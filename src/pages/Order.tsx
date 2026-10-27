import { useEffect } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Check, X } from "lucide-react";
import { money, useApi } from "../api";
import { useAuth } from "../context";
import { ErrorState, Loading } from "../components/ui";
import type { Order } from "../types";
import "../merchant.css";
export function OrderReceipt() {
  const { id } = useParams(),
    [params] = useSearchParams(),
    auth = useAuth();
  let access = params.get("access");
  try {
    access = access || sessionStorage.getItem("makanlah-order-" + id);
  } catch {}
  const { data, error, loading, reload } = useApi<{ order: Order }>(
    "/orders/" + id + (access ? "?access=" + encodeURIComponent(access) : ""),
  );
  useEffect(() => {
    if (data && ["completed", "cancelled"].includes(data.order.status)) return;
    const interval = setInterval(reload, 7000);
    return () => clearInterval(interval);
  }, [data?.order.status, reload]);
  if (loading && !data) return <Loading />;
  if (error && !data)
    return (
      <div className="container receipt-page">
        <ErrorState message={error} retry={reload} />
        <p>
          Use the browser where you placed the order, or sign in to the account
          you used.
        </p>
      </div>
    );
  if (!data) return null;
  const o = data.order,
    steps = ["new", "accepted", "preparing", "ready", "completed"],
    index = steps.indexOf(o.status);
  return (
    <div className="container receipt-page">
      <div
        className={
          "receipt-mark " + (o.status === "cancelled" ? "cancelled" : "")
        }
      >
        {o.status === "cancelled" ? <X size={34} /> : <Check size={34} />}
      </div>
      <h1>
        {
          {
            new: "Order sent",
            accepted: "Order accepted",
            preparing: "Order in preparation",
            ready: "Order ready",
            completed: "Order served",
            cancelled: "Order cancelled",
          }[o.status]
        }
      </h1>
      <p>
        {o.placeName} · {o.tableLabel} · Order #{o.id.slice(0, 8)}
      </p>
      <div className="receipt-status" role="status">
        {o.status === "cancelled" ? (
          <span className="status cancelled">Cancelled</span>
        ) : (
          steps.map((step, i) => (
            <div key={step} className={i <= index ? "reached" : ""}>
              <span>{i < index ? <Check size={15} /> : i + 1}</span>
              <strong>
                {step === "new"
                  ? "Sent"
                  : step === "completed"
                    ? "Served"
                    : step}
              </strong>
            </div>
          ))
        )}
      </div>
      <article className="receipt">
        <h2>Order details</h2>
        <p>{o.customerName}</p>
        <ul>
          {o.items.map((item, index) => (
            <li key={item.menuId + "-" + index}>
              <span>
                {item.quantity} × {item.name}
                {item.variantName && (
                  <small className="receipt-option">{item.variantName}</small>
                )}
                {!!item.addOns?.length && (
                  <small className="receipt-option">
                    + {item.addOns.map((a) => a.name).join(", ")}
                  </small>
                )}
                {item.note && (
                  <small className="receipt-option">Note: {item.note}</small>
                )}
              </span>
              <strong>{money((item.priceCents * item.quantity) / 100)}</strong>
            </li>
          ))}
        </ul>
        {o.note && <p>Kitchen note: {o.note}</p>}
        <div className="cart-total">
          <strong>Total</strong>
          <strong>{money(o.totalCents / 100)}</strong>
        </div>
        <p className="payment-note">
          {o.paymentStatus === "paid_at_counter"
            ? "Payment received."
            : "Pay at the counter."}
        </p>
      </article>
      {error && <ErrorState message={error} retry={reload} />}
      <div className="button-row">
        <button className="btn secondary" onClick={reload}>
          Refresh order
        </button>
        <Link className="btn" to="/discover">
          Food discovery
        </Link>
      </div>
      {!auth.user && (
        <p>
          <Link className="text-link" to="/sign-in">
            Sign in
          </Link>{" "}
          to save future orders to your account.
        </p>
      )}
    </div>
  );
}
