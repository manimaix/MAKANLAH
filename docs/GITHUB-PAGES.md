# GitHub Pages preview

Repository: [manimaix/MAKANLAH](https://github.com/manimaix/MAKANLAH).
Preview: [Makanlah](https://manimaix.github.io/MAKANLAH/).

The user selected a public preview with the server kept local. Pages serves the browsing website. It does not run the Express API, database or uploads. Accounts, merchant work and orders remain available in the local application.

The preview supports food search, price/cuisine/location filters, distance sorting, the OpenStreetMap view, location permission, restaurant details, public reviews, photo/video browsing, public comments and About Us. A notice states that accounts, uploads and ordering are not enabled. Sign-in shows an availability message instead of collecting credentials. Table-menu previews cannot accept orders.

`npm run build:pages` builds into `dist-pages/` with `/MAKANLAH/` as its base. It creates nested route entry files and a 404 fallback. The normal `npm run build` and `npm run dev` keep their root path and full server connection.

The preview catalogue comes only from labelled source examples in `server/seed.mjs`. Its export allows public author fields and excludes account emails, password hashes, sessions, preferences and order tracking hashes. It never reads `var/` or exports local posts, orders, uploads or customer information.

Pushing `main` runs `.github/workflows/deploy-pages.yml`: install dependencies, run tests, build the preview, upload its artifact and publish it to the GitHub Pages environment. GitHub Pages must use **GitHub Actions** as its publishing source. The workflow can also be started manually.

To host the full application later, deploy the Node.js server with persistent database/media storage and `DEMO_MODE=false`. Its own origin can serve the frontend and API together. See `STORAGE.md`; publishing the preview does not migrate data or provision a server.
