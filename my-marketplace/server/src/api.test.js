import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

test('HTTP auth, payment lifecycle and chat authorization', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'marketplace-api-'));
  const previous = Object.fromEntries(['DATABASE_URL', 'JWT_SECRET', 'NODE_ENV', 'ENABLE_MOCK_PAYMENTS'].map((key) => [key, process.env[key]]));
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
    process.env.JWT_SECRET = 'isolated-api-test-secret';
    process.env.NODE_ENV = 'production';
    process.env.ENABLE_MOCK_PAYMENTS = 'true';
    prisma = (await import('./lib/prisma.js')).default;
    const password = await bcrypt.hash('BrokerPass9!', 4);
    const account = (name, role, status = 'active') => prisma.user.create({ data: { name, phone: name, password, role, status, adLicense: 'TEST' } });
    const broker = await account('BrokerPhone', 'broker');
    const otherBroker = await account('OtherBrokerPhone', 'broker');
    const admin = await account('AdminPhone', 'admin');
    const seeker = await account('SeekerPhone', 'seeker');
    const pending = await account('PendingPhone', 'broker', 'pending');
    const bearer = (user) => jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const app = (await import('./app.js')).default;
    server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const request = async (method, route, token, body) => {
      const response = await fetch(`${base}${route}`, { method, headers: {
        'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json() };
    };
    const balance = async () => (await prisma.user.findUniqueOrThrow({ where: { id: broker.id } })).listingCredits;
    await t.test('login hashes, status checks, JWT validity and role enforcement', async () => {
      const loggedIn = await request('POST', '/auth/login', null, { phone: broker.phone, password: 'BrokerPass9!' });
      assert.equal(loggedIn.status, 200);
      assert.equal(loggedIn.body.user.password, undefined);
      const payload = jwt.verify(loggedIn.body.token, process.env.JWT_SECRET);
      assert.equal(payload.exp - payload.iat, 604800);
      assert.equal((await request('GET', '/auth/me', loggedIn.body.token)).body.user.id, broker.id);
      assert.equal((await request('GET', '/auth/me')).status, 401);
      assert.equal((await request('GET', '/auth/me', 'invalid')).status, 401);
      const expired = jwt.sign({ sub: broker.id }, process.env.JWT_SECRET, { expiresIn: -1 });
      assert.equal((await request('GET', '/auth/me', expired)).status, 401);
      assert.equal((await request('POST', '/auth/login', null, { phone: pending.phone, password: 'BrokerPass9!' })).status, 403);
      assert.equal((await request('GET', '/admin/statistics', bearer(seeker))).status, 403);
      assert.equal((await request('GET', '/credits/packages', bearer(seeker))).status, 403);
      const registration = { name: 'New Seeker', phone: 'NewSeekerPhone', password: 'SeekerPass9!' };
      assert.equal((await request('POST', '/auth/register/seeker', null, registration)).status, 201);
      assert.equal((await request('POST', '/auth/register/seeker', null, registration)).status, 409);
      const stored = await prisma.user.findUniqueOrThrow({ where: { phone: registration.phone } });
      assert.notEqual(stored.password, registration.password);
      assert.ok(await bcrypt.compare(registration.password, stored.password));
    });
    await t.test('production rejects mock payments with no transactions or credits', async () => {
      const pricing = await request('GET', '/credits/packages', bearer(broker));
      assert.deepEqual(pricing.body.methods, ['vodafone_cash']);
      for (const method of ['card', 'fawry']) {
        const response = await request('POST', '/credits/purchase', bearer(broker), { package: 'large', method });
        assert.equal(response.status, 403);
        assert.equal(response.body.code, 'MOCK_PAYMENTS_DISABLED');
        assert.equal(response.body.credits_added, 0);
      }
      assert.equal(await balance(), 0);
      assert.equal(await prisma.transaction.count(), 0);
    });
    await t.test('manual approval grants once; rejection grants nothing; history stays private', async () => {
      assert.equal((await request('POST', '/credits/purchase', bearer(broker), { package: 'small', method: 'vodafone_cash' })).status, 400);
      const purchase = await request('POST', '/credits/purchase', bearer(broker), { package: 'small', method: 'vodafone_cash', sender_number: '01012345678', amount: 1, credits: 999 });
      assert.equal(purchase.status, 201);
      const tx = purchase.body.transaction;
      assert.equal(tx.status, 'pending');
      assert.equal(tx.amount, 50);
      assert.equal(tx.credits, 5);
      assert.equal(await balance(), 0);
      assert.equal((await request('PATCH', `/admin/transactions/${tx.id}/approve`, bearer(broker))).status, 403);
      assert.equal((await request('PATCH', `/admin/transactions/${tx.id}/approve`, bearer(admin))).status, 200);
      assert.equal(await balance(), 5);
      assert.equal((await request('PATCH', `/admin/transactions/${tx.id}/approve`, bearer(admin))).status, 400);
      assert.equal(await balance(), 5);
      const rejected = await request('POST', '/credits/purchase', bearer(broker), { package: 'medium', method: 'vodafone_cash', sender_number: '01012345678' });
      assert.equal((await request('PATCH', `/admin/transactions/${rejected.body.transaction.id}/reject`, bearer(admin), { reason: 'Not received' })).status, 200);
      assert.equal(await balance(), 5);
      assert.equal((await request('GET', '/credits/transactions', bearer(otherBroker))).body.transactions.length, 0);
      assert.equal((await request('GET', '/credits/transactions', bearer(broker))).body.transactions.length, 2);
    });
    await t.test('explicit development mocks still work without affecting production guard', async () => {
      process.env.NODE_ENV = 'development';
      for (const method of ['card', 'fawry']) {
        assert.equal((await request('POST', '/credits/purchase', bearer(broker), { package: 'small', method })).status, 201);
      }
      assert.equal(await balance(), 15);
      process.env.NODE_ENV = 'production';
    });
    await t.test('nonparticipants cannot inspect, send, or mark private messages read', async () => {
      const listing = await prisma.listing.create({ data: { brokerId: broker.id, title: 'Chat property', propertyType: 'apartment', offerType: 'sale', price: 100, city: 'Cairo', adLicenseNo: 'TEST', moderationStatus: 'approved' } });
      const created = await request('POST', '/conversations', bearer(seeker), { listing_id: listing.id });
      assert.equal(created.status, 201);
      const id = created.body.conversation.id;
      const sent = await request('POST', `/conversations/${id}/messages`, bearer(broker), { body: 'Private message' });
      assert.equal(sent.status, 201);
      for (const route of [`/conversations/${id}`, `/conversations/${id}/messages`]) {
        assert.equal((await request('GET', route)).status, 401);
        assert.equal((await request('GET', route, bearer(otherBroker))).status, 403);
      }
      assert.equal((await request('POST', `/conversations/${id}/messages`, bearer(otherBroker), { body: 'Intrusion' })).status, 403);
      assert.equal((await request('GET', '/conversations', bearer(otherBroker))).body.conversations.length, 0);
      assert.equal((await prisma.message.findUniqueOrThrow({ where: { id: sent.body.message.id } })).readAt, null);
      assert.equal((await request('GET', `/conversations/${id}/messages`, bearer(seeker))).status, 200);
      assert.ok((await prisma.message.findUniqueOrThrow({ where: { id: sent.body.message.id } })).readAt);
      assert.equal((await request('POST', `/conversations/${id}/messages`, bearer(seeker), { body: ' ' })).status, 400);
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
