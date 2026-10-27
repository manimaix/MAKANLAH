import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { makePreviewCatalog } from "../scripts/preview-data.mjs";

const { outputText } = ts.transpileModule(readFileSync(new URL("../src/preview-catalog.ts", import.meta.url), "utf8"), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } });
const { queryPreview } = await import("data:text/javascript;base64," + Buffer.from(outputText).toString("base64"));

test("public preview uses only labelled source examples and excludes private data", () => {
  const catalog = makePreviewCatalog();
  assert.ok(catalog.places.length > 0);
  assert.ok(catalog.places.every((p) => p.sample));
  assert.ok(catalog.posts.every((p) => p.sample));
  assert.doesNotMatch(JSON.stringify(catalog), /"(?:passwordHash|email|preferences|sessions|trackingHash)"\s*:/);
  assert.deepEqual(queryPreview(catalog, "/session"), { user: null });
});
test("preview search, budget and geographic filters return real catalogue matches", () => {
  const catalog = makePreviewCatalog();
  const results = queryPreview(catalog, "/places?q=nasi&maxPrice=15&lat=3.1535&lng=101.707&radius=5&sort=distance");
  assert.equal(results.places.length, 1);
  assert.equal(results.places[0].id, "nasi");
  assert.ok(results.places[0].distance < 5);
  assert.equal(queryPreview(catalog, "/places?q=nasi&maxPrice=1").total, 0);
  const penang = queryPreview(catalog, "/places?city=Penang");
  assert.ok(penang.total > 0);
  assert.ok(penang.places.every((p) => p.city === "Penang"));
});
test("preview place details, video posts and comments remain connected", () => {
  const catalog = makePreviewCatalog();
  const detail = queryPreview(catalog, "/places/nasi");
  assert.ok(detail.menu.length > 0);
  assert.ok(detail.reviews[0].author.name);
  const videos = queryPreview(catalog, "/posts?type=video").posts;
  assert.equal(videos.length, 1);
  assert.ok(videos[0].media[0].url.endsWith(".mp4"));
  assert.equal(queryPreview(catalog, "/posts/" + videos[0].id).post.id, videos[0].id);
  assert.deepEqual(queryPreview(catalog, "/posts/" + videos[0].id + "/comments"), { comments: [] });
});
test("preview never accepts account or order mutations and marks table ordering unavailable", () => {
  const catalog = makePreviewCatalog(), original = JSON.stringify(catalog);
  for (const route of ["/auth/register", "/auth/login", "/uploads", "/orders"])
    assert.throws(() => queryPreview(catalog, route, "POST"), (error) => error.status === 503);
  assert.throws(() => queryPreview(catalog, "/merchant"), (error) => error.status === 503);
  const table = queryPreview(catalog, "/order/table/kampung-table-01-demo");
  assert.equal(table.place.acceptingOrders, false);
  assert.match(table.place.orderMessage, /not enabled/);
  assert.equal(JSON.stringify(catalog), original);
});
