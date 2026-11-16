import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';

test('parallel creates and boosts cannot overspend, and failed writes refund the debit', async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), 'listing-credit-race-'));
  const databasePath = path.join(directory, 'test.db');
  const previousUrl = process.env.DATABASE_URL;
  let prisma;
  let server;
  try {
    const database = new DatabaseSync(databasePath);
    try {
      const migrations = new URL('../../prisma/migrations/', import.meta.url);
      for (const entry of (await readdir(migrations, { withFileTypes: true })).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
        database.exec(await readFile(new URL(`${entry.name}/migration.sql`, migrations), 'utf8'));
      }
      // Enforce the invariant at every write during this test, not just at the end.
      database.exec(`CREATE TRIGGER prevent_negative_credits BEFORE UPDATE OF listingCredits ON User
        WHEN NEW.listingCredits < 0 BEGIN SELECT RAISE(ABORT, 'negative balance'); END;`);
    } finally {
      database.close();
    }
    process.env.DATABASE_URL = `file:${databasePath.replaceAll('\\', '/')}`;
    prisma = (await import('../lib/prisma.js')).default;
    const { createListing, boostListing } = await import('./listings.controller.js');
    const broker = await prisma.user.create({ data: {
      name: 'Test Broker', phone: 'test-broker', password: 'unused', role: 'broker',
      adLicense: 'TEST-LICENSE', listingCredits: 1,
    } });
    const app = express();
    app.use(express.json());
    // Deliberately stale snapshot shared by both requests reproduces the original race.
    app.use((req, _res, next) => { req.user = broker; next(); });
    app.post('/listings', createListing);
    app.post('/listings/:id/boost', boostListing);
    app.use((error, _req, res, next) => {
      if (res.headersSent) return next(error);
      res.status(500).json({ message: error.message });
    });
    server = await new Promise((resolve) => {
      const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
    });
    const baseUrl = `http://127.0.0.1:${server.address().port}`;
    const payload = { title: 'Test property', property_type: 'apartment', offer_type: 'sale', price: 100, city: 'Cairo' };
    const post = async (route, body) => {
      const response = await fetch(`${baseUrl}${route}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      return { status: response.status, body: await response.json() };
    };
    const balance = async () => (await prisma.user.findUniqueOrThrow({ where: { id: broker.id } })).listingCredits;
    const checkRace = async (requests, expectedBalance) => {
      const results = await Promise.all(requests);
      assert.equal(results.filter((result) => result.status < 300).length, 1, JSON.stringify(results));
      const rejected = results.find((result) => result.status === 402);
      assert.equal(rejected?.body.code, 'INSUFFICIENT_CREDITS', JSON.stringify(results));
      assert.equal(results.find((result) => result.status < 300).body.credits_remaining, expectedBalance);
      assert.equal(await balance(), expectedBalance);
    };
    await t.test('two creates with one credit', async () => {
      await checkRace([post('/listings', payload), post('/listings', payload)], 0);
      assert.equal(await prisma.listing.count(), 1);
    });
    const first = await prisma.listing.findFirstOrThrow();
    const second = await prisma.listing.create({ data: {
      brokerId: broker.id, title: 'Second property', propertyType: 'apartment', offerType: 'sale',
      price: 100, city: 'Cairo', adLicenseNo: 'TEST-LICENSE',
    } });
    await t.test('two boosts with credits for one badge', async () => {
      await prisma.user.update({ where: { id: broker.id }, data: { listingCredits: 20 } });
      await checkRace([post(`/listings/${first.id}/boost`, { type: 'badge' }), post(`/listings/${second.id}/boost`, { type: 'badge' })], 0);
      assert.equal(await prisma.listing.count({ where: { isFeatured: true } }), 1);
    });
    await t.test('create competes with boost for the same balance', async () => {
      await prisma.user.update({ where: { id: broker.id }, data: { listingCredits: 20 } });
      await prisma.listing.updateMany({ data: { isFeatured: false, featureType: null, featuredUntil: null } });
      const results = await Promise.all([post('/listings', payload), post(`/listings/${first.id}/boost`, { type: 'badge' })]);
      assert.equal(results.filter((result) => result.status < 300).length, 1, JSON.stringify(results));
      assert.equal(results.find((result) => result.status === 402)?.body.code, 'INSUFFICIENT_CREDITS');
      const created = results[0].status === 201;
      assert.equal(await balance(), created ? 19 : 0);
      assert.equal(results.find((result) => result.status < 300).body.credits_remaining, await balance());
      assert.equal(await prisma.listing.count(), created ? 3 : 2);
      assert.equal(await prisma.listing.count({ where: { isFeatured: true } }), created ? 0 : 1);
    });
    await t.test('listing write failure rolls back deducted credits', async () => {
      await prisma.user.update({ where: { id: broker.id }, data: { listingCredits: 1 } });
      await prisma.$executeRawUnsafe(`CREATE TRIGGER reject_test_listing BEFORE INSERT ON Listing
        BEGIN SELECT RAISE(ABORT, 'simulated write failure'); END;`);
      const count = await prisma.listing.count();
      assert.equal((await post('/listings', payload)).status, 500);
      assert.equal(await balance(), 1);
      assert.equal(await prisma.listing.count(), count);
    });
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (prisma) await prisma.$disconnect();
    if (previousUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousUrl;
    await rm(directory, { recursive: true, force: true });
  }
});
