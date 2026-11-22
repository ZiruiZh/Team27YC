// Seed data — the team's demo values (matches the ledger-api/ seed). Replace with API data later.
import type { Category, KitchenState, Section } from "./types";

const ing = (
  id: string, name: string, category: Category, unit: string, startQty: number, unitCost: number,
  perishable: boolean, section: Section, par: number, kgPerUnit: number, aliases?: string[],
) => ({ id, name, category, unit, startQty, onHand: startQty, unitCost, perishable, section, par, kgPerUnit, aliases });

export const initialState: KitchenState = {
  chef: "Chef",

  ingredients: [
    ing("salmon", "Salmon fillet", "seafood", "portion", 3, 9.5, true, "daily", 3, 0.2, ["salmon", "fish"]),
    ing("eggs", "Eggs", "dairy", "each", 6, 0.45, true, "daily", 12, 0.06, ["egg"]),
    ing("milk", "Milk", "dairy", "L", 1, 1.8, true, "daily", 3, 1),
    ing("lettuce", "Lettuce", "produce", "kg", 2, 2.0, true, "daily", 2, 1, ["romaine"]),
    ing("tomato", "Tomato", "produce", "kg", 3, 2.5, true, "daily", 3, 1, ["tomatoes"]),
    ing("cream", "Cream", "dairy", "L", 2, 4.0, true, "daily", 2, 1),
    ing("rice", "Rice", "pantry", "kg", 20, 2.1, false, "bulk", 20, 1),
    ing("chicken", "Chicken", "meat", "kg", 5, 6.0, true, "bulk", 5, 1),
    ing("beef", "Beef", "meat", "kg", 4, 11.0, true, "bulk", 4, 1),
    ing("dough", "Pizza dough", "bakery", "kg", 4, 3.0, false, "bulk", 4, 1, ["dough"]),
    ing("pasta", "Pasta", "pantry", "kg", 5, 2.5, false, "bulk", 5, 1),
    ing("bun", "Burger bun", "bakery", "each", 10, 0.8, false, "bulk", 12, 0.08, ["buns"]),
    ing("cheese", "Cheese", "dairy", "kg", 3, 12.0, true, "bulk", 3, 1),
    ing("parmesan", "Parmesan", "dairy", "kg", 1, 18.0, false, "bulk", 1, 1),
    ing("miso", "Miso paste", "pantry", "kg", 1, 8.0, false, "weekly", 1, 1, ["miso"]),
    ing("spices", "Spice mix", "pantry", "kg", 1, 15.0, false, "weekly", 1, 1, ["spice"]),
    ing("truffleOil", "Truffle oil", "pantry", "L", 0.5, 85.0, false, "weekly", 0.5, 1, ["truffle"]),
    ing("croutons", "Croutons", "bakery", "kg", 1, 4.0, false, "weekly", 1, 1),
  ],

  dishes: [
    { id: "misoSalmon", name: "Miso Salmon", short: "Miso", price: 24, manual86: false, recipe: [{ ing: "salmon", qty: 1 }, { ing: "rice", qty: 0.2 }, { ing: "miso", qty: 0.05 }] },
    { id: "chickenCurry", name: "Chicken Curry", short: "Curry", price: 18, manual86: false, recipe: [{ ing: "chicken", qty: 0.25 }, { ing: "rice", qty: 0.2 }, { ing: "spices", qty: 0.03 }] },
    { id: "pizza", name: "Margherita Pizza", short: "Pizza", price: 16, manual86: false, recipe: [{ ing: "dough", qty: 0.3 }, { ing: "cheese", qty: 0.15 }, { ing: "tomato", qty: 0.2 }] },
    { id: "burger", name: "Beef Burger", short: "Burger", price: 19, manual86: false, recipe: [{ ing: "beef", qty: 0.2 }, { ing: "bun", qty: 1 }, { ing: "cheese", qty: 0.05 }, { ing: "lettuce", qty: 0.05 }] },
    { id: "caesar", name: "Caesar Salad", short: "Caesar", price: 14, manual86: false, recipe: [{ ing: "lettuce", qty: 0.15 }, { ing: "chicken", qty: 0.1 }, { ing: "parmesan", qty: 0.05 }, { ing: "croutons", qty: 0.05 }] },
    { id: "trufflePasta", name: "Truffle Pasta", short: "Pasta", price: 22, manual86: false, recipe: [{ ing: "pasta", qty: 0.2 }, { ing: "cream", qty: 0.1 }, { ing: "truffleOil", qty: 0.02 }, { ing: "parmesan", qty: 0.05 }] },
  ],

  receipts: [],

  registry: [
    { item: "beef", supplier: "Raj's Meat Co.", price: 11, note: "friend rate" },
    { item: "chicken", supplier: "Raj's Meat Co.", price: 6, note: "friend rate" },
    { item: "salmon", supplier: "Harbor Fish", price: 9.5, note: "daily delivery" },
    { item: "eggs", supplier: "Neighbour's farm", price: 0, note: "FREE" },
  ],

  searchPrices: [
    { item: "salmon", store: "Metro", distance: "2 km", price: 10.5 },
    { item: "eggs", store: "No Frills", distance: "1.5 km", price: 0.6 },
    { item: "milk", store: "Metro", distance: "2 km", price: 1.95 },
    { item: "lettuce", store: "No Frills", distance: "1.5 km", price: 2.4 },
    { item: "tomato", store: "No Frills", distance: "1.5 km", price: 2.8 },
    { item: "cream", store: "Metro", distance: "2 km", price: 4.5 },
    { item: "rice", store: "No Frills", distance: "1.5 km", price: 2.3 },
    { item: "chicken", store: "Metro", distance: "2 km", price: 6.8 },
    { item: "beef", store: "Metro", distance: "2 km", price: 12.5 },
    { item: "dough", store: "Wholesale Club", distance: "8 km", price: 3.2 },
    { item: "pasta", store: "No Frills", distance: "1.5 km", price: 2.7 },
    { item: "bun", store: "Metro", distance: "2 km", price: 0.9 },
    { item: "cheese", store: "Metro", distance: "2 km", price: 13.0 },
    { item: "parmesan", store: "Metro", distance: "2 km", price: 19.0 },
    { item: "miso", store: "T&T", distance: "5 km", price: 9.0 },
    { item: "spices", store: "Bulk Barn", distance: "3 km", price: 16.0 },
    { item: "truffleOil", store: "Specialty Foods", distance: "12 km", price: 90.0 },
    { item: "croutons", store: "No Frills", distance: "1.5 km", price: 4.5 },
  ],

  extras: {},
  closed: false,
  bought: false,

  feed: [
    { id: "f1", time: "4:52 pm", source: "voice", who: "Owner", title: "Saved Raj's Meat Co. for beef, friend rate" },
    { id: "f2", time: "4:40 pm", source: "voice", who: "Owner", title: "Neighbour's farm eggs added, free" },
    { id: "f3", time: "3:15 pm", source: "delivery", who: "Harbor Fish", title: "Salmon delivered: 3 portions" },
  ],

  shopping: [
    { id: "s1", text: "Parchment paper", store: "Wholesale Club", checked: false, addedBy: "Chef" },
    { id: "s2", text: "Limes", store: "No Frills", checked: false, addedBy: "Line cook" },
    { id: "s3", text: "Deli containers", store: "Wholesale Club", checked: true, addedBy: "Chef" },
  ],

  // Earlier days are illustrative; today comes from the live receipt log.
  week: [
    { day: "Mon", orders: 18, sales: 380, lastOrders: 16, lastSales: 340 },
    { day: "Tue", orders: 22, sales: 450, lastOrders: 20, lastSales: 410 },
    { day: "Wed", orders: 25, sales: 520, lastOrders: 21, lastSales: 450 },
    { day: "Thu", orders: 15, sales: 310, lastOrders: 18, lastSales: 380 },
    { day: "Fri", orders: 28, sales: 590, lastOrders: 26, lastSales: 540 },
    { day: "Sat", orders: 34, sales: 720, lastOrders: 31, lastSales: 650 },
    { day: "Sun", orders: 0, sales: 0, lastOrders: 27, lastSales: 560, today: true },
  ],
  expectedOrders: 24,
  expectedSales: 480,

  weather: { label: "Clear", temp: 14 },
  scout: {
    running: false,
    steps: ["Checked 18 ingredients within 20 km", "Compared against your supplier registry", "Registry wins on 4 items"],
    lastRun: "Today, 5:40 pm",
  },
  voice: { phase: "idle", said: "", reply: "", live: "off", interim: "" },
  ledger: { status: "idle" },
  toasts: [],
};

// The demo clock starts at 6:12 pm on a Sunday and then moves in real time.
const DEMO_START = new Date(2026, 10, 22, 18, 12, 0).getTime();
const appStart = Date.now();
export function demoNow(): Date {
  return new Date(DEMO_START + (Date.now() - appStart));
}
