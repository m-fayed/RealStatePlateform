import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtemp, mkdir, readFile, writeFile, rm, readdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { SERVER_DIR, storagePaths, warnStorage } from './lib/storage.js';

test('backup CLI recovers SQLite rows and public/private uploads after live data loss', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'marketplace-recovery-'));
  const database = path.join(root, 'live', 'pilot.db');
  const uploads = path.join(root, 'live', 'uploads');
  const backups = path.join(root, 'backups');
  const env = { ...process.env, DATABASE_URL: `file:${database.replaceAll('\\', '/')}`, UPLOADS_DIR: uploads };
  const run = (operation, destination, offline = true) => spawnSync(process.execPath, ['scripts/storage.js', operation, destination, ...(offline ? ['--offline'] : [])], { cwd: SERVER_DIR, env, encoding: 'utf8' });
  try {
    await mkdir(path.join(uploads, 'public'), { recursive: true });
    await mkdir(path.join(uploads, 'private'), { recursive: true });
    const db = new DatabaseSync(database);
    try {
      db.exec('PRAGMA journal_mode=WAL; CREATE TABLE recovery (id INTEGER PRIMARY KEY, content TEXT);');
      db.prepare('INSERT INTO recovery (content) VALUES (?)').run('persistent pilot data');
      await writeFile(path.join(uploads, 'public', 'photo.png'), 'photo bytes');
      await writeFile(path.join(uploads, 'private', 'license.pdf'), 'private document bytes');
      await writeFile(path.join(uploads, 'private', 'license.pdf.json'), '{"ownerId":42}');
      assert.notEqual(run('backup', backups, false).status, 0);
      assert.notEqual(run('backup', path.join(uploads, 'backup')).status, 0);
      // An open, idle WAL connection verifies that the snapshot includes committed WAL rows.
      const backup = run('backup', backups);
      assert.equal(backup.status, 0, backup.stderr);
    } finally { db.close(); }
    const snapshot = path.join(backups, (await readdir(backups))[0]);
    assert.notEqual(run('restore', snapshot).status, 0, 'must refuse existing live data');
    await rm(path.join(root, 'live'), { recursive: true });
    const restored = run('restore', snapshot);
    assert.equal(restored.status, 0, restored.stderr);
    const recovered = new DatabaseSync(database, { readOnly: true });
    try { assert.equal(recovered.prepare('SELECT content FROM recovery').get().content, 'persistent pilot data'); }
    finally { recovered.close(); }
    assert.equal(await readFile(path.join(uploads, 'public', 'photo.png'), 'utf8'), 'photo bytes');
    assert.equal(await readFile(path.join(uploads, 'private', 'license.pdf'), 'utf8'), 'private document bytes');
    assert.deepEqual(JSON.parse(await readFile(path.join(uploads, 'private', 'license.pdf.json'), 'utf8')), { ownerId: 42 });
    await rm(path.join(root, 'live'), { recursive: true });
    await writeFile(path.join(snapshot, 'uploads', 'public', 'photo.png'), 'corrupt');
    const corrupt = run('restore', snapshot);
    assert.notEqual(corrupt.status, 0);
    assert.match(corrupt.stderr, /checksum validation failed/);
    assert.equal((await readdir(root)).includes('live'), false, 'validation must precede live writes');
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('storage paths match Prisma resolution and startup warns about suspect locations', () => {
  assert.equal(storagePaths({ DATABASE_URL: 'file:./dev.db' }).database, path.join(SERVER_DIR, 'prisma', 'dev.db'));
  const warnings = [];
  warnStorage({ DATABASE_URL: 'file:./dev.db', UPLOADS_DIR: path.join(tmpdir(), 'uploads') }, (message) => warnings.push(message));
  assert.equal(warnings.length, 2);
  assert.ok(warnings.every((message) => message.includes('[STORAGE WARNING]') && message.includes('durable')));
  assert.throws(() => storagePaths({ DATABASE_URL: 'file::memory:' }), /SQLite file/);
});
