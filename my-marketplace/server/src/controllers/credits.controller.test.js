import assert from 'node:assert/strict';
import process from 'node:process';
import { test } from 'node:test';
import prisma from '../lib/prisma.js';
import { getPackages, purchaseCredits } from './credits.controller.js';

test('mock payments fail closed; Vodafone Cash still awaits review', async () => {
  const originalEnv = { NODE_ENV: process.env.NODE_ENV, ENABLE_MOCK_PAYMENTS: process.env.ENABLE_MOCK_PAYMENTS };
  const originalCreate = prisma.transaction.create;
  const originalUpdate = prisma.user.update;
  const originalTransaction = prisma.$transaction;
  const originalWarn = console.warn;
  const writes = [];
  const warnings = [];
  prisma.transaction.create = (args) => {
    writes.push(args.data);
    return Promise.resolve({ id: 'test-transaction', ...args.data });
  };
  prisma.user.update = () => {
    writes.push('credit update');
    return Promise.resolve({ id: 'broker', listingCredits: 5 });
  };
  prisma.$transaction = (operations) => Promise.all(operations);
  console.warn = (...args) => warnings.push(args);
  const response = () => ({
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  });
  const next = (error) => { throw error; };
  try {
    for (const [environment, flag] of [
      ['production', 'true'], ['production', 'false'],
      ['development', 'false'], ['development', 'TRUE'], ['test', 'true'],
      [undefined, undefined],
    ]) {
      for (const [key, value] of [['NODE_ENV', environment], ['ENABLE_MOCK_PAYMENTS', flag]]) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      const config = response();
      getPackages({}, config);
      assert.equal(config.body.mock_payments_enabled, false);
      assert.deepEqual(config.body.methods, ['vodafone_cash']);
      for (const method of ['card', 'fawry']) {
        const res = response();
        await purchaseCredits({ user: { id: 'broker' }, body: { package: 'small', method } }, res, next);
        assert.equal(res.statusCode, 403);
        assert.equal(res.body.code, 'MOCK_PAYMENTS_DISABLED');
        assert.equal(res.body.credits_added, 0);
      }
    }
    assert.equal(warnings.length, 12);
    assert.deepEqual(writes, []);

    const manual = response();
    await purchaseCredits({ user: { id: 'broker' }, body: {
      package: 'small', method: 'vodafone_cash', sender_number: '01012345678',
    } }, manual, next);
    assert.equal(manual.statusCode, 201);
    assert.equal(manual.body.status, 'pending');
    assert.equal(writes.length, 1);
    assert.equal(writes[0].status, 'pending');

    process.env.NODE_ENV = 'development';
    process.env.ENABLE_MOCK_PAYMENTS = 'true';
    const config = response();
    getPackages({}, config);
    assert.equal(config.body.mock_payments_enabled, true);
    assert.deepEqual(config.body.methods, ['vodafone_cash', 'card', 'fawry']);
    for (const method of ['card', 'fawry']) {
      const res = response();
      await purchaseCredits({ user: { id: 'broker' }, body: { package: 'small', method } }, res, next);
      assert.equal(res.statusCode, 201);
      assert.equal(res.body.credits_added, 5);
    }
  } finally {
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    prisma.transaction.create = originalCreate;
    prisma.user.update = originalUpdate;
    prisma.$transaction = originalTransaction;
    console.warn = originalWarn;
  }
});
