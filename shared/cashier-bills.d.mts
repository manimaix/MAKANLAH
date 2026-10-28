import type { Order, Table } from "../src/types";
export interface CashierBill {
  key: string;
  tableLabel: string;
  orders: Order[];
  totalCents: number;
}
export function billKey(order: Order): string;
export function unpaidBills(orders: Order[], tables?: Table[]): CashierBill[];
