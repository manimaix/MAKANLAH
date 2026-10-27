import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  Check,
  Clock3,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  TableProperties,
  Trash2,
} from "lucide-react";
import { api, ApiError, mediaUrl, money, send, useApi } from "../api";
import { Drawer, Empty, ErrorState, Field, Loading } from "../components/ui";
import {
  DishPicker,
  linePrice,
  type CartLine,
} from "../components/ordering/DishPicker";
import type { MenuItem, Order, Place } from "../types";
import "../merchant.css";

type TableMenu = {
  place: Place;
  table: { label: string; token: string };
  menu: MenuItem[];
};

function readCart(token?: string) {
  try {
    const value = JSON.parse(
      sessionStorage.getItem("makanlah-cart-" + token) || "[]",
    );
    return Array.isArray(value)
      ? (value.filter(
          (v) =>
            typeof v.menuId === "string" &&
            typeof v.key === "string" &&
            Number.isInteger(v.quantity) &&
            v.quantity > 0 &&
            v.quantity <= 20 &&
            Array.isArray(v.addOnIds) &&
            typeof v.note === "string",
        ) as CartLine[])
      : [];
  } catch {
    return [];
  }
}
export default function QRMenu() {
  const { token } = useParams(),
    nav = useNavigate(),
    { data, setData, error, loading, reload } = useApi<TableMenu>(
      "/order/table/" + token,
    );
  const [cart, setCart] = useState<CartLine[]>(() => readCart(token)),
    [cartToken, setCartToken] = useState(token),
    [category, setCategory] = useState("All items"),
    [search, setSearch] = useState(""),
    [selected, setSelected] = useState<MenuItem | null>(null),
    [cartOpen, setCartOpen] = useState(false),
    [name, setName] = useState(""),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false),
    [formError, setFormError] = useState(""),
    [notice, setNotice] = useState(""),
    [idempotencyKey] = useState(() => crypto.randomUUID());
  useEffect(() => {
    setCart(readCart(token));
    setCartToken(token);
    setCategory("All items");
    setSearch("");
  }, [token]);
  useEffect(() => {
    if (cartToken !== token) return;
    try {
      sessionStorage.setItem("makanlah-cart-" + token, JSON.stringify(cart));
    } catch {}
  }, [cart, token, cartToken]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 3000);
    return () => clearTimeout(timer);
  }, [notice]);
  if (loading) return <Loading />;
  if (error || !data)
    return (
      <div className="container qr-unavailable">
        <ErrorState
          message={error || "This table is unavailable."}
          retry={reload}
        />
        <Link className="btn secondary" to="/discover">
          Explore Makanlah
        </Link>
      </div>
    );
  const p = data.place,
    categories = Array.from(new Set(data.menu.map((m) => m.category))),
    open = p.acceptingOrders !== false;
  const visible = data.menu.filter(
    (m) =>
      (category === "All items" || m.category === category) &&
      [m.name, m.description]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase()),
  );
  const validLines = cart.filter((line) =>
    data.menu.some((m) => m.id === line.menuId && m.available),
  );
  const total = validLines.reduce(
      (n, line) =>
        n +
        linePrice(
          line,
          data.menu.find((m) => m.id === line.menuId)!,
        ) *
          line.quantity,
      0,
    ),
    count = validLines.reduce((n, line) => n + line.quantity, 0);
  function change(key: string, delta: number) {
    setCart((items) =>
      items
        .map((line) =>
          line.key === key
            ? { ...line, quantity: Math.min(20, line.quantity + delta) }
            : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }
  async function checkout(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      const r = await send<{ order: Order; trackingKey: string }>("/orders", {
        tableToken: token,
        customerName: name,
        note,
        expectedTotalCents: total,
        items: validLines.map((line) => ({
          menuId: line.menuId,
          quantity: line.quantity,
          variantId: line.variantId,
          addOnIds: line.addOnIds,
          note: line.note,
          expectedUnitPriceCents: linePrice(
            line,
            data!.menu.find((m) => m.id === line.menuId)!,
          ),
        })),
        idempotencyKey,
      });
      sessionStorage.setItem("makanlah-order-" + r.order.id, r.trackingKey);
      sessionStorage.removeItem("makanlah-cart-" + token);
      setCart([]);
      nav("/order/receipt/" + r.order.id);
    } catch (e) {
      setFormError((e as Error).message);
      if (e instanceof ApiError && e.code === "MENU_PRICE_CHANGED") {
        try {
          setData(await api<TableMenu>("/order/table/" + token));
          setFormError(
            "Menu prices changed. The total has been updated. Review your order, then place it again.",
          );
        } catch {
          setFormError(
            "Menu prices changed. Refresh this menu to review the latest total before ordering.",
          );
        }
      }
    } finally {
      setBusy(false);
    }
  }
  const cartContent = (
    <form className="guest-cart-form" onSubmit={checkout}>
      <div className="guest-cart-table">
        <TableProperties size={18} />
        <strong>{data.table.label}</strong>
        <span>Dine in</span>
      </div>
      {cart.length ? (
        <div className="guest-cart-items">
          {cart.map((line) => {
            const dish = data!.menu.find((m) => m.id === line.menuId);
            if (!dish)
              return (
                <div className="cart-unavailable" key={line.key}>
                  <p>An item is no longer on the menu.</p>
                  <button
                    type="button"
                    className="text-link"
                    onClick={() =>
                      setCart((c) => c.filter((i) => i.key !== line.key))
                    }
                  >
                    Remove item
                  </button>
                </div>
              );
            const variant = dish.variants?.find((v) => v.id === line.variantId);
            return (
              <article
                key={line.key}
                className={!dish.available ? "cart-unavailable" : ""}
              >
                <div>
                  <h3>{dish.name}</h3>
                  {variant && <small>{variant.name}</small>}
                  {dish.addOns
                    ?.filter((a) => line.addOnIds.includes(a.id))
                    .map((a) => (
                      <small key={a.id}>+ {a.name}</small>
                    ))}
                  {line.note && <small>Note: {line.note}</small>}
                  {!dish.available && (
                    <p className="form-error">
                      Currently sold out · Remove to continue
                    </p>
                  )}
                </div>
                <strong>
                  {money((linePrice(line, dish) * line.quantity) / 100)}
                </strong>
                <div className="quantity-control">
                  <button
                    type="button"
                    className="round"
                    aria-label={"Remove one " + dish.name}
                    disabled={busy}
                    onClick={() => change(line.key, -1)}
                  >
                    <Minus size={14} />
                  </button>
                  <span>{line.quantity}</span>
                  <button
                    type="button"
                    className="round"
                    aria-label={"Add one " + dish.name}
                    disabled={busy || line.quantity >= 20 || !dish.available}
                    onClick={() => change(line.key, 1)}
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <button
                  type="button"
                  className="remove-cart-line"
                  aria-label={"Remove " + dish.name + " from order"}
                  onClick={() =>
                    setCart((c) => c.filter((i) => i.key !== line.key))
                  }
                >
                  <Trash2 size={14} />
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="guest-empty-cart">
          <ShoppingBag size={35} />
          <h3>No items in the order</h3>
          <p>Select a menu item.</p>
        </div>
      )}
      {cart.length > 0 && (
        <>
          <Field label="Name">
            <input
              required
              maxLength={80}
              autoComplete="given-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder=""
            />
          </Field>
          <Field label="Order note">
            <textarea
              maxLength={500}
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder=""
            />
          </Field>
        </>
      )}
      <div className="guest-total">
        <span>Total</span>
        <strong>{money(total / 100)}</strong>
      </div>
      <p className="guest-payment">
        <Check size={15} />
        Pay at the counter · No account needed
      </p>
      {formError && (
        <p className="form-error" role="alert">
          {formError}
        </p>
      )}
      <button
        className="btn full"
        disabled={busy || !count || !open || validLines.length !== cart.length}
      >
        {busy
          ? "Sending to the kitchen…"
          : !open
            ? "Ordering is paused"
            : "Place order"}
        <ArrowRight size={17} />
      </button>
      <small className="guest-checkout-note">
        Check your table number before placing your order.
      </small>
    </form>
  );
  return (
    <div className="guest-menu-page">
      <section className="guest-restaurant-hero">
        <div className="guest-hero-photo">
          <img src={mediaUrl(p.image)} alt={p.dish} />
        </div>
        <div className="container guest-hero-copy">
          <div>
            <span className="guest-table-tag">
              <TableProperties size={16} />
              {data.table.label} · Dine in
            </span>
            <h1>{p.name}</h1>
            <p>
              <MapPin size={15} />
              {p.area}, {p.city}
            </p>
            <div className="guest-service-facts">
              <span className={open ? "taking-orders" : "paused-orders"}>
                <i />
                {open ? "Accepting orders" : "Ordering is paused"}
              </span>
              <span>
                <Clock3 size={15} />
                {p.prepMinutes || 15}–{(p.prepMinutes || 15) + 5} min
              </span>
              {p.sample && <span className="sample-menu-tag">Sample menu</span>}
            </div>
          </div>
          <Link className="text-link" to={"/place/" + p.id}>
            Business details
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>
      {(!open || p.orderMessage) && (
        <div className="container guest-order-message" role="status">
          {!open ? "Ordering is paused. Order at the counter." : p.orderMessage}
        </div>
      )}
      <div className="container guest-menu-layout">
        <section className="guest-food-column">
          <div className="guest-menu-toolbar">
            <label className="m-search">
              <Search size={18} />
              <input
                aria-label="Search this menu"
                placeholder="Search menu items"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <nav className="guest-categories" aria-label="Food categories">
              {["All items", ...categories].map((c) => (
                <button
                  key={c}
                  className={category === c ? "active" : ""}
                  onClick={() => setCategory(c)}
                >
                  {c}
                </button>
              ))}
            </nav>
          </div>
          {visible.length ? (
            ["All items", ...categories]
              .filter(
                (c) =>
                  c !== "All items" &&
                  (category === "All items" || category === c),
              )
              .map((c) => {
                const items = visible.filter((m) => m.category === c);
                return items.length ? (
                  <section className="guest-menu-category" key={c}>
                    <header>
                      <h2>{c}</h2>
                      <span>
                        {items.length}{" "}
                        {items.length === 1 ? "menu item" : "menu items"}
                      </span>
                    </header>
                    <div className="guest-dish-grid">
                      {items.map((m) => (
                        <article
                          key={m.id}
                          className={`guest-dish ${!m.available ? "unavailable" : ""}`}
                        >
                          <button
                            className="guest-dish-image"
                            aria-label={"View " + m.name}
                            disabled={!m.available || !open}
                            onClick={() => setSelected(m)}
                          >
                            <img
                              src={mediaUrl(m.image || p.image)}
                              alt={m.name}
                              loading="lazy"
                            />
                            {!m.available && <span>Sold out</span>}
                          </button>
                          <div>
                            <h3>{m.name}</h3>
                            <p>{m.description}</p>
                            <footer>
                              <strong>
                                {m.variants?.length ? "From " : ""}
                                {money(
                                  (m.priceCents +
                                    (m.variants?.length
                                      ? Math.min(
                                          ...m.variants.map(
                                            (v) => v.priceCents,
                                          ),
                                        )
                                      : 0)) /
                                    100,
                                )}
                              </strong>
                              <button
                                className="guest-add"
                                aria-label={"Add " + m.name}
                                disabled={!m.available || !open}
                                onClick={() => setSelected(m)}
                              >
                                <Plus size={19} />
                                <span>Add</span>
                              </button>
                            </footer>
                          </div>
                        </article>
                      ))}
                    </div>
                  </section>
                ) : null;
              })
          ) : (
            <Empty title="No items match the search">
              Select another category or change the search.
            </Empty>
          )}
          <p className="guest-food-note">
            For allergy information, ask the staff before you order.
          </p>
        </section>
        <aside className="guest-order-aside">
          <h2>
            <ShoppingBag size={22} />
            Order
          </h2>
          {cartContent}
        </aside>
      </div>
      <button
        className="guest-mobile-cart"
        disabled={!count}
        onClick={() => setCartOpen(true)}
      >
        <span className="cart-count">{count}</span>
        <strong>View order</strong>
        <span>{money(total / 100)}</span>
        <ArrowRight size={18} />
      </button>
      {selected && (
        <DishPicker
          item={selected}
          place={p}
          onClose={() => setSelected(null)}
          onAdd={(line) => {
            setCart((items) => {
              const old = items.find((i) => i.key === line.key);
              return old
                ? items.map((i) =>
                    i.key === line.key
                      ? {
                          ...i,
                          quantity: Math.min(20, i.quantity + line.quantity),
                        }
                      : i,
                  )
                : [...items, line];
            });
            setSelected(null);
            setNotice("Item added.");
          }}
        />
      )}
      {cartOpen && (
        <Drawer title="Order" onClose={() => setCartOpen(false)}>
          {cartContent}
        </Drawer>
      )}
      <div className={`guest-added ${notice ? "visible" : ""}`} role="status">
        {notice}
      </div>
    </div>
  );
}
