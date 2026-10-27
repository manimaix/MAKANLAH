# Merchant QR ordering design review

Reviewed: 27 October 2026. Visual-system comparison: **pass**.

The merchant workspace and guest ordering menu extend the established Makanlah world. They follow the approved direct-implementation direction in `MERCHANT-SURFACE.md` and `MERCHANT-ORDERING.md`, with Figma construction deferred. This is an Operate surface within the existing identity; it does not establish a replacement design system.

## Comparison with the incumbent system

| Area | Observed fit |
| --- | --- |
| Palette | Both surfaces inherit cream `#FEF3E2`, gold `#F4AE52`, orange `#D4621A` and brown `#2A1A0E` from `src/styles.css`. Merchant paper and soft surfaces match the incumbent field and soft colors. Local divider, occupied-table and service-status tones remain in the warm neutral and semantic-status families. Brown remains the main text and action color. |
| Typography | `src/main.tsx` retains the self-hosted Bricolage Grotesque and DM Sans imports. Merchant headings, ticket table names and guest dish headings use the established display family; controls and operational details use the body family. Smaller merchant titles and labels provide task density without changing the public heading scale. |
| Components and shapes | The implementation reuses the shared button, field, avatar, empty/error state and native-dialog drawer language. Cream fields, restrained brown outlines, rounded photographs and flat tonal containers remain recognisable. Scoped merchant controls use smaller heights and corners than public primary actions; these are compact surface variants. |
| Photography and assets | Merchant thumbnails, guest hero images and dish selection use existing place/menu media through `mediaUrl`. The sampled nasi photograph also appears in the incumbent public captures. Existing photography and font provenance remains in `public/ASSET-CREDITS.md`. No new authored shipping raster was introduced for this extension; table QR images are generated from their table URLs using the existing brown/cream palette. |
| Layout and motion | The desktop workspace uses fixed left navigation, a store/status bar and three order lanes. The 970px capture preserves that hierarchy at a denser width. At the merchant mobile breakpoint, navigation collapses and the board scrolls within its own region. The guest menu keeps photography and dish information prominent, with an adjacent desktop cart and a mobile drawer. The picker action remains sticky with safe-area padding; reduced-motion rules suppress transitions and image scaling. |

The source comparison covered `src/merchant.css`, `src/pages/MerchantWorkspace.tsx`, `src/pages/QRMenu.tsx`, all three components in `src/components/merchant/`, `src/components/ordering/DishPicker.tsx` and `src/components/ui.tsx`, against the global styles, `DESIGN.md` and its sidecar.

## Evidence checked

The supplied final captures were visually sampled without opening a browser:

| Capture in `.impeccable/review/` | Evidence |
| --- | --- |
| `merchant-desktop.jpg` | Live-order hierarchy, three lanes, ticket details and next actions. |
| `merchant-desktop-tables.jpg` | Table grid, occupied state, QR actions and shared form treatment. |
| `merchant-desktop-guest.jpg` | Existing food imagery, restaurant/table context, menu and desktop cart. |
| `merchant-mobile.jpg` | Collapsed navigation, wrapping heading and contained horizontal order board. |
| `merchant-mobile-dish.jpg` | Food photograph, one-choice options, quantity and visible sticky add action. |
| `merchant-mobile-price-review.jpg` | Updated total, explicit price-change message and a fresh submission action. |
| `merchant-user-970.jpg` | Intermediate-width navigation, toolbar and ticket composition. |

Incumbent `desktop.png` and `desktop-merchant.png` supplied the visual comparison for palette, fonts, photography, controls and outline weight. This documentation pass made no changes to public pages or implementation sources.

The implementation handoff reports a successful production build, all **25 integration tests passing**, and the independent reviewer's **`ship`** verdict within its four-fix scope: mobile navigation focus/hidden state, clipped picker action, dialog names and changed-price consent. Source inspection shows the corresponding focus/inert handling, sticky picker footer, `aria-labelledby` drawer title and price-mismatch review path. These checks were not rerun by the documenter.

## Documentation drift retained

The existing detector artifact contains **0 primary findings and 381 advisories**: 327 font-size, 36 radius and 18 color. The incumbent machine-readable catalogue does not enumerate every supporting type size, compact corner or tonal status value described or used by the application. Merchant-specific density and its 700px navigation breakpoint are also more specific than the general system prose. These are documentation coverage gaps, not authorization to replace brand tokens or suppress findings.

The implementation-evidence paragraph in `DESIGN.md` still records the earlier 18-test milestone. The current 25-test result is recorded here without rewriting that historical paragraph.

The documented delivery boundary remains local SQLite/filesystem storage with configurable online adapters, pay at counter, and the guest cart/customisation → merchant ticket → private receipt flow. The workspace includes board/list and kitchen views, menu photos/options/extras, table batches and QR printing, sales/history/CSV, and pause/preparation/message settings. No online payment or POS-hardware connection is claimed.

## Preservation

Only this report was added by the documentation handoff. `DESIGN.md` and `.impeccable/design.json` remain byte-for-byte unchanged, with SHA-256 values:

- `DESIGN.md`: `e6c0f6065db100ba5e44f264b096d7396993e854ac265d1658fa42fc35505606`
- `.impeccable/design.json`: `53510a878bbe033c8f196c7ecd46230738160c6b40d8ef16a0eba7455ee21573`
