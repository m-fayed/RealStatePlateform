import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { DatabaseSync } from 'node:sqlite';
import jwt from 'jsonwebtoken';

test('listing ownership, moderation, suspension and paginated read receipts', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'marketplace-workflows-'));
  const previous = { DATABASE_URL: process.env.DATABASE_URL, JWT_SECRET: process.env.JWT_SECRET };
  let prisma;
  let server;
  try {
    const filename = path.join(directory, 'test.db');
    const database = new DatabaseSync(filename);
    try {
      const migrations = new URL('../prisma/migrations/', import.meta.url);
      for (const entry of (await readdir(migrations, { withFileTypes: true })).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
        database.exec(await readFile(new URL(`${entry.name}/migration.sql`, migrations), 'utf8'));
      }
    } finally { database.close(); }
    process.env.DATABASE_URL = `file:${filename.replaceAll('\\', '/')}`;
    process.env.JWT_SECRET = 'test-workflows-secret';
    prisma = (await import('./lib/prisma.js')).default;
    const user = (name, role, status = 'active') => prisma.user.create({ data: { name, phone: name, password: 'unused', role, status, listingCredits: 5, adLicense: 'TEST' } });
    const broker = await user('Broker', 'broker');
    const buyer = await user('Buyer', 'seeker');
    const other = await user('Other Broker', 'broker');
    const admin = await user('Admin', 'admin');
    const pending = await user('Pending Broker', 'broker', 'pending');
    const token = (account) => jwt.sign({ sub: account.id }, process.env.JWT_SECRET, { expiresIn: '7d' });
    const app = (await import('./app.js')).default;
    server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const request = async (method, route, account, body) => {
      const response = await fetch(`${base}${route}`, { method, headers: {
        'Content-Type': 'application/json', ...(account ? { Authorization: `Bearer ${token(account)}` } : {}),
      }, ...(body ? { body: JSON.stringify(body) } : {}) });
      return { status: response.status, body: await response.json() };
    };
    const moderate = (id, action) => request('PATCH', `/admin/listings/${id}/moderation`, admin, { action, reason: 'Reviewed' });
    let listing;
    await t.test('create/edit/status preserve ownership, photos and moderation', async () => {
      const created = await request('POST', '/listings', broker, { title: 'Test property', property_type: 'apartment', offer_type: 'sale', city: 'Cairo', price: 100, images: ['https://example.com/property.png'] });
      assert.equal(created.status, 201);
      listing = created.body.listing;
      assert.equal(listing.moderation_status, 'pending');
      assert.equal((await request('GET', `/listings/${listing.id}`)).status, 404);
      assert.equal((await request('GET', '/listings/mine', broker)).body.listings.length, 1);
      assert.equal((await request('GET', '/listings/mine', buyer)).status, 403);
      assert.equal((await request('PUT', `/listings/${listing.id}`, other, { title: 'Stolen' })).status, 403);
      assert.equal((await request('PUT', `/listings/${listing.id}`, buyer, { title: 'Stolen' })).status, 403);
      assert.equal((await moderate(listing.id, 'approve')).status, 200);
      assert.equal((await request('GET', '/listings')).body.listings.length, 1);
      const edited = await request('PUT', `/listings/${listing.id}`, broker, { title: 'Updated property', floor: 0 });
      assert.equal(edited.status, 200);
      assert.deepEqual(edited.body.listing.images, listing.images);
      assert.equal(edited.body.listing.floor, 0);
      assert.equal(edited.body.listing.moderation_status, 'pending');
      assert.equal((await request('GET', '/auth/me', broker)).body.user.listingCredits, 4);
      assert.equal((await request('PATCH', `/listings/${listing.id}/status`, other, { status: 'sold' })).status, 403);
      assert.equal((await request('PATCH', `/listings/${listing.id}/status`, broker, { status: 'rented' })).status, 400);
      assert.equal((await request('PATCH', `/listings/${listing.id}/status`, broker, { status: 'sold' })).status, 200);
      await moderate(listing.id, 'approve');
      assert.equal((await request('GET', '/listings')).body.listings.length, 0);
      assert.equal((await request('GET', '/listings/mine', broker)).body.listings[0].status, 'sold');
      await request('PUT', `/listings/${listing.id}`, broker, { offer_type: 'rent' });
      assert.equal((await request('PATCH', `/listings/${listing.id}/status`, broker, { status: 'rented' })).status, 200);
      await request('PATCH', `/listings/${listing.id}/status`, broker, { status: 'active' });
    });
    await t.test('moderation and suspension are admin-only and control public visibility', async () => {
      assert.equal((await request('GET', '/admin/brokers', broker)).status, 403);
      assert.equal((await request('PATCH', `/admin/brokers/${broker.id}/suspension`, buyer, { suspended: true })).status, 403);
      assert.equal((await request('PATCH', `/admin/listings/${listing.id}/moderation`, broker, { action: 'approve' })).status, 403);
      assert.ok((await request('GET', '/admin/brokers', admin)).body.brokers.some((row) => row.id === broker.id));
      assert.equal((await request('GET', '/admin/listings', admin)).body.listings.length, 1);
      await moderate(listing.id, 'reject');
      assert.equal((await request('GET', `/listings/${listing.id}`)).status, 404);
      await moderate(listing.id, 'hide');
      await request('PATCH', `/listings/${listing.id}/status`, broker, { status: 'active' });
      const edited = await request('PUT', `/listings/${listing.id}`, broker, { title: 'Cannot bypass hide' });
      assert.equal(edited.body.listing.moderation_status, 'hidden');
      assert.equal((await request('GET', '/listings')).body.listings.length, 0);
      await moderate(listing.id, 'approve');
      assert.equal((await request('GET', `/listings/${listing.id}`)).status, 200);
      assert.equal((await request('PATCH', `/admin/brokers/${broker.id}/suspension`, admin, { suspended: true })).status, 200);
      assert.equal((await request('GET', '/auth/me', broker)).status, 403);
      assert.equal((await request('GET', '/listings/mine', broker)).status, 403);
      assert.equal((await request('GET', '/listings')).body.listings.length, 0);
      assert.equal((await request('GET', `/brokers/${broker.id}`)).status, 404);
      assert.equal((await request('GET', `/listings/${listing.id}`)).status, 404);
      assert.equal((await request('POST', '/conversations', buyer, { listing_id: listing.id })).status, 404);
      assert.equal((await request('PATCH', `/admin/brokers/${pending.id}/suspension`, admin, { suspended: false })).status, 409);
      assert.equal((await request('PATCH', `/admin/brokers/${broker.id}/suspension`, admin, { suspended: false })).status, 200);
      assert.equal((await request('GET', '/listings')).body.listings.length, 1);
    });
    await t.test('cursor pages are stable, isolated and mark only incoming returned messages read', async () => {
      const created = await request('POST', '/conversations', buyer, { listing_id: listing.id });
      assert.equal(created.status, 201);
      const id = created.body.conversation.id;
      const timestamp = new Date('2026-11-16T10:00:00Z');
      await prisma.message.createMany({ data: Array.from({ length: 123 }, (_, index) => ({
        id: `message-${String(index).padStart(3, '0')}`, conversationId: id, senderId: broker.id, body: `Message ${index}`, createdAt: timestamp,
      })) });
      const own = await prisma.message.create({ data: { id: 'message-000-own', conversationId: id, senderId: buyer.id, body: 'Own message', createdAt: timestamp } });
      const unread = async () => (await request('GET', '/conversations', buyer)).body.conversations.find((row) => row.id === id).unread_count;
      assert.equal(await unread(), 123);
      assert.equal((await request('GET', `/conversations/${id}/messages`, other)).status, 403);
      assert.equal((await request('GET', `/conversations/${id}/messages?limit=51`, buyer)).status, 400);
      const first = await request('GET', `/conversations/${id}/messages`, buyer);
      assert.equal(first.body.messages.length, 50);
      assert.equal(first.body.messages[0].id, 'message-122');
      assert.ok(first.body.messages.every((message) => message.read_at));
      assert.equal(await unread(), 73);
      // A newer message inserted between requests must not shift older pages.
      const newest = await prisma.message.create({ data: { conversationId: id, senderId: broker.id, body: 'New incoming', createdAt: new Date('2026-11-16T11:00:00Z') } });
      const second = await request('GET', `/conversations/${id}/messages?cursor=${first.body.next_cursor}`, buyer);
      const third = await request('GET', `/conversations/${id}/messages?cursor=${second.body.next_cursor}`, buyer);
      const all = [...first.body.messages, ...second.body.messages, ...third.body.messages];
      assert.equal(new Set(all.map((message) => message.id)).size, 124);
      assert.equal(all.length, 124);
      assert.equal(third.body.next_cursor, null);
      assert.equal(third.body.has_more, false);
      assert.equal(await unread(), 1);
      assert.equal((await prisma.message.findUnique({ where: { id: own.id } })).readAt, null);
      const latest = await request('GET', `/conversations/${id}/messages`, buyer);
      assert.equal(latest.body.messages[0].id, newest.id);
      assert.equal(await unread(), 0);
      assert.equal((await request('GET', '/conversations', broker)).body.conversations[0].unread_count, 1);
      // Reading as the sender never marks their own messages; receiver reads do.
      await request('GET', `/conversations/${id}/messages?cursor=message-001`, broker);
      assert.ok((await prisma.message.findUnique({ where: { id: own.id } })).readAt);
      const unrelated = await prisma.conversation.create({ data: { listingId: listing.id, buyerId: other.id, brokerId: broker.id } });
      const foreign = await prisma.message.create({ data: { conversationId: unrelated.id, senderId: other.id, body: 'Private' } });
      assert.equal((await request('GET', `/conversations/${id}/messages?cursor=${foreign.id}`, buyer)).status, 400);
      assert.equal((await request('GET', `/conversations/${id}/messages?cursor=missing`, buyer)).status, 400);
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
