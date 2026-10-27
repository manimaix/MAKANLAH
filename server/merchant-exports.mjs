export const malaysiaDate = (value) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));

export function exportOrders(orders, placeId, range, current = new Date()) {
  return orders
    .filter(
      (o) =>
        o.placeId === placeId &&
        !o.sample &&
        (range === "all" ||
          (range === "today"
            ? malaysiaDate(o.createdAt) === malaysiaDate(current)
            : +current - +new Date(o.createdAt) < 7 * 86400000)),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function ordersCsv(orders) {
  const stage = {
    new: "New",
    accepted: "Accepted",
    preparing: "Preparing",
    ready: "Ready",
    completed: "Served",
    cancelled: "Cancelled",
  };
  const rows = [
    [
      "Order",
      "Placed (Malaysia time)",
      "Table",
      "Customer",
      "Status",
      "Payment",
      "Total MYR",
    ],
    ...orders.map((o) => [
      o.id,
      new Date(o.createdAt).toLocaleString("en-GB", {
        timeZone: "Asia/Kuala_Lumpur",
        hour12: false,
      }),
      o.tableLabel,
      o.customerName,
      stage[o.status],
      o.paymentStatus === "paid_at_counter" ? "Paid" : "Unpaid",
      (o.totalCents / 100).toFixed(2),
    ]),
  ];
  const quote = (value) => {
    const text = String(value);
    return (
      '"' +
      (/^[\s]*[=+@-]/.test(text) ? "'" : "") +
      text.replaceAll('"', '""') +
      '"'
    );
  };
  return "\uFEFF" + rows.map((row) => row.map(quote).join(",")).join("\r\n");
}
