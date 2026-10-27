import { after, before, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { createApp, distanceKm } from "../server/app.mjs";

let application, server, base, directory;
const cookies = {};
const testPassword = randomUUID();
let uploaded,
  draft,
  published,
  order,
  trackingKey,
  secondUser,
  newPlace,
  menu,
  table;
async function request(
  route,
  { as, body, method = "GET", headers = {}, ...options } = {},
) {
  const res = await fetch(base + "/api" + route, {
    method,
    headers: {
      ...(body instanceof FormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(as ? { Cookie: cookies[as] } : {}),
      ...headers,
    },
    ...(body !== undefined
      ? { body: body instanceof FormData ? body : JSON.stringify(body) }
      : {}),
    ...options,
  });
  const data = await res.json().catch(() => null);
  return { res, data, status: res.status };
}
before(async () => {
  directory = await fs.mkdtemp(path.join(os.tmpdir(), "makanlah-test-"));
  application = await createApp({
    dataDir: directory,
    demoMode: true,
    demoPassword: testPassword,
    skipRateLimit: true,
  });
  server = application.app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = "http://127.0.0.1:" + server.address().port;
  for (const role of ["user", "merchant", "admin"]) {
    const r = await request("/auth/login", {
      method: "POST",
      body: { email: role + "@makanlah.local", password: testPassword },
    });
    assert.equal(r.status, 200);
    cookies[role] = r.res.headers.get("set-cookie").split(";")[0];
  }
});
after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await application.close();
  await fs.rm(directory, { recursive: true, force: true });
});
test("discovery filters, actual distances, and safe public authors", async () => {
  const r = await request(
    "/places?maxPrice=10&lat=3.1535&lng=101.707&sort=distance",
  );
  assert.equal(r.status, 200);
  assert.ok(r.data.places.length);
  assert.ok(
    r.data.places.every((p) => p.price <= 10 && Number.isFinite(p.distance)),
  );
  assert.ok(r.data.places[0].distance <= r.data.places.at(-1).distance);
  assert.equal(distanceKm(3, 101, 3, 101), 0);
  const posts = await request("/posts");
  assert.equal(posts.data.posts[0].author.passwordHash, undefined);
  assert.equal(posts.data.posts[0].author.email, undefined);
  assert.equal(posts.data.posts[0].author.preferences, undefined);
});
test("server enforces authentication and all three roles", async () => {
  assert.equal((await request("/admin")).status, 401);
  assert.equal((await request("/admin", { as: "user" })).status, 403);
  assert.equal((await request("/admin", { as: "merchant" })).status, 403);
  assert.equal((await request("/merchant", { as: "user" })).status, 403);
  assert.equal((await request("/admin", { as: "admin" })).status, 200);
  assert.equal(
    (
      await request("/auth/register", {
        method: "POST",
        body: {
          name: "Intruder",
          email: "bad@example.com",
          password: "long-password",
          role: "admin",
        },
      })
    ).status,
    400,
  );
  const r = await request("/profile", {
    as: "user",
    method: "PATCH",
    body: { name: "Aina Lim", role: "admin", status: "active" },
  });
  assert.equal(r.data.user.role, "user");
});
test("registration normalizes email and prevents duplicates", async () => {
  const r = await request("/auth/register", {
    method: "POST",
    body: {
      name: "Second Member",
      email: "Second@Example.com",
      password: "A-long-password-123",
      role: "user",
    },
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.email, "second@example.com");
  assert.equal(r.data.user.passwordHash, undefined);
  secondUser = r.data.user;
  cookies.second = r.res.headers.get("set-cookie").split(";")[0];
  assert.equal(
    (
      await request("/auth/register", {
        method: "POST",
        body: {
          name: "Duplicate",
          email: "second@example.com",
          password: "A-long-password-123",
        },
      })
    ).status,
    409,
  );
});
test("blocks cross-origin state changes", async () => {
  const r = await request("/profile", {
    as: "user",
    method: "PATCH",
    headers: { Origin: "https://untrusted.example" },
    body: { name: "Changed" },
  });
  assert.equal(r.status, 403);
});
test("validates uploads by bytes and saves real image files locally", async () => {
  const spoof = new FormData();
  spoof.append(
    "files",
    new Blob(['<svg onload="alert(1)"></svg>'], { type: "image/jpeg" }),
    "food.jpg",
  );
  assert.equal(
    (await request("/media", { as: "user", method: "POST", body: spoof }))
      .status,
    400,
  );
  const form = new FormData();
  const bytes = await fs.readFile("public/assets/nasi.jpg");
  form.append(
    "files",
    new Blob([bytes], { type: "image/jpeg" }),
    "my-food.jpg",
  );
  const r = await request("/media", { as: "user", method: "POST", body: form });
  assert.equal(r.status, 201);
  uploaded = r.data.media[0];
  assert.match(uploaded.url, /^\/api\/media\//);
  assert.equal((await fs.readdir(path.join(directory, "uploads"))).length, 1);
  assert.equal((await fetch(base + uploaded.url)).status, 404);
  assert.equal(
    (await fetch(base + uploaded.url, { headers: { Cookie: cookies.user } }))
      .status,
    200,
  );
});
test("private drafts stay private and media ownership cannot be forged", async () => {
  let r = await request("/posts", {
    as: "user",
    method: "POST",
    body: {
      title: "Breakfast test",
      body: "Local persistence test",
      media: [uploaded],
      placeId: "nasi",
      status: "draft",
    },
  });
  assert.equal(r.status, 201);
  draft = r.data.post;
  assert.equal((await request("/posts/" + draft.id)).status, 404);
  assert.equal(
    (await request("/posts/" + draft.id, { as: "second" })).status,
    404,
  );
  assert.equal(
    (await request("/posts/" + draft.id, { as: "admin" })).status,
    404,
  );
  assert.equal(
    (await request("/posts/" + draft.id, { as: "user" })).status,
    200,
  );
  assert.ok(
    !(await request("/posts")).data.posts.some((p) => p.id === draft.id),
  );
  assert.equal(
    (await fetch(base + uploaded.url, { headers: { Cookie: cookies.admin } }))
      .status,
    404,
  );
  r = await request("/posts", {
    as: "second",
    method: "POST",
    body: { title: "Stolen image", media: [uploaded], status: "published" },
  });
  assert.equal(r.status, 400);
  r = await request("/posts/" + draft.id, {
    as: "second",
    method: "PUT",
    body: { title: "Stolen post", media: [uploaded], status: "published" },
  });
  assert.ok([400, 403].includes(r.status));
});
test("real MP4 uploads support byte-range playback and video-only discovery", async () => {
  const form = new FormData();
  const bytes = await fs.readFile("public/assets/makanlah-preview.mp4");
  form.append("files", new Blob([bytes], { type: "video/mp4" }), "food.mp4");
  const upload = await request("/media", {
    as: "user",
    method: "POST",
    body: form,
  });
  assert.equal(upload.status, 201);
  const item = upload.data.media[0];
  assert.equal(item.type, "video");
  const post = await request("/posts", {
    as: "user",
    method: "POST",
    body: { title: "Video range test", media: [item], status: "published" },
  });
  assert.equal(post.status, 201);
  const range = await fetch(base + item.url, {
    headers: { Range: "bytes=0-1023" },
  });
  assert.equal(range.status, 206);
  assert.match(range.headers.get("content-range"), /^bytes 0-1023\//);
  assert.equal((await range.arrayBuffer()).byteLength, 1024);
  const feed = await request("/posts?type=video");
  assert.ok(
    feed.data.posts.every((p) => p.media.some((m) => m.type === "video")),
  );
  assert.ok(feed.data.posts.some((p) => p.id === post.data.post.id));
});
test("publishing exposes the post and file; edits and persistence are real", async () => {
  const r = await request("/posts/" + draft.id, {
    as: "user",
    method: "PUT",
    body: {
      title: "A real local post",
      body: "Saved locally with real media.",
      media: [uploaded],
      status: "published",
      sponsored: true,
    },
  });
  assert.equal(r.status, 200);
  published = r.data.post;
  assert.equal(published.sponsored, true);
  assert.equal((await request("/posts/" + published.id)).status, 200);
  const bytes = await fetch(base + uploaded.url);
  assert.equal(bytes.status, 200);
  assert.equal(bytes.headers.get("content-type"), "image/jpeg");
  assert.ok((await bytes.arrayBuffer()).byteLength > 10000);
  const state = await application.store.read();
  assert.equal(
    state.posts.find((p) => p.id === published.id).body,
    "Saved locally with real media.",
  );
});
test("likes are atomic toggles, comments persist, and other users cannot remove them", async () => {
  let r = await request("/posts/" + published.id + "/like", {
    as: "user",
    method: "POST",
    body: {},
  });
  assert.equal(r.data.liked, true);
  assert.equal(r.data.likeCount, 1);
  await Promise.all(
    Array.from({ length: 10 }, () =>
      request("/posts/" + published.id + "/like", {
        as: "second",
        method: "POST",
        body: {},
      }),
    ),
  );
  r = await request("/posts/" + published.id);
  assert.equal(r.data.post.likeCount, 1);
  r = await request("/posts/" + published.id + "/comments", {
    as: "user",
    method: "POST",
    body: { body: "This looks sedap!" },
  });
  assert.equal(r.status, 201);
  const comment = r.data.comment;
  assert.equal(
    (
      await request("/comments/" + comment.id, {
        as: "second",
        method: "DELETE",
      })
    ).status,
    403,
  );
  assert.equal(
    (await request("/posts/" + published.id + "/comments")).data.comments[0]
      .body,
    "This looks sedap!",
  );
  assert.equal(
    (await request("/comments/" + comment.id, { as: "user", method: "DELETE" }))
      .status,
    200,
  );
});
test("saved places and taste profiles persist and remain per account", async () => {
  assert.equal(
    (
      await request("/saves", {
        as: "user",
        method: "POST",
        body: { type: "place", id: "nasi" },
      })
    ).data.saved,
    true,
  );
  assert.equal((await request("/saves", { as: "user" })).data.places.length, 1);
  assert.equal(
    (await request("/saves", { as: "second" })).data.places.length,
    0,
  );
  const preferences = {
    cuisines: ["Malay"],
    dietary: ["Halal-friendly"],
    budget: 15,
    spicy: true,
  };
  assert.deepEqual(
    (
      await request("/profile", {
        as: "user",
        method: "PATCH",
        body: { preferences },
      })
    ).data.user.preferences,
    preferences,
  );
});
test("reviews update instead of duplicating; merchant cannot review own place", async () => {
  const body = { body: "A new experience.", rating: 4 };
  assert.equal(
    (
      await request("/places/nasi/reviews", {
        as: "second",
        method: "POST",
        body,
      })
    ).status,
    201,
  );
  await request("/places/nasi/reviews", {
    as: "second",
    method: "POST",
    body: { ...body, rating: 3 },
  });
  const r = await request("/places/nasi");
  assert.equal(
    r.data.reviews.filter((r) => r.authorId === secondUser.id).length,
    1,
  );
  assert.equal(
    (
      await request("/places/nasi/reviews", {
        as: "merchant",
        method: "POST",
        body,
      })
    ).status,
    403,
  );
});
test("merchant creates listing; only admin approves it; other ownership is enforced", async () => {
  const body = {
    name: "Test kitchen",
    dish: "Test nasi",
    description: "A test listing for real approval.",
    address: "1 Jalan Test",
    area: "City centre",
    city: "Kuala Lumpur",
    cuisine: "Malay",
    price: 12,
    lat: 3.15,
    lng: 101.7,
    tags: ["Spicy"],
    image: "/assets/nasi.jpg",
    opensAt: "08:00",
    closesAt: "22:00",
  };
  const r = await request("/merchant/places", {
    as: "merchant",
    method: "POST",
    body,
  });
  assert.equal(r.status, 201);
  newPlace = r.data.place;
  assert.equal(newPlace.status, "pending");
  assert.equal((await request("/places/" + newPlace.id)).status, 404);
  assert.equal(
    (
      await request("/admin/places/" + newPlace.id, {
        as: "merchant",
        method: "PATCH",
        body: { status: "approved" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/merchant/places/noodles", {
        as: "merchant",
        method: "PUT",
        body,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/admin/places/" + newPlace.id, {
        as: "admin",
        method: "PATCH",
        body: { status: "approved" },
      })
    ).status,
    200,
  );
  assert.equal((await request("/places/" + newPlace.id)).status, 200);
});
test("menus, availability and QR tables are durable merchant records", async () => {
  let r = await request("/merchant/places/" + newPlace.id + "/menu", {
    as: "merchant",
    method: "POST",
    body: {
      name: "Nasi test",
      description: "Fresh",
      category: "Mains",
      priceCents: 1250,
      available: true,
      image: "/assets/nasi.jpg",
    },
  });
  assert.equal(r.status, 201);
  menu = r.data.item;
  r = await request("/merchant/places/" + newPlace.id + "/tables", {
    as: "merchant",
    method: "POST",
    body: { label: "Table 02" },
  });
  assert.equal(r.status, 201);
  table = r.data.table;
  assert.ok(table.token.length >= 32);
  r = await request("/order/table/" + table.token);
  assert.equal(r.data.menu[0].priceCents, 1250);
  assert.equal(r.data.table.label, "Table 02");
  assert.equal(
    (
      await request("/merchant/menu/" + menu.id, {
        as: "user",
        method: "PUT",
        body: menu,
      })
    ).status,
    403,
  );
});
test("orders enforce trusted prices, receipts, idempotency and status transitions", async () => {
  const body = {
    tableToken: table.token,
    customerName: "Customer",
    note: "Less spicy",
    items: [{ menuId: menu.id, quantity: 2, priceCents: 1 }],
    totalCents: 2,
    idempotencyKey: randomUUID(),
  };
  let r = await request("/orders", { method: "POST", body });
  assert.equal(r.status, 201);
  order = r.data.order;
  trackingKey = r.data.trackingKey;
  assert.equal(order.totalCents, 2500);
  assert.equal(order.trackingHash, undefined);
  assert.equal(
    (await request("/orders", { method: "POST", body })).status,
    409,
  );
  assert.equal((await request("/orders/" + order.id)).status, 404);
  assert.equal(
    (await request("/orders/" + order.id + "?access=" + trackingKey)).status,
    200,
  );
  assert.equal(
    (
      await request("/merchant/orders/" + order.id, {
        as: "user",
        method: "PATCH",
        body: { status: "completed" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("/merchant/orders/" + order.id, {
        as: "merchant",
        method: "PATCH",
        body: { status: "completed" },
      })
    ).status,
    409,
  );
  for (const status of ["accepted", "preparing", "ready", "completed"])
    assert.equal(
      (
        await request("/merchant/orders/" + order.id, {
          as: "merchant",
          method: "PATCH",
          body: { status },
        })
      ).status,
      200,
    );
  assert.equal(
    (await request("/orders/" + order.id + "?access=" + trackingKey)).data.order
      .status,
    "completed",
  );
});
test("unavailable items, invalid table tokens and duplicate menu entries are rejected", async () => {
  await request("/merchant/menu/" + menu.id, {
    as: "merchant",
    method: "PUT",
    body: { ...menu, available: false },
  });
  const body = {
    tableToken: table.token,
    customerName: "Customer",
    items: [{ menuId: menu.id, quantity: 1 }],
    idempotencyKey: randomUUID(),
  };
  assert.equal(
    (await request("/orders", { method: "POST", body })).status,
    400,
  );
  await request("/merchant/tables/" + table.id, {
    as: "merchant",
    method: "PATCH",
    body: { active: false },
  });
  assert.equal((await request("/order/table/" + table.token)).status, 404);
});
test("moderation hides posts, resolves reports, records audit, and protects own admin", async () => {
  const report = await request("/reports", {
    as: "user",
    method: "POST",
    body: {
      type: "post",
      targetId: published.id,
      reason: "Test moderation report",
    },
  });
  assert.equal(report.status, 201);
  await request("/admin/posts/" + published.id, {
    as: "admin",
    method: "PATCH",
    body: { status: "hidden" },
  });
  assert.equal((await request("/posts/" + published.id)).status, 404);
  assert.equal((await fetch(base + uploaded.url)).status, 404);
  assert.equal(
    (
      await request("/admin/reports/" + report.data.report.id, {
        as: "admin",
        method: "PATCH",
        body: {},
      })
    ).status,
    200,
  );
  assert.equal(
    (
      await request("/admin/users/admin-demo", {
        as: "admin",
        method: "PATCH",
        body: { role: "user" },
      })
    ).status,
    400,
  );
  const dashboard = await request("/admin", { as: "admin" });
  assert.ok(dashboard.data.audit.length >= 3);
  assert.ok(!dashboard.data.posts.some((p) => p.status === "draft"));
});
test("suspended sessions are revoked and logout removes cookie access", async () => {
  await request("/admin/users/" + secondUser.id, {
    as: "admin",
    method: "PATCH",
    body: { status: "suspended" },
  });
  assert.equal((await request("/session", { as: "second" })).data.user, null);
  await request("/auth/logout", { as: "user", method: "POST", body: {} });
  assert.equal((await request("/session", { as: "user" })).data.user, null);
});
test("SQLite data survives a complete store close and reopen", async () => {
  const before = await application.store.read();
  await new Promise((resolve) => server.close(resolve));
  await application.close();
  application = await createApp({
    dataDir: directory,
    demoMode: true,
    skipRateLimit: true,
  });
  server = application.app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = "http://127.0.0.1:" + server.address().port;
  const after = await application.store.read();
  assert.equal(after.orders.find((o) => o.id === order.id).status, "completed");
  assert.equal(after.posts.find((p) => p.id === published.id).status, "hidden");
  assert.equal(after.users.length, before.users.length);
  assert.ok(after.media.some((m) => m.id === uploaded.id));
});
