# Cashier

Mode: Operate. A local extension of the merchant workspace. Keep the established Makanlah palette, fonts and controls. The user asked for a cashier page to accept payment. Use the current pay-at-counter model.

THESIS: Let staff find an unpaid table bill, select its orders, record payment and provide a receipt.

OWN-WORLD: Cream, gold, orange and brown; Bricolage headings and DM Sans controls. Use compact lists, clear totals and existing form patterns.

STORY: Select a table bill. Review items and amount due. Enter cash received or confirm an external card/transfer payment. Save the record and open its receipt. Table occupancy remains separate.

FIRST VIEWPORT: Merchant navigation adds Cashier. A queue of unpaid table bills sits beside the selected bill and payment form. Phones stack these regions. Receipts have a separate history tab.

FORM: Extend the existing operational workspace directly. No new identity, comp or concept selection is required. Use integer cents, server totals, transaction guards and idempotent submission. Keep direct language and real empty/error states.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Cash payments include received amount and change. Card and bank/QR transfer entries record payment confirmed on an external terminal or bank app. No card charge, bank transfer, refund or payment QR is created by this application. Reversing a payment record changes the ledger; staff handle any money return separately. Receipts and reversals are saved with actor, date, order snapshots and business ownership checks.
