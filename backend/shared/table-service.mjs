const activeStatuses = new Set(["new", "accepted", "preparing", "ready"]);
const belongsToTable = (order, table) =>
  !order.sample &&
  order.placeId === table.placeId &&
  (order.tableId
    ? order.tableId === table.id
    : order.tableLabel === table.label);

export function tableService(table, allOrders) {
  const orders = allOrders.filter(
    (order) =>
      belongsToTable(order, table) &&
      (!table.serviceId || order.tableServiceId === table.serviceId),
  );
  const activeOrders = orders.filter((order) =>
    activeStatuses.has(order.status),
  );
  const chargeable = orders.filter((order) => order.status !== "cancelled");
  const unpaidOrders = chargeable.filter(
    (order) => order.paymentStatus !== "paid_at_counter",
  );
  return {
    occupied:
      table.occupied === true ||
      activeOrders.length > 0 ||
      (table.occupied === undefined && chargeable.length > 0),
    orders,
    activeOrders,
    unpaidOrders,
    totalCents: chargeable.reduce((sum, order) => sum + order.totalCents, 0),
  };
}

export function seatTable(table, allOrders, serviceId, at) {
  const current = tableService(table, allOrders);
  if (!current.occupied || !table.serviceId) {
    table.serviceId = serviceId;
    const existing = current.occupied ? current.orders : [];
    for (const order of existing) order.tableServiceId = serviceId;
    table.occupiedSince =
      existing
        .filter((order) => order.status !== "cancelled")
        .map((order) => order.createdAt)
        .sort()[0] || at;
  }
  table.occupied = true;
  return table.serviceId;
}
