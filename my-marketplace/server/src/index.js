import 'dotenv/config';
import app from './app.js';
import process from 'node:process';
import { validateStartupConfig } from './lib/security.js';
import { initializeUploads, cleanupOrphanUploads } from './lib/uploads.js';

validateStartupConfig();
await initializeUploads();
await cleanupOrphanUploads();
let cleaning = false;
setInterval(async () => {
  if (cleaning) return;
  cleaning = true;
  try { await cleanupOrphanUploads(); }
  catch (error) { console.error('Upload cleanup failed:', error.message); }
  finally { cleaning = false; }
}, 60 * 60 * 1000).unref();

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
