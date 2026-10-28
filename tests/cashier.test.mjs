import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createApp } from "../server/app.mjs";
import { unpaidBills } from "../shared/cashier-bills.mjs";

let app, server, base, dir;
const cookies = {},
  password = randomUUID();
async function req(route, { as = "merchant", method = "GET", body } = {}) {
  const response = await fetch(base + "/api" + route, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookies[as] ? { Cookie: cookies[as] } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: response.status, data: await response.json() };
}
async function order({
  token = "kampung-table-01-demo",
  items = [{ menuId: "menu-nasi", quantity: 1 }],
  name = "Cashier test",
  note = "",
} = {}) {
  const response = await req("/orders", {
    as: "guest",
    method: "POST",
    body: {
      tableToken: token,
      customerName: name,
      note,
      items,
      idempotencyKey: randomUUID(),
    },
  });
  assert.equal(response.status, 201);
  return response.data;
}
const paymentBody = (orders, extra = {}) => ({
  orderIds: orders.map((o) => o.id),
  method: "cash",
  expectedTotalCents: orders.reduce((sum, o) => sum + o.totalCents, 0),
  receivedCents: 5000,
  idempotencyKey: randomUUID(),
  ...extra,
});
const pay = (body, as = "merchant") =>
  req("/merchant/places/nasi/payments", { as, method: "POST", body });
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "makanlah-cashier-"));
  app = await createApp({
    dataDir: dir,
    demoMode: true,
    demoPassword: password,
    skipRateLimit: true,
  });
  server = app.app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = "http://127.0.0.1:" + server.address().port;
  for (const role of ["merchant", "user", "admin"]) {
    const response = await fetch(base + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: role + "@makanlah.local", password }),
    });
    cookies[role] = response.headers.get("set-cookie").split(";")[0];
  }
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await app.close();
  await fs.rm(dir, { recursive: true, force: true });
});

