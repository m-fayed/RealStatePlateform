import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

export const SERVER_DIR = fileURLToPath(new URL('../../', import.meta.url));
export function storagePaths(env = process.env) {
  const url = env.DATABASE_URL;
  if (!url?.startsWith('file:') || url.includes('?') || url.includes(':memory:')) {
    throw new Error('DATABASE_URL must name a SQLite file (file:<path>, without query parameters).');
  }
  return {
    database: path.resolve(SERVER_DIR, 'prisma', url.slice(5)),
    uploads: path.resolve(env.UPLOADS_DIR || path.join(SERVER_DIR, 'uploads')),
  };
}

export function within(parent, child) {
  const relative = path.relative(parent, child);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

export function warnStorage(env = process.env, warn = console.warn) {
  try {
    for (const [kind, location] of Object.entries(storagePaths(env))) {
      if (within(SERVER_DIR, location) || within(tmpdir(), location) || /(^|[/\\])(tmp|temp|var[/\\]tmp|run|cache|\.cache)([/\\]|$)/i.test(location)) {
        warn(`[STORAGE WARNING] ${kind}: ${location} looks ephemeral or checkout-local. Configure DATABASE_URL and UPLOADS_DIR on durable mounted storage; redeploys may erase data. Back up both to separate durable storage.`);
      }
    }
  } catch (error) { warn(`[STORAGE WARNING] ${error.message}`); }
}
