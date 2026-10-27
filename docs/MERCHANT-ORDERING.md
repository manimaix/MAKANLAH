# Merchant QR ordering

Mode: Operate. Preserve the existing Makanlah palette, fonts, warm surfaces and food photography. This is an extension of the approved website, built directly after the user deferred the blocked Figma step.

## Daily workflow

The dedicated `/merchant` workspace opens on live orders. A store selector scopes orders, menu, QR tables and sales to the merchant's own food place. The sidebar provides live orders, a focused kitchen view, menu management, tables/QR, sales/history and ordering settings. Orders poll every seven seconds while the page is visible; sound alerts are opt-in.

Orders move through New → Accepted → Preparing → Ready → Served. The merchant can inspect the full ticket, see options and kitchen notes, cancel an early-stage order, and record an offline counter payment. Recording a payment does not charge a card or transfer money. Phones start in list view. Served and cancelled status filters also use list view.

Menu items support photos, categories, availability, one-choice variants and optional extras. Prices are calculated on the server from the selected menu records; client-supplied prices are ignored. Batch table creation skips duplicate names, uses unique tokens, and allows table name, seats and area edits. QR codes can be previewed, copied, downloaded or printed as table cards.

The guest menu at `/order/<table-token>` has a restaurant/table header, search, categories, dish selection, per-item options/notes, a persistent per-table session cart, and a receipt with order progress. No account is required. Pausing orders leaves the menu browsable and the server rejects new orders until resumed. Checkout sends the displayed unit prices and total for comparison only; current server prices remain authoritative. A mismatch creates no order, refreshes the menu summary and asks the guest to review and resubmit.

The working interface has no sample-ticket creation action. Sample records are excluded from queues and sales. The internal sample endpoint remains available only in local demo mode for automated tests.

Table occupancy is separate from food preparation and QR availability. A valid table order marks the table occupied. Staff can also select **Seat guests** before an order exists. Serving food or recording payment does not release the table. Select **Clear table** after guests leave. Unfinished or unpaid orders block clearing. Pausing a QR code does not change occupancy. New seating starts a separate service record so earlier paid orders do not enter the next party's table total. Existing real orders remain associated with their table until its first explicit clear; labelled examples do not occupy tables.

QR codes use the current website address. CSV exports and QR PNG downloads are authenticated file responses with ownership checks. Print actions wait for QR images to load. Local phone access requires the same server to be available to the phone; deployment and network setup belong in the developer configuration, not the merchant interface.

## Reference patterns

These informed the workflow; the interface and assets remain Makanlah's:

- [Lightspeed: How customers use Order Anywhere](https://resto-support.lightspeedhq.com/hc/en-us/articles/4411456554267-How-customers-use-Order-Anywhere): table-specific QR entry to the mobile menu and ordering flow.
- [Lightspeed: Creating service profiles](https://k-series-support.lightspeedhq.com/hc/en-us/articles/1260803546769-Creating-Order-Anywhere-service-profiles): separate merchant configuration for QR ordering; online payment requires a configured processor.
- [Lightspeed: Order Anywhere workflow](https://www.lightspeedhq.com/uk/blog/lightspeed-order-anywhere/): menu modifiers and orders routed to the kitchen.

## Delivery boundary

Local records and uploads use the existing SQLite/filesystem adapters. PostgreSQL/S3 destinations remain configurable. Counter payment is the active checkout method; no POS hardware or online payment processor has been connected.
