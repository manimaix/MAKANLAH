import express from "express";
import multer from "multer";
import { z } from "zod";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import path from "node:path";
import fs from "node:fs";
import { loadConfig } from "./config.mjs";
import { openStore } from "./store.mjs";
import { openMediaStorage } from "./media.mjs";
import { makeInitialState } from "./seed.mjs";
import QRCode from "qrcode";
import { exportOrders, malaysiaDate, ordersCsv } from "./merchant-exports.mjs";
import { seatTable, tableService } from "../shared/table-service.mjs";
import {
  checkPassword,
  hashPassword,
  hashToken,
  newToken,
  publicUser,
  publicAuthor,
  sessionToken,
} from "./auth.mjs";

const id = () => randomUUID();
const now = () => new Date().toISOString();
const fail = (status, message) => {
  throw Object.assign(new Error(message), { status });
};
const text = (max = 2000) => z.string().trim().min(1).max(max);
const maybeText = (max = 2000) => z.string().trim().max(max).default("");
const mediaItem = z.object({
  id: z.string().optional(),
  url: text(1000),
  type: z.enum(["image", "video"]),
});
const postSchema = z.object({
  title: text(120),
  body: maybeText(5000),
  placeId: z.string().nullable().optional(),
  media: z.array(mediaItem).min(1).max(4),
  status: z.enum(["draft", "published"]).default("published"),
  sponsored: z.boolean().default(false),
});
const placeSchema = z.object({
  name: text(100),
  dish: text(100),
  description: text(3000),
  address: text(250),
  area: text(80),
  city: text(80),
  cuisine: text(60),
  price: z.coerce.number().min(0).max(5000),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  tags: z.array(z.string().max(40)).max(12),
  image: text(1000),
  opensAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  closesAt: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
});
const menuChoiceSchema = z.object({
  id: text(80),
  name: text(60),
  priceCents: z.number().int().min(0).max(500000),
});
const menuSchema = z
  .object({
    name: text(100),
    description: maybeText(500),
    priceCents: z.coerce.number().int().min(0).max(500000),
    available: z.boolean(),
    category: text(60),
    image: maybeText(1000),
    variants: z.array(menuChoiceSchema).max(8).default([]),
    addOns: z.array(menuChoiceSchema).max(12).default([]),
  })
  .refine(
    (m) =>
      new Set(m.variants.map((v) => v.id)).size === m.variants.length &&
      new Set(m.addOns.map((v) => v.id)).size === m.addOns.length,
    { message: "Each menu option needs a unique ID." },
  );
const preferencesSchema = z.object({
  cuisines: z.array(z.string().max(60)).max(10),
  dietary: z.array(z.string().max(50)).max(10),
  budget: z.number().min(1).max(5000),
  spicy: z.boolean(),
});
export const distanceKm = (a, b, c, d) => {
  const rad = (n) => (n * Math.PI) / 180,
    deltaLat = rad(c - a),
    deltaLng = rad(d - b);
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(rad(a)) * Math.cos(rad(c)) * Math.sin(deltaLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};
const isOpen = (place) => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  return place.opensAt <= place.closesAt
    ? parts >= place.opensAt && parts < place.closesAt
    : parts >= place.opensAt || parts < place.closesAt;
};

