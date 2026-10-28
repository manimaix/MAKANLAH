# Interface language

The user requested direct operational text and ASD-STE100 guidance on 27 October 2026. This rule applies to merchant, account and QR order screens. Preserve the existing Makanlah colours and fonts.

Use short, complete sentences in help and error messages. Give one instruction in each sentence. Use the imperative for actions. Use the same name for the same object. Remove idioms, promotional headings, contractions and internal implementation details. UI labels can be short noun phrases.

The reference is [ASD-STE100 Issue 9, Part 1](https://www.asd-ste100.org/assets/files/ASD-STE100_ISSUE9.pdf), including rules 5.1, 5.2 and 5.3. The official indexed text specifies a maximum of 20 words for procedural sentences and one instruction in each sentence. This project has no formal dictionary certification or external compliance checker.

## Product terms

| Term | Meaning |
| --- | --- |
| Business | The merchant's food business. |
| Customer | The person who places an order. |
| Menu item | Food or drink that a customer can order. |
| Option | A required choice for an item, such as its size. |
| Extra | An optional addition to an item. |
| QR code | The code that opens the menu for a table. |
| New | The order awaits acceptance. |
| Accepted | The business has accepted the order. |
| Preparing | Staff have started preparation. |
| Ready | Staff can serve the order. |
| Served | Staff have served the order. |
| Cancelled | Staff will not prepare or serve the order. |
| Paid | Staff have recorded payment received at the counter. |
| Cashier | The merchant page for unpaid bills and payment receipts. |
| Unpaid bill | Orders for one table and one seating that still require payment. |
| Record payment | Save a payment received in cash or confirmed on an external terminal or bank app. |
| Cash received | The cash amount given by the customer. |
| Change | Cash received minus the payment amount. |
| Receipt | The saved details of a recorded payment. |
| Reverse payment record | Mark a payment record reversed with a reason. This action does not return money. |
| Occupied | Guests use the table. This state is separate from order status. |
| Seat guests | Mark a table occupied before guests place an order. |
| Clear table | Release a table after guests leave and orders are complete and paid. |

Account roles remain server-enforced. The interface uses normal email/password sign-in. It does not offer sample role accounts, automatic role selection or sample-order creation controls. Business and personal registration are real account types, not sign-in bypasses.

Only real order records enter merchant queues and sales totals. Labelled sample tickets remain in local storage for development history and are excluded from the merchant workspace. Existing sample food content retains its disclosure; it must not be represented as a verified operating business.
