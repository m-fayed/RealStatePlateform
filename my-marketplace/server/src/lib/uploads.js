// Multer setup for local file storage in server/uploads.
//
// Security notes:
// - Filenames are generated server-side (timestamp + random hex + whitelist
//   extension). The client's original filename is never used, so no path
//   traversal or weird-name surprises.
// - Allowed types are matched on BOTH mimetype and extension; anything else
//   is rejected before it touches the disk.
// - uploads/ is served statically by app.js; nothing inside it is ever
//   executed, only downloaded.

import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const UPLOADS_DIR = path.join(__dirname, '..', '..', 'uploads');

export const IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};
export const DOC_TYPES = {
  'application/pdf': '.pdf',
};

export const IMAGE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB per image
export const DOC_MAX_BYTES = 5 * 1024 * 1024;   // 5 MB per document
export const MAX_LISTING_IMAGES = 10;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    // We only reach here after the filter accepted the file, so the
    // mimetype is in our whitelist and ext() is always a known value.
    cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext(file)}`);
  },
});

function makeFilter(allowed) {
  const extensions = new Set(Object.values(allowed));
  return (_req, file, cb) => {
    const ok = Boolean(allowed[file.mimetype]) && extensions.has(ext(file));
    cb(ok ? null : new Error(`File type not allowed: ${file.originalname || file.mimetype}`), ok);
  };
}

function ext(file) {
  const fromMime = allowedTypes[file.mimetype];
  return fromMime || path.extname(file.originalname || '').toLowerCase();
}

// Map of every mimetype we accept, used by ext() to normalize extensions
// (e.g. image/jpg -> .jpg, .JPG -> .jpg). Kept as one object so the filter
// and the filename generator can never disagree about what's allowed.
const allowedTypes = { ...IMAGE_TYPES, ...DOC_TYPES };

export const uploadImage = multer({
  storage,
  fileFilter: makeFilter(IMAGE_TYPES),
  limits: { fileSize: IMAGE_MAX_BYTES, files: MAX_LISTING_IMAGES },
});

export const uploadDoc = multer({
  storage,
  fileFilter: makeFilter({ ...IMAGE_TYPES, ...DOC_TYPES }),
  limits: { fileSize: DOC_MAX_BYTES, files: 1 },
});

// Build the public URL for a stored file. Absolute on purpose: the frontend
// runs on a different origin (5175) than the API (5002), and the stored
// string also feeds z.string().url() validation on the broker schema.
export function fileUrl(req, filename) {
  const proto = req.get('x-forwarded-proto') || req.protocol;
  return `${proto}://${req.get('host')}/uploads/${filename}`;
}