export async function createApp(overrides = {}) {
  const config = loadConfig(overrides);
  if (config.production && config.demoMode)
    throw new Error("Disable DEMO_MODE before running in production.");
  const store = await openStore(
    config,
    makeInitialState(config.demoMode, config.demoPassword),
  );
  const media = await openMediaStorage(config);
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "geolocation=(self)",
      "X-Frame-Options": "SAMEORIGIN",
    });
    const origin = req.headers.origin;
    const allowed = new Set([
      config.appOrigin,
      ...(config.production
        ? []
        : [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
          ]),
    ]);
    if (origin && allowed.has(origin))
      res.set({
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        Vary: "Origin",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      });
    if (req.method === "OPTIONS") return res.sendStatus(204);
    if (!["GET", "HEAD"].includes(req.method) && origin && !allowed.has(origin))
      return res
        .status(403)
        .json({ error: "This request came from an untrusted website." });
    if (req.path.startsWith("/api")) res.set("Cache-Control", "no-store");
    next();
  });
  app.use(express.json({ limit: "1mb" }));
  app.use("/api", async (req, res, next) => {
    const token = sessionToken(req);
    if (token) {
      const state = await store.read();
      const session = state.sessions.find(
        (s) => s.tokenHash === hashToken(token) && s.expiresAt > Date.now(),
      );
      const user =
        session &&
        state.users.find(
          (u) => u.id === session.userId && u.status === "active",
        );
      req.user = user || null;
    }
    next();
  });
  const requireAuth = (req, res, next) =>
    req.user ? next() : res.status(401).json({ error: "Sign in to continue." });
  const roles =
    (...allowed) =>
    (req, res, next) =>
      !req.user
        ? res.status(401).json({ error: "Sign in to continue." })
        : allowed.includes(req.user.role)
          ? next()
          : res.status(403).json({
              error: "Your account does not have access to this action.",
            });
  const merchant = roles("merchant", "admin");
  const admin = roles("admin");
  const ownedPlace = (state, placeId, user) => {
    const place = state.places.find((p) => p.id === placeId);
    if (!place) fail(404, "This place could not be found.");
    if (place.ownerId !== user.id && user.role !== "admin")
      fail(403, "You can manage only your own places.");
    return place;
  };
  const verifyMedia = (state, items, user) => {
    for (const item of items) {
      if (
        config.demoMode &&
        (/^\/assets\/[a-z]+\.jpg$/.test(item.url) ||
          item.url === "/assets/makanlah-preview.mp4")
      )
        continue;
      const found = state.media.find(
        (m) =>
          m.id === item.id &&
          m.ownerId === user.id &&
          m.url === item.url &&
          m.type === item.type,
      );
      if (!found) fail(400, "Choose media uploaded from your account.");
    }
  };
  const verifyImage = (state, url, user) => {
    if (config.demoMode && /^\/assets\/[a-z]+\.jpg$/.test(url)) return;
    if (
      !state.media.some(
        (m) => m.url === url && m.ownerId === user.id && m.type === "image",
      )
    )
      fail(400, "Upload a photo from your account.");
  };
  const summarizePost = (state, post, user) => ({
    ...post,
    author: publicAuthor(state.users.find((u) => u.id === post.authorId)),
    place:
      state.places.find(
        (p) => p.id === post.placeId && p.status === "approved",
      ) || null,
    likeCount: state.likes.filter((l) => l.postId === post.id).length,
    liked:
      !!user &&
      state.likes.some((l) => l.postId === post.id && l.userId === user.id),
    commentCount: state.comments.filter((c) => c.postId === post.id).length,
    saved:
      !!user &&
      state.saves.some((s) => s.postId === post.id && s.userId === user.id),
  });
  const summarizePlace = (state, place, user, coords) => ({
    ...place,
    open: isOpen(place),
    reviewCount: state.reviews.filter((r) => r.placeId === place.id).length,
    rating: state.reviews.some((r) => r.placeId === place.id)
      ? Number(
          (
            state.reviews
              .filter((r) => r.placeId === place.id)
              .reduce((n, r) => n + r.rating, 0) /
            state.reviews.filter((r) => r.placeId === place.id).length
          ).toFixed(1),
        )
      : place.rating || 0,
    saved:
      !!user &&
      state.saves.some((s) => s.placeId === place.id && s.userId === user.id),
    ...(coords
      ? { distance: distanceKm(coords.lat, coords.lng, place.lat, place.lng) }
      : {}),
  });
  const secureEqual = (a, b) =>
    a &&
    b &&
    Buffer.byteLength(a) === Buffer.byteLength(b) &&
    timingSafeEqual(Buffer.from(a), Buffer.from(b));
  const publicOrder = (order) => {
    const { trackingHash, idempotencyKey, ...result } = order;
    return result;
  };
  const cookieOptions = {
    httpOnly: true,
    sameSite: "lax",
    secure: config.production,
    path: "/",
    maxAge: 7 * 24 * 3600 * 1000,
  };
  async function signIn(res, user) {
    const token = newToken();
    await store.transact((state) => {
      state.sessions = state.sessions.filter((s) => s.expiresAt > Date.now());
      state.sessions.push({
        tokenHash: hashToken(token),
        userId: user.id,
        expiresAt: Date.now() + cookieOptions.maxAge,
      });
    });
    res.cookie("makanlah_session", token, cookieOptions);
    return publicUser(user);
  }
  const attempts = new Map();
  const authLimit = (req, res, next) => {
    if (config.skipRateLimit) return next();
    const key = req.ip,
      current = attempts.get(key) || { count: 0, reset: Date.now() + 900000 };
    if (current.reset < Date.now()) {
      current.count = 0;
      current.reset = Date.now() + 900000;
    }
    if (++current.count > 40)
      return res
        .status(429)
        .json({ error: "Too many sign-in attempts. Try again in 15 minutes." });
    attempts.set(key, current);
    if (attempts.size > 10000)
      for (const [ip, a] of attempts)
        if (a.reset < Date.now()) attempts.delete(ip);
    next();
  };
  app.get("/api/health", (req, res) =>
    res.json({
      ok: true,
      storage: config.databaseDriver,
      media: config.mediaDriver,
    }),
  );
  app.get("/api/session", (req, res) =>
    res.json({ user: publicUser(req.user), demoMode: config.demoMode }),
  );
  app.post("/api/auth/register", authLimit, async (req, res) => {
    const data = z
      .object({
        name: text(80),
        email: z
          .email()
          .max(200)
          .transform((s) => s.toLowerCase()),
        password: z.string().min(10).max(128),
        role: z.enum(["user", "merchant"]).default("user"),
      })
      .parse(req.body);
    const passwordHash = hashPassword(data.password);
    const user = await store.transact((state) => {
      if (state.users.some((u) => u.email === data.email))
        fail(409, "An account already uses this email. Sign in instead.");
      const item = {
        id: id(),
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        status: "active",
        bio: "",
        city: "Kuala Lumpur",
        preferences: { cuisines: [], dietary: [], budget: 30, spicy: false },
        createdAt: now(),
      };
      state.users.push(item);
      return item;
    });
    res.status(201).json({ user: await signIn(res, user) });
  });
  app.post("/api/auth/login", authLimit, async (req, res) => {
    const data = z
      .object({
        email: z.email().transform((s) => s.toLowerCase()),
        password: z.string().max(128),
      })
      .parse(req.body);
    const user = (await store.read()).users.find((u) => u.email === data.email);
    if (!user || !checkPassword(data.password, user.passwordHash))
      fail(401, "Email or password is incorrect.");
    if (user.status !== "active")
      fail(403, "This account is suspended. Contact the Makanlah team.");
    res.json({ user: await signIn(res, user) });
  });
  app.post("/api/auth/logout", async (req, res) => {
    const hash = hashToken(sessionToken(req));
    await store.transact((state) => {
      state.sessions = state.sessions.filter((s) => s.tokenHash !== hash);
    });
    res.clearCookie("makanlah_session", {
      ...cookieOptions,
      maxAge: undefined,
    });
    res.json({ ok: true });
  });
  app.patch("/api/profile", requireAuth, async (req, res) => {
    const data = z
      .object({
        name: text(80).optional(),
        bio: maybeText(500).optional(),
        city: text(80).optional(),
        preferences: preferencesSchema.optional(),
      })
      .parse(req.body);
    const user = await store.transact((s) => {
      const u = s.users.find((u) => u.id === req.user.id);
      Object.assign(u, data);
      return publicUser(u);
    });
    res.json({ user });
  });
  app.get("/api/places", async (req, res) => {
    const state = await store.read();
    const q = req.query;
    let places = state.places.filter((p) => p.status === "approved");
    if (q.q) {
      const term = String(q.q).toLowerCase();
      places = places.filter((p) =>
        [p.name, p.dish, p.city, p.area, p.cuisine, ...p.tags]
          .join(" ")
          .toLowerCase()
          .includes(term),
      );
    }
    if (q.city && q.city !== "All Malaysia")
      places = places.filter((p) => p.city === q.city);
    if (q.cuisine) places = places.filter((p) => p.cuisine === q.cuisine);
    if (q.tag) places = places.filter((p) => p.tags.includes(q.tag));
    if (q.maxPrice && Number.isFinite(Number(q.maxPrice)))
      places = places.filter((p) => p.price <= Number(q.maxPrice));
    if (q.open === "true") places = places.filter(isOpen);
    let coords = null;
    if (q.lat !== undefined && q.lng !== undefined) {
      const lat = Number(q.lat),
        lng = Number(q.lng);
      if (
        Number.isFinite(lat) &&
        Math.abs(lat) <= 90 &&
        Number.isFinite(lng) &&
        Math.abs(lng) <= 180
      )
        coords = { lat, lng };
    }
    let results = places.map((p) => summarizePlace(state, p, req.user, coords));
    if (coords && q.radius)
      results = results.filter((p) => p.distance <= Number(q.radius));
    if (q.sort === "price") results.sort((a, b) => a.price - b.price);
    else if (q.sort === "distance" && coords)
      results.sort((a, b) => a.distance - b.distance);
    else if (q.sort === "rating") results.sort((a, b) => b.rating - a.rating);
    res.json({ places: results, total: results.length });
  });
  app.get("/api/places/:id", async (req, res) => {
    const state = await store.read();
    const place = state.places.find(
      (p) => p.id === req.params.id && p.status === "approved",
    );
    if (!place) fail(404, "This place could not be found.");
    res.json({
      place: summarizePlace(state, place, req.user),
      menu: state.menus.filter((m) => m.placeId === place.id),
      reviews: state.reviews
        .filter((r) => r.placeId === place.id)
        .map((r) => ({
          ...r,
          author: publicAuthor(state.users.find((u) => u.id === r.authorId)),
        })),
      posts: state.posts
        .filter((p) => p.placeId === place.id && p.status === "published")
        .map((p) => summarizePost(state, p, req.user)),
    });
  });
  app.post("/api/places/:id/reviews", requireAuth, async (req, res) => {
    const data = z
      .object({ body: text(3000), rating: z.number().int().min(1).max(5) })
      .parse(req.body);
    const review = await store.transact((s) => {
      const place = s.places.find(
        (p) => p.id === req.params.id && p.status === "approved",
      );
      if (!place) fail(404, "This place could not be found.");
      if (place.ownerId === req.user.id)
        fail(403, "You cannot review your own listing.");
      let review = s.reviews.find(
        (r) => r.authorId === req.user.id && r.placeId === place.id,
      );
      if (review) Object.assign(review, data, { updatedAt: now() });
      else {
        review = {
          id: id(),
          authorId: req.user.id,
          placeId: place.id,
          ...data,
          createdAt: now(),
        };
        s.reviews.push(review);
      }
      return review;
    });
    res.status(201).json({ review });
  });
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.maxUploadBytes, files: 4 },
  });
  app.post(
    "/api/media",
    requireAuth,
    upload.array("files", 4),
    async (req, res) => {
      if (!req.files?.length) fail(400, "Choose at least one photo or video.");
      const accepted = [];
      try {
        for (const file of req.files) {
          const detected = await fileTypeFromBuffer(file.buffer).catch(
            () => null,
          );
          if (
            !detected ||
            ![
              "image/jpeg",
              "image/png",
              "image/webp",
              "image/avif",
              "video/mp4",
              "video/webm",
              "video/quicktime",
            ].includes(detected.mime)
          )
            fail(400, "Use JPG, PNG, WebP, AVIF, MP4, MOV or WebM files.");
          if (
            detected.mime.startsWith("image/") &&
            file.size > 12 * 1024 * 1024
          )
            fail(400, "Photos must be 12 MB or smaller.");
          const mediaId = id(),
            key = `${mediaId}.${detected.ext}`;
          await media.put(key, file.buffer, detected.mime);
          accepted.push({
            id: mediaId,
            key,
            url: `/api/media/${mediaId}`,
            type: detected.mime.startsWith("video/") ? "video" : "image",
            mime: detected.mime,
            size: file.size,
            ownerId: req.user.id,
            createdAt: now(),
          });
        }
        await store.transact((s) => {
          s.media.push(...accepted);
        });
      } catch (error) {
        await Promise.allSettled(
          accepted.map((item) => media.remove(item.key)),
        );
        throw error;
      }
      res
        .status(201)
        .json({ media: accepted.map(({ key, ownerId, ...safe }) => safe) });
    },
  );
  app.get("/api/media/:id", async (req, res) => {
    const state = await store.read();
    const item = state.media.find((m) => m.id === req.params.id);
    if (!item) fail(404, "Media could not be found.");
    const visible =
      state.posts.some(
        (p) =>
          p.status === "published" && p.media.some((m) => m.id === item.id),
      ) ||
      state.places.some(
        (p) => p.status === "approved" && p.image === item.url,
      ) ||
      state.menus.some(
        (m) =>
          m.image === item.url &&
          state.places.some(
            (p) => p.id === m.placeId && p.status === "approved",
          ),
      );
    const moderated =
      req.user?.role === "admin" &&
      state.posts.some(
        (p) => p.status === "hidden" && p.media.some((m) => m.id === item.id),
      );
    const pendingListing =
      req.user?.role === "admin" &&
      state.places.some((p) => p.status !== "approved" && p.image === item.url);
    if (
      !visible &&
      req.user?.id !== item.ownerId &&
      !moderated &&
      !pendingListing
    )
      fail(404, "Media could not be found.");
    res.set({
      "Content-Type": item.mime,
      "Cache-Control": "private, max-age=3600",
    });
    await media.serve(item.key, req, res);
  });
  app.get("/api/posts", async (req, res) => {
    const s = await store.read();
    let posts = s.posts.filter((p) =>
      req.query.mine === "true"
        ? req.user && p.authorId === req.user.id
        : p.status === "published",
    );
    if (req.query.status)
      posts = posts.filter((p) => p.status === req.query.status);
    if (req.query.type === "video")
      posts = posts.filter((p) => p.media.some((m) => m.type === "video"));
    if (req.query.placeId)
      posts = posts.filter((p) => p.placeId === req.query.placeId);
    if (req.query.q) {
      const q = String(req.query.q).toLowerCase();
      posts = posts.filter((p) =>
        `${p.title} ${p.body}`.toLowerCase().includes(q),
      );
    }
    posts.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json({ posts: posts.map((p) => summarizePost(s, p, req.user)) });
  });
  app.get("/api/posts/:id", async (req, res) => {
    const s = await store.read(),
      post = s.posts.find(
        (p) =>
          p.id === req.params.id &&
          (p.status === "published" || p.authorId === req.user?.id),
      );
    if (!post) fail(404, "This post could not be found.");
    res.json({ post: summarizePost(s, post, req.user) });
  });
  const savePost = async (req, res) => {
    const data = postSchema.parse(req.body);
    const post = await store.transact((s) => {
      verifyMedia(s, data.media, req.user);
      if (
        data.placeId &&
        !s.places.some((p) => p.id === data.placeId && p.status === "approved")
      )
        fail(400, "Choose an available place.");
      if (req.params.id) {
        const p = s.posts.find((p) => p.id === req.params.id);
        if (!p) fail(404, "Post not found.");
        if (p.authorId !== req.user.id)
          fail(403, "You can edit only your own posts.");
        if (p.status === "hidden")
          fail(403, "A moderated post cannot be republished.");
        Object.assign(p, data, { updatedAt: now() });
        return summarizePost(s, p, req.user);
      }
      const p = {
        id: id(),
        authorId: req.user.id,
        ...data,
        createdAt: now(),
        updatedAt: now(),
      };
      s.posts.push(p);
      return summarizePost(s, p, req.user);
    });
    res.status(req.params.id ? 200 : 201).json({ post });
  };
  app.post("/api/posts", requireAuth, savePost);
  app.put("/api/posts/:id", requireAuth, savePost);
  app.delete("/api/posts/:id", requireAuth, async (req, res) => {
    await store.transact((s) => {
      const p = s.posts.find((p) => p.id === req.params.id);
      if (!p) fail(404, "Post not found.");
      if (p.authorId !== req.user.id && req.user.role !== "admin")
        fail(403, "You can delete only your own posts.");
      s.posts = s.posts.filter((x) => x.id !== p.id);
      s.comments = s.comments.filter((x) => x.postId !== p.id);
      s.likes = s.likes.filter((x) => x.postId !== p.id);
      s.saves = s.saves.filter((x) => x.postId !== p.id);
    });
    res.json({ ok: true });
  });
  app.post("/api/posts/:id/like", requireAuth, async (req, res) => {
    const result = await store.transact((s) => {
      if (
        !s.posts.some((p) => p.id === req.params.id && p.status === "published")
      )
        fail(404, "Post not found.");
      const index = s.likes.findIndex(
        (l) => l.postId === req.params.id && l.userId === req.user.id,
      );
      if (index >= 0) s.likes.splice(index, 1);
      else s.likes.push({ postId: req.params.id, userId: req.user.id });
      return {
        liked: index < 0,
        likeCount: s.likes.filter((l) => l.postId === req.params.id).length,
      };
    });
    res.json(result);
  });
  app.get("/api/posts/:id/comments", async (req, res) => {
    const s = await store.read();
    if (
      !s.posts.some((p) => p.id === req.params.id && p.status === "published")
    )
      fail(404, "Post not found.");
    res.json({
      comments: s.comments
        .filter((c) => c.postId === req.params.id)
        .map((c) => ({
          ...c,
          author: publicAuthor(s.users.find((u) => u.id === c.authorId)),
        })),
    });
  });
  app.post("/api/posts/:id/comments", requireAuth, async (req, res) => {
    const data = z.object({ body: text(1000) }).parse(req.body);
    const comment = await store.transact((s) => {
      if (
        !s.posts.some((p) => p.id === req.params.id && p.status === "published")
      )
        fail(404, "Post not found.");
      const c = {
        id: id(),
        postId: req.params.id,
        authorId: req.user.id,
        body: data.body,
        createdAt: now(),
      };
      s.comments.push(c);
      return { ...c, author: publicAuthor(req.user) };
    });
    res.status(201).json({ comment });
  });
  app.delete("/api/comments/:id", requireAuth, async (req, res) => {
    await store.transact((s) => {
      const c = s.comments.find((c) => c.id === req.params.id);
      if (!c) fail(404, "Comment not found.");
      if (c.authorId !== req.user.id && req.user.role !== "admin")
        fail(403, "You can delete only your own comments.");
      s.comments = s.comments.filter((x) => x.id !== c.id);
    });
    res.json({ ok: true });
  });
  app.post("/api/saves", requireAuth, async (req, res) => {
    const data = z
      .object({ type: z.enum(["place", "post"]), id: text(100) })
      .parse(req.body);
    const result = await store.transact((s) => {
      const key = data.type === "place" ? "placeId" : "postId";
      if (
        data.type === "place"
          ? !s.places.some((p) => p.id === data.id && p.status === "approved")
          : !s.posts.some((p) => p.id === data.id && p.status === "published")
      )
        fail(404, "This item is no longer available.");
      const index = s.saves.findIndex(
        (b) => b[key] === data.id && b.userId === req.user.id,
      );
      if (index >= 0) s.saves.splice(index, 1);
      else s.saves.push({ [key]: data.id, userId: req.user.id });
      return { saved: index < 0 };
    });
    res.json(result);
  });
  app.get("/api/saves", requireAuth, async (req, res) => {
    const s = await store.read();
    const saves = s.saves.filter((b) => b.userId === req.user.id);
    res.json({
      places: s.places
        .filter(
          (p) =>
            p.status === "approved" && saves.some((b) => b.placeId === p.id),
        )
        .map((p) => summarizePlace(s, p, req.user)),
      posts: s.posts
        .filter(
          (p) =>
            p.status === "published" && saves.some((b) => b.postId === p.id),
        )
        .map((p) => summarizePost(s, p, req.user)),
    });
  });
  app.post("/api/reports", requireAuth, async (req, res) => {
    const data = z
      .object({
        type: z.enum(["post", "place", "review"]),
        targetId: text(100),
        reason: text(1000),
      })
      .parse(req.body);
    const report = await store.transact((s) => {
      const collection =
        data.type === "post"
          ? s.posts
          : data.type === "place"
            ? s.places
            : s.reviews;
      if (!collection.some((x) => x.id === data.targetId))
        fail(404, "Content not found.");
      const r = {
        id: id(),
        ...data,
        authorId: req.user.id,
        status: "open",
        createdAt: now(),
      };
      s.reports.push(r);
      return r;
    });
    res.status(201).json({ report });
  });
  app.get("/api/merchant", merchant, async (req, res) => {
    const s = await store.read();
    const places = s.places.filter((p) => p.ownerId === req.user.id);
    const ids = new Set(places.map((p) => p.id));
    res.json({
      places,
      menus: s.menus.filter((m) => ids.has(m.placeId)),
      tables: s.tables.filter((t) => ids.has(t.placeId)),
      orders: s.orders
        .filter((o) => ids.has(o.placeId))
        .map(publicOrder)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    });
  });
  app.get("/api/merchant/places/:id/orders.csv", merchant, async (req, res) => {
    const state = await store.read();
    ownedPlace(state, req.params.id, req.user);
    const range = z
      .enum(["today", "week", "all"])
      .parse(req.query.range || "today");
    res
      .attachment("makanlah-orders-" + malaysiaDate(new Date()) + ".csv")
      .type("text/csv")
      .set("Cache-Control", "private, no-store")
      .send(ordersCsv(exportOrders(state.orders, req.params.id, range)));
  });
  app.get("/api/merchant/tables/:id/qr.png", merchant, async (req, res) => {
    const state = await store.read(),
      table = state.tables.find((t) => t.id === req.params.id);
    if (!table) fail(404, "Table not found.");
    ownedPlace(state, table.placeId, req.user);
    const origin = z.url().parse(req.query.origin || config.appOrigin);
    const baseUrl = new URL(origin);
    if (!["http:", "https:"].includes(baseUrl.protocol))
      fail(400, "The menu address is invalid.");
    const target = new URL("/order/" + table.token, baseUrl);
    const image = await QRCode.toBuffer(target.href, {
      width: 1200,
      margin: 4,
      color: { dark: "#2A1A0E", light: "#FEF3E2" },
    });
    res
      .attachment(
        "makanlah-" + table.label.replace(/[^a-z0-9]+/gi, "-") + ".png",
      )
      .type("png")
      .set("Cache-Control", "private, no-store")
      .send(image);
  });
  app.post("/api/merchant/places", merchant, async (req, res) => {
    const data = placeSchema.parse(req.body);
    const place = await store.transact((s) => {
      verifyImage(s, data.image, req.user);
      const p = {
        id: id(),
        ownerId: req.user.id,
        ...data,
        rating: 0,
        status: "pending",
        createdAt: now(),
      };
      s.places.push(p);
      return p;
    });
    res.status(201).json({ place });
  });
  app.patch("/api/merchant/places/:id/ordering", merchant, async (req, res) => {
    const data = z
      .object({
        acceptingOrders: z.boolean().optional(),
        prepMinutes: z.number().int().min(1).max(120).optional(),
        orderMessage: z.string().trim().max(300).optional(),
      })
      .parse(req.body);
    const place = await store.transact((s) => {
      const p = ownedPlace(s, req.params.id, req.user);
      Object.assign(p, data, { updatedAt: now() });
      return p;
    });
    res.json({ place });
  });
  app.put("/api/merchant/places/:id", merchant, async (req, res) => {
    const data = placeSchema.parse(req.body);
    const place = await store.transact((s) => {
      const p = ownedPlace(s, req.params.id, req.user);
      if (p.image !== data.image) verifyImage(s, data.image, req.user);
      Object.assign(p, data, { status: "pending", updatedAt: now() });
      return p;
    });
    res.json({ place });
  });
  app.post("/api/merchant/places/:id/menu", merchant, async (req, res) => {
    const data = menuSchema.parse(req.body);
    const item = await store.transact((s) => {
      const place = ownedPlace(s, req.params.id, req.user);
      if (data.image && data.image !== place.image)
        verifyImage(s, data.image, req.user);
      const m = { id: id(), placeId: place.id, ...data };
      s.menus.push(m);
      return m;
    });
    res.status(201).json({ item });
  });
  app.put("/api/merchant/menu/:id", merchant, async (req, res) => {
    const data = menuSchema.parse(req.body);
    const item = await store.transact((s) => {
      const m = s.menus.find((m) => m.id === req.params.id);
      if (!m) fail(404, "Menu item not found.");
      const p = ownedPlace(s, m.placeId, req.user);
      if (data.image && data.image !== m.image && data.image !== p.image)
        verifyImage(s, data.image, req.user);
      Object.assign(m, data);
      return m;
    });
    res.json({ item });
  });
  app.delete("/api/merchant/menu/:id", merchant, async (req, res) => {
    await store.transact((s) => {
      const m = s.menus.find((m) => m.id === req.params.id);
      if (!m) fail(404, "Menu item not found.");
      ownedPlace(s, m.placeId, req.user);
      s.menus = s.menus.filter((x) => x.id !== m.id);
    });
    res.json({ ok: true });
  });
  app.post("/api/merchant/places/:id/tables", merchant, async (req, res) => {
    const data = z.object({ label: text(60) }).parse(req.body);
    const table = await store.transact((s) => {
      ownedPlace(s, req.params.id, req.user);
      if (
        s.tables.some(
          (t) =>
            t.placeId === req.params.id &&
            t.label.toLowerCase() === data.label.toLowerCase(),
        )
      )
        fail(409, "A table already uses this name.");
      const t = {
        id: id(),
        placeId: req.params.id,
        label: data.label,
        token: newToken(),
        active: true,
      };
      s.tables.push(t);
      return t;
    });
    res.status(201).json({ table });
  });
  app.patch(
    "/api/merchant/tables/:id/occupancy",
    merchant,
    async (req, res) => {
      const data = z.object({ occupied: z.boolean() }).parse(req.body);
      const table = await store.transact((s) => {
        const table = s.tables.find((t) => t.id === req.params.id);
        if (!table) fail(404, "Table not found.");
        ownedPlace(s, table.placeId, req.user);
        if (data.occupied) {
          seatTable(table, s.orders, id(), now());
        } else {
          const service = tableService(table, s.orders);
          if (!service.occupied) return table;
          if (service.activeOrders.length)
            fail(
              409,
              "Complete or cancel the table orders before clearing the table.",
            );
          if (service.unpaidOrders.length)
            fail(
              409,
              "Record payment for the table orders before clearing the table.",
            );
          table.occupied = false;
          table.clearedAt = now();
          delete table.occupiedSince;
        }
        return table;
      });
      res.json({ table });
    },
  );
  app.patch("/api/merchant/tables/:id", merchant, async (req, res) => {
    const data = z
      .object({
        active: z.boolean().optional(),
        label: text(60).optional(),
        seats: z.number().int().min(1).max(30).optional(),
        area: text(60).optional(),
      })
      .parse(req.body);
    await store.transact((s) => {
      const table = s.tables.find((t) => t.id === req.params.id);
      if (!table) fail(404, "Table not found.");
      ownedPlace(s, table.placeId, req.user);
      if (
        data.label &&
        s.tables.some(
          (t) =>
            t.id !== table.id &&
            t.placeId === table.placeId &&
            t.label.toLowerCase() === data.label.toLowerCase(),
        )
      )
        fail(409, "A table already uses this name.");
      if (data.label && data.label !== table.label) {
        for (const order of s.orders) {
          if (
            !order.tableId &&
            order.placeId === table.placeId &&
            order.tableLabel === table.label
          )
            order.tableId = table.id;
          if (
            order.tableId === table.id &&
            !["completed", "cancelled"].includes(order.status)
          )
            order.tableLabel = data.label;
        }
      }
      Object.assign(table, data);
    });
    res.json({ ok: true });
  });
  app.post(
    "/api/merchant/places/:id/tables/batch",
    merchant,
    async (req, res) => {
      const data = z
        .object({
          prefix: text(30).default("Table"),
          start: z.number().int().min(1).max(999),
          count: z.number().int().min(1).max(30),
          seats: z.number().int().min(1).max(30).default(2),
          area: text(60).default("Main dining"),
        })
        .parse(req.body);
      const tables = await store.transact((s) => {
        ownedPlace(s, req.params.id, req.user);
        const created = [];
        for (let n = data.start; n < data.start + data.count; n++) {
          const label = `${data.prefix} ${String(n).padStart(2, "0")}`;
          if (
            s.tables.some(
              (t) =>
                t.placeId === req.params.id &&
                t.label.toLowerCase() === label.toLowerCase(),
            )
          )
            continue;
          const t = {
            id: id(),
            placeId: req.params.id,
            label,
            token: newToken(),
            active: true,
            seats: data.seats,
            area: data.area,
          };
          s.tables.push(t);
          created.push(t);
        }
        return created;
      });
      res.status(201).json({ tables });
    },
  );
  app.patch("/api/merchant/orders/:id/payment", merchant, async (req, res) => {
    const data = z.object({ paid: z.boolean() }).parse(req.body);
    const order = await store.transact((s) => {
      const o = s.orders.find((o) => o.id === req.params.id);
      if (!o) fail(404, "Order not found.");
      ownedPlace(s, o.placeId, req.user);
      if (o.status === "cancelled")
        fail(409, "A cancelled order cannot be marked paid.");
      o.paymentStatus = data.paid ? "paid_at_counter" : "pay_at_counter";
      o.updatedAt = now();
      return publicOrder(o);
    });
    res.json({ order });
  });
  app.post(
    "/api/merchant/places/:id/sample-orders",
    merchant,
    async (req, res) => {
      if (!config.demoMode)
        fail(404, "This feature is available only in local demo mode.");
      const orders = await store.transact((s) => {
        const place = ownedPlace(s, req.params.id, req.user);
        if (place.status !== "approved")
          fail(409, "Approve this listing before creating sample orders.");
        if (s.orders.some((o) => o.placeId === place.id && o.sample)) return [];
        const dishes = s.menus.filter(
          (m) => m.placeId === place.id && m.available,
        );
        if (!dishes.length) fail(400, "Add an available menu item first.");
        let tables = s.tables.filter((t) => t.placeId === place.id && t.active);
        if (!tables.length) {
          const t = {
            id: id(),
            placeId: place.id,
            label: "Table 01",
            token: newToken(),
            active: true,
          };
          s.tables.push(t);
          tables = [t];
        }
        const created = ["new", "preparing", "ready"].map((status, i) => {
          const dish = dishes[i % dishes.length],
            quantity = i === 0 ? 2 : 1;
          const o = {
            id: id(),
            placeId: place.id,
            placeName: place.name,
            tableId: tables[i % tables.length].id,
            tableLabel: tables[i % tables.length].label,
            customerName: ["Aina · Sample", "Daniel · Sample", "Mei · Sample"][
              i
            ],
            note:
              i === 0
                ? "Less spicy, please. Sample order."
                : "Sample order for the local preview.",
            items: [
              {
                menuId: dish.id,
                name: dish.name,
                priceCents: dish.priceCents,
                quantity,
              },
            ],
            totalCents: dish.priceCents * quantity,
            status,
            paymentStatus: "pay_at_counter",
            userId: null,
            idempotencyKey: id(),
            trackingHash: hashToken(newToken()),
            sample: true,
            createdAt: new Date(Date.now() - i * 180000).toISOString(),
            updatedAt: now(),
          };
          s.orders.push(o);
          return publicOrder(o);
        });
        return created;
      });
      res.status(201).json({ orders });
    },
  );
  app.get("/api/order/table/:token", async (req, res) => {
    const s = await store.read(),
      table = s.tables.find((t) => t.token === req.params.token && t.active);
    if (!table)
      fail(
        404,
        "This QR code is no longer active. Ask the team for a current menu.",
      );
    const place = s.places.find(
      (p) => p.id === table.placeId && p.status === "approved",
    );
    if (!place) fail(404, "Ordering is not available for this place.");
    res.json({
      table: { label: table.label, token: table.token },
      place,
      menu: s.menus.filter((m) => m.placeId === place.id),
    });
  });
  app.post("/api/orders", async (req, res) => {
    const data = z
      .object({
        tableToken: text(200),
        customerName: text(80),
        note: maybeText(500),
        expectedTotalCents: z.number().int().nonnegative().optional(),
        items: z
          .array(
            z.object({
              menuId: text(100),
              quantity: z.number().int().min(1).max(20),
              expectedUnitPriceCents: z.number().int().nonnegative().optional(),
              variantId: z.string().max(80).optional(),
              addOnIds: z.array(z.string().max(80)).max(12).default([]),
              note: z.string().trim().max(200).default(""),
            }),
          )
          .min(1)
          .max(30),
        idempotencyKey: z.uuid(),
      })
      .parse(req.body);
    const trackingKey = newToken();
    const result = await store.transact((s) => {
      const old = s.orders.find(
        (o) => o.idempotencyKey === data.idempotencyKey,
      );
      if (old)
        fail(409, "This order was already placed. Check your order receipt.");
      const table = s.tables.find(
        (t) => t.token === data.tableToken && t.active,
      );
      if (!table) fail(404, "This table is no longer taking orders.");
      const place = s.places.find(
        (p) => p.id === table.placeId && p.status === "approved",
      );
      if (!place) fail(400, "This place is not taking orders.");
      if (place.acceptingOrders === false)
        fail(
          409,
          "Ordering is paused right now. Please ask the team for help.",
        );
      const signature = (i) =>
        JSON.stringify([
          i.menuId,
          i.variantId || "",
          [...i.addOnIds].sort(),
          i.note,
        ]);
      if (new Set(data.items.map(signature)).size !== data.items.length)
        fail(400, "Combine duplicate menu items before ordering.");
      const items = data.items.map((item) => {
        const m = s.menus.find(
          (m) => m.id === item.menuId && m.placeId === place.id && m.available,
        );
        if (!m)
          fail(
            400,
            "A selected item is no longer available. Refresh the menu.",
          );
        const variant = item.variantId
          ? (m.variants || []).find((v) => v.id === item.variantId)
          : null;
        if ((m.variants?.length && !variant) || (item.variantId && !variant))
          fail(400, "Choose a valid option for " + m.name + ".");
        if (new Set(item.addOnIds).size !== item.addOnIds.length)
          fail(400, "Choose each extra once.");
        const addOns = item.addOnIds.map((optionId) => {
          const option = (m.addOns || []).find((a) => a.id === optionId);
          if (!option)
            fail(400, "A selected extra is unavailable. Refresh the menu.");
          return option;
        });
        const priceCents =
          m.priceCents +
          (variant?.priceCents || 0) +
          addOns.reduce((n, a) => n + a.priceCents, 0);
        if (
          item.expectedUnitPriceCents !== undefined &&
          item.expectedUnitPriceCents !== priceCents
        )
          throw Object.assign(
            new Error(
              "Menu prices changed. Review the updated total before ordering.",
            ),
            { status: 409, code: "MENU_PRICE_CHANGED" },
          );
        return {
          menuId: m.id,
          name: m.name,
          priceCents,
          quantity: item.quantity,
          ...(variant ? { variantName: variant.name } : {}),
          ...(addOns.length ? { addOns } : {}),
          ...(item.note ? { note: item.note } : {}),
        };
      });
      const totalCents = items.reduce(
        (n, i) => n + i.priceCents * i.quantity,
        0,
      );
      if (
        data.expectedTotalCents !== undefined &&
        data.expectedTotalCents !== totalCents
      )
        throw Object.assign(
          new Error(
            "Menu prices changed. Review the updated total before ordering.",
          ),
          { status: 409, code: "MENU_PRICE_CHANGED" },
        );
      const tableServiceId = seatTable(table, s.orders, id(), now());
      const order = {
        id: id(),
        placeId: place.id,
        placeName: place.name,
        tableId: table.id,
        tableServiceId,
        tableLabel: table.label,
        customerName: data.customerName,
        note: data.note,
        items,
        totalCents,
        status: "new",
        paymentStatus: "pay_at_counter",
        userId: req.user?.id || null,
        idempotencyKey: data.idempotencyKey,
        trackingHash: hashToken(trackingKey),
        createdAt: now(),
        updatedAt: now(),
      };
      s.orders.push(order);
      return publicOrder(order);
    });
    res.status(201).json({ order: result, trackingKey });
  });
  app.get("/api/orders", requireAuth, async (req, res) =>
    res.json({
      orders: (await store.read()).orders
        .filter((o) => o.userId === req.user.id)
        .map(publicOrder),
    }),
  );
  app.get("/api/orders/:id", async (req, res) => {
    const s = await store.read(),
      order = s.orders.find((o) => o.id === req.params.id);
    if (!order) fail(404, "Order not found.");
    const p = s.places.find((p) => p.id === order.placeId);
    if (
      !(
        req.user &&
        (order.userId === req.user.id ||
          p?.ownerId === req.user.id ||
          req.user.role === "admin")
      ) &&
      !secureEqual(
        order.trackingHash,
        hashToken(String(req.query.access || "")),
      )
    )
      fail(404, "Order not found.");
    res.json({ order: publicOrder(order) });
  });
  app.patch("/api/merchant/orders/:id", merchant, async (req, res) => {
    const data = z
      .object({
        status: z.enum([
          "accepted",
          "preparing",
          "ready",
          "completed",
          "cancelled",
        ]),
      })
      .parse(req.body);
    const order = await store.transact((s) => {
      const o = s.orders.find((o) => o.id === req.params.id);
      if (!o) fail(404, "Order not found.");
      ownedPlace(s, o.placeId, req.user);
      const transitions = {
        new: ["accepted", "cancelled"],
        accepted: ["preparing", "cancelled"],
        preparing: ["ready", "cancelled"],
        ready: ["completed"],
        completed: [],
        cancelled: [],
      };
      if (!transitions[o.status].includes(data.status))
        fail(409, `Cannot move an order from ${o.status} to ${data.status}.`);
      o.status = data.status;
      o.updatedAt = now();
      return publicOrder(o);
    });
    res.json({ order });
  });
  app.get("/api/admin", admin, async (req, res) => {
    const s = await store.read();
    res.json({
      users: s.users.map(publicUser),
      places: s.places,
      posts: s.posts
        .filter((p) => p.status !== "draft")
        .map((p) => summarizePost(s, p, req.user)),
      reports: s.reports,
      audit: s.audit.slice(-100).reverse(),
      orders: s.orders.map(publicOrder),
    });
  });
  app.patch("/api/admin/places/:id", admin, async (req, res) => {
    const data = z
      .object({ status: z.enum(["approved", "rejected", "pending"]) })
      .parse(req.body);
    await store.transact((s) => {
      const p = s.places.find((p) => p.id === req.params.id);
      if (!p) fail(404, "Listing not found.");
      p.status = data.status;
      s.audit.push({
        id: id(),
        actorId: req.user.id,
        action: `Listing ${data.status}`,
        targetId: p.id,
        createdAt: now(),
      });
    });
    res.json({ ok: true });
  });
  app.patch("/api/admin/posts/:id", admin, async (req, res) => {
    const data = z
      .object({ status: z.enum(["published", "hidden"]) })
      .parse(req.body);
    await store.transact((s) => {
      const p = s.posts.find((p) => p.id === req.params.id);
      if (!p) fail(404, "Post not found.");
      if (p.status === "draft")
        fail(400, "A private draft cannot be published by an admin.");
      p.status = data.status;
      s.audit.push({
        id: id(),
        actorId: req.user.id,
        action: `Post ${data.status}`,
        targetId: p.id,
        createdAt: now(),
      });
    });
    res.json({ ok: true });
  });
  app.patch("/api/admin/users/:id", admin, async (req, res) => {
    const data = z
      .object({
        role: z.enum(["user", "merchant", "admin"]).optional(),
        status: z.enum(["active", "suspended"]).optional(),
      })
      .parse(req.body);
    await store.transact((s) => {
      const u = s.users.find((u) => u.id === req.params.id);
      if (!u) fail(404, "User not found.");
      if (
        u.id === req.user.id &&
        (data.status === "suspended" || (data.role && data.role !== "admin"))
      )
        fail(400, "You cannot remove your own admin access.");
      Object.assign(u, data);
      if (data.status === "suspended")
        s.sessions = s.sessions.filter((x) => x.userId !== u.id);
      s.audit.push({
        id: id(),
        actorId: req.user.id,
        action: `User updated: ${JSON.stringify(data)}`,
        targetId: u.id,
        createdAt: now(),
      });
    });
    res.json({ ok: true });
  });
  app.patch("/api/admin/reports/:id", admin, async (req, res) => {
    await store.transact((s) => {
      const r = s.reports.find((r) => r.id === req.params.id);
      if (!r) fail(404, "Report not found.");
      r.status = "resolved";
      r.resolvedAt = now();
      s.audit.push({
        id: id(),
        actorId: req.user.id,
        action: "Report resolved",
        targetId: r.id,
        createdAt: now(),
      });
    });
    res.json({ ok: true });
  });
  app.delete("/api/admin/reviews/:id", admin, async (req, res) => {
    await store.transact((s) => {
      s.reviews = s.reviews.filter((r) => r.id !== req.params.id);
      s.audit.push({
        id: id(),
        actorId: req.user.id,
        action: "Review removed",
        targetId: req.params.id,
        createdAt: now(),
      });
    });
    res.json({ ok: true });
  });
  app.use("/api", (req, res) =>
    res.status(404).json({ error: "This endpoint does not exist." }),
  );
  const dist = path.resolve("dist");
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get("/{*splat}", (req, res) =>
      res.sendFile(path.join(dist, "index.html")),
    );
  }
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    if (error instanceof z.ZodError)
      return res.status(400).json({
        error: error.issues
          .map((i) => `${i.path.join(".") || "Input"}: ${i.message}`)
          .join("; "),
      });
    if (error instanceof multer.MulterError)
      return res.status(400).json({
        error:
          error.code === "LIMIT_FILE_SIZE"
            ? "This file is too large. Use photos up to 12 MB or videos up to 80 MB."
            : "Upload up to four files at a time.",
      });
    if (!error.status) console.error(error);
    res.status(error.status || 500).json({
      error: error.status
        ? error.message
        : "Something went wrong. Please try again.",
      ...(error.code === "MENU_PRICE_CHANGED" ? { code: error.code } : {}),
    });
  });
  return { app, store, config, close: () => store.close() };
}