test("cashier records a table bill, correct change and private receipt without clearing occupancy", async () => {
  const first = await order(),
    second = await order({ items: [{ menuId: "drink-nasi", quantity: 1 }] });
  const result = await pay(paymentBody([first.order, second.order]));
  assert.equal(result.status, 200);
  const payment = result.data.payment;
  assert.equal(payment.totalCents, 1550);
  assert.equal(payment.receivedCents, 5000);
  assert.equal(payment.changeCents, 3450);
  assert.equal(payment.orders.length, 2);
  assert.equal(payment.recordedBy, "Kampung Table");
  assert.ok(!("idempotencyKey" in payment));
  assert.ok(!("fingerprint" in payment));
  assert.ok(
    result.data.orders.every(
      (o) =>
        o.paymentStatus === "paid_at_counter" && o.paymentId === payment.id,
    ),
  );
  const merchant = (await req("/merchant")).data;
  assert.equal(
    merchant.tables.find((t) => t.id === "table-demo").occupied,
    true,
  );
  assert.equal(
    merchant.payments.find((p) => p.id === payment.id).totalCents,
    1550,
  );
  const guest = await req(
    "/orders/" + first.order.id + "?access=" + first.trackingKey,
    { as: "guest" },
  );
  assert.equal(guest.data.order.paymentStatus, "paid_at_counter");
  const receipt = await fetch(
    base + "/api/merchant/payments/" + payment.id + "/receipt",
    { headers: { Cookie: cookies.merchant } },
  );
  assert.equal(receipt.status, 200);
  assert.match(receipt.headers.get("content-type"), /text\/html/);
  const html = await receipt.text();
  assert.ok(html.includes(payment.receiptNumber));
  assert.match(html, /RM(?:&nbsp;|\s)?34\.50/);
  assert.ok(html.includes("Print receipt"));
});
test("cashier rejects changed, short, duplicate and mixed bills without partial payment", async () => {
  const first = await order();
  for (const extra of [
    { receivedCents: 1 },
    { expectedTotalCents: 1 },
    { orderIds: [first.order.id, first.order.id] },
  ])
    assert.ok(
      [400, 409].includes(
        (await pay(paymentBody([first.order], extra))).status,
      ),
    );
  const table = (
    await req("/merchant/places/nasi/tables", {
      method: "POST",
      body: { label: "Separate bill" },
    })
  ).data.table;
  const second = await order({ token: table.token });
  assert.equal(
    (await pay(paymentBody([first.order, second.order]))).status,
    400,
  );
  const current = (await req("/merchant")).data.orders;
  assert.equal(
    current.find((o) => o.id === first.order.id).paymentStatus,
    "pay_at_counter",
  );
  assert.equal(
    current.find((o) => o.id === second.order.id).paymentStatus,
    "pay_at_counter",
  );
  assert.equal(unpaidBills([first.order, second.order]).length, 2);
});
test("cashier and receipts enforce account role and business ownership", async () => {
  const pending = await order(),
    body = paymentBody([pending.order]);
  assert.equal((await pay(body, "user")).status, 403);
  assert.equal((await pay(body, "guest")).status, 401);
  assert.equal(
    (await req("/merchant/places/noodles/payments", { method: "POST", body }))
      .status,
    403,
  );
  const paid = (await pay(body)).data.payment;
  for (const [as, status] of [
    ["user", 403],
    ["guest", 401],
  ]) {
    const response = await fetch(
      base + "/api/merchant/payments/" + paid.id + "/receipt",
      { headers: cookies[as] ? { Cookie: cookies[as] } : {} },
    );
    assert.equal(response.status, status);
  }
  await app.store.transact((s) =>
    s.payments.push({ ...paid, id: "other-payment", placeId: "noodles" }),
  );
  assert.equal(
    (
      await fetch(base + "/api/merchant/payments/other-payment/receipt", {
        headers: { Cookie: cookies.merchant },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await req("/merchant/payments/other-payment/reverse", {
        method: "POST",
        body: { reason: "Wrong business" },
      })
    ).status,
    403,
  );
});
test("card and transfer records require confirmation and do not invent cash amounts", async () => {
  for (const method of ["card", "transfer"]) {
    const pending = await order(),
      body = paymentBody([pending.order], {
        method,
        receivedCents: undefined,
        reference: "Terminal reference",
      });
    assert.equal((await pay(body)).status, 400);
    const result = await pay({ ...body, confirmed: true });
    assert.equal(result.status, 200);
    assert.equal(result.data.payment.method, method);
    assert.equal(result.data.payment.receivedCents, undefined);
    assert.equal(result.data.payment.changeCents, undefined);
  }
});
test("cashier submissions are idempotent and concurrent cashiers cannot pay an order twice", async () => {
  const pending = await order(),
    body = paymentBody([pending.order]);
  const [a, b] = await Promise.all([pay(body), pay(body)]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(a.data.payment.id, b.data.payment.id);
  assert.equal((await pay({ ...body, receivedCents: 6000 })).status, 409);
  const next = await order(),
    requests = await Promise.all([
      pay(paymentBody([next.order])),
      pay(paymentBody([next.order])),
    ]);
  assert.deepEqual(requests.map((r) => r.status).sort(), [200, 409]);
  const payments = (await req("/merchant")).data.payments;
  assert.equal(
    payments.filter((p) => p.orderIds.includes(next.order.id)).length,
    1,
  );
});
test("payment reversal records its reason, permits repayment and preserves newer payments on replay", async () => {
  const pending = await order(),
    first = (await pay(paymentBody([pending.order]))).data.payment;
  const route = "/merchant/payments/" + first.id + "/reverse";
  assert.equal(
    (await req(route, { method: "POST", body: { reason: "" } })).status,
    400,
  );
  const reversed = await req(route, {
    method: "POST",
    body: { reason: "Cash entry correction" },
  });
  assert.equal(reversed.status, 200);
  assert.equal(reversed.data.payment.status, "reversed");
  assert.equal(reversed.data.orders[0].paymentStatus, "pay_at_counter");
  assert.equal(reversed.data.payment.reversalReason, "Cash entry correction");
  const second = await pay(paymentBody([pending.order]));
  assert.equal(second.status, 200);
  const replay = await req(route, {
    method: "POST",
    body: { reason: "Repeated request" },
  });
  assert.equal(replay.data.orders[0].paymentId, second.data.payment.id);
  assert.equal(replay.data.orders[0].paymentStatus, "paid_at_counter");
  assert.equal(
    (
      await req("/merchant/orders/" + pending.order.id + "/payment", {
        method: "PATCH",
        body: { paid: false },
      })
    ).status,
    409,
  );
  const audit = (await app.store.read()).audit;
  assert.ok(
    audit.some(
      (a) => a.action === "Payment record reversed" && a.targetId === first.id,
    ),
  );
});
test("receipt snapshots persist and escape customer text in HTML and downloads", async () => {
  const pending = await order({
      name: "<img src=x onerror=alert(1)>",
      note: "<script>bad()</script>",
    }),
    result = await pay(
      paymentBody([pending.order], { reference: "<svg onload=bad()>" }),
    );
  assert.equal(result.status, 200);
  const payment = result.data.payment;
  const response = await fetch(
    base + "/api/merchant/payments/" + payment.id + "/receipt?download=1",
    { headers: { Cookie: cookies.merchant } },
  );
  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-disposition"),
    /attachment.*\.html/,
  );
  const html = await response.text();
  assert.ok(html.includes("&lt;img"));
  assert.ok(html.includes("&lt;script&gt;bad()"));
  assert.ok(!html.includes("<img src=x"));
  assert.ok(!html.includes("<svg onload"));
  await app.store.transact((s) => {
    s.places.find((p) => p.id === "nasi").name = "Changed business name";
  });
  const reopened = await createApp({ dataDir: dir, demoMode: false });
  try {
    const stored = (await reopened.store.read()).payments.find(
      (p) => p.id === payment.id,
    );
    assert.equal(stored.businessName, "Kampung Table");
    assert.equal(stored.orders[0].customerName, "<img src=x onerror=alert(1)>");
  } finally {
    await reopened.close();
  }
});
test("cancelled orders and sample tickets cannot receive cashier payments", async () => {
  const pending = await order();
  await req("/merchant/orders/" + pending.order.id, {
    method: "PATCH",
    body: { status: "cancelled" },
  });
  assert.equal((await pay(paymentBody([pending.order]))).status, 409);
  const samples = (
    await req("/merchant/places/nasi/sample-orders", {
      method: "POST",
      body: {},
    })
  ).data.orders;
  assert.ok(samples.length);
  assert.equal((await pay(paymentBody([samples[0]]))).status, 400);
});
