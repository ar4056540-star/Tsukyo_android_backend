# VYBE

VYBE uses a custom Node.js/Express backend with server-side JSON persistence and private media storage.

## Development

1. Copy `.env.example` to `.env` and set a strong `SESSION_SECRET`.
2. Run `npm install` (or `bun install`).
3. Run `npm run dev`.

The web app and API are served together on port 3000.


## Media upload limit
The custom backend controls the maximum size of profile pictures, post/story media, reels, and message attachments with `TSUKYO_MAX_UPLOAD_MB` in the server environment. The default is 512 MB when the variable is omitted or invalid. Files above the configured server-side limit receive HTTP 413.


## Deployment configuration
See [DEPLOYMENT.md](DEPLOYMENT.md) for Docker/Render deployment steps. Set `SESSION_SECRET` in production and configure `DATA_DIR` to a persistent disk mount so JSON records and uploaded media survive restarts. The included `render.yaml` uses a paid Starter service and a 1 GB persistent disk; review current host pricing before deploying.
