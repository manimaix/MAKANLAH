export const billKey = (order) =>
  JSON.stringify([
    order.placeId,
    order.tableId || order.tableLabel,
    order.tableServiceId || null,
  ]);

export function unpaidBills(orders, tables = []) {
  const bills = new Map();
  for (const order of orders) {
    if (
      order.sample ||
      order.status === "cancelled" ||
      order.paymentStatus === "paid_at_counter"
    )
      continue;
    const key = billKey(order);
    if (!bills.has(key))
      bills.set(key, {
        key,
        tableLabel:
          tables.find((t) => t.id === order.tableId)?.label || order.tableLabel,
        orders: [],
        totalCents: 0,
      });
    const bill = bills.get(key);
    bill.orders.push(order);
    bill.totalCents += order.totalCents;
  }
  return [...bills.values()]
    .map((bill) => ({
      ...bill,
      orders: bill.orders.sort((a, b) =>
        a.createdAt.localeCompare(b.createdAt),
      ),
    }))
    .sort((a, b) => a.orders[0].createdAt.localeCompare(b.orders[0].createdAt));
}
