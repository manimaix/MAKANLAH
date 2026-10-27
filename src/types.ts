export interface Preferences {
  cuisines: string[];
  dietary: string[];
  budget: number;
  spicy: boolean;
}
export interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "merchant" | "admin";
  bio: string;
  city: string;
  status: string;
  preferences: Preferences;
  createdAt: string;
}
export interface Place {
  id: string;
  name: string;
  dish: string;
  description: string;
  address: string;
  area: string;
  city: string;
  cuisine: string;
  price: number;
  lat: number;
  lng: number;
  tags: string[];
  image: string;
  rating: number;
  reviewCount: number;
  distance?: number;
  saved?: boolean;
  open?: boolean;
  opensAt: string;
  closesAt: string;
  sample?: boolean;
  ownerId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  acceptingOrders?: boolean;
  prepMinutes?: number;
  orderMessage?: string;
}
export interface Media {
  id?: string;
  url: string;
  type: "image" | "video";
  size?: number;
}
export interface Post {
  id: string;
  title: string;
  body: string;
  media: Media[];
  authorId: string;
  author: User;
  placeId: string | null;
  place: Place | null;
  status: "published" | "draft" | "hidden";
  sponsored: boolean;
  sample?: boolean;
  likeCount: number;
  liked: boolean;
  saved: boolean;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}
export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  author: User;
  body: string;
  createdAt: string;
}
export interface Review {
  id: string;
  authorId: string;
  author: User;
  placeId: string;
  body: string;
  rating: number;
  sample?: boolean;
  createdAt: string;
}
export interface MenuChoice {
  id: string;
  name: string;
  priceCents: number;
}
export interface MenuItem {
  id: string;
  placeId: string;
  name: string;
  description: string;
  category: string;
  priceCents: number;
  available: boolean;
  image: string;
  variants?: MenuChoice[];
  addOns?: MenuChoice[];
}
export interface Table {
  id: string;
  placeId: string;
  label: string;
  token: string;
  active: boolean;
  seats?: number;
  area?: string;
  occupied?: boolean;
  serviceId?: string;
  occupiedSince?: string;
  clearedAt?: string;
}
export type OrderStatus =
  "new" | "accepted" | "preparing" | "ready" | "completed" | "cancelled";
export interface Order {
  id: string;
  placeId: string;
  placeName: string;
  tableId?: string;
  tableServiceId?: string;
  tableLabel: string;
  customerName: string;
  note: string;
  items: {
    menuId: string;
    name: string;
    priceCents: number;
    quantity: number;
    variantName?: string;
    addOns?: MenuChoice[];
    note?: string;
  }[];
  totalCents: number;
  status: OrderStatus;
  paymentStatus: string;
  createdAt: string;
  updatedAt?: string;
  sample?: boolean;
}
export interface MerchantData {
  places: Place[];
  menus: MenuItem[];
  tables: Table[];
  orders: Order[];
}
export interface Report {
  id: string;
  authorId: string;
  type: "post" | "place" | "review";
  targetId: string;
  reason: string;
  status: "open" | "resolved";
  createdAt: string;
}
export interface AdminData {
  users: User[];
  places: Place[];
  posts: Post[];
  reports: Report[];
  audit: { id: string; action: string; targetId: string; createdAt: string }[];
  orders: Order[];
}
export type Coordinates = { lat: number; lng: number };
