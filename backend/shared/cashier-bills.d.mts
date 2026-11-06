import type { ServiceOrder, ServiceTable } from "./table-service.mjs";
export interface CashierBill<O extends ServiceOrder = ServiceOrder> {
  key: string; tableLabel: string; orders: O[]; totalCents: number;
}
export function billKey(order: ServiceOrder): string;
export function unpaidBills<O extends ServiceOrder>(orders: O[], tables?: ServiceTable[]): CashierBill<O>[];
