import { randomUUID } from "node:crypto";
import { billKey } from "../shared/cashier-bills.mjs";
import { malaysiaDate } from "./merchant-exports.mjs";

const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
export function publicPayment(payment) {
  const { idempotencyKey, fingerprint, recordedById, reversedById, ...result } =
    payment;
  return result;
}
export function recordPayment(state, place, actor, data) {
  state.payments ||= [];
  const fingerprint = JSON.stringify([
    [...data.orderIds].sort(),
    data.method,
    data.receivedCents ?? null,
    data.reference || "",
    data.expectedTotalCents,
  ]);
  const previous = state.payments.find(
    (p) => p.placeId === place.id && p.idempotencyKey === data.idempotencyKey,
  );
  if (previous) {
    if (previous.status !== "recorded")
      fail(409, "This payment record was reversed. Start a new payment.");
    if (previous.fingerprint !== fingerprint)
      fail(409, "This payment request changed. Review the bill and try again.");
    return previous;
  }
  if (new Set(data.orderIds).size !== data.orderIds.length)
    fail(400, "Select each order once.");
  const orders = data.orderIds.map((id) => {
    const order = state.orders.find((o) => o.id === id);
    if (!order) fail(404, "An order could not be found. Reload the bill.");
    if (order.placeId !== place.id)
      fail(403, "Select orders from this business only.");
    if (order.sample) fail(400, "Sample orders cannot accept payments.");
    if (order.status === "cancelled")
      fail(409, "A selected order was cancelled. Reload the bill.");
    if (order.paymentStatus === "paid_at_counter")
      fail(409, "A selected order is already paid. Reload the bill.");
    return order;
  });
  if (new Set(orders.map(billKey)).size !== 1)
    fail(400, "Select orders from one table bill.");
  const totalCents = orders.reduce((sum, order) => sum + order.totalCents, 0);
  if (totalCents !== data.expectedTotalCents)
    fail(
      409,
      "The bill total changed. Review the bill before recording payment.",
    );
  if (
    data.method === "cash" &&
    (!Number.isSafeInteger(data.receivedCents) ||
      data.receivedCents < totalCents)
  )
    fail(400, "The cash received must cover the amount due.");
  if (["card", "transfer"].includes(data.method) && !data.confirmed)
    fail(400, "Confirm payment on your terminal or bank app first.");
  const at = new Date().toISOString(),
    id = randomUUID();
  let receiptNumber;
  do {
    receiptNumber =
      "ML-" +
      malaysiaDate(at).replaceAll("-", "") +
      "-" +
      randomUUID().slice(0, 8).toUpperCase();
  } while (
    state.payments.some((payment) => payment.receiptNumber === receiptNumber)
  );
  const table = state.tables.find((t) => t.id === orders[0].tableId);
  const payment = {
    id,
    placeId: place.id,
    receiptNumber,
    businessName: place.name,
    businessAddress: place.address,
    tableLabel: table?.label || orders[0].tableLabel,
    orderIds: orders.map((o) => o.id),
    orders: orders.map((o) => ({
      id: o.id,
      customerName: o.customerName,
      items: structuredClone(o.items),
      note: o.note,
      totalCents: o.totalCents,
    })),
    totalCents,
    method: data.method,
    reference: data.reference || "",
    ...(data.method === "cash"
      ? {
          receivedCents: data.receivedCents,
          changeCents: data.receivedCents - totalCents,
        }
      : {}),
    status: "recorded",
    recordedAt: at,
    recordedBy: actor.name,
    recordedById: actor.id,
    idempotencyKey: data.idempotencyKey,
    fingerprint,
  };
  state.payments.push(payment);
  for (const order of orders) {
    order.paymentStatus = "paid_at_counter";
    order.paymentId = id;
    order.updatedAt = at;
  }
  state.audit.push({
    id: randomUUID(),
    actorId: actor.id,
    action: "Payment recorded",
    targetId: id,
    createdAt: at,
  });
  return payment;
}
export function reversePayment(state, payment, actor, reason) {
  if (payment.status === "reversed") return payment;
  const at = new Date().toISOString();
  for (const order of state.orders.filter((o) => o.paymentId === payment.id)) {
    order.paymentStatus = "pay_at_counter";
    delete order.paymentId;
    order.updatedAt = at;
  }
  Object.assign(payment, {
    status: "reversed",
    reversedAt: at,
    reversedBy: actor.name,
    reversedById: actor.id,
    reversalReason: reason,
  });
  state.audit.push({
    id: randomUUID(),
    actorId: actor.id,
    action: "Payment record reversed",
    targetId: payment.id,
    createdAt: at,
  });
  return payment;
}

