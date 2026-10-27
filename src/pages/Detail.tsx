import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Bookmark,
  Clock,
  Flag,
  MapPin,
  Star,
  ArrowUpRight,
} from "lucide-react";
import { date, mediaUrl, money, send, useApi } from "../api";
import { useAuth, useToast } from "../context";
import { Avatar, Empty, ErrorState, Field, Loading } from "../components/ui";
import { FoodMap } from "../components/Map";
import { PostCard, ReportDrawer } from "../components/PostCard";
import type { MenuItem, Place, Post, Review } from "../types";
export default function Detail() {
  const { id } = useParams(),
    { data, error, loading, reload } = useApi<{
      place: Place;
      menu: MenuItem[];
      reviews: Review[];
      posts: Post[];
    }>("/places/" + id);
  const auth = useAuth(),
    toast = useToast();
  const [rating, setRating] = useState(5),
    [review, setReview] = useState(""),
    [reviewError, setReviewError] = useState(""),
    [busy, setBusy] = useState(false),
    [report, setReport] = useState(false);
  if (loading) return <Loading />;
  if (error || !data)
    return <ErrorState message={error || "Place not found."} retry={reload} />;
  const p = data.place;
  async function save() {
    if (!auth.requireUser()) return;
    try {
      await send("/saves", { type: "place", id });
      reload();
    } catch (e) {
      toast((e as Error).message);
    }
  }
  return (
    <div className="container detail-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/discover">Explore food</Link>
        <span>/</span>
        <span>{p.name}</span>
      </nav>
      <div className="detail-hero">
        <img src={mediaUrl(p.image)} alt={p.dish} />
        <div className="detail-summary">
          <div className="detail-tags">
            <span className="chip">{p.cuisine}</span>
            {p.sample && <span className="chip">Sample listing</span>}
          </div>
          <h1>{p.dish}</h1>
          <h2>{p.name}</h2>
          <p className="detail-rating">
            <Star size={18} />
            <strong>{p.rating ? p.rating.toFixed(1) : "New"}</strong>
            <span>
              ({p.reviewCount} {p.reviewCount === 1 ? "review" : "reviews"})
            </span>
            <span>·</span>
            <strong>{money(p.price)}</strong>
          </p>
          <p>{p.description}</p>
          <div className="detail-facts">
            <span>
              <MapPin size={18} />
              {p.area}, {p.city}
            </span>
            <span>
              <Clock size={18} />
              {p.opensAt}–{p.closesAt} · {p.open ? "Open now" : "Closed now"}{" "}
              (MYT)
            </span>
          </div>
          <div className="chips">
            {p.tags.map((t) => (
              <span className="chip" key={t}>
                {t}
              </span>
            ))}
          </div>
          <div className="button-row">
            <button className="btn" onClick={save}>
              <Bookmark size={17} fill={p.saved ? "currentColor" : "none"} />
              {p.saved ? "Saved to my places" : "Save this place"}
            </button>
            <a
              className="btn secondary"
              href={`https://www.openstreetmap.org/directions?to=${p.lat}%2C${p.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              Directions
              <ArrowUpRight size={17} />
            </a>
          </div>
          <small>
            Listing tags are provided by the merchant. Check dietary
            requirements directly with the venue.
          </small>
        </div>
      </div>
      <div className="detail-body">
        <section>
          <div className="section-head">
            <div>
              <h2>A little taste of the menu.</h2>
              <p>Pick a familiar favourite or try something new.</p>
            </div>
            {p.id === "nasi" && p.sample && (
              <Link className="text-link" to="/order/kampung-table-01-demo">
                Try QR ordering
                <ArrowUpRight size={17} />
              </Link>
            )}
          </div>
          {data.menu.length ? (
            <div className="menu-list">
              {data.menu.map((m) => (
                <article
                  key={m.id}
                  className={!m.available ? "unavailable" : ""}
                >
                  <img
                    src={mediaUrl(m.image || p.image)}
                    alt=""
                    loading="lazy"
                  />
                  <div>
                    <h3>{m.name}</h3>
                    <p>{m.description}</p>
                    {!m.available && <small>Currently unavailable</small>}
                  </div>
                  <strong>{money(m.priceCents / 100)}</strong>
                </article>
              ))}
            </div>
          ) : (
            <Empty title="A menu is on its way.">
              The merchant hasn’t added a menu yet.
            </Empty>
          )}
          <section className="reviews-section">
            <h2>From the food diaries.</h2>
            {data.reviews.map((r) => (
              <article className="review" key={r.id}>
                <div className="author">
                  <Avatar name={r.author?.name} />
                  <div>
                    <strong>{r.author?.name}</strong>
                    <small>
                      {date(r.createdAt)}
                      {r.sample ? " · Sample review" : ""}
                    </small>
                  </div>
                  <span className="review-stars">
                    <Star size={16} />
                    {r.rating}
                  </span>
                </div>
                <p>{r.body}</p>
              </article>
            ))}
            {!data.reviews.length && (
              <p className="muted">
                No reviews yet. Share your first impression.
              </p>
            )}
            <form
              className="review-form"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!auth.requireUser()) return;
                setBusy(true);
                setReviewError("");
                try {
                  await send("/places/" + id + "/reviews", {
                    body: review,
                    rating,
                  });
                  setReview("");
                  reload();
                  toast("Your experience has been added.");
                } catch (e) {
                  setReviewError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <h3>Been here? Pass it on.</h3>
              <Field label="Your rating">
                <select
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option value={n} key={n}>
                      {n} {n === 1 ? "star" : "stars"}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Your experience">
                <textarea
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  required
                  maxLength={3000}
                  placeholder="What did you love? What should someone know?"
                />
              </Field>
              {reviewError && (
                <p className="form-error" role="alert">
                  {reviewError}
                </p>
              )}
              <button className="btn" disabled={busy}>
                {busy ? "Sharing…" : "Share my experience"}
              </button>
              <small>
                One review per account per place. Sharing again updates your
                review.
              </small>
            </form>
          </section>
        </section>
        <aside className="place-location">
          <h2>Find your way here.</h2>
          <FoodMap
            places={[p]}
            center={{ lat: p.lat, lng: p.lng }}
            selected={p.id}
          />
          <p>
            <MapPin size={17} />
            {p.address}
          </p>
          <a
            className="text-link"
            href={`https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=17/${p.lat}/${p.lng}`}
            target="_blank"
            rel="noreferrer"
          >
            Open map
            <ArrowUpRight size={17} />
          </a>
          <button
            className="text-link report-link"
            onClick={() => {
              if (auth.requireUser()) setReport(true);
            }}
          >
            <Flag size={16} />
            Report this listing
          </button>
        </aside>
      </div>
      {data.posts.length > 0 && (
        <section className="section">
          <h2>Spotted in the community.</h2>
          <div className="post-grid detail-posts">
            {data.posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}
      {report && (
        <ReportDrawer
          type="place"
          targetId={p.id}
          onClose={() => setReport(false)}
        />
      )}
    </div>
  );
}
