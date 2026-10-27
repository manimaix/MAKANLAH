# Merchant operations review

Reviewed: 27 October 2026. This is an ordinary correction within the existing Makanlah identity. **Final finish verdict: ship**, bounded to this operational correction and the supplied source, captures and runtime evidence. This report does not replace the design system.

## Implemented patterns

- The merchant shell opens task screens directly: Orders, Kitchen, Menu, Tables, Sales and Settings. A compact business/status bar and left navigation replace the earlier promotional composition. Desktop order lanes scroll independently. Phones start with list view; served and cancelled filters also use list view.
- Menu rows put the photograph, name, description, price, availability and edit action together. Category and search controls filter actual menu records. Table controls open a QR drawer with the generated code, customer link and editable table details.
- Order actions follow New → Accepted → Preparing → Ready → Served. Tickets retain options, extras, notes and totals. Counter payment is a separate record. Sales distinguishes served order value from recorded payment and provides date filters, history and CSV export.
- Sign-in uses email and password. Personal/business choices appear during account creation. The sampled account and workspace paths contain no sample-role sign-in shortcuts or sample-ticket creation controls. QR links use the current website origin; the merchant has no developer destination field.
- The guest order drawer states "No items in the order" and "Select a menu item." The menu's View order dock is disabled at zero items. Submission guards check item count, availability and ordering status before calling the order API; changed-price errors require review and resubmission. The private receipt shows fulfilment and payment states.

These are surface patterns, not new global tokens. Source wiring supports API mutations, navigation, filtering, clipboard, authenticated attachments and print requests. Native file-save and print completion remain outside the verified browser scope.

## Language and visual continuity

`INTERFACE-LANGUAGE.md` supplies the ASD-STE100-guided project rules: short complete help/error sentences, one instruction per sentence, imperative actions and consistent object names. Business, customer, menu item, option, extra and QR code have defined meanings. Functional state labels replace promotional headings. Short control labels remain noun phrases. This is guidance, with no formal dictionary certification claimed.

`src/styles.css` retains cream `#FEF3E2`, gold `#F4AE52`, orange `#D4621A` and brown `#2A1A0E`. `src/main.tsx` retains the self-hosted Bricolage Grotesque and DM Sans variable fonts. Merchant headings use the existing display family; details and controls use the body family. Compact titles, restrained outlines, warm tonal surfaces and rounded food thumbnails preserve the incumbent character. Existing media supplies the food images; QR artwork is generated from table links in brown and cream.

## Evidence checked

Read `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `docs/MERCHANT-SURFACE.md`, `docs/INTERFACE-LANGUAGE.md` and `docs/VERIFICATION.md`. Source sampling covered `src/pages/MerchantWorkspace.tsx`, `src/merchant.css`, `src/pages/Account.tsx`, `src/components/Layout.tsx`, `src/pages/QRMenu.tsx`, `src/pages/Order.tsx`, `src/components/merchant/TableQR.tsx` and `src/components/merchant/OrderTicket.tsx`, plus global token/font declarations.

Saved captures under `.impeccable/review/operations/` were inspected without opening a browser:

| Captures | Evidence |
| --- | --- |
| `desktop-orders.jpg`, `desktop-sales.jpg` | Compact navigation, live empty queues, filters, history and zero totals after sample exclusion. |
| `desktop-menu.jpg`, `user-970-menu.jpg`, `phone-menu.jpg` | The same menu hierarchy at 1440px, 970px and 390px; mobile actions wrap below item details. |
| `desktop-qr.jpg` | Table-specific QR artwork, download/print actions, customer link and table editor. |
| `phone-sign-in.jpg`, `phone-empty-order.jpg` | Direct account form and explicit empty-order instructions. |
| `phone-served.jpg` | Historical real QA ticket: Regular, Extra egg, note, RM13.50, Served and Paid. It does not represent a record left in the working queue. |

The builder's recorded checks report a passing production build and **27 API integration tests**, including authenticated CSV/PNG content and ownership. Real browser checks covered normal sign-in, menu/table save-reopen-restore, and the full RM13.50 guest order through service and counter-payment recording. The customer receipt reached **Order served** and **Payment received**. The documenter did not rerun those checks.

The builder's known QA records were backed up and marked `sample: true`; no record was deleted. Current source excludes samples before deriving queues and sales. Earlier verification milestones and captures remain historical evidence. The fresh reviewer requested menu-item vocabulary consistency and QA cleanup; both were corrected and the final build passed. Its full re-review accepted all 19 required captures, confirmed both fixes resolved and returned **ship** with no material fixes. It checked the settled phone menu, consistent menu-item counts/empty-order text, and current Sales with zero orders and RM0.00 after QA cleanup. Native file-save and print dialogs remain unconfirmed.

## Retained drift and preservation

The detector ran once for this correction: **0 primary findings, 663 advisories**. Its old/new CSS size, corner and tonal-colour literals exceed the limited incumbent machine-readable catalogue. These advisories are retained as documentation coverage gaps. They were not repaired, suppressed or canonized into new system rules. Historical test counts in the design documents remain unchanged.

Only this report was written by this documentation pass. `DESIGN.md` and `.impeccable/design.json` remain byte-for-byte unchanged, verified by SHA-256:

- `DESIGN.md`: `E6C0F6065DB100BA5E44F264B096D7396993E854AC265D1658FA42FC35505606`
- `.impeccable/design.json`: `53510A878BBE033C8F196C7ECD46230738160C6B40D8EF16A0EBA7455EE21573`

The confirmed delivery remains local SQLite/filesystem storage with configurable remote adapters and pay at counter. Remote providers, card charging, POS hardware and cloud deployment are not established by this review.
