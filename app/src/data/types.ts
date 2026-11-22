// Shared data shapes. The ledger API (ledger-api/) and voice tools should speak these.

export type Section = "daily" | "bulk" | "weekly";
export type Category = "produce" | "meat" | "seafood" | "dairy" | "pantry" | "bakery" | "drinks";

export interface Ingredient {
  id: string;
  name: string;
  category: Category;
  unit: string;
  startQty: number; // stock at the start of service
  onHand: number; // live stock (sales and waste come off this)
  unitCost: number;
  perishable: boolean;
  section: Section; // ordering cadence: daily perishables, bulk (3–4 days), weekly dry goods
  par: number;
  kgPerUnit: number; // for waste in kg
  aliases?: string[];
}

export interface RecipeLine {
  ing: string;
  qty: number;
}

export interface Dish {
  id: string;
  name: string;
  short: string;
  price: number;
  recipe: RecipeLine[];
  manual86: boolean;
  special?: boolean;
}

export interface Receipt {
  orderNo: number;
  dishId: string;
  dish: string;
  price: number;
  time: string;
}

/** Off-market deals the owner told the agent about. Registry prices win over the 20 km search. */
export interface RegistryEntry {
  item: string;
  supplier: string;
  price: number;
  note: string;
}

export interface SearchPrice {
  item: string;
  store: string;
  distance: string;
  price: number;
}

export interface GroceryLine {
  ingId: string;
  name: string;
  section: Section;
  qty: number;
  unit: string;
  supplier: string;
  price: number;
  total: number;
  source: "Supplier registry" | "20 km search" | "Last cost";
}

export type LedgerState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "live"; inventory: { item: string; onHand: number; unit: string }[]; orderCount: number }
  | { status: "offline" };

export type FeedSource = "voice" | "agent" | "delivery" | "you";

export interface FeedItem {
  id: string;
  time: string;
  source: FeedSource;
  who?: string;
  title: string;
}

export interface ShoppingItem {
  id: string;
  text: string;
  store: string;
  checked: boolean;
  addedBy: string;
}

export interface WeekDay {
  day: string;
  orders: number;
  sales: number;
  lastOrders: number;
  lastSales: number;
  today?: boolean;
}

export interface Toast {
  id: string;
  text: string;
}

export interface KitchenState {
  chef: string;
  ingredients: Ingredient[];
  dishes: Dish[];
  receipts: Receipt[];
  registry: RegistryEntry[];
  searchPrices: SearchPrice[];
  extras: Record<string, number>; // manual top-ups for tomorrow's order
  closed: boolean;
  bought: boolean;
  feed: FeedItem[];
  shopping: ShoppingItem[];
  week: WeekDay[];
  expectedOrders: number;
  expectedSales: number;
  weather: { label: string; temp: number };
  scout: { running: boolean; steps: string[]; lastRun: string };
  voice: {
    phase: "idle" | "listening" | "done";
    said: string;
    reply: string;
    live: "off" | "connecting" | "listening" | "speaking"; // ElevenLabs session
    interim: string; // live caption while someone is talking
  };
  ledger: LedgerState;
  toasts: Toast[];
}
