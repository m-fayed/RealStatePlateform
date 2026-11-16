import path from 'node:path';
import crypto from 'node:crypto';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { mkdir, writeFile, readFile, open, unlink, readdir, stat, rename } from 'node:fs/promises';
import multer from 'multer';
import { fileURLToPath } from 'node:url';
import prisma from './prisma.js';
import { parseImages } from './serializers.js';

export const UPLOADS_DIR = path.resolve(process.env.UPLOADS_DIR || fileURLToPath(new URL('../../uploads/', import.meta.url)));
export const PUBLIC_UPLOADS_DIR = path.join(UPLOADS_DIR, 'public');
export const PRIVATE_UPLOADS_DIR = path.join(UPLOADS_DIR, 'private');
export const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
export const DOC_TYPES = { 'application/pdf': '.pdf' };
export const IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const DOC_MAX_BYTES = IMAGE_MAX_BYTES;
export const MAX_LISTING_IMAGES = 10;
export const ORPHAN_MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function detectFileType(buffer) {
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'image/png';
  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) return 'image/jpeg';
  if (['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString('ascii'))) return 'image/gif';
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buffer.subarray(0, 5).toString('ascii') === '%PDF-') return 'application/pdf';
  return null;
}

function badUpload(message) { return Object.assign(new Error(message), { status: 400 }); }

// Bounded memory storage: validate all file signatures before writing to disk.
export const uploadImage = multer({ storage: multer.memoryStorage(), limits: { fileSize: IMAGE_MAX_BYTES, files: MAX_LISTING_IMAGES, fields: 0, parts: MAX_LISTING_IMAGES + 1 } });
export const uploadDoc = multer({ storage: multer.memoryStorage(), limits: { fileSize: DOC_MAX_BYTES, files: 1, fields: 0, parts: 2 } });

export function storeUploads(kind) {
  return async (req, _res, next) => {
    const written = [];
    try {
      const files = req.files || (req.file ? [req.file] : []);
      const allowed = kind === 'images' ? IMAGE_TYPES : { ...IMAGE_TYPES, ...DOC_TYPES };
      for (const file of files) {
        const type = detectFileType(file.buffer);
        const extension = path.extname(file.originalname).toLowerCase();
        if (!type || !allowed[type] || !(extension === allowed[type] || (type === 'image/jpeg' && extension === '.jpeg'))) {
          throw badUpload('File content or extension is not allowed');
        }
        file.mimetype = type;
        file.filename = `${Date.now()}-${crypto.randomBytes(16).toString('hex')}${allowed[type]}`;
      }
      const directory = kind === 'images' ? PUBLIC_UPLOADS_DIR : PRIVATE_UPLOADS_DIR;
      await mkdir(directory, { recursive: true });
      for (const file of files) {
        const target = path.join(directory, file.filename);
        written.push(target);
        await writeFile(target, file.buffer, { flag: 'wx' });
        delete file.buffer;
        if (kind !== 'images') {
          const token = kind === 'license' ? crypto.randomBytes(32).toString('hex') : null;
          file.uploadToken = token;
          const metadata = `${target}.json`;
          written.push(metadata);
          await writeFile(metadata, JSON.stringify({ kind, ownerId: req.user?.id || null, tokenHash: token ? hashToken(token) : null }), { flag: 'wx' });
        }
      }
      next();
    } catch (error) {
      await Promise.all(written.map((file) => unlink(file).catch(() => {})));
      next(error);
    }
  };
}

function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }

export function uploadFilename(value) {
  try {
    const url = new URL(value);
    const match = url.pathname.match(/^\/(?:api\/uploads\/documents|uploads)\/([\w.-]+)$/);
    return match && !match[1].startsWith('.') ? match[1] : null;
  } catch { return null; }
}

export async function claimLicense(url, token, createUser) {
  const filename = uploadFilename(url);
  if (!filename) throw badUpload('A newly uploaded license and its upload token are required');
  const target = path.join(PRIVATE_UPLOADS_DIR, filename);
  let lock;
  try {
    lock = await open(`${target}.lock`, 'wx');
    const metadata = JSON.parse(await readFile(`${target}.json`, 'utf8'));
    if (metadata.kind !== 'license' || metadata.ownerId || metadata.tokenHash !== hashToken(token)) throw badUpload('Invalid or already claimed license upload');
    const user = await createUser();
    await writeFile(`${target}.json`, JSON.stringify({ kind: 'license', ownerId: user.id, tokenHash: null }));
    return user;
  } catch (error) {
    if (['ENOENT', 'EEXIST'].includes(error.code)) throw badUpload('License upload is unavailable or already being claimed');
    throw error;
  } finally {
    if (lock) { await lock.close(); await unlink(`${target}.lock`); }
  }
}

