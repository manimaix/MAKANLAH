import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import QRCode from "qrcode";
import {
  ArrowRight,
  Download,
  ExternalLink,
  Plus,
  QrCode,
  Store,
  Upload,
  X,
} from "lucide-react";
import { api, date, mediaUrl, money, send, useApi } from "../api";
import { useAuth, useToast } from "../context";
import { Empty, ErrorState, Field, Loading } from "../components/ui";
import type {
  Media,
  MenuItem,
  MerchantData,
  OrderStatus,
  Place,
  Table,
} from "../types";
import { cuisines } from "./Discover";

const initialListing = {
  name: "",
  dish: "",
  description: "",
  address: "",
  area: "",
  city: "Kuala Lumpur",
  cuisine: "Malay",
  price: 12,
  lat: 3.1535,
  lng: 101.707,
  tags: [] as string[],
  image: "",
  opensAt: "07:00",
  closesAt: "23:00",
};
export function ListingEditor({
  place,
  onClose,
  onSaved,
}: {
  place?: Place;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(place ? { ...place } : initialListing),
    [busy, setBusy] = useState(false),
    [uploading, setUploading] = useState(false),
    [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null),
    toast = useToast();
  const set = (key: string, v: unknown) =>
    setValue((p) => ({ ...p, [key]: v }));
  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const data = new FormData();
      data.append("files", file);
      const r = await api<{ media: Media[] }>("/media", {
        method: "POST",
        body: data,
      });
      set("image", r.media[0].url);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }
  return (
    <section className="workspace-editor">
      <header>
        <div>
          <h2>
            {place ? "Edit your listing" : "A place at the Makanlah table."}
          </h2>
          <p>
            Listings are reviewed by an admin before appearing in discovery.
          </p>
        </div>
        <button
          className="round"
          aria-label="Close listing editor"
          onClick={onClose}
        >
          <X />
        </button>
      </header>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await send(
              "/merchant/places" + (place ? "/" + place.id : ""),
              value,
              place ? "PUT" : "POST",
            );
            toast("Listing sent for review.");
            onSaved();
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="listing-image-upload">
          {value.image ? (
            <img src={mediaUrl(value.image)} alt="Listing photo" />
          ) : (
            <Store size={42} />
          )}
          <button
            type="button"
            className="btn secondary"
            disabled={uploading}
            onClick={() => input.current?.click()}
          >
            <Upload size={17} />
            {uploading ? "Uploading…" : "Upload food photo"}
          </button>
          <input
            ref={input}
            hidden
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </div>
        <div className="form-grid">
          <Field label="Restaurant / stall name">
            <input
              required
              maxLength={100}
              value={value.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
          <Field label="Signature dish">
            <input
              required
              maxLength={100}
              value={value.dish}
              onChange={(e) => set("dish", e.target.value)}
            />
          </Field>
          <Field label="Cuisine">
            <select
              value={value.cuisine}
              onChange={(e) => set("cuisine", e.target.value)}
            >
              {cuisines.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Starting price (RM)">
            <input
              required
              type="number"
              min="0"
              max="5000"
              step="0.01"
              value={value.price}
              onChange={(e) => set("price", Number(e.target.value))}
            />
          </Field>
          <Field label="City">
            <input
              required
              value={value.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </Field>
          <Field label="Neighbourhood">
            <input
              required
              value={value.area}
              onChange={(e) => set("area", e.target.value)}
            />
          </Field>
          <Field label="Address">
            <input
              required
              value={value.address}
              onChange={(e) => set("address", e.target.value)}
            />
          </Field>
          <Field label="Description">
            <textarea
              required
              maxLength={3000}
              value={value.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <Field label="Latitude">
            <input
              required
              type="number"
              step="any"
              min="-90"
              max="90"
              value={value.lat}
              onChange={(e) => set("lat", Number(e.target.value))}
            />
          </Field>
          <Field label="Longitude">
            <input
              required
              type="number"
              step="any"
              min="-180"
              max="180"
              value={value.lng}
              onChange={(e) => set("lng", Number(e.target.value))}
            />
          </Field>
          <Field label="Opens at (Malaysia time)">
            <input
              required
              type="time"
              value={value.opensAt}
              onChange={(e) => set("opensAt", e.target.value)}
            />
          </Field>
          <Field label="Closes at (Malaysia time)">
            <input
              required
              type="time"
              value={value.closesAt}
              onChange={(e) => set("closesAt", e.target.value)}
            />
          </Field>
        </div>
        <fieldset>
          <legend>Listing tags</legend>
          <div className="chips">
            {[
              "Halal-friendly",
              "Vegetarian",
              "Spicy",
              "Breakfast",
              "Lunch",
              "Dinner",
              "Sweet treats",
            ].map((t) => (
              <label className="check-row" key={t}>
                <input
                  type="checkbox"
                  checked={value.tags.includes(t)}
                  onChange={(e) =>
                    set(
                      "tags",
                      e.target.checked
                        ? [...value.tags, t]
                        : value.tags.filter((x) => x !== t),
                    )
                  }
                />
                {t}
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <div className="button-row">
          <button className="btn" disabled={busy || uploading || !value.image}>
            {busy ? "Submitting…" : "Submit for review"}
            <ArrowRight size={17} />
          </button>
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
function MenuEditor({
  placeId,
  item,
  onSaved,
  onClose,
  image,
}: {
  placeId: string;
  item?: MenuItem;
  onSaved: () => void;
  onClose: () => void;
  image: string;
}) {
  const [value, setValue] = useState({
      name: item?.name || "",
      description: item?.description || "",
      category: item?.category || "Mains",
      price: item ? item.priceCents / 100 : 0,
      available: item?.available ?? true,
      image: item?.image || image,
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <form
      className="inline-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          await send(
            item
              ? "/merchant/menu/" + item.id
              : "/merchant/places/" + placeId + "/menu",
            { ...value, priceCents: Math.round(value.price * 100) },
            item ? "PUT" : "POST",
          );
          onSaved();
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h3>{item ? "Edit menu item" : "Something new on the menu."}</h3>
      <div className="form-grid">
        <Field label="Item name">
          <input
            required
            maxLength={100}
            value={value.name}
            onChange={(e) => setValue((v) => ({ ...v, name: e.target.value }))}
          />
        </Field>
        <Field label="Price (RM)">
          <input
            type="number"
            required
            min="0"
            step="0.01"
            value={value.price}
            onChange={(e) =>
              setValue((v) => ({ ...v, price: Number(e.target.value) }))
            }
          />
        </Field>
        <Field label="Category">
          <input
            required
            value={value.category}
            onChange={(e) =>
              setValue((v) => ({ ...v, category: e.target.value }))
            }
          />
        </Field>
        <Field label="Description">
          <input
            value={value.description}
            onChange={(e) =>
              setValue((v) => ({ ...v, description: e.target.value }))
            }
          />
        </Field>
      </div>
      <label className="check-row">
        <input
          type="checkbox"
          checked={value.available}
          onChange={(e) =>
            setValue((v) => ({ ...v, available: e.target.checked }))
          }
        />
        Available to order
      </label>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <div className="button-row">
        <button className="btn" disabled={busy}>
          {busy ? "Saving…" : "Save item"}
        </button>
        <button type="button" className="btn secondary" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}
function QRTable({
  table,
  origin,
  onToggle,
}: {
  table: Table;
  origin: string;
  onToggle: () => void;
}) {
  const [image, setImage] = useState(""),
    [error, setError] = useState("");
  const url = origin.replace(/\/$/, "") + "/order/" + table.token;
  useEffect(() => {
    setError("");
    QRCode.toDataURL(url, {
      width: 420,
      margin: 3,
      color: { dark: "#2A1A0E", light: "#FEF3E2" },
    })
      .then(setImage)
      .catch(() =>
        setError("This address could not be converted to a QR code."),
      );
  }, [url]);
  return (
    <article className="qr-table">
      {image && <img src={image} alt={"Order QR code for " + table.label} />}
      <h3>{table.label}</h3>
      <span className={"status " + (table.active ? "approved" : "rejected")}>
        {table.active ? "Active" : "Disabled"}
      </span>
      {error && <p role="alert">{error}</p>}
      <a className="text-link" href={url} target="_blank" rel="noreferrer">
        Open table menu
        <ExternalLink size={15} />
      </a>
      <a
        className="btn secondary"
        href={image}
        download={"makanlah-" + table.label.replaceAll(" ", "-") + ".png"}
      >
        <Download size={17} />
        Download QR
      </a>
      <button className="text-link" onClick={onToggle}>
        {table.active ? "Disable QR code" : "Enable QR code"}
      </button>
    </article>
  );
}
const nextStatus: Record<OrderStatus, OrderStatus | undefined> = {
  new: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "completed",
  completed: undefined,
  cancelled: undefined,
};
export default function Merchant() {
  const auth = useAuth(),
    toast = useToast(),
    { data, error, loading, reload } = useApi<MerchantData>("/merchant");
  const [tab, setTab] = useState("overview"),
    [editor, setEditor] = useState<Place | "new" | null>(null),
    [placeId, setPlaceId] = useState(""),
    [menuEditor, setMenuEditor] = useState<MenuItem | "new" | null>(null),
    [tableName, setTableName] = useState(""),
    [qrOrigin, setQrOrigin] = useState(location.origin),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    if (data?.places.length && !data.places.some((p) => p.id === placeId))
      setPlaceId(data.places[0].id);
  }, [data, placeId]);
  useEffect(() => {
    if (tab !== "orders") return;
    const interval = setInterval(reload, 10000);
    return () => clearInterval(interval);
  }, [tab, reload]);
  async function mutate(path: string, body: unknown, method = "POST") {
    setBusy(true);
    try {
      await send(path, body, method);
      reload();
      return true;
    } catch (e) {
      toast((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  if (loading && !data) return <Loading />;
  if (error && !data) return <ErrorState message={error} retry={reload} />;
  if (!data) return null;
  const place = data.places.find((p) => p.id === placeId),
    menus = data.menus.filter((m) => m.placeId === placeId),
    tables = data.tables.filter((t) => t.placeId === placeId);
  return (
    <div className="container workspace">
      <div className="workspace-heading">
        <div>
          <h1>Hello, {auth.user?.name.split(" ")[0]}.</h1>
          <p>Good food deserves to be found. Let’s make it happen.</p>
        </div>
        <button className="btn" onClick={() => setEditor("new")}>
          <Plus size={18} />
          Register a food place
        </button>
      </div>
      <div className="tabs workspace-tabs">
        {[
          ["overview", "Overview"],
          ["listings", "My listings"],
          ["menu", "Menu"],
          ["orders", "Orders"],
          ["qr", "QR tables"],
        ].map(([key, label]) => (
          <button
            className={tab === key ? "active" : ""}
            key={key}
            onClick={() => {
              setTab(key);
              setMenuEditor(null);
            }}
          >
            {label}
          </button>
        ))}
      </div>
      {error && <ErrorState message={error} retry={reload} />}{" "}
      {editor ? (
        <ListingEditor
          place={editor === "new" ? undefined : editor}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setTab("listings");
            reload();
          }}
        />
      ) : (
        <>
          {tab === "overview" && (
            <>
              <div className="workspace-stats">
                <div>
                  <span>Food places</span>
                  <strong>{data.places.length}</strong>
                </div>
                <div>
                  <span>Awaiting review</span>
                  <strong>
                    {data.places.filter((p) => p.status === "pending").length}
                  </strong>
                </div>
                <div>
                  <span>Active orders</span>
                  <strong>
                    {
                      data.orders.filter(
                        (o) => !["completed", "cancelled"].includes(o.status),
                      ).length
                    }
                  </strong>
                </div>
                <div>
                  <span>Completed sales</span>
                  <strong>
                    {money(
                      data.orders
                        .filter((o) => o.status === "completed")
                        .reduce((n, o) => n + o.totalCents, 0) / 100,
                    )}
                  </strong>
                </div>
              </div>
              <section className="merchant-welcome">
                <div>
                  <h2>
                    Your food.
                    <br />A whole new audience.
                  </h2>
                  <p>
                    Add your place, build a menu, and generate a QR code for
                    every table. Your customers can order directly from their
                    phones.
                  </p>
                  <button
                    className="btn secondary"
                    onClick={() =>
                      setTab(data.places.length ? "menu" : "listings")
                    }
                  >
                    Set up my food place
                    <ArrowRight size={18} />
                  </button>
                </div>
                <img
                  src="/assets/nasi.jpg"
                  alt="Nasi lemak with sambal sotong"
                />
              </section>
            </>
          )}
          {tab === "listings" &&
            (data.places.length ? (
              <div className="merchant-listings">
                {data.places.map((p) => (
                  <article key={p.id}>
                    <img src={mediaUrl(p.image)} alt={p.dish} />
                    <div>
                      <span className={"status " + p.status}>{p.status}</span>
                      <h2>{p.name}</h2>
                      <p>
                        {p.dish} · {p.area}
                      </p>
                      <small>
                        {p.status === "pending"
                          ? "Awaiting admin review. Editing an approved listing sends it for review again."
                          : p.status === "rejected"
                            ? "This listing needs changes before approval. Update it and submit again."
                            : "Visible in food discovery."}
                      </small>
                      <div className="button-row">
                        <button
                          className="btn secondary"
                          onClick={() => setEditor(p)}
                        >
                          Edit listing
                        </button>
                        {p.status === "approved" && (
                          <Link className="text-link" to={"/place/" + p.id}>
                            View public listing
                            <ExternalLink size={16} />
                          </Link>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <Empty title="Let’s put your food on the map.">
                Register your first food place using the button above.
              </Empty>
            ))}
          {["menu", "qr"].includes(tab) && (
            <>
              {data.places.length ? (
                <>
                  <div className="workspace-toolbar">
                    <Field label="Food place">
                      <select
                        value={placeId}
                        onChange={(e) => {
                          setPlaceId(e.target.value);
                          setMenuEditor(null);
                        }}
                      >
                        {data.places.map((p) => (
                          <option value={p.id} key={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    {tab === "menu" && (
                      <button
                        className="btn"
                        onClick={() => setMenuEditor("new")}
                      >
                        <Plus size={17} />
                        Add menu item
                      </button>
                    )}
                  </div>
                  {tab === "menu" && (
                    <>
                      {menuEditor && (
                        <MenuEditor
                          placeId={placeId}
                          image={place?.image || ""}
                          item={menuEditor === "new" ? undefined : menuEditor}
                          onClose={() => setMenuEditor(null)}
                          onSaved={() => {
                            setMenuEditor(null);
                            reload();
                          }}
                        />
                      )}
                      <div className="table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Dish</th>
                              <th>Category</th>
                              <th>Price</th>
                              <th>Availability</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {menus.map((m) => (
                              <tr key={m.id}>
                                <td>
                                  <strong>{m.name}</strong>
                                  <small>{m.description}</small>
                                </td>
                                <td>{m.category}</td>
                                <td>{money(m.priceCents / 100)}</td>
                                <td>
                                  <button
                                    className={
                                      "status-button " +
                                      (m.available ? "available" : "")
                                    }
                                    disabled={busy}
                                    onClick={() =>
                                      mutate(
                                        "/merchant/menu/" + m.id,
                                        { ...m, available: !m.available },
                                        "PUT",
                                      )
                                    }
                                  >
                                    {m.available ? "Available" : "Sold out"}
                                  </button>
                                </td>
                                <td>
                                  <div className="table-actions">
                                    <button onClick={() => setMenuEditor(m)}>
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (
                                          confirm(
                                            "Remove " +
                                              m.name +
                                              " from the menu?",
                                          )
                                        )
                                          mutate(
                                            "/merchant/menu/" + m.id,
                                            {},
                                            "DELETE",
                                          );
                                      }}
                                    >
                                      Remove
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {!menus.length && (
                          <Empty title="What’s cooking?">
                            Add your first menu item.
                          </Empty>
                        )}
                      </div>
                    </>
                  )}
                  {tab === "qr" && (
                    <>
                      <div className="qr-setup">
                        <Field
                          label="Website address for your QR codes"
                          hint="For phones, use a reachable network address or your online domain. localhost only works on this computer."
                        >
                          <input
                            type="url"
                            value={qrOrigin}
                            onChange={(e) => setQrOrigin(e.target.value)}
                          />
                        </Field>
                        <form
                          onSubmit={async (e) => {
                            e.preventDefault();
                            if (
                              await mutate(
                                "/merchant/places/" + placeId + "/tables",
                                { label: tableName },
                              )
                            )
                              setTableName("");
                          }}
                        >
                          <Field label="Table name">
                            <input
                              required
                              maxLength={60}
                              value={tableName}
                              onChange={(e) => setTableName(e.target.value)}
                              placeholder="Table 02"
                            />
                          </Field>
                          <button className="btn" disabled={busy}>
                            <QrCode size={18} />
                            Create table QR
                          </button>
                        </form>
                      </div>
                      {place?.status !== "approved" && (
                        <p className="form-error">
                          Your listing needs admin approval before customers can
                          order.
                        </p>
                      )}
                      <div className="qr-grid">
                        {tables.map((t) => (
                          <QRTable
                            key={t.id}
                            table={t}
                            origin={qrOrigin}
                            onToggle={() =>
                              mutate(
                                "/merchant/tables/" + t.id,
                                { active: !t.active },
                                "PATCH",
                              )
                            }
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <Empty title="Add a place first.">
                  A menu and QR codes belong to one of your registered food
                  places.
                </Empty>
              )}
            </>
          )}
          {tab === "orders" && (
            <>
              <div className="section-head">
                <div>
                  <h2>Orders, fresh off the table.</h2>
                  <p>Updates every 10 seconds. Customers pay at the counter.</p>
                </div>
                <button className="text-link" onClick={reload}>
                  Refresh orders
                </button>
              </div>
              {data.orders.length ? (
                <div className="merchant-orders">
                  {data.orders.map((o) => (
                    <article className="order-card" key={o.id}>
                      <header>
                        <div>
                          <h3>
                            {o.tableLabel} · {o.customerName}
                          </h3>
                          <small>
                            {o.placeName} · {date(o.createdAt)} · #
                            {o.id.slice(0, 8)}
                          </small>
                        </div>
                        <span className={"status " + o.status}>{o.status}</span>
                      </header>
                      <ul>
                        {o.items.map((item) => (
                          <li key={item.menuId}>
                            <span>
                              {item.quantity} × {item.name}
                            </span>
                            <strong>
                              {money((item.priceCents * item.quantity) / 100)}
                            </strong>
                          </li>
                        ))}
                      </ul>
                      {o.note && <p className="order-note">Note: {o.note}</p>}
                      <footer>
                        <strong>Total {money(o.totalCents / 100)}</strong>
                        <div className="button-row">
                          {nextStatus[o.status] && (
                            <button
                              className="btn"
                              disabled={busy}
                              onClick={() =>
                                mutate(
                                  "/merchant/orders/" + o.id,
                                  { status: nextStatus[o.status] },
                                  "PATCH",
                                )
                              }
                            >
                              {o.status === "new"
                                ? "Accept order"
                                : o.status === "accepted"
                                  ? "Start preparing"
                                  : o.status === "preparing"
                                    ? "Mark ready"
                                    : "Complete order"}
                            </button>
                          )}
                          {["new", "accepted", "preparing"].includes(
                            o.status,
                          ) && (
                            <button
                              className="text-link"
                              disabled={busy}
                              onClick={() => {
                                if (confirm("Cancel this order?"))
                                  mutate(
                                    "/merchant/orders/" + o.id,
                                    { status: "cancelled" },
                                    "PATCH",
                                  );
                              }}
                            >
                              Cancel order
                            </button>
                          )}
                        </div>
                      </footer>
                    </article>
                  ))}
                </div>
              ) : (
                <Empty title="The next order is on its way.">
                  Share a table QR code to start receiving orders.
                </Empty>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
