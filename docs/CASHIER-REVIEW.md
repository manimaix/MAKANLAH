# Cashier review

Reviewed: 28 October 2026. Mode: Operate. Cashier extends the existing merchant workspace and design system. It is a merchant navigation page, not a fourth account role. The fresh full finish review accepted the nine required captures and requested one search fix. The verdict pass marked that fix **Resolved**, the remaining checks **Clear**, and returned **ship at the fix-list scope**. This record does not claim independent runtime certification.

## Implemented behavior

- Unpaid bills group real, non-cancelled orders by business, table and seating record. Staff can select whole orders for a partial bill. The server rejects a payment that mixes bills, uses changed totals or includes an already paid order. The ticket's **Accept payment** action opens the corresponding Cashier bill.
- Cash requires an amount that covers the selected total and shows change. **Card** and **Bank / QR** require confirmation from the external terminal or bank app; a reference is optional. **Record payment** saves a received payment. It does not charge a card, transfer money or create a payment QR code.
- The server ledger stores receipt numbers, business and order snapshots, method, cashier and time. Transaction, idempotency, ownership and duplicate-payment guards protect the write. Merchant history and receipt HTML are private; the download route returns an authenticated HTML attachment.
- **Reverse payment record** requires a reason and retains the original receipt and audit information. It returns linked orders to unpaid without overwriting a newer payment. Staff handle any money return separately. Payment and reversal leave food fulfilment and table occupancy separate.
- Both tabs trim search whitespace, ignore case and strip a leading `#`. Receipt search includes saved order IDs as well as receipt number, table, reference and customer name. Empty and nonmatching states provide direct instructions.

## System comparison

| Incumbent rule | Cashier evidence |
| --- | --- |
| Cream, gold, orange and brown | Global palette variables remain the source. Cashier uses warm field surfaces, subtle brown borders, a gold selected bill, brown selected methods and orange focus indication. |
| Bricolage Grotesque headings; DM Sans text and controls | The workspace inherits the installed variable families. Compact detail labels support prominent tabular money totals; amount inputs use 16px text. The private receipt uses copies of the same families. |
| Compact operational layout | Desktop places the bill queue beside the selected bill. At 1100px and above, orders and payment controls share the detail area; the order list can scroll. At 800px and below, the regions stack and the queue has its own scroll limit. |
| Warm outlined controls and restrained depth | Cashier panels use 12px corners and tonal separation. Existing merchant buttons, search, tabs and form controls carry their established treatments. Local method/status corner values remain surface details, not new global tokens. |
| Direct action and state language | **Unpaid bills**, **Cash received**, **Change**, **Record payment**, **Receipt** and **Reverse payment record** agree with `MERCHANT-ORDERING.md` and `INTERFACE-LANGUAGE.md`. Short help sentences follow the project's ASD-STE100 guidance; no formal language certification is claimed. |

These are implemented surface patterns. No new visual world, approved comp or global token catalogue was required.

## Evidence checked

The documentation pass read `PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `docs/CASHIER-SURFACE.md`, the merchant ordering and interface-language documents, and existing verification history. Source sampling covered `src/components/merchant/Cashier.tsx`, `src/cashier.css`, `src/pages/MerchantWorkspace.tsx`, global/merchant styles, `shared/cashier-bills.mjs`, `server/payments.mjs`, the payment routes in `server/app.mjs`, `tests/cashier.test.mjs`, the receipt-font copy script and asset credits. It did not open a browser or rerun tests, builds or the detector.

All saved images below were inspected under `.impeccable/review/cashier/`:

| Captures | Evidence |
| --- | --- |
| `desktop.jpg`, `mobile.jpg` | Merchant navigation, the Table 02 bill, selected orders and responsive layout. |
| `mobile-payment.jpg`, `mobile-transfer.jpg` | RM17.00 due, RM20.00 cash and RM3.00 change; external transfer confirmation and optional reference. These are intentionally scrolled payment views. |
| `desktop-receipt.jpg`, `printable-receipt.jpg` | Saved cash receipt and the actual private printable HTML page. |
| `desktop-reversed-payment.jpg`, `desktop-transfer-receipt.jpg`, `desktop-history.jpg` | Reversal reason, retained original amounts, confirmed transfer record and two historical receipts. |
| `desktop-search.jpg`, `mobile-search.jpg` | Targeted correction evidence: order queries `#07E25B` and `963128` each match the receipts containing those orders. |

CSS viewports were 1280×720 and 390×844. CUA presentation scaling produced 1265×712 desktop and 375×812 phone images where document scrollbars exist; this is disclosed presentation scaling, not a manual resize. The new search captures are 1280×720 and 390×844. The full reviewer accepted all nine required finish captures as valid. The separate search captures confirm the changed region.

The builder reports **42 passing tests**: 29 original API integration tests, eight cashier tests, one table compatibility check and four preview checks. Normal and Pages builds passed after the final search fix. Cashier tests cover grouping, received cash/change, external confirmation, ownership, trusted totals, duplicate and concurrent requests, private receipts/download responses, saved snapshots, reversal and repayment. Browser checks exercised order selection totals, short-cash blocking, cash save, persistence after reload, the actual printable page, reversal back to unpaid, a confirmed transfer with a reference, matching order-ID searches and a nonmatching empty state. Native print and file-save dialogs remain unverified.

## Data, assets and retained drift

The captures contain labelled QA entries, **Cashier check 1/2**, rather than actual customer payments. The builder archived exactly two own orders and two own payments as samples after privately backing up the originals at `var/backups/cashier-qa-9eb335ce-f882-4a53-aa30-6c3d39207f91.json`. Search checks briefly restored only the two own payment snapshots, then re-archived them; the orders stayed archived. The final browser accessibility state reported zero unpaid bills, zero receipts and zero new orders. Table 02 was restored free. Existing Tables 01/04 and customer records were untouched. These cleanup and runtime facts are builder-supplied evidence.

No new shipping raster was added. Receipt WOFF2 files reuse the installed OFL-licensed DM Sans and Bricolage Grotesque packages through `scripts/copy-receipt-fonts.mjs`; provenance and local licences are recorded in `public/ASSET-CREDITS.md`.

The scoped detector ran once and reported **0 primary findings and 34 advisories**: 32 font-size and two radius coverage advisories, retained in `.impeccable/review/cashier/detector.json`. This pass read that report without another scan. The incumbent machine-readable design catalogue does not cover every compact size/corner already used. That drift was neither repaired nor canonized into new rules. Historical verification counts in the design files remain historical.

Only this report and a dated addition to `VERIFICATION.md` were written by this documentation pass. SHA-256 confirms both incumbent design files remain byte-for-byte unchanged:

- `DESIGN.md`: `E6C0F6065DB100BA5E44F264B096D7396993E854AC265D1658FA42FC35505606`
- `.impeccable/design.json`: `53510A878BBE033C8F196C7ECD46230738160C6B40D8EF16A0EBA7455EE21573`

Cashier uses the full local server and durable ledger. The current public Pages preview excludes private workspaces. This evidence establishes no terminal, banking, refund or POS hardware integration, remote-provider test or production deployment.
