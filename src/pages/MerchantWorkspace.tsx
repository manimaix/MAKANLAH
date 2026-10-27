import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  BellRing,
  BookOpen,
  Check,
  ChefHat,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Clock3,
  ExternalLink,
  LayoutGrid,
  List,
  LogOut,
  Menu,
  MoreHorizontal,
  Plus,
  Printer,
  QrCode,
  ReceiptText,
  RefreshCw,
  Search,
  Settings2,
  SlidersHorizontal,
  Store,
  TableProperties,
  TrendingUp,
  Users,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { api, mediaUrl, money, send, useApi } from "../api";
import { useAuth, useToast } from "../context";
import {
  Avatar,
  Drawer,
  Empty,
  ErrorState,
  Field,
  Loading,
} from "../components/ui";
import { ListingEditor } from "./Merchant";
import { DishEditor } from "../components/merchant/DishEditor";
import { QRArtwork, TableQR, tableLink } from "../components/merchant/TableQR";
import {
  activeStatuses,
  ageLabel,
  nextLabel,
  nextStage,
  OrderTicket,
  orderStage,
  TicketItems,
} from "../components/merchant/OrderTicket";
import type {
  MenuItem,
  MerchantData,
  Order,
  OrderStatus,
  Place,
  Table,
} from "../types";
import "../merchant.css";

