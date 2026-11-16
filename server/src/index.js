import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});
