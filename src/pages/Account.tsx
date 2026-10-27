import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  Bookmark,
  Check,
  Eye,
  EyeOff,
  Store,
  UserRound,
} from "lucide-react";
import { mediaUrl, money, send, useApi } from "../api";
import { useAuth, useToast } from "../context";
import { Avatar, Empty, ErrorState, Field, Loading } from "../components/ui";
import { FoodCard } from "../components/FoodCard";
import { PostCard } from "../components/PostCard";
import { cuisines } from "./Discover";
import { staticPreview } from "../paths";
import type { Order, Place, Post, Preferences, User } from "../types";

export function SignIn() {
  const [params] = useSearchParams(),
    [register, setRegister] = useState(params.get("mode") === "register"),
    [role, setRole] = useState(
      params.get("role") === "merchant" ? "merchant" : "user",
    ),
    [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const auth = useAuth(),
    nav = useNavigate();
  async function submit() {
    setBusy(true);
    setError("");
    try {
      const r = await send<{ user: User }>(
        register ? "/auth/register" : "/auth/login",
        { name, email, password, role },
      );
      auth.setUser(r.user);
      const next = params.get("next");
      nav(
        next?.startsWith("/") && !next.startsWith("//")
          ? next
          : r.user.role === "merchant"
            ? "/merchant"
            : r.user.role === "admin"
              ? "/admin"
              : "/discover",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (staticPreview)
    return <div className="auth-page container operational-auth"><section className="auth-form"><h1>Accounts are not enabled</h1><p>This preview includes food search, maps and the food feed.</p><Link className="btn" to="/discover">Browse food</Link></section></div>;
  return (
    <div className="auth-page container operational-auth">
      <section className="auth-form">
        <h1>{register ? "Create an account" : "Sign in"}</h1>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          {register && (
            <>
              <div className="role-options">
                <button
                  type="button"
                  className={role === "user" ? "active" : ""}
                  onClick={() => setRole("user")}
                >
                  <UserRound size={18} />
                  Personal account
                </button>
                <button
                  type="button"
                  className={role === "merchant" ? "active" : ""}
                  onClick={() => setRole("merchant")}
                >
                  <Store size={18} />
                  Business account
                </button>
              </div>
              <Field label={role === "merchant" ? "Business name" : "Name"}>
                <input
                  required
                  autoComplete="name"
                  value={name}
                  maxLength={80}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
            </>
          )}
          <Field label="Email address">
            <input
              required
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </Field>
          <Field
            label="Password"
            hint={register ? "Use at least 10 characters." : undefined}
          >
            <div className="password-field">
              <input
                required
                minLength={register ? 10 : undefined}
                maxLength={128}
                autoComplete={register ? "new-password" : "current-password"}
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="round"
                aria-label={show ? "Hide password" : "Show password"}
                onClick={() => setShow(!show)}
              >
                {show ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </Field>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button className="btn full" disabled={busy}>
            {busy ? "Please wait…" : register ? "Create account" : "Sign in"}
            <ArrowRight size={18} />
          </button>
        </form>
        <p>
          {register ? "Have an account?" : "Need an account?"}{" "}
          <button
            className="text-link"
            onClick={() => {
              setRegister(!register);
              setError("");
            }}
          >
            {register ? "Sign in" : "Create an account"}
          </button>
        </p>
      </section>
    </div>
  );
}
export function PreferencesPage() {
  const auth = useAuth(),
    toast = useToast(),
    nav = useNavigate(),
    [value, setValue] = useState<Preferences>(auth.user!.preferences),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const toggle = (key: "cuisines" | "dietary", item: string) =>
    setValue((v) => ({
      ...v,
      [key]: v[key].includes(item)
        ? v[key].filter((x) => x !== item)
        : [...v[key], item],
    }));
  return (
    <div className="container preferences-page">
      <div className="page-heading">
        <h1>Your kind of makan.</h1>
        <p>A few small preferences. A whole lot more you.</p>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const r = await send<{ user: User }>(
              "/profile",
              { preferences: value },
              "PATCH",
            );
            auth.setUser(r.user);
            toast("Your tastes are saved.");
            nav("/discover?forYou=true");
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <section>
          <h2>What’s usually on your mind?</h2>
          <p>
            Pick the cuisines you love. Leave them all off to explore
            everything.
          </p>
          <div className="choice-grid">
            {cuisines.map((c) => (
              <button
                type="button"
                key={c}
                className={value.cuisines.includes(c) ? "selected" : ""}
                aria-pressed={value.cuisines.includes(c)}
                onClick={() => toggle("cuisines", c)}
              >
                {c}
                {value.cuisines.includes(c) && <Check size={18} />}
              </button>
            ))}
          </div>
        </section>
        <section>
          <h2>A few things to keep in mind.</h2>
          <div className="chips">
            {["Vegetarian", "Halal-friendly"].map((t) => (
              <button
                key={t}
                type="button"
                className={`chip ${value.dietary.includes(t) ? "active" : ""}`}
                aria-pressed={value.dietary.includes(t)}
                onClick={() => toggle("dietary", t)}
              >
                {t}
              </button>
            ))}
            <button
              type="button"
              className={`chip ${value.spicy ? "active" : ""}`}
              aria-pressed={value.spicy}
              onClick={() => setValue((v) => ({ ...v, spicy: !v.spicy }))}
            >
              Spicy, please
            </button>
          </div>
          <small>
            Dietary tags are listing information, not certification. Always
            check with the venue.
          </small>
        </section>
        <section>
          <h2>Your everyday food budget.</h2>
          <label className="budget-slider">
            Up to <strong>{money(value.budget)}</strong>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={value.budget}
              onChange={(e) =>
                setValue((v) => ({ ...v, budget: Number(e.target.value) }))
              }
            />
          </label>
        </section>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="btn" disabled={busy}>
          {busy ? "Saving…" : "Find my kind of food"}
          <ArrowRight size={18} />
        </button>
      </form>
    </div>
  );
}
export function Library({ savedOnly = false }: { savedOnly?: boolean }) {
  const auth = useAuth(),
    [params, setParams] = useSearchParams(),
    [editing, setEditing] = useState(false),
    [name, setName] = useState(auth.user!.name),
    [bio, setBio] = useState(auth.user!.bio),
    [saving, setSaving] = useState(false);
  const toast = useToast(),
    tab = params.get("tab") || (savedOnly ? "saved" : "posts");
  const saves = useApi<{ places: Place[]; posts: Post[] }>("/saves"),
    posts = useApi<{ posts: Post[] }>("/posts?mine=true"),
    orders = useApi<{ orders: Order[] }>("/orders");
  const current = tab === "saved" ? saves : tab === "orders" ? orders : posts;
  return (
    <div className="container library-page">
      <div className="profile-header">
        <Avatar name={auth.user!.name} large />
        <div>
          <h1>
            {savedOnly
              ? "A little saved sedap."
              : auth.user!.name + "’s food diary"}
          </h1>
          <p>
            {savedOnly
              ? "For the next time someone asks, “Makan apa?”"
              : auth.user!.bio ||
                "Your discoveries, your stories, your next favourite bite."}
          </p>
          <div className="button-row">
            <button className="text-link" onClick={() => setEditing(!editing)}>
              {editing ? "Close profile editor" : "Edit profile"}
            </button>
            <Link className="text-link" to="/preferences">
              My taste preferences
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </div>
      {editing && (
        <form
          className="profile-editor"
          onSubmit={async (e) => {
            e.preventDefault();
            setSaving(true);
            try {
              const r = await send<{ user: User }>(
                "/profile",
                { name, bio },
                "PATCH",
              );
              auth.setUser(r.user);
              setEditing(false);
              toast("Profile updated.");
            } catch (e) {
              toast((e as Error).message);
            } finally {
              setSaving(false);
            }
          }}
        >
          <Field label="Your name">
            <input
              required
              maxLength={80}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <Field label="A little about your food diary">
            <textarea
              maxLength={500}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </Field>
          <button className="btn" disabled={saving}>
            {saving ? "Saving…" : "Save profile"}
          </button>
        </form>
      )}
      <div className="tabs">
        {[
          ["posts", "My posts"],
          ["saved", "Saved bites"],
          ["drafts", "Private drafts"],
          ["orders", "My orders"],
        ].map(([key, label]) => (
          <button
            className={tab === key ? "active" : ""}
            key={key}
            onClick={() => setParams({ tab: key })}
          >
            {label}
          </button>
        ))}
      </div>
      {current.loading ? (
        <Loading />
      ) : current.error ? (
        <ErrorState message={current.error} retry={current.reload} />
      ) : tab === "saved" ? (
        <>
          {saves.data?.places.length ? (
            <div className="food-grid four">
              {saves.data.places.map((p) => (
                <FoodCard key={p.id} place={p} />
              ))}
            </div>
          ) : (
            <Empty
              title="Make room for your next favourite."
              action="Explore food"
              to="/discover"
            >
              Tap the bookmark on a place or post to keep it here.
            </Empty>
          )}
          {!!saves.data?.posts.length && (
            <section className="section">
              <h2>Stories worth keeping.</h2>
              <div className="post-grid">
                {saves.data.posts.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            </section>
          )}
        </>
      ) : tab === "orders" ? (
        orders.data?.orders.length ? (
          <div className="order-history">
            {orders.data.orders.map((o) => (
              <Link key={o.id} to={"/order/receipt/" + o.id}>
                <div>
                  <strong>{o.placeName}</strong>
                  <p>
                    {o.tableLabel} · {o.items.length} items
                  </p>
                </div>
                <span className={"status " + o.status}>{o.status}</span>
                <strong>{money(o.totalCents / 100)}</strong>
                <ArrowRight size={18} />
              </Link>
            ))}
          </div>
        ) : (
          <Empty title="No orders">
            Scan the table QR code to place an order.
          </Empty>
        )
      ) : (
        <>
          {posts.data?.posts.filter((p) =>
            tab === "drafts" ? p.status === "draft" : p.status !== "draft",
          ).length ? (
            <div className="post-grid">
              {posts.data.posts
                .filter((p) =>
                  tab === "drafts"
                    ? p.status === "draft"
                    : p.status !== "draft",
                )
                .map((p) => (
                  <PostCard key={p.id} post={p} onDelete={posts.reload} />
                ))}
            </div>
          ) : (
            <Empty
              title={
                tab === "drafts"
                  ? "A little thought for later."
                  : "Your food diary starts with a bite."
              }
              action="Share a bite"
              to="/post"
            >
              {tab === "drafts"
                ? "Save a post as a draft and come back when you’re ready."
                : "Your photos, videos and food discoveries will live here."}
            </Empty>
          )}
        </>
      )}
    </div>
  );
}