export function fileUrl(req, filename, privateDocument = false) {
  return `${req.protocol}://${req.get('host')}/${privateDocument ? 'api/uploads/documents' : 'uploads'}/${filename}`;
}

export async function canReadDocument(filename, user) {
  if (user.role === 'admin') return true;
  const account = await prisma.user.findUnique({ where: { id: user.id }, select: { licenseImageUrl: true } });
  if (uploadFilename(account?.licenseImageUrl) === filename) return true;
  const transactions = await prisma.transaction.findMany({ where: { brokerId: user.id }, select: { receiptUrl: true } });
  if (transactions.some((tx) => uploadFilename(tx.receiptUrl) === filename)) return true;
  try {
    const metadata = JSON.parse(await readFile(path.join(PRIVATE_UPLOADS_DIR, `${filename}.json`), 'utf8'));
    return metadata.ownerId === user.id;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

export async function validateReceiptOwner(url, userId) {
  if (!url) return;
  const filename = uploadFilename(url);
  if (!filename) throw badUpload('Receipt must be uploaded by the signed-in broker');
  try {
    const metadata = JSON.parse(await readFile(path.join(PRIVATE_UPLOADS_DIR, `${filename}.json`), 'utf8'));
    if (metadata.kind !== 'receipt' || metadata.ownerId !== userId) throw badUpload('Receipt belongs to another account');
  } catch (error) {
    if (error.code === 'ENOENT') throw badUpload('Receipt upload not found');
    throw error;
  }
}

export async function readDocument(req, res, next) {
  try {
    const filename = req.params.filename;
    if (!/^[\w-]+\.(?:jpg|jpeg|png|gif|webp|pdf)$/i.test(filename) || !(await canReadDocument(filename, req.user))) {
      return res.status(403).json({ success: false, message: 'Document access denied' });
    }
    res.set({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'" });
    res.download(path.join(PRIVATE_UPLOADS_DIR, filename), filename, (error) => { if (error) next(error); });
  } catch (error) { next(error); }
}

async function referencedFiles() {
  const [users, transactions, listings] = await Promise.all([
    prisma.user.findMany({ select: { licenseImageUrl: true } }),
    prisma.transaction.findMany({ select: { receiptUrl: true } }),
    prisma.listing.findMany({ select: { images: true } }),
  ]);
  return {
    documents: new Set([...users.map((user) => user.licenseImageUrl), ...transactions.map((tx) => tx.receiptUrl)].map(uploadFilename).filter(Boolean)),
    photos: new Set(listings.flatMap((listing) => parseImages(listing.images)).map(uploadFilename).filter(Boolean)),
  };
}

// Run before listening. Legacy files without a clear photo reference are
// quarantined privately; old document URLs remain protected by authentication.
export async function initializeUploads() {
  await Promise.all([mkdir(PUBLIC_UPLOADS_DIR, { recursive: true }), mkdir(PRIVATE_UPLOADS_DIR, { recursive: true })]);
  const { documents, photos } = await referencedFiles();
  for (const entry of await readdir(UPLOADS_DIR, { withFileTypes: true })) {
    if (!entry.isFile() || entry.name.startsWith('.')) continue;
    const directory = photos.has(entry.name) && !documents.has(entry.name) ? PUBLIC_UPLOADS_DIR : PRIVATE_UPLOADS_DIR;
    await rename(path.join(UPLOADS_DIR, entry.name), path.join(directory, entry.name));
  }
}

// Keep referenced files and a 24-hour grace period for incomplete forms.
// Any DB lookup failure aborts cleanup without deleting files.
export async function cleanupOrphanUploads(now = Date.now()) {
  const { documents, photos } = await referencedFiles();
  for (const [directory, references] of [[PUBLIC_UPLOADS_DIR, photos], [PRIVATE_UPLOADS_DIR, documents]]) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      if (!entry.isFile() || entry.name.startsWith('.') || /\.(json|lock)$/.test(entry.name) || references.has(entry.name)) continue;
      const target = path.join(directory, entry.name);
      if (now - (await stat(target)).mtimeMs < ORPHAN_MAX_AGE_MS) continue;
      let lock;
      try {
        lock = await open(`${target}.lock`, 'wx');
        const fresh = await referencedFiles();
        if (fresh.documents.has(entry.name) || fresh.photos.has(entry.name)) continue;
        await unlink(target);
        await unlink(`${target}.json`).catch((error) => { if (error.code !== 'ENOENT') throw error; });
      } catch (error) {
        if (error.code !== 'EEXIST' && error.code !== 'ENOENT') throw error;
      } finally {
        if (lock) { await lock.close(); await unlink(`${target}.lock`); }
      }
    }
  }
}
