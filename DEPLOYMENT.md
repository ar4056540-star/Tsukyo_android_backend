# Tsukyo backend deployment notes

This package includes the existing Express API plus deployment files for a Docker-based host such as Render.

## What was added
- `DATA_DIR` environment variable support so JSON records and uploaded media can live on a persistent mounted disk.
- `.env.example` documenting required production configuration.
- `Dockerfile` for a production build.
- `render.yaml` blueprint with `/api/health` health check, generated session secret, and a persistent disk.
- `.dockerignore` to avoid copying local data/secrets into the image.
- Removed unused ESM-only `import.meta.url` path setup from `server.ts` so the bundled CommonJS server entry does not evaluate it at startup.

## Deploy
1. Push this project folder to a GitHub repository.
2. In Render, create a new Blueprint and select that repository; review the service and persistent-disk cost before deploying. The configured `starter` service and disk may incur charges.
3. Wait for the service to become Live. Test `https://YOUR-SERVICE.onrender.com/api/health`; it should return JSON with `status: "ok"`.
4. Use that HTTPS base URL in the Android app's API configuration. Do not use `localhost` in the installed Android app.

## Important limitations
- This backend stores records in JSON files, not a managed database. A persistent disk protects them across restarts on the configured host, but it does not provide database transactions, multi-instance scaling, or automated backups.
- Password reset currently does not send email because no mail provider is configured. It returns a generic acknowledgement only.
- Review rate limiting, monitoring, backups, media retention, and production security before opening this to public users.
- The included Android folder is a separate legacy VYBE Android project; it is not the newer `com.tsukyo.app` Android project built in the Colab workflow. Backend deployment alone does not automatically connect the newer Tsukyo APK; its API base URL and request/response models must be integrated and tested separately.
