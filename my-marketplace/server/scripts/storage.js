import 'dotenv/config';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { mkdir, cp, readdir, readFile, writeFile, lstat, access, rename, rm } from 'node:fs/promises';
import { storagePaths, within } from '../src/lib/storage.js';

async function inventory(root, prefix = '') {
  const result = {};
  for (const entry of await readdir(path.join(root, prefix), { withFileTypes: true })) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    const location = path.join(root, name);
    if ((await lstat(location)).isSymbolicLink()) throw new Error(`Symbolic links are not supported: ${name}`);
    if (entry.isDirectory()) Object.assign(result, await inventory(root, name));
    else if (entry.isFile()) result[name] = createHash('sha256').update(await readFile(location)).digest('hex');
    else throw new Error(`Unsupported file: ${name}`);
  }
  return result;
}

async function absent(location) {
  try { await access(location); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
  throw new Error(`Refusing to overwrite ${location}. Move existing live data aside first.`);
}

function checkDatabase(filename) {
  const db = new DatabaseSync(filename, { readOnly: true });
  try {
    if (db.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') throw new Error('SQLite integrity check failed');
  } finally { db.close(); }
}

async function main() {
  const [operation, destination, acknowledgement, ...extra] = process.argv.slice(2);
  if (!['backup', 'restore'].includes(operation) || !destination || acknowledgement !== '--offline' || extra.length) {
    throw new Error('Usage: npm run backup -- <backup-root> --offline OR npm run restore -- <snapshot-folder> --offline. Stop the API and ALL other database/upload writers first.');
  }
  const live = storagePaths();
  const target = path.resolve(destination);
  for (const location of Object.values(live)) {
    if (within(location, target) || within(target, location)) throw new Error('Backup storage must be separate from live database and uploads paths.');
  }
  if (operation === 'backup') {
    await access(live.database);
    await inventory(live.uploads);
    await mkdir(target, { recursive: true, mode: 0o700 });
    const snapshot = path.join(target, `${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}`);
    const staging = `${snapshot}.partial`;
    await mkdir(staging, { mode: 0o700 });
    try {
      const db = new DatabaseSync(live.database, { readOnly: true });
      try { db.exec(`VACUUM INTO '${path.join(staging, 'database.sqlite').replaceAll("'", "''")}'`); }
      finally { db.close(); }
      checkDatabase(path.join(staging, 'database.sqlite'));
      await cp(live.uploads, path.join(staging, 'uploads'), { recursive: true });
      const files = await inventory(staging);
      await writeFile(path.join(staging, 'manifest.json'), JSON.stringify({ version: 1, createdAt: new Date().toISOString(), files }, null, 2), { mode: 0o600 });
      await rename(staging, snapshot);
      console.log(`Backup complete: ${snapshot}`);
    } catch (error) { await rm(staging, { recursive: true, force: true }); throw error; }
  } else {
    const manifest = JSON.parse(await readFile(path.join(target, 'manifest.json'), 'utf8'));
    const files = await inventory(target);
    delete files['manifest.json'];
    if (manifest.version !== 1 || !manifest.files || JSON.stringify(Object.entries(files).sort()) !== JSON.stringify(Object.entries(manifest.files).sort())) throw new Error('Backup manifest/checksum validation failed');
    checkDatabase(path.join(target, 'database.sqlite'));
    if (!(await lstat(path.join(target, 'uploads'))).isDirectory()) throw new Error('Backup uploads directory is missing');
    for (const location of [live.database, `${live.database}-wal`, `${live.database}-shm`, `${live.database}-journal`, live.uploads]) await absent(location);
    await mkdir(path.dirname(live.database), { recursive: true });
    await mkdir(path.dirname(live.uploads), { recursive: true });
    await cp(path.join(target, 'uploads'), live.uploads, { recursive: true, errorOnExist: true, force: false });
    await cp(path.join(target, 'database.sqlite'), live.database, { errorOnExist: true, force: false });
    console.log(`Restore complete: ${live.database} and ${live.uploads}`);
  }
}

main().catch((error) => { console.error(`Storage operation failed: ${error.message}`); process.exitCode = 1; });
