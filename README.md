# Makanlah

A working local Malaysian food discovery and community website, developed by **Nextgen Tech**. React + TypeScript + Vite, Express, SQLite and local uploads. The cream, gold, burnt-orange and brown palette, Bricolage Grotesque and DM Sans typography, and public page compositions follow the saved Makanlah Figma design. New merchant and admin flows extend that design system.

**Public preview:** [manimaix.github.io/MAKANLAH](https://manimaix.github.io/MAKANLAH/). GitHub Pages publishes browsing pages from labelled examples. Accounts, uploads and ordering stay on the local server. See [preview deployment](docs/GITHUB-PAGES.md).

## Run locally

Requires Node.js **22.13+** (Node 24 recommended). From this directory:

```powershell
npm install
npm run dev
```

Open **http://127.0.0.1:5173**. The API runs on port 3001. No cloud account, API key, or `.env` file is needed for local mode. SQLite emits an experimental-feature notice on Node 22; that is expected.

### Local test accounts

Use the normal email and password form. For a new local database, set your own `DEMO_PASSWORD` in `.env` before the first start. Use at least 12 characters. These account names are available in demo mode:

| Role | Email |
|---|---|
| User | `user@makanlah.local` |
| Merchant | `merchant@makanlah.local` |
| Admin | `admin@makanlah.local` |

These accounts exist only with `DEMO_MODE=true`. No shared password is shipped. Without `DEMO_PASSWORD`, seed authors receive random credentials. Existing database passwords stay unchanged. Registration creates personal or business accounts. Admin access is assigned by an existing admin or the local admin script. The interface has no sample role sign-in buttons.

## Implemented

- Home recommendations, dish/place search, cuisine, price, dietary and opening-hours filters; saved taste preferences.
- Leaflet/OpenStreetMap with real tiles, price pins, manual cities, map-point selection and opt-in browser geolocation. Precise coordinates stay in memory for the current browser session.
- Vertical snap-scrolling food feed: image and video posts, muted autoplay, pause offscreen/in the background, play/pause, audio toggle, keyboard arrows, likes, comments, saves and sharing.
- Create and edit photo/video posts, multiple uploads, private drafts, paid-partnership labels, and owner deletion. Uploads are checked by their actual file signature; photos up to 12 MB, videos up to 80 MB, four files per post.
- Restaurant details, menus, reviews, location directions, saved places, saved posts, profile editor and food diaries.
- Dedicated merchant workspace with live order board/list, kitchen focus view, optional new-order sounds, menu photos/categories/variants/extras, availability, batch table creation, editable table details, QR preview/download/print, sales/history and CSV export.
- Compact merchant task screens with direct labels and short instructions. Phones start with the order list. Served and cancelled orders remain available in history. Sample tickets are excluded from the workspace and sales totals. CSV and QR downloads use authenticated file responses.
- Merchant registration and listing submissions, edit/review workflow, ordering pause/resume, preparation estimates, guest messages, and counter-payment records.
- Customer QR menus with search/categories, dish options and extras, per-item notes, per-table session carts, server-priced orders, private receipts, order status polling and signed-in order history. **Pay at counter** is the checkout method. See [merchant workflow and reference patterns](docs/MERCHANT-ORDERING.md).
- Admin listing approvals/unlisting, post moderation, user roles and suspension, reports, review removal and an activity log.
- Server permissions, ownership checks, HTTP-only sessions, scrypt password hashing, origin checks and sign-in throttling.

Sample restaurants, locations, ratings, prices and stories are labelled. The included five-second video is an explicitly labelled motion preview of the credited nasi lemak photo, not restaurant footage. Upload your own footage through **Share a bite**.

## Where data goes

```text
var/makanlah.sqlite       accounts, posts, comments, menus, orders, etc.
var/uploads/             image and video originals
public/assets/           credited sample photography and video
```

`var/`, `.env`, dependencies and builds are ignored by Git. Posts and uploaded files survive browser refreshes and server restarts. `npm run backup` creates a state export plus copies of local uploads in `var/backups/`. Backups contain account and private-post data; keep them private.

## Move online by configuration

Copy `.env.example` to `.env`. The UI always talks to one API; the server's database and upload adapters select destinations:

```dotenv
DATABASE_DRIVER=postgres
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
MEDIA_DRIVER=s3
S3_ENDPOINT=https://your-s3-compatible-endpoint
S3_REGION=auto
S3_BUCKET=makanlah
S3_ACCESS_KEY_ID=...
S3_SECRET_ACCESS_KEY=...
APP_ORIGIN=https://your-makanlah-domain
DEMO_MODE=false
NODE_ENV=production
```

Use an S3-compatible bucket such as S3, R2 or MinIO. Standard AWS S3 can omit `S3_ENDPOINT`. The bucket can stay private: the API serves authorized media, including byte-range requests for videos. No UI changes or rewritten post URLs are required. Changing destinations starts against that destination's records; it does **not** move existing files automatically.

To carry existing local data to an **empty** PostgreSQL database and S3 bucket, set the cloud connection values, stop both servers, back up locally, then run:

```powershell
npm run migrate:online -- --copy-media
```

The migration preserves the local source, copies the original media keys, and clears active sessions. Then set the two drivers and restart. Cloud adapters are implemented; they have not been tested against your provider because no cloud credentials were supplied. See [storage and deployment details](docs/STORAGE.md).

For a clean online launch, use a new empty database with `DEMO_MODE=false` and create your own admin with `ADMIN_EMAIL`, `ADMIN_NAME` and `ADMIN_PASSWORD` environment variables followed by `npm run create-admin`. Set a unique password of at least 12 characters. Disabling demo mode on a database that already contains demo accounts does not delete those accounts; use the clean database.

## Build and checks

```powershell
npm run build
npm test
npm start
```

`npm start` serves the compiled website and API together at **http://localhost:3001**. Set `APP_ORIGIN=http://localhost:3001` for that local serving mode. Keep `DEMO_MODE=true` for local sample accounts; production rejects demo mode.

All 31 checks pass: 27 API integration tests and four preview checks. They cover role/ownership enforcement, signup, upload validation, draft privacy, real MP4 byte-range playback, local persistence across restarts, comments, atomic likes, saved items, preferences, reviews, listing approvals, QR tables, trusted order totals, modifier validation, changed-price review, table renaming, pause controls, payment records, fulfilment transitions, CSV export and PNG downloads. Preview checks cover public data export, catalogue filters, connected details/video/comments and blocked mutations. Desktop/mobile browser checks covered local image/video posting, offscreen video pause, geolocation, map tiles, QR generation and customer/merchant order status updates. See [verification notes](docs/VERIFICATION.md) and [interface language rules](docs/INTERFACE-LANGUAGE.md).

## Design and attribution

[Original Figma file](https://www.figma.com/design/7L5g6fhIpqer5AFKRnocfY/MAKANLAH?node-id=5-2). The live connector hit its Starter-plan limit, so this build used saved construction sources, the actual food assets and browser captures. No new live pixel-comparison claim is made. [Photography credits](public/ASSET-CREDITS.md) are linked in the footer. The map credits OpenStreetMap contributors and uses on-demand tiles without offline prefetching.
