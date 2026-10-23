/**
 * Optional external health-check bot for Tsukyo.
 * Run this OUTSIDE the backend process (for example, on an always-on runner).
 * It pings the public health endpoint every 4 minutes.
 *
 * Usage:
 *   TSUKYO_API_URL=https://your-public-domain.example node keepalive.mjs
 *
 * This script does not itself host the API and cannot wake a sleeping service
 * if it runs inside that same sleeping service.
 */
const baseUrl = (process.env.TSUKYO_API_URL || '').replace(/\/+$/, '');
const intervalMs = 4 * 60 * 1000;

if (!baseUrl) {
  console.error('Missing TSUKYO_API_URL. Set it to your deployed backend base URL.');
  process.exit(1);
}

const healthUrl = `${baseUrl}/api/health`;
let stopping = false;

async function ping() {
  const started = Date.now();
  try {
    const response = await fetch(healthUrl, { signal: AbortSignal.timeout(15000) });
    const body = await response.text();
    console.log(`[${new Date().toISOString()}] ${response.status} ${healthUrl} (${Date.now() - started}ms) ${body.slice(0, 180)}`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Health check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function main() {
  console.log(`Tsukyo health-check bot started; target=${healthUrl}; interval=4 minutes`);
  await ping();
  while (!stopping) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));
    if (!stopping) await ping();
  }
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    stopping = true;
    console.log(`Received ${signal}; stopping after current wait.`);
  });
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
