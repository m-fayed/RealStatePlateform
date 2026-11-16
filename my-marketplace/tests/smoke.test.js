import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build, createServer } from 'vite';

test('frontend renders authentication, listing editing and protected content', async () => {
  const server = await createServer({ server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { renderScreen } = await server.ssrLoadModule('/tests/smoke-fixture.jsx');
    assert.match(renderScreen('auth'), /تسجيل الدخول/);
    const edit = renderScreen('edit');
    assert.match(edit, /حفظ التعديلات/);
    assert.match(edit, /value="Smoke Test Apartment"/);
    assert.match(edit, /photo\.png/);
    assert.match(renderScreen('card'), /Smoke Test Apartment/);
    assert.doesNotMatch(renderScreen('protected'), /Protected broker content/);
    assert.doesNotMatch(renderScreen('protected', { isAuthenticated: true, user: { role: 'seeker' } }), /Protected broker content/);
    assert.match(renderScreen('protected', { isAuthenticated: true, user: { role: 'broker' } }), /Protected broker content/);
    assert.doesNotMatch(renderScreen('protected', { loading: true, isAuthenticated: true, user: { role: 'broker' } }), /Protected broker content/);
  } finally { await server.close(); }
});

test('production frontend bundles successfully with Arabic RTL entry point', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'marketplace-smoke-build-'));
  try {
    await build({ logLevel: 'warn', build: { outDir: directory, emptyOutDir: true } });
    const html = await readFile(path.join(directory, 'index.html'), 'utf8');
    assert.match(html, /lang="ar" dir="rtl"/);
    assert.match(html, /assets\/index-.*\.js/);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
