export interface ServiceTable {
  id: string; placeId: string; label: string; serviceId?: string;
  occupied?: boolean; occupiedSince?: string;
}
export interface ServiceOrder {
  id: string; placeId: string; tableId?: string; tableLabel: string;
  sample?: boolean; tableServiceId?: string; status: string;
  paymentStatus?: string; totalCents: number; createdAt: string;
}
export function tableService<O extends ServiceOrder>(table: ServiceTable, allOrders: O[]): {
  occupied: boolean; orders: O[]; activeOrders: O[]; unpaidOrders: O[]; totalCents: number;
};
export function seatTable<O extends ServiceOrder>(table: ServiceTable, allOrders: O[], serviceId: string, at: string): string;