const navigation = [
  { key: "orders", label: "Orders", icon: ClipboardList },
  { key: "kitchen", label: "Kitchen", icon: ChefHat },
  { key: "menu", label: "Menu", icon: BookOpen },
  { key: "tables", label: "Tables", icon: QrCode },
  { key: "sales", label: "Sales", icon: TrendingUp },
  { key: "settings", label: "Settings", icon: Settings2 },
];
const dayKey = (value: string | Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
function inRange(o: Order, range: string) {
  return (
    range === "all" ||
    (range === "today" && dayKey(o.createdAt) === dayKey(new Date())) ||
    (range === "week" &&
      Date.now() - new Date(o.createdAt).getTime() < 7 * 86400000)
  );
}
function OrderingSettings({
  place,
  onSaved,
}: {
  place: Place;
  onSaved: () => void;
}) {
  const [prep, setPrep] = useState(place.prepMinutes || 15),
    [message, setMessage] = useState(place.orderMessage || ""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const toast = useToast();
  return (
    <form
      className="m-settings-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await send(
            "/merchant/places/" + place.id + "/ordering",
            { prepMinutes: prep, orderMessage: message },
            "PATCH",
          );
          onSaved();
          toast("Ordering settings saved.");
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Order settings</h2>
      <p>Set the preparation time and customer message.</p>
      <Field label="Preparation time (minutes)">
        <input
          type="number"
          min="1"
          max="120"
          required
          value={prep}
          onChange={(e) => setPrep(Number(e.target.value))}
        />
      </Field>
      <Field
        label="Customer message"
        hint="This message appears on the customer menu."
      >
        <textarea
          maxLength={300}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder=""
        />
      </Field>
      <div className="m-payment-explainer">
        <ReceiptText size={24} />
        <div>
          <strong>Pay at the counter</strong>
          <p>Record payment after the customer pays.</p>
        </div>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button className="btn" disabled={busy}>
        {busy ? "Saving…" : "Save ordering settings"}
      </button>
    </form>
  );
}

export default function MerchantWorkspace() {
  const auth = useAuth(),
    toast = useToast(),
    [params, setParams] = useSearchParams(),
    { data, setData, error, loading, reload } =
      useApi<MerchantData>("/merchant");
  const view = navigation.some((n) => n.key === params.get("view"))
    ? params.get("view")!
    : "orders";
  const [placeId, setPlaceId] = useState(""),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("All items"),
    [range, setRange] = useState("all"),
    [statusFilter, setStatusFilter] = useState("active"),
    [board, setBoard] = useState(
      () => !window.matchMedia("(max-width: 700px)").matches,
    ),
    [sidebar, setSidebar] = useState(false),
    [mobile, setMobile] = useState(
      () => window.matchMedia("(max-width: 700px)").matches,
    ),
    [focus, setFocus] = useState(false),
    [busy, setBusy] = useState(false),
    [sound, setSound] = useState(false),
    [selectedOrder, setSelectedOrder] = useState<Order | null>(null),
    [selectedTable, setSelectedTable] = useState<Table | null>(null),
    [dishEditor, setDishEditor] = useState<MenuItem | "new" | null>(null),
    [listing, setListing] = useState<Place | "new" | null>(null),
    [tableForm, setTableForm] = useState(false),
    [tableCount, setTableCount] = useState(1),
    [tableStart, setTableStart] = useState(1),
    [tableArea, setTableArea] = useState("Main dining"),
    [tableSeats, setTableSeats] = useState(2),
    [formError, setFormError] = useState(""),
    [printing, setPrinting] = useState(false),
    [printReady, setPrintReady] = useState(0),
    [lastSync, setLastSync] = useState<number | null>(null);
  const origin = window.location.origin;
  const audio = useRef<AudioContext | null>(null),
    seen = useRef<Set<string> | null>(null),
    sidebarRef = useRef<HTMLElement>(null),
    menuToggleRef = useRef<HTMLButtonElement>(null);
  const printed = useRef(false);
  useEffect(() => {
    if (data) setLastSync(Date.now());
  }, [data]);
  useEffect(() => {
    if (
      printing &&
      !printed.current &&
      printReady > 0 &&
      printReady ===
        data?.tables.filter((t) => t.placeId === placeId && t.active).length
    ) {
      printed.current = true;
      requestAnimationFrame(() => window.print());
    }
  }, [printing, printReady, data, placeId]);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 700px)");
    const update = () => {
      setMobile(query.matches);
      if (!query.matches) setSidebar(false);
    };
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!mobile || !sidebar || !sidebarRef.current) return;
    const panel = sidebarRef.current;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const controls = () =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), select:not([disabled]), [tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0);
    panel
      .querySelector<HTMLButtonElement>(
        'button[aria-label="Close workspace menu"]',
      )
      ?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setSidebar(false);
      } else if (event.key === "Tab") {
        const items = controls(),
          first = items[0],
          last = items.at(-1);
        if (!first || !last) {
          event.preventDefault();
          panel.focus();
        } else if (
          event.shiftKey &&
          (document.activeElement === first ||
            !panel.contains(document.activeElement))
        ) {
          event.preventDefault();
          last.focus();
        } else if (
          !event.shiftKey &&
          (document.activeElement === last ||
            !panel.contains(document.activeElement))
        ) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = oldOverflow;
      menuToggleRef.current?.focus();
    };
  }, [mobile, sidebar]);
  useEffect(() => {
    if (data?.places.length && !data.places.some((p) => p.id === placeId))
      setPlaceId(data.places[0].id);
  }, [data, placeId]);
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) reload();
    }, 7000);
    return () => clearInterval(interval);
  }, [reload]);
  useEffect(() => {
    if (!data) return;
    const incoming = data.orders.filter(
      (o) => o.status === "new" && o.placeId === placeId,
    );
    if (
      seen.current &&
      incoming.some((o) => !seen.current!.has(o.id)) &&
      sound &&
      audio.current
    ) {
      const ctx = audio.current;
      const oscillator = ctx.createOscillator(),
        gain = ctx.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 780;
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.4);
      toast("New order received.");
    }
    seen.current = new Set(data.orders.map((o) => o.id));
  }, [data, placeId, sound, toast]);
  useEffect(() => {
    const stop = () => setPrinting(false);
    window.addEventListener("afterprint", stop);
    return () => {
      window.removeEventListener("afterprint", stop);
      audio.current?.close();
    };
  }, []);
  function navigate(value: string) {
    setParams({ view: value });
    setRange(value === "sales" ? "today" : "all");
    setStatusFilter("active");
    setQuery("");
    setSidebar(false);
    setFocus(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function mutate(path: string, body: unknown, method = "PATCH") {
    setBusy(true);
    try {
      const result = await send<{
        order?: Order;
        place?: Place;
        tables?: Table[];
      }>(path, body, method);
      if (result.order) {
        setData((s) =>
          s
            ? {
                ...s,
                orders: s.orders.map((o) =>
                  o.id === result.order!.id ? result.order! : o,
                ),
              }
            : s,
        );
        setSelectedOrder((o) =>
          o?.id === result.order!.id ? result.order! : o,
        );
      }
      if (result.place)
        setData((s) =>
          s
            ? {
                ...s,
                places: s.places.map((p) =>
                  p.id === result.place!.id ? result.place! : p,
                ),
              }
            : s,
        );
      reload();
      return true;
    } catch (e) {
      toast((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function advance(order: Order, status: OrderStatus) {
    if (
      status === "cancelled" &&
      !confirm("Cancel this order? The customer will see the cancelled status.")
    )
      return;
    await mutate("/merchant/orders/" + order.id, { status });
  }
  const place = data?.places.find((p) => p.id === placeId),
    menus = data?.menus.filter((m) => m.placeId === placeId) || [],
    tables = data?.tables.filter((t) => t.placeId === placeId) || [],
    allOrders =
      data?.orders.filter((o) => o.placeId === placeId && !o.sample) || [];
  const active = allOrders.filter((o) => activeStatuses.includes(o.status));
  const categories = Array.from(new Set(menus.map((m) => m.category)));
  const filteredOrders = allOrders.filter(
    (o) =>
      inRange(o, range) &&
      (statusFilter === "all" ||
        (statusFilter === "active"
          ? activeStatuses.includes(o.status)
          : o.status === statusFilter)) &&
      (!query ||
        [o.customerName, o.tableLabel, o.id, ...o.items.map((i) => i.name)]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  const filteredMenu = menus.filter(
    (m) =>
      (category === "All items" || m.category === category) &&
      (!query ||
        [m.name, m.description, m.category]
          .join(" ")
          .toLowerCase()
          .includes(query.toLowerCase())),
  );
  const selectedRange = allOrders.filter((o) => inRange(o, range));
  const completed = selectedRange.filter((o) => o.status === "completed"),
    totalSales = completed.reduce((n, o) => n + o.totalCents, 0);
  const publicTable = tables.find((t) => t.active),
    open = place?.status === "approved" && place.acceptingOrders !== false;
  if (loading && !data)
    return (
      <div className="merchant-loading">
        <span className="logo">
          makanlah<span>.</span>
        </span>
        <Loading />
      </div>
    );
  if (error && !data) return <ErrorState message={error} retry={reload} />;
  if (!data) return null;
  return (
    <div
      className={`mpos ${sidebar ? "sidebar-open" : ""} ${focus ? "focus-kitchen" : ""}`}
    >
      <a
        href="#merchant-main"
        className="skip-link"
        inert={mobile && sidebar ? true : undefined}
      >
        Skip to merchant workspace
      </a>
      <aside
        className="mpos-sidebar"
        id="merchant-navigation"
        ref={sidebarRef}
        tabIndex={-1}
        role={mobile ? "dialog" : undefined}
        aria-label="Merchant navigation"
        aria-modal={mobile && sidebar ? true : undefined}
        aria-hidden={mobile && !sidebar ? true : undefined}
        inert={mobile && !sidebar ? true : undefined}
      >
        <div className="mpos-brand">
          <Link className="logo" to="/">
            makanlah<span>.</span>
          </Link>
          <button
            className="round mobile-only"
            aria-label="Close workspace menu"
            onClick={() => setSidebar(false)}
          >
            <X size={20} />
          </button>
        </div>
        <label className="mpos-store-select">
          <span>Business</span>
          <select
            aria-label="Select business"
            value={placeId}
            onChange={(e) => {
              setPlaceId(e.target.value);
              seen.current = null;
            }}
          >
            {data.places.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
              </option>
            ))}
            {!data.places.length && <option value="">No business</option>}
          </select>
        </label>
        <nav aria-label="Merchant workspace">
          {navigation.map((n) => (
            <button
              key={n.key}
              className={view === n.key ? "active" : ""}
              aria-current={view === n.key ? "page" : undefined}
              onClick={() => navigate(n.key)}
            >
              <n.icon size={19} />
              {n.label}
              {n.key === "orders" && active.length > 0 && (
                <span className="nav-order-count">{active.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="mpos-sidebar-bottom">
          <Link to="/discover">
            <ArrowLeft size={16} />
            Food discovery
          </Link>
          <button onClick={() => auth.logout()}>
            <LogOut size={16} />
            Sign out
          </button>
          <div className="merchant-account">
            <Avatar name={auth.user?.name} />
            <div>
              <strong>{auth.user?.name}</strong>
            </div>
          </div>
        </div>
      </aside>
      {sidebar && (
        <button
          className="sidebar-scrim"
          aria-label="Close workspace menu"
          aria-hidden="true"
          tabIndex={-1}
          onClick={() => setSidebar(false)}
        />
      )}
      <div className="mpos-body" inert={mobile && sidebar ? true : undefined}>
        <header className="mpos-topbar">
          <div className="mpos-topbar-store">
            <button
              className="round mpos-menu-toggle"
              ref={menuToggleRef}
              aria-label="Open workspace menu"
              aria-expanded={sidebar}
              aria-controls="merchant-navigation"
              onClick={() => setSidebar(true)}
            >
              <Menu size={21} />
            </button>
            {place && <img src={mediaUrl(place.image)} alt="" />}
            <div>
              <strong>{place?.name || "Business"}</strong>
              <small>
                {place?.area ? place.area + ", " : ""}
                {place?.city || "Select a business"}
              </small>
            </div>
          </div>
          <div className="mpos-top-actions">
            {place && (
              <button
                className={`ordering-status ${open ? "is-open" : ""}`}
                disabled={busy || place.status !== "approved"}
                onClick={() =>
                  mutate("/merchant/places/" + place.id + "/ordering", {
                    acceptingOrders: !open,
                  })
                }
              >
                <span />
                {place.status !== "approved"
                  ? "Awaiting approval"
                  : open
                    ? "Accepting orders"
                    : "Ordering paused"}
                <ChevronDown size={14} />
              </button>
            )}
            {publicTable ? (
              <Link
                className="text-link customer-preview"
                to={publicTable ? "/order/" + publicTable.token : "/discover"}
                target="_blank"
              >
                <ExternalLink size={15} />
                Open customer menu
              </Link>
            ) : (
              place && (
                <button
                  className="btn secondary"
                  onClick={() => {
                    navigate("tables");
                    setTableForm(true);
                  }}
                >
                  Add table
                </button>
              )
            )}
          </div>
        </header>
        <main id="merchant-main" className="mpos-main">
          {error && (
            <div className="mpos-error" role="alert">
              Cannot update orders. The last update is shown.{" "}
              <button onClick={reload}>Retry</button>
            </div>
          )}
          {!place ? (
            <div className="mpos-onboard">
              <Store size={40} />
              <h1>Add a business</h1>
              <p>Add your business details. Then add menu items and tables.</p>
              <button className="btn" onClick={() => setListing("new")}>
                <Plus size={17} />
                Add business
              </button>
            </div>
          ) : (
            <>
              <div className="mpos-heading">
                <div>
                  <h1>
                    {view === "orders"
                      ? "Orders"
                      : view === "kitchen"
                        ? "Kitchen"
                        : view === "menu"
                          ? "Menu"
                          : view === "tables"
                            ? "Tables"
                            : view === "sales"
                              ? "Sales"
                              : "Settings"}
                  </h1>
                </div>
                <div className="mpos-heading-actions">
                  {view === "menu" && (
                    <button
                      className="btn"
                      onClick={() => setDishEditor("new")}
                    >
                      <Plus size={17} />
                      Add item
                    </button>
                  )}
                  {view === "tables" && (
                    <button
                      className="btn"
                      onClick={() => {
                        setTableStart(
                          Math.max(
                            0,
                            ...tables.map((t) =>
                              Number(
                                t.label.match(/^Table\s+(\d+)$/i)?.[1] || 0,
                              ),
                            ),
                          ) + 1,
                        );
                        setTableForm(true);
                        setFormError("");
                      }}
                    >
                      <Plus size={17} />
                      Add tables
                    </button>
                  )}
                  {view === "sales" && (
                    <a
                      className="btn secondary"
                      href={mediaUrl(
                        "/api/merchant/places/" +
                          placeId +
                          "/orders.csv?range=" +
                          range,
                      )}
                      download
                    >
                      <ArrowDownToLine size={16} />
                      Export orders
                    </a>
                  )}
                  {view === "kitchen" && (
                    <button
                      className="btn secondary"
                      onClick={() => setFocus(!focus)}
                    >
                      {focus ? "Show navigation" : "Hide navigation"}
                    </button>
                  )}
                </div>
              </div>
              {(view === "orders" || view === "kitchen") && (
                <>
                  <div className="service-strip">
                    <span className="live-dot" />
                    <strong>
                      {allOrders.filter((o) => o.status === "new").length
                        ? `${allOrders.filter((o) => o.status === "new").length} new ${allOrders.filter((o) => o.status === "new").length === 1 ? "order is" : "orders are"} awaiting acceptance.`
                        : "No new orders."}
                    </strong>
                    <span>
                      {lastSync
                        ? "Updated " +
                          new Date(lastSync).toLocaleTimeString("en-MY", {
                            timeZone: "Asia/Kuala_Lumpur",
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                          })
                        : ""}
                    </span>
                    <button
                      aria-pressed={sound}
                      onClick={async () => {
                        if (!sound) {
                          try {
                            audio.current = audio.current || new AudioContext();
                            await audio.current.resume();
                          } catch {
                            toast("Sound is unavailable in this browser.");
                            return;
                          }
                        }
                        setSound(!sound);
                      }}
                    >
                      {sound ? <Volume2 size={16} /> : <VolumeX size={16} />}
                      Sound {sound ? "on" : "off"}
                    </button>
                    <button
                      className="refresh-orders"
                      aria-label="Refresh orders"
                      onClick={reload}
                    >
                      <RefreshCw size={16} />
                    </button>
                  </div>
                  <div className="mpos-toolbar">
                    <label className="m-search">
                      <Search size={18} />
                      <input
                        aria-label="Search orders"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search order, table or customer"
                      />
                    </label>
                    <select
                      aria-label="Order date range"
                      value={range}
                      onChange={(e) => setRange(e.target.value)}
                    >
                      <option value="today">Today</option>
                      <option value="week">Last 7 days</option>
                      <option value="all">All dates</option>
                    </select>
                    {view === "orders" && (
                      <>
                        <select
                          aria-label="Filter order status"
                          value={statusFilter}
                          onChange={(e) => {
                            setStatusFilter(e.target.value);
                            if (
                              ["completed", "cancelled"].includes(
                                e.target.value,
                              )
                            )
                              setBoard(false);
                          }}
                        >
                          <option value="active">Active orders</option>
                          <option value="all">All orders</option>
                          {Object.entries(orderStage).map(([key, label]) => (
                            <option value={key} key={key}>
                              {label}
                            </option>
                          ))}
                        </select>
                        <div className="view-switch">
                          <button
                            className={board ? "active" : ""}
                            aria-label="Order board view"
                            aria-pressed={board}
                            onClick={() => {
                              setBoard(true);
                              if (
                                ["completed", "cancelled"].includes(
                                  statusFilter,
                                )
                              )
                                setStatusFilter("active");
                            }}
                          >
                            <LayoutGrid size={17} />
                          </button>
                          <button
                            className={!board ? "active" : ""}
                            aria-label="Order list view"
                            aria-pressed={!board}
                            onClick={() => setBoard(false)}
                          >
                            <List size={18} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  {view === "kitchen" && (
                    <div className="kitchen-summary">
                      <ChefHat size={19} />
                      <strong>Items in preparation</strong>
                      {Array.from(
                        new Set(
                          active
                            .filter((o) =>
                              ["accepted", "preparing"].includes(o.status),
                            )
                            .flatMap((o) => o.items.map((i) => i.name)),
                        ),
                      ).map((name) => (
                        <span key={name}>
                          {active
                            .filter((o) =>
                              ["accepted", "preparing"].includes(o.status),
                            )
                            .flatMap((o) => o.items)
                            .filter((i) => i.name === name)
                            .reduce((n, i) => n + i.quantity, 0)}
                          × {name}
                        </span>
                      ))}
                      {!active.some((o) =>
                        ["accepted", "preparing"].includes(o.status),
                      ) && <span>No menu items in preparation.</span>}
                    </div>
                  )}
                  {board || view === "kitchen" ? (
                    <div className="m-order-board">
                      {[
                        {
                          key: "new",
                          label: "New orders",
                          statuses: ["new"],
                        },
                        {
                          key: "preparing",
                          label: "In preparation",
                          statuses: ["accepted", "preparing"],
                        },
                        {
                          key: "ready",
                          label: "Ready",
                          statuses: ["ready"],
                        },
                      ].map((column) => {
                        const orders = filteredOrders.filter((o) =>
                          column.statuses.includes(o.status),
                        );
                        return (
                          <section
                            className={"order-column " + column.key}
                            key={column.key}
                          >
                            <header>
                              <span className="column-dot" />
                              <h2>{column.label}</h2>
                              <span className="column-count">
                                {orders.length}
                              </span>
                            </header>
                            <div className="order-column-list">
                              {orders.map((o) => (
                                <OrderTicket
                                  key={o.id}
                                  order={o}
                                  busy={busy}
                                  onOpen={() => setSelectedOrder(o)}
                                  onAction={advance}
                                  kitchen={view === "kitchen"}
                                />
                              ))}
                              {!orders.length && (
                                <div className="empty-order-lane">
                                  {column.key === "new" ? (
                                    <ClipboardList />
                                  ) : column.key === "preparing" ? (
                                    <ChefHat />
                                  ) : (
                                    <Check />
                                  )}
                                  <h3>
                                    {column.key === "new"
                                      ? "No new orders"
                                      : column.key === "preparing"
                                        ? "No orders in preparation"
                                        : "No orders ready"}
                                  </h3>
                                  <p>
                                    {column.key === "new"
                                      ? "New orders appear here."
                                      : column.key === "preparing"
                                        ? "Accept an order to start preparation."
                                        : "Mark an order as ready after preparation."}
                                  </p>
                                </div>
                              )}
                            </div>
                          </section>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="m-order-list">
                      <div className="m-mobile-orders">
                        {filteredOrders.map((o) => (
                          <OrderTicket
                            key={o.id}
                            order={o}
                            busy={busy}
                            showStatus
                            onOpen={() => setSelectedOrder(o)}
                            onAction={advance}
                          />
                        ))}
                      </div>
                      <div className="m-desktop-orders table-scroll">
                        <table>
                          <thead>
                            <tr>
                              <th>Order / Table</th>
                              <th>Customer</th>
                              <th>Time</th>
                              <th>Status</th>
                              <th>Payment</th>
                              <th>Total</th>
                              <th>Details</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredOrders.map((o) => (
                              <tr key={o.id}>
                                <td>
                                  <strong>{o.tableLabel}</strong>
                                  <small>
                                    #{o.id.slice(0, 6).toUpperCase()}
                                  </small>
                                </td>
                                <td>
                                  {o.customerName}
                                  {o.sample && <small>Sample order</small>}
                                </td>
                                <td>{ageLabel(o.createdAt)}</td>
                                <td>
                                  <span className={"status " + o.status}>
                                    {orderStage[o.status]}
                                  </span>
                                </td>
                                <td>
                                  {o.paymentStatus === "paid_at_counter"
                                    ? "Paid"
                                    : "Pay at counter"}
                                </td>
                                <td>
                                  <strong>{money(o.totalCents / 100)}</strong>
                                </td>
                                <td>
                                  <button
                                    className="text-link"
                                    onClick={() => setSelectedOrder(o)}
                                  >
                                    View order
                                    <ArrowRight size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      {!filteredOrders.length && (
                        <Empty title="No orders match this view.">
                          Try a different date, status or search.
                        </Empty>
                      )}
                    </div>
                  )}
                  {board && view === "orders" && (
                    <div className="order-history-link">
                      <button
                        className="text-link"
                        onClick={() => {
                          setBoard(false);
                          setStatusFilter("completed");
                        }}
                      >
                        View served orders
                        <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </>
              )}
              {view === "menu" && (
                <>
                  <div className="mpos-toolbar">
                    <label className="m-search">
                      <Search size={18} />
                      <input
                        aria-label="Search menu"
                        placeholder="Search items"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    <p className="menu-count">
                      <strong>{menus.filter((m) => m.available).length}</strong>{" "}
                      available · {menus.length}{" "}
                      {menus.length === 1 ? "menu item" : "menu items"}
                    </p>
                  </div>
                  <div className="merchant-menu-layout">
                    <nav
                      className="menu-category-nav"
                      aria-label="Menu categories"
                    >
                      {["All items", ...categories].map((c) => (
                        <button
                          key={c}
                          className={category === c ? "active" : ""}
                          onClick={() => setCategory(c)}
                        >
                          {c}
                          <span>
                            {c === "All items"
                              ? menus.length
                              : menus.filter((m) => m.category === c).length}
                          </span>
                        </button>
                      ))}
                    </nav>
                    <section className="m-menu-items">
                      {filteredMenu.map((m) => (
                        <article
                          className={`m-menu-row ${!m.available ? "sold-out" : ""}`}
                          key={m.id}
                        >
                          <img
                            src={mediaUrl(m.image || place.image)}
                            alt={m.name}
                          />
                          <div className="m-menu-copy">
                            <span>{m.category}</span>
                            <h3>{m.name}</h3>
                            <p>{m.description}</p>
                            {!!m.variants?.length || !!m.addOns?.length ? (
                              <small>
                                {m.variants?.length || 0} options ·{" "}
                                {m.addOns?.length || 0}{" "}
                                {m.addOns?.length === 1 ? "extra" : "extras"}
                              </small>
                            ) : null}
                          </div>
                          <strong className="m-menu-price">
                            {money(m.priceCents / 100)}
                          </strong>
                          <label className="menu-availability">
                            <input
                              type="checkbox"
                              role="switch"
                              aria-label={"Availability for " + m.name}
                              checked={m.available}
                              disabled={busy}
                              onChange={() =>
                                mutate(
                                  "/merchant/menu/" + m.id,
                                  { ...m, available: !m.available },
                                  "PUT",
                                )
                              }
                            />
                            <span>
                              {m.available ? "Available" : "Sold out"}
                            </span>
                          </label>
                          <button
                            className="btn secondary"
                            onClick={() => setDishEditor(m)}
                          >
                            Edit item
                          </button>
                          <details className="menu-more">
                            <summary aria-label={"More actions for " + m.name}>
                              <MoreHorizontal size={20} />
                            </summary>
                            <button
                              disabled={busy}
                              onClick={() => {
                                if (
                                  confirm(
                                    "Remove " + m.name + " from your menu?",
                                  )
                                )
                                  mutate(
                                    "/merchant/menu/" + m.id,
                                    {},
                                    "DELETE",
                                  );
                              }}
                            >
                              Delete item
                            </button>
                          </details>
                        </article>
                      ))}
                      {!filteredMenu.length && (
                        <Empty
                          title={
                            menus.length
                              ? "A different craving, perhaps?"
                              : "What’s cooking?"
                          }
                        >
                          {menus.length
                            ? "No items match the search."
                            : "Add a menu item."}
                        </Empty>
                      )}
                    </section>
                  </div>
                </>
              )}
              {view === "tables" && (
                <>
                  <div className="table-setup-bar">
                    <label className="m-search">
                      <Search size={18} />
                      <input
                        aria-label="Search tables"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Find a table or dining area"
                      />
                    </label>
                    <button
                      className="btn secondary"
                      disabled={!tables.some((t) => t.active) || printing}
                      onClick={() => {
                        printed.current = false;
                        setPrintReady(0);
                        setPrinting(true);
                      }}
                    >
                      <Printer size={16} />
                      {printing ? "Prepare QR codes…" : "Print QR codes"}
                    </button>
                  </div>
                  <div className="table-legend">
                    <span>
                      <i className="table-state-dot active" />
                      {
                        tables.filter(
                          (t) =>
                            t.active &&
                            active.some((o) =>
                              o.tableId
                                ? o.tableId === t.id
                                : o.tableLabel === t.label,
                            ),
                        ).length
                      }{" "}
                      in service
                    </span>
                    <span>
                      <i className="table-state-dot" />
                      {
                        tables.filter(
                          (t) =>
                            t.active &&
                            !active.some((o) =>
                              o.tableId
                                ? o.tableId === t.id
                                : o.tableLabel === t.label,
                            ),
                        ).length
                      }{" "}
                      available
                    </span>
                    <span>
                      <i className="table-state-dot disabled" />
                      {tables.filter((t) => !t.active).length} QR paused
                    </span>
                  </div>
                  <div className="m-table-grid">
                    {tables
                      .filter((t) =>
                        [t.label, t.area || "Main dining"]
                          .join(" ")
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((t) => {
                        const orders = active.filter((o) =>
                            o.tableId
                              ? o.tableId === t.id
                              : o.tableLabel === t.label,
                          ),
                          occupied = t.active && orders.length > 0;
                        return (
                          <article
                            className={`m-table-card ${occupied ? "occupied" : ""} ${!t.active ? "qr-disabled" : ""}`}
                            key={t.id}
                          >
                            <header>
                              <span>
                                <Users size={15} />
                                {t.seats || 2} seats
                              </span>
                              <button
                                className="round"
                                aria-label={"Manage " + t.label}
                                onClick={() => setSelectedTable(t)}
                              >
                                <MoreHorizontal size={19} />
                              </button>
                            </header>
                            <button
                              className="table-main-button"
                              onClick={() => setSelectedTable(t)}
                            >
                              <TableProperties size={33} />
                              <h2>{t.label}</h2>
                              <p>{t.area || "Main dining"}</p>
                              <span
                                className={
                                  "table-state " + (occupied ? "occupied" : "")
                                }
                              >
                                {!t.active
                                  ? "QR paused"
                                  : occupied
                                    ? `${orders.length} active ${orders.length === 1 ? "order" : "orders"}`
                                    : "Ready for guests"}
                              </span>
                            </button>
                            <footer>
                              {occupied ? (
                                <button
                                  className="text-link"
                                  onClick={() => {
                                    navigate("orders");
                                    setQuery(t.label);
                                  }}
                                >
                                  View orders ·{" "}
                                  {money(
                                    orders.reduce(
                                      (n, o) => n + o.totalCents,
                                      0,
                                    ) / 100,
                                  )}
                                  <ArrowRight size={14} />
                                </button>
                              ) : (
                                <button
                                  className="text-link"
                                  onClick={() => setSelectedTable(t)}
                                >
                                  <QrCode size={15} />
                                  View QR code
                                </button>
                              )}
                              <button
                                className="table-qr-toggle"
                                aria-label={
                                  (t.active
                                    ? "Pause QR for "
                                    : "Enable QR for ") + t.label
                                }
                                disabled={busy}
                                onClick={() =>
                                  mutate("/merchant/tables/" + t.id, {
                                    active: !t.active,
                                  })
                                }
                              >
                                {t.active ? "Pause" : "Enable"}
                              </button>
                            </footer>
                          </article>
                        );
                      })}
                  </div>
                  {!tables.length && (
                    <Empty title="No tables">
                      Select Add tables to create QR codes.
                    </Empty>
                  )}
                  {tables.length > 0 &&
                    !tables.some((t) =>
                      [t.label, t.area || "Main dining"]
                        .join(" ")
                        .toLowerCase()
                        .includes(query.toLowerCase()),
                    ) && (
                      <Empty title="No tables match the search">
                        <button
                          className="btn secondary"
                          onClick={() => setQuery("")}
                        >
                          Clear search
                        </button>
                      </Empty>
                    )}
                </>
              )}
              {view === "sales" && (
                <>
                  <div className="mpos-toolbar">
                    <div className="tabs sales-period">
                      {[
                        ["today", "Today"],
                        ["week", "Last 7 days"],
                        ["all", "All time"],
                      ].map(([key, label]) => (
                        <button
                          key={key}
                          className={range === key ? "active" : ""}
                          onClick={() => setRange(key)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <span className="muted">Times shown in Malaysia time</span>
                  </div>
                  <div className="m-sales-summary">
                    <div>
                      <span>Served order value</span>
                      <strong>{money(totalSales / 100)}</strong>
                      <small>Based on served orders</small>
                    </div>
                    <div>
                      <span>Orders received</span>
                      <strong>{selectedRange.length}</strong>
                      <small>
                        {completed.length} served ·{" "}
                        {
                          selectedRange.filter((o) => o.status === "cancelled")
                            .length
                        }{" "}
                        cancelled
                      </small>
                    </div>
                    <div>
                      <span>Average served order</span>
                      <strong>
                        {money(
                          completed.length
                            ? totalSales / completed.length / 100
                            : 0,
                        )}
                      </strong>
                      <small>For the selected period</small>
                    </div>
                    <div>
                      <span>Payment recorded</span>
                      <strong>
                        {money(
                          selectedRange
                            .filter(
                              (o) => o.paymentStatus === "paid_at_counter",
                            )
                            .reduce((n, o) => n + o.totalCents, 0) / 100,
                        )}
                      </strong>
                      <small>Recorded at the counter</small>
                    </div>
                  </div>
                  <div className="section-head">
                    <h2>Order history</h2>
                    <span>
                      {selectedRange.length}{" "}
                      {selectedRange.length === 1 ? "order" : "orders"}
                    </span>
                  </div>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Order / table</th>
                          <th>Placed</th>
                          <th>Customer</th>
                          <th>Status</th>
                          <th>Total</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {selectedRange.map((o) => (
                          <tr key={o.id}>
                            <td>
                              <strong>{o.tableLabel}</strong>
                              <small>#{o.id.slice(0, 6).toUpperCase()}</small>
                            </td>
                            <td>
                              {new Date(o.createdAt).toLocaleString("en-MY", {
                                timeZone: "Asia/Kuala_Lumpur",
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </td>
                            <td>{o.customerName}</td>
                            <td>
                              <span className={"status " + o.status}>
                                {orderStage[o.status]}
                              </span>
                            </td>
                            <td>{money(o.totalCents / 100)}</td>
                            <td>
                              <button
                                className="text-link"
                                onClick={() => setSelectedOrder(o)}
                              >
                                View
                                <ArrowRight size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {!selectedRange.length && (
                      <Empty title="No orders">
                        Orders appear here after customers place them.
                      </Empty>
                    )}
                  </div>
                </>
              )}
              {view === "settings" && (
                <div className="merchant-settings-layout">
                  <OrderingSettings
                    key={place.id}
                    place={place}
                    onSaved={reload}
                  />
                  <aside className="m-listing-summary">
                    <img src={mediaUrl(place.image)} alt={place.dish} />
                    <span className={"status " + place.status}>
                      {place.status}
                    </span>
                    <h2>{place.name}</h2>
                    <p>{place.address}</p>
                    <dl>
                      <div>
                        <dt>Opening hours</dt>
                        <dd>
                          {place.opensAt}–{place.closesAt} MYT
                        </dd>
                      </div>
                      <div>
                        <dt>Food discovery</dt>
                        <dd>
                          {place.status === "approved"
                            ? "Listed on Makanlah"
                            : "Awaiting review"}
                        </dd>
                      </div>
                    </dl>
                    <button
                      className="btn secondary"
                      onClick={() => setListing(place)}
                    >
                      Edit business details
                    </button>
                    <button
                      className="text-link"
                      onClick={() => setListing("new")}
                    >
                      <Plus size={15} />
                      Register another business
                    </button>
                  </aside>
                </div>
              )}
            </>
          )}
        </main>
      </div>
      {selectedOrder && (
        <Drawer
          title={"Order #" + selectedOrder.id.slice(0, 6).toUpperCase()}
          onClose={() => setSelectedOrder(null)}
        >
          <div className="order-detail-meta">
            <h3>{selectedOrder.tableLabel}</h3>
            <span className={"status " + selectedOrder.status}>
              {orderStage[selectedOrder.status]}
            </span>
            <p>
              {selectedOrder.customerName} · {ageLabel(selectedOrder.createdAt)}
            </p>
          </div>
          <TicketItems order={selectedOrder} />
          {selectedOrder.note && (
            <div className="ticket-note">{selectedOrder.note}</div>
          )}
          <div className="cart-total">
            <strong>Total</strong>
            <strong>{money(selectedOrder.totalCents / 100)}</strong>
          </div>
          <div className="order-payment-state">
            <ReceiptText size={18} />
            <div>
              <strong>
                {selectedOrder.paymentStatus === "paid_at_counter"
                  ? "Paid"
                  : "Unpaid"}
              </strong>
              <small>Record payment after the customer pays.</small>
            </div>
            {selectedOrder.status !== "cancelled" && (
              <button
                className="text-link"
                disabled={busy}
                onClick={() =>
                  mutate("/merchant/orders/" + selectedOrder.id + "/payment", {
                    paid: selectedOrder.paymentStatus !== "paid_at_counter",
                  })
                }
              >
                {selectedOrder.paymentStatus === "paid_at_counter"
                  ? "Reverse payment record"
                  : "Record payment"}
              </button>
            )}
          </div>
          <div className="drawer-save">
            {nextStage[selectedOrder.status] && (
              <button
                className="btn"
                disabled={busy}
                onClick={() =>
                  advance(selectedOrder, nextStage[selectedOrder.status]!)
                }
              >
                {nextLabel[selectedOrder.status]}
                <Check size={16} />
              </button>
            )}
            {["new", "accepted", "preparing"].includes(
              selectedOrder.status,
            ) && (
              <button
                className="text-link"
                disabled={busy}
                onClick={() => advance(selectedOrder, "cancelled")}
              >
                Cancel order
              </button>
            )}
          </div>
        </Drawer>
      )}
      {dishEditor && place && (
        <DishEditor
          place={place}
          item={dishEditor === "new" ? undefined : dishEditor}
          categories={categories}
          onClose={() => setDishEditor(null)}
          onSaved={() => {
            setDishEditor(null);
            reload();
            toast("Menu saved.");
          }}
        />
      )}
      {selectedTable && place && (
        <TableQR
          table={selectedTable}
          place={place}
          origin={origin}
          onClose={() => setSelectedTable(null)}
          onSaved={() => {
            setSelectedTable(null);
            reload();
          }}
        />
      )}
      {tableForm && (
        <Drawer title="Add tables" onClose={() => setTableForm(false)}>
          <p>Create a QR code for each table.</p>
          <form
            className="create-tables-form"
            onSubmit={async (e) => {
              e.preventDefault();
              setFormError("");
              setBusy(true);
              try {
                const r = await send<{ tables: Table[] }>(
                  "/merchant/places/" + placeId + "/tables/batch",
                  {
                    prefix: "Table",
                    start: tableStart,
                    count: tableCount,
                    seats: tableSeats,
                    area: tableArea,
                  },
                );
                toast(
                  r.tables.length
                    ? `${r.tables.length} table QR ${r.tables.length === 1 ? "code is" : "codes are"} ready.`
                    : "These table names already exist. Try a different starting number.",
                );
                reload();
                setTableForm(false);
              } catch (e) {
                setFormError((e as Error).message);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Field label="Dining area">
              <input
                value={tableArea}
                maxLength={60}
                required
                onChange={(e) => setTableArea(e.target.value)}
              />
            </Field>
            <div className="form-grid">
              <Field label="First table number">
                <input
                  type="number"
                  min="1"
                  max="999"
                  required
                  value={tableStart}
                  onChange={(e) => setTableStart(Number(e.target.value))}
                />
              </Field>
              <Field label="Number of tables">
                <input
                  type="number"
                  min="1"
                  max="30"
                  required
                  value={tableCount}
                  onChange={(e) => setTableCount(Number(e.target.value))}
                />
              </Field>
            </div>
            <Field label="Seats per table">
              <input
                type="number"
                min="1"
                max="30"
                required
                value={tableSeats}
                onChange={(e) => setTableSeats(Number(e.target.value))}
              />
            </Field>
            <div className="table-create-preview">
              <QrCode size={28} />
              <span>
                Table {String(tableStart).padStart(2, "0")}
                {tableCount > 1
                  ? " — Table " +
                    String(tableStart + tableCount - 1).padStart(2, "0")
                  : ""}
              </span>
              <small>Existing table names are skipped.</small>
            </div>
            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}
            <button className="btn full" disabled={busy}>
              {busy ? "Creating…" : "Create table QR codes"}
            </button>
          </form>
        </Drawer>
      )}
      {listing && (
        <Drawer
          title={
            listing === "new"
              ? "Register a business"
              : "Update your business details"
          }
          onClose={() => setListing(null)}
        >
          <ListingEditor
            place={listing === "new" ? undefined : listing}
            onClose={() => setListing(null)}
            onSaved={() => {
              setListing(null);
              reload();
            }}
          />
        </Drawer>
      )}
      {printing && place && (
        <div className="print-table-sheet">
          {tables
            .filter((t) => t.active)
            .map((t) => (
              <QRArtwork
                key={t.id}
                table={t}
                place={place}
                origin={origin}
                onReady={() => setPrintReady((n) => n + 1)}
                onError={() => {
                  setPrinting(false);
                  toast("Cannot create the QR codes. Try again.");
                }}
              />
            ))}
        </div>
      )}
    </div>
  );
}
