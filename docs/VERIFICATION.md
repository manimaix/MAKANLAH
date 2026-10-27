# Verification

## Automated

`npm test`: 27 API integration tests passed against a temporary, real SQLite database and filesystem. They cover discovery/distance, public author privacy, role boundaries, privilege escalation, registration, origin checks, upload signatures, draft and media privacy, MP4 uploads and byte ranges, post edits/publication, concurrent likes, comments, saves, preferences, reviews, listing approvals, moderation, suspended sessions, logout and persistence after reopening the store. Merchant checks cover menu and QR persistence, server-enforced order totals, idempotency, private receipts, fulfilment transitions, unavailable items, ordering controls, table uniqueness and ownership, stable table identity after renaming, required options/extras, changed-price review, distinct customised lines, counter-payment records and labelled sample tickets. Export checks cover CSV content, formula escaping, date filters, sample exclusion, real PNG data, origin validation and ownership. The full suite was rerun after the download endpoints were corrected.

`npm run build`: TypeScript and the Vite production build passed. Checks are rerun after functional fixes. Cloud PostgreSQL and S3 paths were not exercised against a real remote provider.

## Browser

At 1440×1000 and 390×844, checked the public pages and role workspaces for document overflow. Local browser flows exercised:

1. Sign in as user; upload a real JPG; publish, like, save, comment and reload. The post and interaction state persisted.
2. Upload a playable MP4 through the actual file input. The feed reached readyState 4, played muted, and paused after scrolling to the next item. The included sample clip is a labelled photo motion preview.
3. Grant test geolocation at Kuala Lumpur; **Use my location** updated the source and rendered seven nearby pins. OpenStreetMap tile requests loaded real 256px tiles.
4. Place a table order with a nasi lemak and teh ais (RM15.50); sign in as merchant; accept, prepare and mark ready; reload the private customer receipt and confirm the ready state.
5. Open merchant QR controls and verify generated table QR images at desktop/mobile sizes; visit the admin workspace in both sizes.

The temporary QA posts were removed after testing. The local sample order remains in the merchant queue as a useful fulfilment example. Precise browser test coordinates are not persisted by the application.

## Visual evidence

The saved Figma capture and source construction scripts define the visual target. Live Figma API access remained limited by the Starter-plan quota. The website's desktop and mobile captures are in `.impeccable/review/` (ignored from Git). Impeccable's detector ran once; observed advisories concerned the earlier design document's incomplete type ramp and semantic tonal colors. Those require documentation of the implemented system, not changing the supplied brand palette.

A fresh finish reviewer inspected all 34 supplied captures and sampled source. Its two P2 findings (mobile Home spacing and added Merchant/Admin eyebrow rows) were corrected and recaptured. The verdict pass scored both resolved and returned `ship` for those fixes, with no visible regressions in the changed regions. This is a bounded visual verdict, not independent runtime or cloud-provider approval.

The local backup helper was also run successfully. The compiled website and a direct `/about` link both returned HTTP 200 from the Express server with compiled asset references.

## Merchant expansion, 27 October 2026

The QR order journey was exercised through the actual browser UI: edit a dish to offer Regular/Large and Extra egg; create five additional table QR codes; place a Large nasi lemak with Extra egg and an item note for RM16.50; inspect the incoming ticket; record counter payment; accept, prepare and mark ready; refresh the private receipt and confirm its ready/payment state and selected options. The local preview order remains for inspection. Service pause was verified on the guest menu, and a sold-out drink became unavailable to add. Ordering and drink availability were restored afterward.

Responsive captures cover 1440×1000, 390×844 and the user's 970×712 window. Mobile checkout uses a drawer, while the merchant board scrolls inside its own region and also offers list view. QR artwork and table links rendered. The automated QR-download event check timed out in the in-app browser; a completed file download and native print dialog are not claimed as verified.

The merchant-only static design detector completed once with zero primary findings. Its 381 advisories concern the incumbent design document's incomplete type/radius/tonal-color coverage; the report is saved at `.impeccable/review/merchant-detector.json`. No new stock imagery or generated artwork was added.

The final browser correction checks verified mobile navigation focus wrapping, Escape dismissal and return focus, inert closed navigation/background, named native dialogs, and the full dish action visible both before and after scrolling (footer bottom844px at844px viewport;820px after the note field scroll). A real UI price-change check changed the menu after the cart loaded: checkout stayed on the menu, updated RM16.50 to RM17.50 and asked for review/resubmission. The menu price was restored and the draft cart cleared afterward.

A fresh merchant finish reviewer inspected all17 supplied merchant captures and the relevant source. It requested four P2 fixes: mobile navigation focus, the clipped dish-picker footer, accessible drawer names and changed-price review. After correction, its verdict pass independently checked changed source and eight updated captures, scored all four resolved and returned `ship` at that fix-list scope. Runtime and automated test evidence remain builder-supplied; the verdict does not certify cloud deployment or untested hardware integrations.

## Merchant operational correction, 27 October 2026

The user rejected the earlier merchant layout as a landing page. The revised workspace uses compact Orders, Kitchen, Menu, Tables, Sales and Settings screens. Marketing headings, sample role sign-in buttons, sample-order creation and the developer QR destination field were removed. Account access still uses email/password sessions and server permissions. Interface instructions follow the short-sentence and single-instruction guidance in ASD-STE100 Issue 9. No formal dictionary certification is claimed.

Real browser checks covered normal sign-in; menu description save/reopen/restore; table seats save/reopen/restore; loaded QR artwork and table links; a guest order with Regular, Extra egg, an item note and a trusted RM13.50 total; and merchant acceptance, preparation, readiness, payment recording and service. The private customer receipt reached Order served and Payment received. Served history and sales matched the order. Phones default to list view. Selecting a terminal status also opens the list so completed records remain visible.

Current captures in `.impeccable/review/operations/` cover 1440×1000, 390×844 and 970×712. The static detector ran once for this correction over the changed UI files: zero primary findings and 663 advisories about the incumbent design document's incomplete type, radius and tonal-colour coverage. DESIGN.md and its sidecar were preserved. CSV and QR responses are authenticated attachments with integration tests for content and access. The in-app browser's download-event check stalled; native file-save and print dialogs remain outside the confirmed browser checks.

The builder's known QA orders are retained as sample records, excluded from merchant queues and sales totals. Original records are backed up privately under `var/backups/`. No user order was removed. Earlier sections describe historical tests; their preview tickets no longer populate the working queue.

A fresh finish review examined the operational correction against the user's rejection, the current direction contract, source and 19 valid captures. It returned `ship` after menu-item terminology was made consistent and QA cleanup was confirmed by the zero-order sales view. This is the final full review of the correction, not a claim that native save/print dialogs or cloud services were tested. See `MERCHANT-OPERATIONS-REVIEW.md` for the system comparison.
