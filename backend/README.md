# Makanlah backend

This folder is a standalone Node.js/Express API. It has its own package manifest, lockfile, runtime, shared helpers, receipt assets, scripts and tests. It can be deployed with backend/ as the service root. PostgreSQL is required in development, tests and production.

## Local setup

Install PostgreSQL binaries, then run these commands from backend/:

```sh
npm ci
npm run db:setup
npm run dev
```

db:setup creates a dedicated local instance, an application database and a limited application login. It saves generated credentials in the ignored backend/.env. It does not replace credentials on the system PostgreSQL service. On Windows the database files live under %LOCALAPPDATA%/Makanlah/PostgreSQL-17, outside OneDrive. The default local port is 5433; setup selects the next free port if needed. POSTGRES_BIN can specify an installed PostgreSQL bin folder.

For an existing PostgreSQL service, create the application database and set DATABASE_URL in backend/.env instead of running db:setup. Keep LOCAL_PG_MANAGED=false. Copy .env.example for the other settings. Do not commit .env.

From the repository root, npm run dev starts this API and the frontend together. npm run dev:backend starts only the API; npm run dev:frontend starts only Vite.

## Import the previous local database

Stop the API before importing. From backend/ run:

```sh
npm run migrate:sqlite
```

The default source is the original ../var/makanlah.sqlite. Use -- --source /path/to/file.sqlite for a different source. The importer reads SQLite only for this one-time operation, backs up the state privately, copies and verifies uploads, retains existing sessions/password hashes, verifies the PostgreSQL result, and refuses a nonempty destination. The original source files remain intact.

## Deployment

Service root: backend/. Install: npm ci --omit=dev. Start: npm start. No frontend build is required by the API.

Set NODE_ENV=production, DEMO_MODE=false, HOST=0.0.0.0 when the host requires it, APP_ORIGIN to the frontend HTTPS origin, and DATABASE_URL to PostgreSQL. Set DATA_DIR to durable storage for uploads, or MEDIA_DRIVER=s3 with bucket settings. The host can supply PORT.

A Dockerfile is included. Build from this folder with docker build -t makanlah-backend . and pass production settings at runtime. The image excludes local .env, database files and tests. Docker image execution was not tested on this Windows machine.

Deploy the frontend separately from the repository root: npm ci, npm run build, publish dist/. For separate frontend/API hosts, build with VITE_API_URL=https://api.your-domain.com. Use HTTPS subdomains of the same parent domain for the existing session cookies, or put /api and /fonts behind a reverse proxy on the frontend domain.

GET /api/health checks the live database connection. Receipt font files are served by this backend at /fonts.

## Maintenance

- npm test runs API, upload, order, cashier, migration and transaction tests in random isolated PostgreSQL schemas. TEST_DATABASE_URL can point at a separate test database. Cleanup drops only each generated test schema.
- npm run backup exports application state and local uploads to the ignored var/backups folder. Protect these private backups.
- npm run create-admin uses ADMIN_EMAIL, ADMIN_PASSWORD and optional ADMIN_NAME from the environment.
- npm run db:start, db:status and db:stop manage only this project's dedicated local instance.
- npm run migrate:online -- --copy-media copies local PostgreSQL records and files to a different empty TARGET_DATABASE_URL and configured S3 bucket. It revokes copied sessions and preserves source data.

Application state currently occupies one transactionally locked JSONB row in public.makanlah_state. This change switches the engine and deployment structure; it does not normalize every collection into relational tables.

The receipt fonts are copies of the project's OFL-licensed DM Sans and Bricolage Grotesque files; see public/licenses/. Test image/video fixtures reuse the project's credited food assets, documented in tests/fixtures/README.md.

Implementation references: [PostgreSQL initdb](https://www.postgresql.org/docs/17/app-initdb.html), [PostgreSQL connection settings](https://www.postgresql.org/docs/17/runtime-config-connection.html), [node-postgres pooling](https://node-postgres.com/apis/pool).
