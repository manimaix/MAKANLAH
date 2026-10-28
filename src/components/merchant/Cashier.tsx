import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Banknote,
  Check,
  CreditCard,
  Download,
  Printer,
  ReceiptText,
  Search,
  Smartphone,
} from "lucide-react";
import { mediaUrl, money, send } from "../../api";
import { Empty, Field } from "../ui";
import { orderStage, TicketItems } from "./OrderTicket";
import {
  billKey,
  unpaidBills,
  type CashierBill,
} from "../../../shared/cashier-bills.mjs";
import type { Order, Payment, Place, Table } from "../../types";
import "../../cashier.css";

export interface PaymentResult {
  payment: Payment;
  orders: Order[];
}
const methods = [
  { key: "cash", label: "Cash", icon: Banknote },
  { key: "card", label: "Card", icon: CreditCard },
  { key: "transfer", label: "Bank / QR", icon: Smartphone },
] as const;
const methodName = {
  cash: "Cash",
  card: "Card",
  transfer: "Bank / QR transfer",
  counter: "At counter",
};
const at = (value: string) =>
  new Intl.DateTimeFormat("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
const unpaid = (order: Order) =>
  !order.sample &&
  order.status !== "cancelled" &&
  order.paymentStatus !== "paid_at_counter";

function PaymentReceipt({
  payment,
  fresh,
  busy,
  onNext,
  onReverse,
}: {
  payment: Payment;
  fresh: boolean;
  busy: boolean;
  onNext: () => void;
  onReverse: (payment: Payment, reason: string) => Promise<void>;
}) {
  const [reverse, setReverse] = useState(false),
    [reason, setReason] = useState("");
  const receiptUrl = mediaUrl(
    "/api/merchant/payments/" + payment.id + "/receipt",
  );
  return (
    <section
      className="cashier-panel cashier-receipt"
      aria-label="Payment receipt"
    >
      {fresh && (
        <p className="cashier-success" role="status">
          <Check size={18} />
          Payment recorded
        </p>
      )}
      <header className="cashier-bill-heading">
        <div>
          <h2>Payment receipt</h2>
          <p>{payment.receiptNumber}</p>
        </div>
        <span className={"cashier-status " + payment.status}>
          {payment.status === "recorded" ? "Recorded" : "Reversed"}
        </span>
      </header>
      <p className="cashier-table-name">{payment.tableLabel}</p>
      <p className="cashier-caption">
        {at(payment.recordedAt)} MYT · {payment.recordedBy}
      </p>
      {payment.orders.map((order) => (
        <section className="cashier-order" key={order.id}>
          <h3>
            #{order.id.slice(0, 6).toUpperCase()} · {order.customerName}
          </h3>
          <ul className="cashier-receipt-items">
            {order.items.map((item, index) => (
              <li key={index}>
                <div>
                  <span>
                    {item.quantity} × {item.name}
                  </span>
                  <strong>
                    {money((item.priceCents * item.quantity) / 100)}
                  </strong>
                </div>
                {item.variantName && <small>{item.variantName}</small>}
                {item.addOns?.map((extra) => (
                  <small key={extra.id}>+ {extra.name}</small>
                ))}
                {item.note && <small>{item.note}</small>}
              </li>
            ))}
          </ul>
        </section>
      ))}
      <dl className="cashier-payment-details">
        <div>
          <dt>{payment.status === "recorded" ? "Paid" : "Original amount"}</dt>
          <dd>{money(payment.totalCents / 100)}</dd>
        </div>
        <div>
          <dt>Method</dt>
          <dd>{methodName[payment.method]}</dd>
        </div>
        {payment.method === "cash" && (
          <>
            <div>
              <dt>Cash received</dt>
              <dd>{money(payment.receivedCents! / 100)}</dd>
            </div>
            <div>
              <dt>Change</dt>
              <dd>{money(payment.changeCents! / 100)}</dd>
            </div>
          </>
        )}
        {payment.reference && (
          <div>
            <dt>Reference</dt>
            <dd>{payment.reference}</dd>
          </div>
        )}
      </dl>
      {payment.status === "reversed" && (
        <p className="cashier-reversal-note">
          {payment.reversalReason} · {payment.reversedBy}
        </p>
      )}
      <div className="cashier-receipt-actions">
        <a
          className="btn secondary"
          href={receiptUrl}
          target="_blank"
          rel="noreferrer"
        >
          <Printer size={16} />
          Open printable receipt
        </a>
        <a className="btn secondary" href={receiptUrl + "?download=1"} download>
          <Download size={16} />
          Download receipt
        </a>
      </div>
      <button className="btn" onClick={onNext} disabled={busy}>
        Next bill
        <ArrowRight size={16} />
      </button>
      {payment.status === "recorded" && !reverse && (
        <button
          className="text-link cashier-reverse"
          onClick={() => setReverse(true)}
        >
          Reverse payment record
        </button>
      )}
      {payment.status === "recorded" && reverse && (
        <form
          className="cashier-reverse-form"
          onSubmit={async (event) => {
            event.preventDefault();
            await onReverse(payment, reason.trim());
          }}
        >
          <Field label="Reason">
            <input
              required
              maxLength={200}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={busy}
            />
          </Field>
          <p>
            Return money separately. This action only changes the payment
            record.
          </p>
          <div className="cashier-receipt-actions">
            <button
              className="btn secondary"
              type="button"
              disabled={busy}
              onClick={() => setReverse(false)}
            >
              Keep record
            </button>
            <button className="btn" disabled={busy || !reason.trim()}>
              {busy ? "Saving…" : "Reverse payment record"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export function Cashier({
  place,
  orders,
  tables,
  payments,
  initialOrderId,
  onChange,
  onViewOrders,
}: {
  place: Place;
  orders: Order[];
  tables: Table[];
  payments: Payment[];
  initialOrderId?: string | null;
  onChange: (result: PaymentResult) => void;
  onViewOrders: () => void;
}) {
  const bills = useMemo(() => unpaidBills(orders, tables), [orders, tables]);
  const first =
    bills.find((bill) =>
      bill.orders.some((order) => order.id === initialOrderId),
    ) ||
    bills[0] ||
    null;
  const [mode, setMode] = useState<"unpaid" | "receipts">("unpaid"),
    [query, setQuery] = useState("");
  const [activeBill, setActiveBill] = useState<CashierBill | null>(first),
    [selectedIds, setSelectedIds] = useState<string[]>(
      first?.orders.map((o) => o.id) || [],
    );
  const [method, setMethod] = useState<"cash" | "card" | "transfer">("cash"),
    [received, setReceived] = useState(""),
    [reference, setReference] = useState(""),
    [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [receipt, setReceipt] = useState<Payment | null>(null),
    [fresh, setFresh] = useState(false);
  const requestKey = useRef(crypto.randomUUID()),
    focusedOrder = useRef(initialOrderId),
    billRef = useRef<HTMLElement>(null);
  const choose = (bill: CashierBill | null, scroll = false) => {
    setActiveBill(bill);
    setSelectedIds(bill?.orders.map((o) => o.id) || []);
    setReceived("");
    setReference("");
    setConfirmed(false);
    setError("");
    setReceipt(null);
    setFresh(false);
    setMode("unpaid");
    if (scroll && window.matchMedia("(max-width: 700px)").matches)
      requestAnimationFrame(() =>
        billRef.current?.scrollIntoView({
          behavior: "instant",
          block: "start",
        }),
      );
  };
  useEffect(() => {
    if (!activeBill && !receipt && mode === "unpaid" && bills[0])
      choose(bills[0]);
  }, [bills[0]?.key, activeBill, receipt, mode]);
  useEffect(() => {
    if (initialOrderId !== focusedOrder.current) {
      focusedOrder.current = initialOrderId;
      const bill = bills.find((bill) =>
        bill.orders.some((o) => o.id === initialOrderId),
      );
      if (bill) choose(bill);
    }
  }, [initialOrderId, bills]);
  useEffect(() => {
    requestKey.current = crypto.randomUUID();
  }, [
    activeBill?.key,
    selectedIds.join("|"),
    method,
    received,
    reference,
    confirmed,
  ]);
  const rows = activeBill
    ? orders.filter(
        (o) =>
          billKey(o) === activeBill.key &&
          (unpaid(o) || selectedIds.includes(o.id)),
      )
    : [];
  const selected = rows.filter((o) => selectedIds.includes(o.id));
  const changed =
    selectedIds.some((id) => !selected.some((o) => o.id === id)) ||
    selected.some((o) => !unpaid(o));
  const total = selected.reduce((sum, o) => sum + o.totalCents, 0);
  const cash = /^\d+(?:\.\d{1,2})?$/.test(received.trim())
    ? Math.round(Number(received) * 100)
    : null;
  const valid =
    !changed &&
    selected.length > 0 &&
    (method === "cash"
      ? cash !== null && cash >= total && cash <= 1000000000
      : confirmed);
  const search = query.trim().replace(/^#/, "").toLowerCase();
  const matchingBills = bills.filter((bill) =>
    [bill.tableLabel, ...bill.orders.flatMap((o) => [o.customerName, o.id])]
      .join(" ")
      .toLowerCase()
      .includes(search),
  );
  const matchingPayments = payments.filter((p) =>
    [
      p.receiptNumber,
      p.tableLabel,
      p.reference,
      ...p.orders.flatMap((o) => [o.customerName, o.id]),
    ]
      .join(" ")
      .toLowerCase()
      .includes(search),
  );
  const shownReceipt =
    receipt && (payments.find((p) => p.id === receipt.id) || receipt);
  async function accept(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await send<PaymentResult>(
        "/merchant/places/" + place.id + "/payments",
        {
          orderIds: selectedIds,
          method,
          expectedTotalCents: total,
          ...(method === "cash" ? { receivedCents: cash } : {}),
          reference: method === "cash" ? "" : reference,
          confirmed,
          idempotencyKey: requestKey.current,
        },
      );
      onChange(result);
      setReceipt(result.payment);
      setFresh(true);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reverse(payment: Payment, reason: string) {
    setBusy(true);
    setError("");
    try {
      const result = await send<PaymentResult>(
        "/merchant/payments/" + payment.id + "/reverse",
        { reason },
      );
      onChange(result);
      setReceipt(result.payment);
      setFresh(false);
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="cashier">
      <div className="mpos-toolbar cashier-toolbar">
        <div className="tabs">
          <button
            className={mode === "unpaid" ? "active" : ""}
            aria-pressed={mode === "unpaid"}
            disabled={busy}
            onClick={() =>
              choose(
                bills.find((bill) => bill.key === activeBill?.key) ||
                  bills[0] ||
                  null,
              )
            }
          >
            Unpaid bills <span>{bills.length}</span>
          </button>
          <button
            className={mode === "receipts" ? "active" : ""}
            aria-pressed={mode === "receipts"}
            disabled={busy}
            onClick={() => {
              setMode("receipts");
              setReceipt(null);
              setError("");
            }}
          >
            Receipts <span>{payments.length}</span>
          </button>
        </div>
        <label className="m-search">
          <Search size={18} />
          <input
            aria-label="Search cashier"
            placeholder="Search table, order or receipt"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      <p className="cashier-caption">
        {mode === "unpaid"
          ? `${bills.length} unpaid ${bills.length === 1 ? "bill" : "bills"} · ${money(bills.reduce((sum, bill) => sum + bill.totalCents, 0) / 100)} outstanding`
          : "Receipts for payments recorded at the counter. Times are in Malaysia time."}
      </p>
      <div className="cashier-layout">
        <section
          className="cashier-queue"
          aria-label={mode === "unpaid" ? "Unpaid bills" : "Receipts"}
        >
          {mode === "unpaid" ? (
            matchingBills.length ? (
              matchingBills.map((bill) => (
                <button
                  key={bill.key}
                  className={
                    "cashier-queue-row " +
                    (!receipt && activeBill?.key === bill.key ? "selected" : "")
                  }
                  aria-pressed={!receipt && activeBill?.key === bill.key}
                  disabled={busy}
                  onClick={() => choose(bill, true)}
                >
                  <div>
                    <strong>{bill.tableLabel}</strong>
                    <strong>{money(bill.totalCents / 100)}</strong>
                  </div>
                  <p>
                    {bill.orders.length}{" "}
                    {bill.orders.length === 1 ? "order" : "orders"} ·{" "}
                    {[...new Set(bill.orders.map((o) => o.customerName))].join(
                      ", ",
                    )}
                  </p>
                  <small>{at(bill.orders[0].createdAt)}</small>
                </button>
              ))
            ) : (
              <div className="cashier-queue-empty">
                <ReceiptText size={26} />
                <h2>{query ? "No matching bills" : "No unpaid bills"}</h2>
                <p>
                  {query
                    ? "Change the search or clear it."
                    : "Unpaid orders will appear here."}
                </p>
                {query && (
                  <button className="text-link" onClick={() => setQuery("")}>
                    Clear search
                  </button>
                )}
              </div>
            )
          ) : matchingPayments.length ? (
            matchingPayments.map((payment) => (
              <button
                key={payment.id}
                className={
                  "cashier-queue-row " +
                  (receipt?.id === payment.id ? "selected" : "")
                }
                disabled={busy}
                onClick={() => {
                  setReceipt(payment);
                  setFresh(false);
                  setError("");
                }}
              >
                <div>
                  <strong>{payment.tableLabel}</strong>
                  <strong>{money(payment.totalCents / 100)}</strong>
                </div>
                <p>{payment.receiptNumber}</p>
                <small>
                  {at(payment.recordedAt)} ·{" "}
                  {payment.status === "recorded"
                    ? methodName[payment.method]
                    : "Reversed"}
                </small>
              </button>
            ))
          ) : (
            <div className="cashier-queue-empty">
              <ReceiptText size={26} />
              <h2>{query ? "No matching receipts" : "No receipts yet"}</h2>
              <p>
                {query
                  ? "Change the search or clear it."
                  : "New payment receipts will appear here."}
              </p>
            </div>
          )}
        </section>
        <section
          className="cashier-detail"
          ref={billRef}
          aria-label="Selected bill"
        >
          {error && (
            <div className="form-error cashier-error" role="alert">
              {error}
            </div>
          )}
          {shownReceipt ? (
            <PaymentReceipt
              key={shownReceipt.id}
              payment={shownReceipt}
              fresh={fresh}
              busy={busy}
              onNext={() => choose(bills[0] || null)}
              onReverse={reverse}
            />
          ) : mode === "receipts" ? (
            <Empty title="Select a receipt">
              Open a recorded payment to view its details.
            </Empty>
          ) : activeBill ? (
            <form className="cashier-panel" onSubmit={accept}>
              <header className="cashier-bill-heading">
                <div>
                  <h2>{activeBill.tableLabel}</h2>
                  <p>Select orders for this payment.</p>
                </div>
                <span>
                  {rows.length} {rows.length === 1 ? "order" : "orders"}
                </span>
              </header>
              <div className="cashier-payment-layout">
                <fieldset className="cashier-orders">
                  <legend className="sr-only">Orders to pay</legend>
                  {rows.map((order) => (
                    <section className="cashier-order" key={order.id}>
                      <label className="cashier-order-select">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(order.id)}
                          disabled={busy}
                          onChange={(event) => {
                            setSelectedIds((ids) =>
                              event.target.checked
                                ? [...ids, order.id]
                                : ids.filter((id) => id !== order.id),
                            );
                            setReceived("");
                            setConfirmed(false);
                          }}
                        />
                        <span>
                          <strong>
                            #{order.id.slice(0, 6).toUpperCase()} ·{" "}
                            {order.customerName}
                          </strong>
                          <small>
                            {orderStage[order.status]} ·{" "}
                            {order.paymentStatus === "paid_at_counter"
                              ? "Paid"
                              : "Unpaid"}
                          </small>
                        </span>
                        <strong>{money(order.totalCents / 100)}</strong>
                      </label>
                      <TicketItems order={order} />
                      {order.note && (
                        <p className="cashier-caption">{order.note}</p>
                      )}
                    </section>
                  ))}
                </fieldset>
                <div className="cashier-checkout">
                  <div className="cashier-total">
                    <span>Amount due</span>
                    <strong>{money(total / 100)}</strong>
                  </div>
                  {changed && (
                    <div className="form-error" role="alert">
                      A selected order changed. Reload the bill.
                      <button
                        className="text-link"
                        type="button"
                        onClick={() =>
                          choose(
                            bills.find((bill) => bill.key === activeBill.key) ||
                              null,
                          )
                        }
                      >
                        Reload bill
                      </button>
                    </div>
                  )}
                  <fieldset className="cashier-methods">
                    <legend>Payment method</legend>
                    {methods.map((option) => (
                      <label
                        className={method === option.key ? "selected" : ""}
                        key={option.key}
                      >
                        <input
                          type="radio"
                          name="cashier-payment-method"
                          value={option.key}
                          checked={method === option.key}
                          disabled={busy}
                          onChange={() => {
                            setMethod(option.key);
                            setConfirmed(false);
                              setReference("");
                          }}
                        />
                        <option.icon size={18} />
                        {option.label}
                      </label>
                    ))}
                  </fieldset>
                  {method === "cash" ? (
                    <>
                      <Field label="Cash received (RM)">
                        <div className="cashier-cash-input">
                          <input
                            aria-label="Cash received (RM)"
                            inputMode="decimal"
                            autoComplete="off"
                            value={received}
                            disabled={busy}
                            placeholder="0.00"
                            onChange={(event) =>
                              setReceived(event.target.value)
                            }
                            maxLength={14}
                          />
                          <button
                            className="btn secondary"
                            type="button"
                            disabled={busy || !selected.length}
                            onClick={() =>
                              setReceived((total / 100).toFixed(2))
                            }
                          >
                            Exact amount
                          </button>
                        </div>
                      </Field>
                      <div className="cashier-change" aria-live="polite">
                        <span>Change</span>
                        <strong>
                          {cash !== null && cash >= total
                            ? money((cash - total) / 100)
                            : money(0)}
                        </strong>
                      </div>
                      {received &&
                        (cash === null ? (
                          <p className="form-error">
                            Enter an amount with up to two decimal places.
                          </p>
                        ) : cash < total ? (
                          <p className="form-error">
                            Cash received is {money((total - cash) / 100)}{" "}
                            short.
                          </p>
                        ) : null)}
                    </>
                  ) : (
                    <>
                      <Field
                        label="Payment reference (optional)"
                        hint="Use the terminal or transfer reference."
                      >
                        <input
                          maxLength={80}
                          autoComplete="off"
                          value={reference}
                          onChange={(event) => setReference(event.target.value)}
                          disabled={busy}
                        />
                      </Field>
                      <label className="cashier-confirm">
                        <input
                          type="checkbox"
                          checked={confirmed}
                          disabled={busy}
                          onChange={(event) =>
                            setConfirmed(event.target.checked)
                          }
                        />
                        <span>
                          {method === "card"
                            ? "Payment confirmed on the terminal"
                            : "Transfer received in the bank app"}
                        </span>
                      </label>
                      <p className="cashier-caption">
                        This page records the confirmed payment.
                      </p>
                    </>
                  )}
                  <button
                    className="btn cashier-submit"
                    disabled={busy || !valid}
                  >
                    {busy ? "Saving payment…" : "Record payment"}
                    <ArrowRight size={17} />
                  </button>
                  <p className="cashier-caption">
                    Record payment only after you receive it. Clearing the table
                    remains a separate action.
                  </p>
                </div>
              </div>
            </form>
          ) : (
            <Empty title="No unpaid bills">
              <p>Open orders to review current table activity.</p>
              <button className="btn secondary" onClick={onViewOrders}>
                View orders
                <ArrowRight size={16} />
              </button>
            </Empty>
          )}
        </section>
      </div>
    </div>
  );
}
