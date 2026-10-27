import type { Comment, MenuItem, Place, Post, Review, Table } from "./types";

export interface PreviewCatalog {
  places: Place[];
  posts: Post[];
  menus: MenuItem[];
  reviews: Review[];
  comments: Comment[];
  tables: Table[];
}
const unavailable = (message: string, status = 404): never => {
  throw Object.assign(new Error(message), { status });
};
function distance(lat: number, lng: number, place: Place) {
  const rad = Math.PI / 180;
  const a = Math.sin((place.lat - lat) * rad / 2) ** 2 +
    Math.cos(lat * rad) * Math.cos(place.lat * rad) * Math.sin((place.lng - lng) * rad / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function open(place: Place) {
  const time = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Kuala_Lumpur", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
  return place.opensAt <= place.closesAt
    ? time >= place.opensAt && time < place.closesAt
    : time >= place.opensAt || time < place.closesAt;
}
export function queryPreview(catalog: PreviewCatalog, path: string, method = "GET"): unknown {
  if (method !== "GET") unavailable("Accounts, uploads and ordering are not enabled on this preview.", 503);
  const url = new URL(path, "https://preview.invalid"), q = url.searchParams;
  const route = url.pathname;
  const place = (id: string) => {
    const found = catalog.places.find((p) => p.id === id);
    if (!found) return unavailable("This place could not be found.");
    return { ...found, open: open(found), saved: false, acceptingOrders: false };
  };
  if (route === "/session") return { user: null };
  if (route === "/places") {
    const coords = q.has("lat") && q.has("lng") && Number.isFinite(Number(q.get("lat"))) && Number.isFinite(Number(q.get("lng")));
    let places = catalog.places.map((p) => ({ ...place(p.id), ...(coords ? { distance: distance(Number(q.get("lat")), Number(q.get("lng")), p) } : {}) }));
    const text = (q.get("q") || "").toLowerCase();
    if (text) places = places.filter((p) => `${p.name} ${p.dish} ${p.area} ${p.city} ${p.cuisine} ${p.tags.join(" ")}`.toLowerCase().includes(text));
    if (q.get("city") && q.get("city") !== "All Malaysia") places = places.filter((p) => p.city === q.get("city"));
    if (q.get("cuisine")) places = places.filter((p) => p.cuisine === q.get("cuisine"));
    if (q.get("tag")) places = places.filter((p) => p.tags.includes(q.get("tag")!));
    if (q.has("maxPrice")) places = places.filter((p) => p.price <= Number(q.get("maxPrice")));
    if (q.get("open") === "true") places = places.filter((p) => p.open);
    if (coords && q.has("radius")) places = places.filter((p) => p.distance! <= Number(q.get("radius")));
    if (q.get("sort") === "price") places.sort((a, b) => a.price - b.price);
    if (q.get("sort") === "rating") places.sort((a, b) => b.rating - a.rating);
    if (coords && q.get("sort") === "distance") places.sort((a, b) => a.distance! - b.distance!);
    return { places, total: places.length };
  }
  if (route.startsWith("/places/")) {
    const id = decodeURIComponent(route.slice(8));
    return { place: place(id), menu: catalog.menus.filter((m) => m.placeId === id), reviews: catalog.reviews.filter((r) => r.placeId === id), posts: catalog.posts.filter((p) => p.placeId === id) };
  }
  if (route === "/posts") {
    if (q.get("mine") === "true") unavailable("Accounts are not enabled on this preview.", 503);
    let posts = catalog.posts.filter((p) => p.status === "published");
    if (q.get("type") === "video") posts = posts.filter((p) => p.media.some((m) => m.type === "video"));
    if (q.get("placeId")) posts = posts.filter((p) => p.placeId === q.get("placeId"));
    if (q.get("q")) posts = posts.filter((p) => `${p.title} ${p.body}`.toLowerCase().includes(q.get("q")!.toLowerCase()));
    return { posts: [...posts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
  }
  const postRoute = route.match(/^\/posts\/([^/]+)(\/comments)?$/);
  if (postRoute) {
    const post = catalog.posts.find((p) => p.id === decodeURIComponent(postRoute[1]));
    if (!post) return unavailable("This post could not be found.");
    return postRoute[2] ? { comments: catalog.comments.filter((c) => c.postId === post.id) } : { post };
  }
  if (route.startsWith("/order/table/")) {
    const table = catalog.tables.find((t) => t.token === decodeURIComponent(route.slice(13)));
    if (!table) return unavailable("This table could not be found.");
    return { table, place: { ...place(table.placeId), orderMessage: "Ordering is not enabled on this preview." }, menu: catalog.menus.filter((m) => m.placeId === table.placeId) };
  }
  return unavailable("This service is not enabled on the website preview.", 503);
}
