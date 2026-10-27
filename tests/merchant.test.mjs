import { before, after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createApp } from "../server/app.mjs";
import { tableService } from "../shared/table-service.mjs";
let app, server, base, dir, menu;
const cookies = {};
const testPassword = randomUUID();
async function req(route, { as = "merchant", body, method = "GET" } = {}) {
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
const orderBody = (items) => ({
  tableToken: "kampung-table-01-demo",
  customerName: "API guest",
  note: "",
  items,
  idempotencyKey: randomUUID(),
});
before(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "makanlah-merchant-"));
  app = await createApp({
    dataDir: dir,
    demoMode: true,
    demoPassword: testPassword,
    skipRateLimit: true,
  });
  server = app.app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = "http://127.0.0.1:" + server.address().port;
  for (const role of ["merchant", "user", "admin"]) {
    const response = await fetch(base + "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: role + "@makanlah.local",
        password: testPassword,
      }),
    });
    cookies[role] = response.headers.get("set-cookie").split(";")[0];
  }
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await app.close();
  await fs.rm(dir, { force: true, recursive: true });
});
test("ordering controls are owned, durable and independent of listing approval", async () => {
  const body = {
    acceptingOrders: false,
    prepMinutes: 22,
    orderMessage: "Kitchen update",
  };
  assert.equal(
    (
      await req("/merchant/places/nasi/ordering", {
        as: "user",
        method: "PATCH",
        body,
      })
    ).status,
    403,
  );
  assert.equal(
    (await req("/merchant/places/noodles/ordering", { method: "PATCH", body }))
      .status,
    403,
  );
  const result = await req("/merchant/places/nasi/ordering", {
    method: "PATCH",
    body,
  });
  assert.equal(result.status, 200);
  assert.equal(result.data.place.status, "approved");
  const guest = await req("/order/table/kampung-table-01-demo", {
    as: "guest",
  });
  assert.equal(guest.status, 200);
  assert.equal(guest.data.place.acceptingOrders, false);
  assert.equal(guest.data.place.prepMinutes, 22);
  const rejected = await req("/orders", {
    as: "guest",
    method: "POST",
    body: orderBody([{ menuId: "menu-nasi", quantity: 1 }]),
  });
  assert.equal(rejected.status, 409);
  await req("/merchant/places/nasi/ordering", {
    method: "PATCH",
    body: { acceptingOrders: true },
  });
});
test("batch table creation skips duplicates and enforces ownership", async () => {
  const body = {
    prefix: "Table",
    start: 2,
    count: 3,
    seats: 4,
    area: "Terrace",
  };
  const result = await req("/merchant/places/nasi/tables/batch", {
    method: "POST",
    body,
  });
  assert.equal(result.status, 201);
  assert.equal(result.data.tables.length, 3);
  assert.equal(new Set(result.data.tables.map((t) => t.token)).size, 3);
  assert.equal(
    (await req("/merchant/places/nasi/tables/batch", { method: "POST", body }))
      .data.tables.length,
    0,
  );
  assert.equal(
    (
      await req("/merchant/places/noodles/tables/batch", {
        method: "POST",
        body,
      })
    ).status,
    403,
  );
  const table = result.data.tables[0];
  const placed = await req("/orders", {
    as: "guest",
    method: "POST",
    body: {
      ...orderBody([{ menuId: "menu-nasi", quantity: 1 }]),
      tableToken: table.token,
    },
  });
  assert.equal(placed.status, 201);
  assert.equal(placed.data.order.tableId, table.id);
  assert.equal(
    (
      await req("/merchant/places/nasi/tables", {
        method: "POST",
        body: { label: "Table 01" },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await req("/merchant/tables/" + table.id, {
        method: "PATCH",
        body: { label: "Table 01" },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await req("/merchant/tables/" + table.id, {
        method: "PATCH",
        body: { label: "Window seat", seats: 3 },
      })
    ).status,
    200,
  );
  const updated = (await req("/merchant")).data.tables.find(
    (t) => t.id === table.id,
  );
  assert.equal(updated.label, "Window seat");
  assert.equal(updated.seats, 3);
  assert.equal(updated.area, "Terrace");
  const ticket = (await req("/merchant")).data.orders.find(
    (o) => o.id === placed.data.order.id,
  );
  assert.equal(ticket.tableId, table.id);
  assert.equal(ticket.tableLabel, "Window seat");
});
test("menu modifiers are validated and priced entirely on the server", async () => {
  const result = await req("/merchant/places/nasi/menu", {
    method: "POST",
    body: {
      name: "Nasi with choices",
      description: "Test dish",
      category: "Mains",
      priceCents: 1000,
      available: true,
      image: "/assets/nasi.jpg",
      variants: [
        { id: "regular", name: "Regular", priceCents: 0 },
        { id: "large", name: "Large", priceCents: 200 },
      ],
      addOns: [{ id: "egg", name: "Extra egg", priceCents: 150 }],
    },
  });
  assert.equal(result.status, 201);
  menu = result.data.item;
  const order = await req("/orders", {
    as: "guest",
    method: "POST",
    body: orderBody([
      {
        menuId: menu.id,
        quantity: 2,
        variantId: "large",
        addOnIds: ["egg"],
        note: "Less spicy",
        priceCents: 1,
      },
    ]),
  });
  assert.equal(order.status, 201);
  assert.equal(order.data.order.totalCents, 2700);
  assert.equal(order.data.order.items[0].variantName, "Large");
  assert.equal(order.data.order.items[0].addOns[0].name, "Extra egg");
  assert.equal(order.data.order.items[0].note, "Less spicy");
  for (const item of [
    { menuId: menu.id, quantity: 1 },
    { menuId: menu.id, quantity: 1, variantId: "fake" },
    { menuId: menu.id, quantity: 1, variantId: "regular", addOnIds: ["fake"] },
    {
      menuId: menu.id,
      quantity: 1,
      variantId: "regular",
      addOnIds: ["egg", "egg"],
    },
  ])
    assert.equal(
      (
        await req("/orders", {
          as: "guest",
          method: "POST",
          body: orderBody([item]),
        })
      ).status,
      400,
    );
});
test("changed menu prices require guest review before an order can be created", async () => {
  const body = {
    ...orderBody([
      {
        menuId: menu.id,
        quantity: 1,
        variantId: "large",
        addOnIds: ["egg"],
        expectedUnitPriceCents: 1350,
      },
    ]),
    expectedTotalCents: 1350,
  };
  const before = (await req("/merchant")).data.orders.length;
  const updated = await req("/merchant/menu/" + menu.id, {
    method: "PUT",
    body: { ...menu, priceCents: 1200 },
  });
  assert.equal(updated.status, 200);
  const changed = await req("/orders", { as: "guest", method: "POST", body });
  assert.equal(changed.status, 409);
  assert.equal(changed.data.code, "MENU_PRICE_CHANGED");
  assert.equal((await req("/merchant")).data.orders.length, before);
  const reviewed = await req("/orders", {
    as: "guest",
    method: "POST",
    body: {
      ...body,
      expectedTotalCents: 1550,
      items: [{ ...body.items[0], expectedUnitPriceCents: 1550 }],
    },
  });
  assert.equal(reviewed.status, 201);
  assert.equal(reviewed.data.order.totalCents, 1550);
  await req("/merchant/menu/" + menu.id, { method: "PUT", body: menu });
});

test("distinct variants can share an order while duplicate lines are rejected", async () => {
  const regular = {
      menuId: menu.id,
      quantity: 1,
      variantId: "regular",
      addOnIds: [],
    },
    large = { menuId: menu.id, quantity: 1, variantId: "large", addOnIds: [] };
  const result = await req("/orders", {
    as: "guest",
    method: "POST",
    body: orderBody([regular, large]),
  });
  assert.equal(result.status, 201);
  assert.equal(result.data.order.totalCents, 2200);
  assert.equal(
    (
      await req("/orders", {
        as: "guest",
        method: "POST",
        body: orderBody([regular, regular]),
      })
    ).status,
    400,
  );
});
test("counter payment records are protected and appear on private guest receipts", async () => {
  const created = await req("/orders", {
    as: "guest",
    method: "POST",
    body: orderBody([{ menuId: "menu-nasi", quantity: 1 }]),
  });
  const order = created.data.order;
  assert.equal(
    (
      await req("/merchant/orders/" + order.id + "/payment", {
        as: "user",
        method: "PATCH",
        body: { paid: true },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await req("/merchant/orders/" + order.id + "/payment", {
        method: "PATCH",
        body: { paid: true },
      })
    ).data.order.paymentStatus,
    "paid_at_counter",
  );
  const receipt = await req(
    "/orders/" + order.id + "?access=" + created.data.trackingKey,
    { as: "guest" },
  );
  assert.equal(receipt.data.order.paymentStatus, "paid_at_counter");
  await req("/merchant/orders/" + order.id, {
    method: "PATCH",
    body: { status: "cancelled" },
  });
  assert.equal(
    (
      await req("/merchant/orders/" + order.id + "/payment", {
        method: "PATCH",
        body: { paid: true },
      })
    ).status,
    409,
  );
});
test("local sample tickets are labelled and repeat requests do not duplicate them", async () => {
  const first = await req("/merchant/places/nasi/sample-orders", {
    method: "POST",
    body: {},
  });
  assert.equal(first.status, 201);
  assert.equal(first.data.orders.length, 3);
  assert.ok(first.data.orders.every((o) => o.sample));
  assert.deepEqual(
    first.data.orders.map((o) => o.status),
    ["new", "preparing", "ready"],
  );
  assert.equal(
    (
      await req("/merchant/places/nasi/sample-orders", {
        method: "POST",
        body: {},
      })
    ).data.orders.length,
    0,
  );
});

test("CSV download enforces ownership, escapes formulas and excludes examples", async () => {
  const created = await req("/orders", {
    as: "guest",
    method: "POST",
    body: {
      ...orderBody([{ menuId: "menu-nasi", quantity: 1 }]),
      customerName: "=SUM(1,2)",
    },
  });
  assert.equal(created.status, 201);
  const response = await fetch(
    base + "/api/merchant/places/nasi/orders.csv?range=all",
    { headers: { Cookie: cookies.merchant } },
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /text\/csv/);
  assert.match(
    response.headers.get("content-disposition"),
    /attachment.*\.csv/,
  );
  const csv = await response.text();
  assert.ok(csv.includes('"\'=SUM(1,2)"'));
  assert.ok(csv.includes(created.data.order.id));
  assert.ok(!csv.includes("Aina · Sample"));
  assert.equal(
    (
      await fetch(base + "/api/merchant/places/noodles/orders.csv", {
        headers: { Cookie: cookies.merchant },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/api/merchant/places/nasi/orders.csv", {
        headers: { Cookie: cookies.user },
      })
    ).status,
    403,
  );
  assert.equal(
    (await fetch(base + "/api/merchant/places/nasi/orders.csv")).status,
    401,
  );
  await app.store.transact((s) => {
    s.orders.find((o) => o.id === created.data.order.id).createdAt = new Date(
      Date.now() - 8 * 86400000,
    ).toISOString();
  });
  const recent = await fetch(
    base + "/api/merchant/places/nasi/orders.csv?range=week",
    { headers: { Cookie: cookies.merchant } },
  );
  assert.ok(!(await recent.text()).includes(created.data.order.id));
});

test("QR download returns a real PNG and protects each business's table", async () => {
  const response = await fetch(
    base +
      "/api/merchant/tables/table-demo/qr.png?origin=" +
      encodeURIComponent("http://127.0.0.1:5173"),
    { headers: { Cookie: cookies.merchant } },
  );
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type"), /image\/png/);
  assert.match(
    response.headers.get("content-disposition"),
    /attachment.*\.png/,
  );
  const png = Buffer.from(await response.arrayBuffer());
  assert.equal(png.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  assert.ok(png.length > 1000);
  await app.store.transact((s) =>
    s.tables.push({
      id: "other-qr",
      placeId: "noodles",
      label: "Other table",
      token: "other-token",
      active: true,
    }),
  );
  assert.equal(
    (
      await fetch(base + "/api/merchant/tables/other-qr/qr.png", {
        headers: { Cookie: cookies.merchant },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(base + "/api/merchant/tables/table-demo/qr.png", {
        headers: { Cookie: cookies.user },
      })
    ).status,
    403,
  );
  assert.equal(
    (await fetch(base + "/api/merchant/tables/table-demo/qr.png")).status,
    401,
  );
  assert.equal(
    (
      await fetch(
        base +
          "/api/merchant/tables/table-demo/qr.png?origin=javascript%3Aalert(1)",
        { headers: { Cookie: cookies.merchant } },
      )
    ).status,
    400,
  );
});

test("table occupancy survives served and paid orders until staff clear the table", async () => {
  const createdTable = await req("/merchant/places/nasi/tables", {
    method: "POST",
    body: { label: "Occupancy check" },
  });
  const table = createdTable.data.table;
  const readTable = async () =>
    (await req("/merchant")).data.tables.find((t) => t.id === table.id);
  const occupancy = (occupied) =>
    req("/merchant/tables/" + table.id + "/occupancy", {
      method: "PATCH",
      body: { occupied },
    });
  const first = await req("/orders", {
    as: "guest",
    method: "POST",
    body: {
      ...orderBody([{ menuId: "menu-nasi", quantity: 1 }]),
      tableToken: table.token,
    },
  });
  assert.equal(first.status, 201);
  assert.equal((await readTable()).occupied, true);
  assert.equal((await readTable()).serviceId, first.data.order.tableServiceId);
  assert.equal((await occupancy(false)).status, 409);
  for (const status of ["accepted", "preparing", "ready", "completed"])
    assert.equal(
      (
        await req("/merchant/orders/" + first.data.order.id, {
          method: "PATCH",
          body: { status },
        })
      ).status,
      200,
    );
  assert.equal((await readTable()).occupied, true);
  assert.equal((await occupancy(false)).status, 409);
  await req("/merchant/orders/" + first.data.order.id + "/payment", {
    method: "PATCH",
    body: { paid: true },
  });
  assert.equal((await readTable()).occupied, true);
  const reopened = await createApp({ dataDir: dir, demoMode: false });
  try {
    assert.equal(
      (await reopened.store.read()).tables.find((t) => t.id === table.id)
        .occupied,
      true,
    );
  } finally {
    await reopened.close();
  }
  assert.equal((await occupancy(false)).status, 200);
  assert.equal((await readTable()).occupied, false);
  const oldServiceId = (await readTable()).serviceId;
  const second = await req("/orders", {
    as: "guest",
    method: "POST",
    body: {
      ...orderBody([{ menuId: "menu-nasi", quantity: 1 }]),
      tableToken: table.token,
    },
  });
  assert.equal(second.status, 201);
  const current = await req("/merchant"),
    currentTable = await readTable();
  assert.notEqual(currentTable.serviceId, oldServiceId);
  assert.deepEqual(
    tableService(currentTable, current.data.orders).orders.map((o) => o.id),
    [second.data.order.id],
  );
  await req("/merchant/orders/" + second.data.order.id, {
    method: "PATCH",
    body: { status: "cancelled" },
  });
  assert.equal((await readTable()).occupied, true);
  assert.equal((await occupancy(false)).status, 200);
});

test("manual seating is independent of QR status and protected by business ownership", async () => {
  const result = await req("/merchant/places/nasi/tables", {
    method: "POST",
    body: { label: "Manual seating check" },
  });
  const table = result.data.table,
    route = "/merchant/tables/" + table.id + "/occupancy";
  assert.equal(
    (
      await req(route, {
        as: "user",
        method: "PATCH",
        body: { occupied: true },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await req(route, {
        as: "guest",
        method: "PATCH",
        body: { occupied: true },
      })
    ).status,
    401,
  );
  await app.store.transact((s) =>
    s.tables.push({
      id: "other-occupancy",
      placeId: "noodles",
      label: "Other business",
      token: randomUUID(),
      active: true,
    }),
  );
  assert.equal(
    (
      await req("/merchant/tables/other-occupancy/occupancy", {
        method: "PATCH",
        body: { occupied: true },
      })
    ).status,
    403,
  );
  assert.equal(
    (await req(route, { method: "PATCH", body: { occupied: true } })).data.table
      .occupied,
    true,
  );
  await req("/merchant/tables/" + table.id, {
    method: "PATCH",
    body: { active: false },
  });
  const data = (await req("/merchant")).data,
    occupied = data.tables.find((t) => t.id === table.id);
  assert.equal(occupied.active, false);
  assert.equal(tableService(occupied, data.orders).occupied, true);
  assert.equal(
    (await req(route, { method: "PATCH", body: { occupied: false } })).data
      .table.occupied,
    false,
  );
});

test("existing served table orders retain occupancy while examples and other businesses do not", () => {
  const table = {
    id: "legacy-table",
    placeId: "nasi",
    label: "Same label",
    active: false,
  };
  const order = {
    id: "legacy-order",
    placeId: "nasi",
    tableLabel: "Same label",
    status: "completed",
    paymentStatus: "paid_at_counter",
    totalCents: 1200,
  };
  assert.equal(tableService(table, [order]).occupied, true);
  assert.equal(
    tableService(table, [{ ...order, sample: true }]).occupied,
    false,
  );
  assert.equal(
    tableService(table, [{ ...order, placeId: "noodles" }]).occupied,
    false,
  );
  assert.equal(
    tableService(table, [{ ...order, status: "cancelled" }]).occupied,
    false,
  );
});
