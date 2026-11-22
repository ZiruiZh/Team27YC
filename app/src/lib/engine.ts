// Pure kitchen logic, ported from the team's POS / End Sales screen.
import type { Dish, GroceryLine, Ingredient, KitchenState, RegistryEntry, SearchPrice, Section } from "../data/types";

export const ingMap = (s: KitchenState): Record<string, Ingredient> => Object.fromEntries(s.ingredients.map((i) => [i.id, i]));

export const dishCost = (dish: Dish, ings: Record<string, Ingredient>) =>
  dish.recipe.reduce((sum, l) => sum + l.qty * (ings[l.ing]?.unitCost ?? 0), 0);

export const canMake = (dish: Dish, ings: Record<string, Ingredient>) =>
  dish.recipe.every((l) => (ings[l.ing]?.onHand ?? 0) >= l.qty - 1e-9);

export const is86 = (dish: Dish, ings: Record<string, Ingredient>) => dish.manual86 || !canMake(dish, ings);

/** Low = at or under a quarter of the starting stock. */
export function stockStatus(i: Ingredient): "out" | "low" | "ok" {
  if (i.onHand <= 1e-9) return "out";
  if (i.onHand <= i.startQty * 0.25) return "low";
  return "ok";
}

export const used = (i: Ingredient) => Math.max(0, i.startQty - i.onHand);

export function totals(s: KitchenState) {
  const ings = ingMap(s);
  const revenue = s.receipts.reduce((sum, r) => sum + r.price, 0);
  const cost = s.receipts.reduce((sum, r) => {
    const d = s.dishes.find((x) => x.id === r.dishId);
    return sum + (d ? dishCost(d, ings) : 0);
  }, 0);
  return { revenue, cost, profit: revenue - cost, foodCostPct: revenue > 0 ? (cost / revenue) * 100 : 0 };
}

/** Leftover daily perishables at close spoil overnight. 0 during service. */
export function wasteKg(s: KitchenState) {
  if (!s.closed) return 0;
  const w = s.ingredients.filter((i) => i.section === "daily").reduce((sum, i) => sum + i.onHand * i.kgPerUnit, 0);
  return Math.round(w * 100) / 100;
}

export function bestSource(item: string, registry: RegistryEntry[], search: SearchPrice[], lastCost: number) {
  const reg = registry.find((r) => r.item === item);
  if (reg) return { supplier: `${reg.supplier} (${reg.note})`, price: reg.price, source: "Supplier registry" as const };
  const found = search.filter((p) => p.item === item).sort((a, b) => a.price - b.price)[0];
  if (found) return { supplier: `${found.store} (${found.distance})`, price: found.price, source: "20 km search" as const };
  return { supplier: "Last cost", price: lastCost, source: "Last cost" as const };
}

/** Tomorrow's grocery list: registry prices first, then the 20 km search. */
export function groceryList(s: KitchenState): GroceryLine[] {
  const lines: GroceryLine[] = [];
  for (const i of s.ingredients) {
    const u = used(i);
    let target: number;
    if (i.section === "daily") target = Math.max(i.par, u);
    else if (i.section === "bulk") target = Math.max(i.par, u * 4);
    else target = i.par;
    let q = target - i.onHand + (s.extras[i.id] ?? 0);
    if (q <= 1e-9) continue;
    q = i.unit === "portion" || i.unit === "each" ? Math.ceil(q) : Math.ceil(q * 10) / 10;
    const src = bestSource(i.id, s.registry, s.searchPrices, i.unitCost);
    lines.push({
      ingId: i.id, name: i.name, section: i.section, qty: q, unit: i.unit,
      supplier: src.supplier, price: src.price, total: Math.round(q * src.price * 100) / 100, source: src.source,
    });
  }
  return lines;
}

export const SCOUT_STEPS = [
  "Searching stores within 20 km",
  "Reading 18 product listings",
  "Comparing with your supplier registry",
  "Found milk cheaper at FreshCo",
];

export const sectionLabel: Record<Section, string> = { daily: "Daily", bulk: "Bulk", weekly: "Weekly" };
export const sectionLong: Record<Section, string> = {
  daily: "Daily perishables: fish, milk, eggs",
  bulk: "Bulk, 3–4 days: rice, meat, dough",
  weekly: "Weekly: spices, dry goods",
};

/** How much the registry deals save versus the cheapest 20 km price, per restock to par. */
export function registrySavings(s: KitchenState) {
  return s.registry.reduce((sum, r) => {
    const i = s.ingredients.find((x) => x.id === r.item);
    const market = s.searchPrices.filter((p) => p.item === r.item).sort((a, b) => a.price - b.price)[0];
    if (!i || !market || market.price <= r.price) return sum;
    return sum + (market.price - r.price) * i.par;
  }, 0);
}

export function mostUsed(s: KitchenState) {
  let best: Ingredient | null = null;
  for (const i of s.ingredients) if (used(i) > (best ? used(best) : 0)) best = i;
  return best;
}

export function priceyBarelyUsed(s: KitchenState) {
  const c = s.ingredients.filter((i) => used(i) <= i.startQty * 0.1);
  return c.length ? c.reduce((a, b) => (b.unitCost > a.unitCost ? b : a)) : null;
}

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim()
    .split(" ").map((w) => w.replace(/ies$/, "y").replace(/(es|s)$/, "")).join(" ");

/** Loose name match for spoken or typed names ("the salmon" → Salmon fillet). */
export function findByName<T extends { name: string; aliases?: string[]; short?: string }>(items: T[], query: string): T | undefined {
  const q = norm(query.replace(/^the /i, ""));
  if (!q) return undefined;
  let best: { item: T; score: number } | undefined;
  for (const item of items) {
    for (const label of [item.name, item.short ?? "", ...(item.aliases ?? [])].filter(Boolean)) {
      const n = norm(label);
      let score = 0;
      if (n === q) score = 1;
      else if (n.includes(q) || q.includes(n)) score = 0.8;
      else {
        const qt = q.split(" ");
        score = (qt.filter((t) => n.split(" ").includes(t)).length / qt.length) * 0.7;
      }
      if (!best || score > best.score) best = { item, score };
    }
  }
  return best && best.score >= 0.5 ? best.item : undefined;
}
