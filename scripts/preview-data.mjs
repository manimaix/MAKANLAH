import { makeInitialState } from "../server/seed.mjs";
import { publicAuthor } from "../server/auth.mjs";

// Export the source's labelled examples only. Never read the local database.
export function makePreviewCatalog() {
  const state = makeInitialState(true);
  const author = (id) => publicAuthor(state.users.find((u) => u.id === id));
  const places = state.places.map((p) => ({
    ...p, saved: false, acceptingOrders: false,
    reviewCount: state.reviews.filter((r) => r.placeId === p.id).length,
  }));
  return {
    places,
    posts: state.posts.filter((p) => p.status === "published").map((p) => ({
      ...p, author: author(p.authorId), place: places.find((v) => v.id === p.placeId) || null,
      likeCount: 0, liked: false, commentCount: 0, saved: false,
    })),
    menus: state.menus,
    reviews: state.reviews.map((r) => ({ ...r, author: author(r.authorId) })),
    comments: [],
    tables: state.tables,
  };
}