const escape = (value = "") =>
  String(value).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (cents) =>
  new Intl.NumberFormat("en-MY", { style: "currency", currency: "MYR" }).format(
    cents / 100,
  );
export function receiptHtml(payment) {
  const method = {
    cash: "Cash",
    card: "Card",
    transfer: "Bank / QR transfer",
    counter: "At counter",
  }[payment.method];
  return `<!doctype html><html lang="en-MY"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Receipt ${escape(payment.receiptNumber)}</title>
<style>@font-face{font-family:DM;src:url(/fonts/dm-sans.woff2) format("woff2");font-weight:100 1000}@font-face{font-family:Bricolage;src:url(/fonts/bricolage-grotesque.woff2) format("woff2");font-weight:100 1000}body{font:14px/1.5 DM,sans-serif;color:#2A1A0E;background:#FEF3E2;margin:0;padding:28px}main{max-width:480px;margin:auto}h1{font-family:Bricolage,sans-serif;font-size:28px;margin:0}h2{font-size:19px;margin:10px 0}p{margin:6px 0}.muted,small{color:#71583F}header,section,footer{padding:18px 0;border-bottom:1px solid #D9C8B1}.row{display:flex;justify-content:space-between;gap:20px}.row strong{font-variant-numeric:tabular-nums;white-space:nowrap}ul{padding:0;list-style:none}li{margin:14px 0}small{display:block}.total{font-size:21px;margin:16px 0}button{font:inherit;background:#2A1A0E;color:#FEF3E2;border:0;padding:12px 20px;border-radius:8px;cursor:pointer}.reversed{font-weight:bold;color:#8A2919}footer{font-size:12px}@media print{body{background:white;padding:0}button{display:none}main{max-width:80mm}header,section,footer{break-inside:avoid}}</style>
<main><header><h1>makanlah.</h1><h2>${escape(payment.businessName)}</h2><p>${escape(payment.businessAddress)}</p></header><section><h2>Payment receipt</h2><p>${escape(payment.receiptNumber)}</p><p>${escape(payment.tableLabel)}</p><p>${escape(new Date(payment.recordedAt).toLocaleString("en-MY", { timeZone: "Asia/Kuala_Lumpur" }))} MYT</p>${payment.status === "reversed" ? `<p class="reversed">Payment record reversed</p><p>${escape(payment.reversalReason)}</p>` : ""}</section>
${payment.orders.map((order) => `<section><p><strong>Order #${escape(order.id.slice(0, 6).toUpperCase())}</strong> · ${escape(order.customerName)}</p><ul>${order.items.map((item) => `<li><div class="row"><span>${item.quantity} × ${escape(item.name)}</span><strong>${escape(money(item.quantity * item.priceCents))}</strong></div>${item.variantName ? `<small>${escape(item.variantName)}</small>` : ""}${(item.addOns || []).map((extra) => `<small>+ ${escape(extra.name)}</small>`).join("")}${item.note ? `<small>${escape(item.note)}</small>` : ""}</li>`).join("")}</ul>${order.note ? `<p>${escape(order.note)}</p>` : ""}</section>`).join("")}
<section><div class="row total"><strong>${payment.status === "recorded" ? "Paid" : "Original amount"}</strong><strong>${escape(money(payment.totalCents))}</strong></div><div class="row"><span>Method</span><span>${escape(method)}</span></div>${payment.method === "cash" ? `<div class="row"><span>Cash received</span><span>${escape(money(payment.receivedCents))}</span></div><div class="row"><span>Change</span><span>${escape(money(payment.changeCents))}</span></div>` : ""}${payment.reference ? `<p>Reference: ${escape(payment.reference)}</p>` : ""}<p>Recorded by ${escape(payment.recordedBy)}</p></section><footer><p>Developed by Nextgen Tech</p><p>Payment recorded at the counter.</p></footer><p><button id="print">Print receipt</button></p></main><script>document.getElementById('print').addEventListener('click',()=>window.print())</script></html>`;
}
