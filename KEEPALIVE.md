# Tsukyo health-check bot (every 4 minutes)

The backend already exposes `GET /api/health`. `keepalive.mjs` sends a request to that endpoint immediately and then every four minutes.

## Important
- This must run in a separate, externally running process. Putting the bot inside the same backend process will not wake a sleeping backend.
- Set `TSUKYO_API_URL` to the public HTTPS base URL after deployment, without a trailing slash.
- Keep-alive requests can increase usage and do not prevent platform maintenance/restarts. Check your hosting provider's current plan and terms before using frequent pings.

## Run

```bash
TSUKYO_API_URL=https://your-public-domain.example node keepalive.mjs
```

Node.js 18 or newer is recommended (built-in `fetch` required).
