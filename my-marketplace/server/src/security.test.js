import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, readdir, rm, writeFile, utimes, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { DatabaseSync } from 'node:sqlite';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { validateAdminConfig, validateStartupConfig, createRateLimit } from './lib/security.js';
import express from 'express';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

test('admin credentials must be explicit and strong', () => {
  for (const env of [{}, { ADMIN_EMAIL: 'bad', ADMIN_PASSWORD: 'Something9!Long' }, { ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'admin123' }]) {
    assert.throws(() => validateAdminConfig(env));
    assert.throws(() => validateStartupConfig({ ...env, NODE_ENV: 'production' }));
  }
  assert.doesNotThrow(() => validateStartupConfig({ NODE_ENV: 'development' }));
  assert.doesNotThrow(() => validateAdminConfig({ ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'Unique9!StrongValue' }));
});

test('production startup and seed reject missing credentials before DB access', async () => {
  for (const entry of ['index.js', '../prisma/seed.js']) {
    await assert.rejects(promisify(execFile)(process.execPath, [new URL(entry, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')], {
      env: { ...process.env, NODE_ENV: 'production', ADMIN_EMAIL: '', ADMIN_PASSWORD: '', DATABASE_URL: 'file:/nonexistent/security-test.db' },
    }), (error) => error.code === 1 && /ADMIN_EMAIL/.test(error.stderr));
  }
});

test('production requires a strong JWT secret before database access', async () => {
  const env = { NODE_ENV: 'production', ADMIN_EMAIL: 'admin@example.com', ADMIN_PASSWORD: 'Unique9!StrongValue' };
  for (const JWT_SECRET of [undefined, '', 'a'.repeat(64), 'abcD123!'.repeat(4), 'replace-with-a-long-random-string', 'abcdefghijklmnopqrstuvwxyz012345', 'f8b2c9a4e7d1 ' + '0'.repeat(32), 'f8b2c9a4e7d10365']) {
    assert.throws(() => validateStartupConfig({ ...env, JWT_SECRET }), /JWT_SECRET/);
  }
  assert.doesNotThrow(() => validateStartupConfig({ ...env, JWT_SECRET: 'f8b2c9a4e7d10365b0a9d6e2c5f18473' }));
  assert.doesNotThrow(() => validateStartupConfig({ NODE_ENV: 'development' }));
  await assert.rejects(promisify(execFile)(process.execPath, [new URL('index.js', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')], {
    env: { ...process.env, ...env, JWT_SECRET: '', DATABASE_URL: 'file:/nonexistent/security-test.db' },
  }), (error) => error.code === 1 && /JWT_SECRET/.test(error.stderr));
});

test('failed-login slots expire after fifteen minutes and successes do not count', async () => {
  let now = 0;
  const limiter = createRateLimit({ limit: 5, windowMs: 900000, failedOnly: true, now: () => now });
  const app = express();
  app.get('/', limiter, (req, res) => res.sendStatus(req.query.fail ? 401 : 200));
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const url = `http://127.0.0.1:${server.address().port}/`;
  try {
    for (let i = 0; i < 6; i++) assert.equal((await fetch(url)).status, 200);
    for (let i = 0; i < 5; i++) assert.equal((await fetch(`${url}?fail=1`)).status, 401);
    const blocked = await fetch(url);
    assert.equal(blocked.status, 429);
    assert.equal(blocked.headers.get('retry-after'), '900');
    now = 900000;
    assert.equal((await fetch(url)).status, 200);
  } finally { await new Promise((resolve) => server.close(resolve)); }
});

test('auth, private documents, file signatures, upload limits and cleanup', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'marketplace-security-'));
  const previous = { DATABASE_URL: process.env.DATABASE_URL, UPLOADS_DIR: process.env.UPLOADS_DIR, JWT_SECRET: process.env.JWT_SECRET };
  let prisma;
  let server;
  try {
    const databasePath = path.join(directory, 'test.db');
    const database = new DatabaseSync(databasePath);
    try {
      const migrations = new URL('../prisma/migrations/', import.meta.url);
      for (const entry of (await readdir(migrations, { withFileTypes: true })).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
        database.exec(await readFile(new URL(`${entry.name}/migration.sql`, migrations), 'utf8'));
      }
    } finally { database.close(); }
    process.env.DATABASE_URL = `file:${databasePath.replaceAll('\\', '/')}`;
    process.env.UPLOADS_DIR = path.join(directory, 'uploads');
    process.env.JWT_SECRET = 'test-only-secret';
    prisma = (await import('./lib/prisma.js')).default;
    const uploads = await import('./lib/uploads.js');
    await uploads.initializeUploads();
    const password = await bcrypt.hash('TestPass9!', 4);
    const owner = await prisma.user.create({ data: { name: 'Owner', phone: '01000000001', password, role: 'broker', adLicense: 'TEST' } });
    const other = await prisma.user.create({ data: { name: 'Other', phone: '01000000002', password, role: 'broker' } });
    const admin = await prisma.user.create({ data: { name: 'Admin', phone: '01000000003', password, role: 'admin' } });
    const token = (user) => jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const ownerToken = token(owner);
    const app = (await import('./app.js')).default;
    server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const base = `http://127.0.0.1:${server.address().port}`;
    const post = (route, body, bearer) => fetch(`${base}${route}`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) }, body: JSON.stringify(body) });
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
    const upload = (route, field, name, content, bearer, type = 'image/png') => {
      const form = new FormData();
      form.append(field, new Blob([content], { type }), name);
      return fetch(`${base}/api/uploads/${route}`, { method: 'POST', headers: bearer ? { Authorization: `Bearer ${bearer}` } : {}, body: form });
    };
    await t.test('password minimum, JWT expiration and failed-login throttle', async () => {
      const registration = { name: 'Seeker', phone: '01000000004', password: '1234567' };
      assert.equal((await post('/api/auth/register/seeker', registration)).status, 400);
      const created = await post('/api/auth/register/seeker', { ...registration, password: '12345678' });
      assert.equal(created.status, 201);
      const payload = jwt.verify((await created.json()).token, process.env.JWT_SECRET);
      assert.equal(payload.exp - payload.iat, 7 * 24 * 60 * 60);
      for (let i = 0; i < 5; i++) assert.equal((await post('/api/auth/login', { phone: owner.phone, password: 'wrong' })).status, 401);
      assert.equal((await post('/api/auth/login', { phone: owner.phone, password: 'TestPass9!' })).status, 429);
    });
    await t.test('spoofed content and mismatched extensions are rejected', async () => {
      assert.equal((await upload('images', 'images', 'fake.png', 'not an image', ownerToken)).status, 400);
      assert.equal((await upload('images', 'images', 'fake.pdf', png, ownerToken)).status, 400);
      assert.equal((await upload('images', 'images', 'fake.png', '%PDF-1.4\n', ownerToken)).status, 400);
    });
    let license;
    let receipt;
    let photo;
    await t.test('license claim is one-time and all document reads require owner/admin', async () => {
      const response = await upload('license', 'license', 'license.png', png);
      assert.equal(response.status, 201);
      license = await response.json();
      const form = { name: 'New Broker', phone: '01000000005', email: 'broker@example.com', password: 'TestPass9!', license_image_url: license.url, ad_license_no: 'TEST' };
      assert.equal((await post('/api/auth/register/broker', { ...form, license_upload_token: 'wrong' })).status, 400);
      const registered = await post('/api/auth/register/broker', { ...form, license_upload_token: license.upload_token });
      assert.equal(registered.status, 201);
      const user = (await registered.json()).user;
      await prisma.user.update({ where: { id: user.id }, data: { status: 'active' } });
      assert.equal((await post('/api/auth/register/broker', { ...form, phone: '01000000006', license_upload_token: license.upload_token })).status, 400);
      assert.equal((await fetch(license.url)).status, 401);
      assert.equal((await fetch(license.url, { headers: { Authorization: `Bearer ${token(other)}` } })).status, 403);
      for (const authorized of [user, admin]) {
        const downloaded = await fetch(license.url, { headers: { Authorization: `Bearer ${token(authorized)}` } });
        assert.equal(downloaded.status, 200);
        assert.equal(downloaded.headers.get('cache-control'), 'private, no-store');
        assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), png);
      }
      const filename = uploads.uploadFilename(license.url);
      assert.equal((await fetch(`${base}/uploads/${filename}`)).status, 401);
      assert.equal((await fetch(`${base}/uploads/private/${filename}`)).status, 404);
      receipt = await (await upload('receipt', 'receipt', 'receipt.pdf', '%PDF-1.4\n%%EOF', ownerToken, 'application/pdf')).json();
      assert.equal((await fetch(receipt.url, { headers: { Authorization: `Bearer ${ownerToken}` } })).status, 200);
      assert.equal((await fetch(receipt.url, { headers: { Authorization: `Bearer ${token(other)}` } })).status, 403);
      assert.equal((await post('/api/credits/purchase', { package: 'small', method: 'vodafone_cash', sender_number: '01000000002', receipt_url: receipt.url }, token(other))).status, 400);
      const purchase = await post('/api/credits/purchase', { package: 'small', method: 'vodafone_cash', sender_number: owner.phone, receipt_url: receipt.url }, ownerToken);
      assert.equal(purchase.status, 201);
      assert.equal((await purchase.json()).status, 'pending');
    });
    await t.test('listing photos alone are public; cleanup preserves references and recent uploads', async () => {
      const response = await upload('images', 'images', 'photo.png', png, ownerToken, 'application/octet-stream');
      assert.equal(response.status, 201);
      photo = (await response.json()).urls[0];
      assert.equal((await fetch(photo)).status, 200);
      await prisma.listing.create({ data: { brokerId: owner.id, title: 'Photo', propertyType: 'apartment', offerType: 'sale', city: 'Cairo', price: 100, adLicenseNo: 'TEST', images: JSON.stringify([photo]) } });
      const old = new Date(Date.now() - 25 * 60 * 60 * 1000);
      for (const [url, root] of [[photo, uploads.PUBLIC_UPLOADS_DIR], [license.url, uploads.PRIVATE_UPLOADS_DIR], [receipt.url, uploads.PRIVATE_UPLOADS_DIR]]) {
        await utimes(path.join(root, uploads.uploadFilename(url)), old, old);
      }
      const orphan = path.join(uploads.PUBLIC_UPLOADS_DIR, 'orphan.png');
      const privateOrphan = path.join(uploads.PRIVATE_UPLOADS_DIR, 'orphan.pdf');
      const recent = path.join(uploads.PUBLIC_UPLOADS_DIR, 'recent.png');
      await writeFile(orphan, png);
      await writeFile(privateOrphan, '%PDF-1.4\n%%EOF');
      await writeFile(`${privateOrphan}.json`, '{}');
      await writeFile(recent, png);
      await utimes(orphan, old, old);
      await utimes(privateOrphan, old, old);
      await uploads.cleanupOrphanUploads();
      await assert.rejects(access(orphan));
      await assert.rejects(access(privateOrphan));
      await assert.rejects(access(`${privateOrphan}.json`));
      await access(recent);
      for (const [url, root] of [[photo, uploads.PUBLIC_UPLOADS_DIR], [license.url, uploads.PRIVATE_UPLOADS_DIR], [receipt.url, uploads.PRIVATE_UPLOADS_DIR]]) await access(path.join(root, uploads.uploadFilename(url)));
      // Legacy files are segregated and their existing URLs retain access checks.
      const legacy = 'legacy-license.pdf';
      await writeFile(path.join(uploads.UPLOADS_DIR, legacy), '%PDF-1.4\n%%EOF');
      await prisma.user.update({ where: { id: owner.id }, data: { licenseImageUrl: `${base}/uploads/${legacy}` } });
      await uploads.initializeUploads();
      await access(path.join(uploads.PRIVATE_UPLOADS_DIR, legacy));
      assert.equal((await fetch(`${base}/uploads/${legacy}`)).status, 401);
      assert.equal((await fetch(`${base}/uploads/${legacy}`, { headers: { Authorization: `Bearer ${ownerToken}` } })).status, 200);
    });
    await t.test('upload rate limit blocks excess requests', async () => {
      let response;
      for (let i = 0; i < 21; i++) response = await upload('license', 'license', 'fake.png', 'invalid');
      assert.equal(response.status, 429);
      assert.ok(response.headers.get('retry-after'));
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (prisma) await prisma.$disconnect();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(directory, { recursive: true, force: true });
  }
});
