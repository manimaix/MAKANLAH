# Storage and online deployment

## Destination boundary

`server/store.mjs` exports `read`, `transact` and `close`. It supports SQLite and PostgreSQL. Every mutation runs inside a transaction; PostgreSQL locks its state row and local SQLite serializes mutations with `BEGIN IMMEDIATE`.

The first version deliberately stores the application state as one transactional document (`app_state` locally, `makanlah_state` online). This keeps local/online behavior identical and is suitable for this working prototype and small installations. It is **not** a claim of high-volume production scalability: split collections into indexed relational tables before a large public rollout. The API is independent of that repository implementation.

`server/media.mjs` exports `put`, `serve` and `remove`, backed by the filesystem or S3-compatible storage. Media records contain stable `/api/media/<id>` URLs. Serving checks post/listing visibility and draft ownership; S3 remains private. Both storage implementations support video byte-range requests. Replacing the destination does not change frontend components.

`VITE_API_URL` optionally changes the API base at build time. Prefer serving the web and API under one HTTPS origin for cookie sessions. If a separate API origin is used, configure `APP_ORIGIN` exactly and keep both hosts under the same site; this implementation uses SameSite=Lax cookies, so arbitrary cross-site deployments are intentionally unsupported.

## Migration

`npm run migrate:online -- --copy-media` reads the local SQLite directory from `DATA_DIR`, refuses to overwrite nonempty PostgreSQL state, copies local original files into the configured S3 bucket and imports the records atomically. It clears sessions so people sign in on the new host. Run with both servers stopped, retain a local backup, and use an empty bucket/database destination. Partial failed bucket copies can safely be retried with the same generated keys while the database is still empty.

If using online mode from the beginning, simply choose the destination variables. Source migration is unnecessary. To restore a local backup, stop the server, create a fresh local repository and load the backup's `state` object into `store.transact`, then restore its uploads folder. Keep a copy of the original before restoring.

## Deployment

Build with `npm run build`, then run `npm start` on a Node host with Node 22.13+ (24 recommended). Put a TLS reverse proxy in front of it. The Express server defaults to loopback; configure `HOST=0.0.0.0` only when your host requires it. Set `APP_ORIGIN` to the actual public origin, `DEMO_MODE=false`, `NODE_ENV=production`, and provider secrets outside Git. The built site needs a running API; static hosting alone cannot persist multi-user posts or handle uploads and orders.

Browser geolocation works on localhost or HTTPS. The app requests it only after a visitor chooses **Use my location**; permission denial, timeout and unsupported browsers offer manual city/map alternatives. Device coordinates are not saved to the database or localStorage. The map still requires a network connection to its tile service.

For local phone testing, expose the Vite server on your LAN (`npx vite --host 0.0.0.0`), set `APP_ORIGIN` to that LAN origin, and use the reachable origin in the merchant QR generator. Most browsers require HTTPS for device geolocation outside localhost. QR ordering itself works on a reachable HTTP LAN origin.

## Media compatibility and limits

Actual file signatures, not client filenames, determine stored extensions. SVG, HTML and executables are rejected. H.264 MP4 and WebM are the most reliable web video choices. MOV playback depends on the browser's codec support. Original uploads are retained; this version does not transcode, scan for malware, strip EXIF, create adaptive streaming renditions, or run a background media-processing service. Add those services before opening unrestricted public uploads. Limit request sizes at your proxy to match the configured 80 MB video limit.

## Before a public service

Provider integration and deployment require real credentials and hosting, which were not supplied. Email delivery/password recovery, payment processing, multi-venue enterprise analytics, push notifications and verified merchant/certification services are not configured. These are separate integrations, not controls pretending to work. Existing functionality runs with local accounts, local files, local order fulfilment and the three enforced roles.

OpenStreetMap's standard tile service is used for the local preview. Keep visible attribution and comply with its usage policy; for a busy public service, set `VITE_MAP_TILE_URL` and `VITE_MAP_ATTRIBUTION` to a suitable provider or your own tile server.
