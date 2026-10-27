import type { Order, Table } from "../src/types";
export function tableService(
  table: Table,
  allOrders: Order[],
): {
  occupied: boolean;
  orders: Order[];
  activeOrders: Order[];
  unpaidOrders: Order[];
  totalCents: number;
};
export function seatTable(
  table: Table,
  allOrders: Order[],
  serviceId: string,
  at: string,
): string;
