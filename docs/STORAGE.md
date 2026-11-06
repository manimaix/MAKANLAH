# Storage and deployment

## Project structure

The repository root contains the React/Vite frontend. backend/ contains an independently installable Express API, package.json and package-lock.json, runtime sources, shared pure helpers, receipt assets, scripts and PostgreSQL tests. The API does not require the frontend's dist/ directory. See ../backend/README.md for commands.

## Database

PostgreSQL is required locally and in production. DATABASE_URL, DATABASE_SCHEMA and DATABASE_POOL_SIZE belong in backend/.env or the deployment environment. Runtime configuration rejects SQLite.

backend/src/store.mjs implements read, transact, ping and close. The state remains one JSONB document in makanlah_state. Mutations use a single pooled client, BEGIN, SELECT FOR UPDATE, UPDATE and COMMIT; failures roll back before releasing that client. Separate API processes therefore share the same locking boundary. This prototype retains document storage; it does not claim the indexed relational design needed for a large rollout.

Tests use random schemas and do not reset the application's public schema. TEST_DATABASE_URL can isolate tests in a separate database. Only each generated test schema is dropped after its test file.

## Local PostgreSQL

npm --prefix backend run db:setup creates a dedicated native instance using installed PostgreSQL binaries. On Windows its files are under %LOCALAPPDATA%/Makanlah/PostgreSQL-17 rather than the OneDrive project folder. It listens on loopback, uses generated SCRAM passwords, and provides a limited application login for database makanlah. Connection settings remain private in backend/.env. The existing system PostgreSQL service is not changed.

The default port is 5433, with the next available port selected if needed. npm run dev starts the managed instance before the API. db:start, db:status and db:stop act only on that dedicated instance. For a separately managed PostgreSQL service, configure DATABASE_URL and LOCAL_PG_MANAGED=false.

## Data migration and backups

npm --prefix backend run migrate:sqlite reads the original var/makanlah.sqlite from the repository root, including committed WAL data. It backs up the snapshot under backend/var/backups, copies uploads into backend/var/uploads without overwriting different files, imports all records and existing sessions, and verifies the result. It refuses to overwrite nonempty PostgreSQL state. SQLite is retained only as a preserved source/backup and an import dependency, never as the active store.

npm --prefix backend run backup exports PostgreSQL application records and local uploads. The snapshot contains private account/session records and must stay out of Git and public hosting. Use provider backups and bucket versioning when deploying remotely.

npm --prefix backend run migrate:online -- --copy-media reads current PostgreSQL data and local files, writes an empty TARGET_DATABASE_URL plus S3 bucket, verifies state, revokes copied sessions and preserves source records. Both API instances must be stopped. Remote PostgreSQL/S3 providers have not been exercised with real credentials.

## Uploads and frontend access

backend/src/media.mjs keeps local filesystem and private S3-compatible adapters, including video byte ranges. DATA_DIR is resolved relative to backend/, regardless of the shell working directory. Media URLs retain /api/media/<id>; records did not need URL rewrites.

Frontend VITE_API_URL is optional at build time. Local Vite proxies /api, /uploads and receipt fonts to port 3001. For deployment use a same-domain reverse proxy, or HTTPS frontend/API subdomains under the same parent domain and an exact backend APP_ORIGIN. Cookie sessions use SameSite=Lax; unrelated frontend/API sites are not supported.

## Production

Deploy backend/ with npm ci --omit=dev and npm start, or its Dockerfile. Configure NODE_ENV=production, DEMO_MODE=false, the host's PORT, HOST=0.0.0.0 if required, the frontend APP_ORIGIN, DATABASE_URL, and durable DATA_DIR or S3 credentials. Keep .env and provider secrets outside Git.

Deploy the frontend from the repository root using npm ci and npm run build, publishing dist/. Configure VITE_API_URL at build time for a separate API. GitHub Pages remains a labelled browsing preview and does not host the backend/database.
