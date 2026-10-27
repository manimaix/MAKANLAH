import {
  Clock3,
  MessageSquareText,
  MoreHorizontal,
  ReceiptText,
  Check,
  X,
} from "lucide-react";
import { money } from "../../api";
import type { Order, OrderStatus } from "../../types";
export const activeStatuses: OrderStatus[] = [
  "new",
  "accepted",
  "preparing",
  "ready",
];
export const orderStage: Record<OrderStatus, string> = {
  new: "New",
  accepted: "Accepted",
  preparing: "Preparing",
  ready: "Ready",
  completed: "Served",
  cancelled: "Cancelled",
};
export const nextStage: Partial<Record<OrderStatus, OrderStatus>> = {
  new: "accepted",
  accepted: "preparing",
  preparing: "ready",
  ready: "completed",
};
export const nextLabel: Partial<Record<OrderStatus, string>> = {
  new: "Accept order",
  accepted: "Start preparation",
  preparing: "Mark as ready",
  ready: "Mark as served",
};
export function ageLabel(createdAt: string) {
  const mins = Math.max(
    0,
    Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000),
  );
  return mins < 1
    ? "Just now"
    : mins < 60
      ? `${mins} min ago`
      : mins < 1440
        ? `${Math.floor(mins / 60)}h ${mins % 60}m ago`
        : `${Math.floor(mins / 1440)}d ago`;
}
export function TicketItems({ order }: { order: Order }) {
  return (
    <ul className="ticket-items">
      {order.items.map((item, i) => (
        <li key={i}>
          <span className="ticket-qty">{item.quantity}×</span>
          <div>
            <strong>{item.name}</strong>
            {item.variantName && <small>{item.variantName}</small>}
            {!!item.addOns?.length && (
              <small>+ {item.addOns.map((a) => a.name).join(", ")}</small>
            )}
            {item.note && <p className="item-request">{item.note}</p>}
          </div>
          <span>{money((item.quantity * item.priceCents) / 100)}</span>
        </li>
      ))}
    </ul>
  );
}
export function OrderTicket({
  order,
  busy,
  onAction,
  onOpen,
  kitchen = false,
  showStatus = false,
}: {
  order: Order;
  busy: boolean;
  onAction: (order: Order, status: OrderStatus) => void;
  onOpen: () => void;
  kitchen?: boolean;
  showStatus?: boolean;
}) {
  const next = nextStage[order.status];
  const late =
    activeStatuses.includes(order.status) &&
    Date.now() - new Date(order.createdAt).getTime() > 20 * 60000;
  return (
    <article
      className={`m-ticket ${kitchen ? "kitchen-ticket" : ""} ${order.status}`}
    >
      <header>
        <div>
          <button className="ticket-table" onClick={onOpen}>
            {order.tableLabel}
            <span>#{order.id.slice(0, 6).toUpperCase()}</span>
          </button>
          <p>
            {order.sample
              ? order.customerName.replace(/\s*· Sample$/, "")
              : order.customerName}
            {order.sample && <span className="sample-ticket">Sample</span>}
          </p>
        </div>
        <button
          className="round"
          aria-label={"Order details " + order.id.slice(0, 6)}
          onClick={onOpen}
        >
          <MoreHorizontal size={19} />
        </button>
      </header>
      {showStatus && (
        <span className={"status " + order.status}>
          {orderStage[order.status]}
        </span>
      )}
      <div className={`ticket-timing ${late ? "late" : ""}`}>
        <Clock3 size={13} />
        {ageLabel(order.createdAt)}
        <span>
          {order.items.reduce((n, i) => n + i.quantity, 0)}{" "}
          {order.items.reduce((n, i) => n + i.quantity, 0) === 1
            ? "item"
            : "items"}
        </span>
      </div>
      <TicketItems order={order} />
      {order.note && (
        <p className="ticket-note">
          <MessageSquareText size={14} />
          {order.note}
        </p>
      )}
      <div className="ticket-total">
        <span
          className={order.paymentStatus === "paid_at_counter" ? "paid" : ""}
        >
          {order.paymentStatus === "paid_at_counter" ? (
            <Check size={13} />
          ) : (
            <ReceiptText size={13} />
          )}{" "}
          {order.paymentStatus === "paid_at_counter" ? "Paid" : "Unpaid"}
        </span>
        <strong>{money(order.totalCents / 100)}</strong>
      </div>
      {next && (
        <div className="ticket-actions">
          <button
            className={`btn ${order.status === "new" ? "gold" : ""}`}
            disabled={busy}
            onClick={() => onAction(order, next)}
          >
            {nextLabel[order.status]}
            <Check size={15} />
          </button>
          {order.status === "new" && (
            <button
              className="ticket-decline"
              aria-label={"Cancel order " + order.id.slice(0, 6)}
              disabled={busy}
              onClick={() => onAction(order, "cancelled")}
            >
              <X size={17} />
            </button>
          )}
        </div>
      )}
    </article>
  );
}
