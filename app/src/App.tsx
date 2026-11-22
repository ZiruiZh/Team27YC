import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type Section = 'daily' | 'bulk' | 'weekly';

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  startQty: number;
  unitCost: number;
  perishable: boolean;
  section: Section;
  par: number; // target stock level the grocery list orders up to
  kgPerUnit: number; // for waste (kg) — 1 portion salmon = 0.2 kg, 1 egg = 0.06 kg
};

type RecipeLine = { ing: string; qty: number };

type Dish = {
  id: string;
  name: string;
  price: number;
  recipe: RecipeLine[];
};

type Receipt = {
  orderNo: number;
  dishId: string;
  dish: string;
  price: number;
  time: string;
};

type RegistryEntry = {
  item: string;
  supplier: string;
  price: number;
  note: string;
};

type SearchPrice = {
  item: string;
  store: string;
  distance: string;
  price: number;
};

type GroceryLine = {
  ingId: string;
  name: string;
  qty: number;
  unit: string;
  supplier: string;
  price: number;
  total: number;
  source: string;
};

/* ------------------------------------------------------------------ */
/* Seed data — illustrative demo values, the team can replace them     */
/* ------------------------------------------------------------------ */

const INGREDIENTS: Ingredient[] = [
  { id: 'salmon', name: 'Salmon fillet', unit: 'portion', startQty: 3, unitCost: 9.5, perishable: true, section: 'daily', par: 3, kgPerUnit: 0.2 },
  { id: 'eggs', name: 'Eggs', unit: 'each', startQty: 6, unitCost: 0.45, perishable: true, section: 'daily', par: 12, kgPerUnit: 0.06 },
  { id: 'milk', name: 'Milk', unit: 'L', startQty: 1, unitCost: 1.8, perishable: true, section: 'daily', par: 3, kgPerUnit: 1 },
  { id: 'lettuce', name: 'Lettuce', unit: 'kg', startQty: 2, unitCost: 2.0, perishable: true, section: 'daily', par: 2, kgPerUnit: 1 },
  { id: 'tomato', name: 'Tomato', unit: 'kg', startQty: 3, unitCost: 2.5, perishable: true, section: 'daily', par: 3, kgPerUnit: 1 },
  { id: 'cream', name: 'Cream', unit: 'L', startQty: 2, unitCost: 4.0, perishable: true, section: 'daily', par: 2, kgPerUnit: 1 },
  { id: 'rice', name: 'Rice', unit: 'kg', startQty: 20, unitCost: 2.1, perishable: false, section: 'bulk', par: 20, kgPerUnit: 1 },
  { id: 'chicken', name: 'Chicken', unit: 'kg', startQty: 5, unitCost: 6.0, perishable: true, section: 'bulk', par: 5, kgPerUnit: 1 },
  { id: 'beef', name: 'Beef', unit: 'kg', startQty: 4, unitCost: 11.0, perishable: true, section: 'bulk', par: 4, kgPerUnit: 1 },
  { id: 'dough', name: 'Pizza dough', unit: 'kg', startQty: 4, unitCost: 3.0, perishable: false, section: 'bulk', par: 4, kgPerUnit: 1 },
  { id: 'pasta', name: 'Pasta', unit: 'kg', startQty: 5, unitCost: 2.5, perishable: false, section: 'bulk', par: 5, kgPerUnit: 1 },
  { id: 'bun', name: 'Burger bun', unit: 'each', startQty: 10, unitCost: 0.8, perishable: false, section: 'bulk', par: 12, kgPerUnit: 0.08 },
  { id: 'cheese', name: 'Cheese', unit: 'kg', startQty: 3, unitCost: 12.0, perishable: true, section: 'bulk', par: 3, kgPerUnit: 1 },
  { id: 'parmesan', name: 'Parmesan', unit: 'kg', startQty: 1, unitCost: 18.0, perishable: false, section: 'bulk', par: 1, kgPerUnit: 1 },
  { id: 'miso', name: 'Miso paste', unit: 'kg', startQty: 1, unitCost: 8.0, perishable: false, section: 'weekly', par: 1, kgPerUnit: 1 },
  { id: 'spices', name: 'Spice mix', unit: 'kg', startQty: 1, unitCost: 15.0, perishable: false, section: 'weekly', par: 1, kgPerUnit: 1 },
  { id: 'truffleOil', name: 'Truffle oil', unit: 'L', startQty: 0.5, unitCost: 85.0, perishable: false, section: 'weekly', par: 0.5, kgPerUnit: 1 },
  { id: 'croutons', name: 'Croutons', unit: 'kg', startQty: 1, unitCost: 4.0, perishable: false, section: 'weekly', par: 1, kgPerUnit: 1 },
];

const DISHES: Dish[] = [
  {
    id: 'misoSalmon',
    name: 'Miso Salmon',
    price: 24,
    recipe: [
      { ing: 'salmon', qty: 1 },
      { ing: 'rice', qty: 0.2 },
      { ing: 'miso', qty: 0.05 },
    ],
  },
  {
    id: 'chickenCurry',
    name: 'Chicken Curry',
    price: 18,
    recipe: [
      { ing: 'chicken', qty: 0.25 },
      { ing: 'rice', qty: 0.2 },
      { ing: 'spices', qty: 0.03 },
    ],
  },
  {
    id: 'pizza',
    name: 'Margherita Pizza',
    price: 16,
    recipe: [
      { ing: 'dough', qty: 0.3 },
      { ing: 'cheese', qty: 0.15 },
      { ing: 'tomato', qty: 0.2 },
    ],
  },
  {
    id: 'burger',
    name: 'Beef Burger',
    price: 19,
    recipe: [
      { ing: 'beef', qty: 0.2 },
      { ing: 'bun', qty: 1 },
      { ing: 'cheese', qty: 0.05 },
      { ing: 'lettuce', qty: 0.05 },
    ],
  },
  {
    id: 'caesar',
    name: 'Caesar Salad',
    price: 14,
    recipe: [
      { ing: 'lettuce', qty: 0.15 },
      { ing: 'chicken', qty: 0.1 },
      { ing: 'parmesan', qty: 0.05 },
      { ing: 'croutons', qty: 0.05 },
    ],
  },
  {
    id: 'trufflePasta',
    name: 'Truffle Pasta',
    price: 22,
    recipe: [
      { ing: 'pasta', qty: 0.2 },
      { ing: 'cream', qty: 0.1 },
      { ing: 'truffleOil', qty: 0.02 },
      { ing: 'parmesan', qty: 0.05 },
    ],
  },
];

/* Custom supplier registry — off-market deals the owner told the agent
   about by voice. Registry prices win over the 20 km search. */
const REGISTRY: RegistryEntry[] = [
  { item: 'beef', supplier: "Raj's Meat Co.", price: 11, note: 'friend rate' },
  { item: 'chicken', supplier: "Raj's Meat Co.", price: 6, note: 'friend rate' },
  { item: 'salmon', supplier: 'Harbor Fish', price: 9.5, note: 'daily delivery' },
  { item: 'eggs', supplier: "Neighbour's farm", price: 0, note: 'FREE' },
];

/* Seeded 20 km search prices — fallback when the registry has no price. */
const SEARCH_PRICES: SearchPrice[] = [
  { item: 'salmon', store: 'Metro', distance: '2 km', price: 10.5 },
  { item: 'eggs', store: 'No Frills', distance: '1.5 km', price: 0.6 },
  { item: 'milk', store: 'Metro', distance: '2 km', price: 1.95 },
  { item: 'lettuce', store: 'No Frills', distance: '1.5 km', price: 2.4 },
  { item: 'tomato', store: 'No Frills', distance: '1.5 km', price: 2.8 },
  { item: 'cream', store: 'Metro', distance: '2 km', price: 4.5 },
  { item: 'rice', store: 'No Frills', distance: '1.5 km', price: 2.3 },
  { item: 'chicken', store: 'Metro', distance: '2 km', price: 6.8 },
  { item: 'beef', store: 'Metro', distance: '2 km', price: 12.5 },
  { item: 'dough', store: 'Wholesale Club', distance: '8 km', price: 3.2 },
  { item: 'pasta', store: 'No Frills', distance: '1.5 km', price: 2.7 },
  { item: 'bun', store: 'Metro', distance: '2 km', price: 0.9 },
  { item: 'cheese', store: 'Metro', distance: '2 km', price: 13.0 },
  { item: 'parmesan', store: 'Metro', distance: '2 km', price: 19.0 },
  { item: 'miso', store: 'T&T', distance: '5 km', price: 9.0 },
  { item: 'spices', store: 'Bulk Barn', distance: '3 km', price: 16.0 },
  { item: 'truffleOil', store: 'Specialty Foods', distance: '12 km', price: 90.0 },
  { item: 'croutons', store: 'No Frills', distance: '1.5 km', price: 4.5 },
];

const ING_MAP: Record<string, Ingredient> = Object.fromEntries(
  INGREDIENTS.map((i) => [i.id, i]),
);
const DISH_MAP: Record<string, Dish> = Object.fromEntries(
  DISHES.map((d) => [d.id, d]),
);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function dishCost(dish: Dish): number {
  return dish.recipe.reduce(
    (sum, line) => sum + line.qty * ING_MAP[line.ing].unitCost,
    0,
  );
}

function money(n: number): string {
  return `$${n.toFixed(2)}`;
}

function fmtQty(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function recipeText(dish: Dish): string {
  return dish.recipe
    .map((line) => `${ING_MAP[line.ing].name} ${fmtQty(line.qty)} ${ING_MAP[line.ing].unit}`)
    .join(' · ');
}

/* ------------------------------------------------------------------ */
/* Styles (plain dark, matches the Vite template)                      */
/* ------------------------------------------------------------------ */

const s: Record<string, CSSProperties> = {
  app: {
    maxWidth: 1100,
    margin: '0 auto',
    padding: 20,
    background: '#14161a',
    color: '#e8eaed',
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  title: { margin: 0, fontSize: 28 },
  subtitle: { margin: '4px 0 0', color: '#9aa0a6' },
  panel: {
    background: '#1f222a',
    border: '1px solid #333842',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  panelTitle: { margin: '0 0 12px', fontSize: 18 },
  scoreRow: { display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 },
  scoreCard: {
    flex: '1 1 140px',
    background: '#1f222a',
    border: '1px solid #333842',
    borderRadius: 10,
    padding: 12,
  },
  scoreLabel: { fontSize: 12, color: '#9aa0a6', textTransform: 'uppercase' },
  scoreValue: { fontSize: 24, fontWeight: 700, marginTop: 4 },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  posGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  posButton: {
    background: '#2b6cb0',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    padding: '12px 10px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  posButtonDisabled: {
    background: '#3a3f4a',
    color: '#9aa0a6',
    border: 'none',
    borderRadius: 8,
    padding: '12px 10px',
    cursor: 'not-allowed',
    textAlign: 'left',
  },
  dishName: { fontWeight: 700, fontSize: 15 },
  dishPrice: { fontWeight: 700, fontSize: 15 },
  dishRecipe: { fontSize: 12, color: '#c5c9cf', marginTop: 4, lineHeight: 1.4 },
  menuRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    padding: '10px 0',
    borderBottom: '1px solid #2c313a',
  },
  crossed: { textDecoration: 'line-through', color: '#8a8f98' },
  smallButton: {
    background: '#333842',
    color: '#e8eaed',
    border: '1px solid #4a505c',
    borderRadius: 6,
    padding: '6px 10px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  smallButtonDanger: {
    background: '#5a1f1f',
    color: '#ffb4b4',
    border: '1px solid #7a2e2e',
    borderRadius: 6,
    padding: '6px 10px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  bigButton: {
    width: '100%',
    background: '#2f9e44',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '14px 16px',
    fontSize: 17,
    fontWeight: 700,
    cursor: 'pointer',
    marginBottom: 16,
  },
  buyButton: {
    background: '#2f9e44',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '12px 24px',
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
  },
  ghostButton: {
    background: 'transparent',
    color: '#9aa0a6',
    border: '1px solid #4a505c',
    borderRadius: 8,
    padding: '8px 12px',
    cursor: 'pointer',
  },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 14 },
  th: { textAlign: 'left', color: '#9aa0a6', padding: '6px 8px', borderBottom: '1px solid #333842' },
  td: { padding: '6px 8px', borderBottom: '1px solid #2c313a' },
  tag: {
    display: 'inline-block',
    fontSize: 11,
    padding: '2px 7px',
    borderRadius: 20,
    background: '#333842',
    color: '#c5c9cf',
  },
  tagGreen: {
    display: 'inline-block',
    fontSize: 11,
    padding: '2px 7px',
    borderRadius: 20,
    background: '#1d4d2b',
    color: '#8be0a4',
  },
  tagRed: {
    display: 'inline-block',
    fontSize: 11,
    padding: '2px 7px',
    borderRadius: 20,
    background: '#5a1f1f',
    color: '#ffb4b4',
  },
  tagAmber: {
    display: 'inline-block',
    fontSize: 11,
    padding: '2px 7px',
    borderRadius: 20,
    background: '#5a4312',
    color: '#ffd28a',
  },
  confirmBox: {
    background: '#1d4d2b',
    border: '1px solid #2f9e44',
    color: '#c8f0d2',
    borderRadius: 10,
    padding: 14,
    marginTop: 12,
    lineHeight: 1.5,
  },
  note: { fontSize: 13, color: '#9aa0a6', lineHeight: 1.5 },
  sectionTitle: { margin: '16px 0 8px', fontSize: 16 },
};

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

export default function App() {
  const [orders, setOrders] = useState<Receipt[]>([]);
  const [manual86, setManual86] = useState<ReadonlySet<string>>(new Set());
  const [closed, setClosed] = useState(false);
  const [bought, setBought] = useState(false);

  /* Ingredients used today, derived from the receipt log. */
  const used = useMemo(() => {
    const u: Record<string, number> = {};
    for (const o of orders) {
      for (const line of DISH_MAP[o.dishId].recipe) {
        u[line.ing] = (u[line.ing] ?? 0) + line.qty;
      }
    }
    return u;
  }, [orders]);

  /* Current inventory = starting stock minus what was used. */
  const current = useMemo(() => {
    const c: Record<string, number> = {};
    for (const ing of INGREDIENTS) {
      c[ing.id] = ing.startQty - (used[ing.id] ?? 0);
    }
    return c;
  }, [used]);

  const revenue = useMemo(
    () => orders.reduce((sum, o) => sum + o.price, 0),
    [orders],
  );
  const ingredientCost = useMemo(
    () => orders.reduce((sum, o) => sum + dishCost(DISH_MAP[o.dishId]), 0),
    [orders],
  );
  const profit = revenue - ingredientCost;
  const foodCostPct = revenue > 0 ? (ingredientCost / revenue) * 100 : 0;

  /* Waste (kg): leftover daily perishables at close — they spoil overnight.
     Counted at End Sales, 0 during service. */
  const wasteKg = useMemo(() => {
    if (!closed) return 0;
    let w = 0;
    for (const ing of INGREDIENTS) {
      if (ing.section === 'daily') {
        w += (current[ing.id] ?? 0) * ing.kgPerUnit;
      }
    }
    return Math.round(w * 100) / 100;
  }, [closed, current]);

  const canMake = (dish: Dish) =>
    dish.recipe.every((line) => (current[line.ing] ?? 0) >= line.qty);

  const is86 = (dish: Dish) => manual86.has(dish.id) || !canMake(dish);

  const placeOrder = (dish: Dish) => {
    if (closed || is86(dish)) return;
    const receipt: Receipt = {
      orderNo: orders.length + 1,
      dishId: dish.id,
      dish: dish.name,
      price: dish.price,
      time: new Date().toLocaleTimeString(),
    };
    setOrders((prev) => [...prev, receipt]);
  };

  const toggle86 = (dishId: string) => {
    setManual86((prev) => {
      const next = new Set(prev);
      if (next.has(dishId)) next.delete(dishId);
      else next.add(dishId);
      return next;
    });
  };

  const resetDemo = () => {
    setOrders([]);
    setManual86(new Set());
    setClosed(false);
    setBought(false);
  };

  const mostUsed = useMemo(() => {
    let best: Ingredient | null = null;
    let bestQty = 0;
    for (const ing of INGREDIENTS) {
      const q = used[ing.id] ?? 0;
      if (q > bestQty) {
        bestQty = q;
        best = ing;
      }
    }
    return best ? { ing: best, qty: bestQty } : null;
  }, [used]);

  /* Most expensive ingredient that was barely used today (<= 10% of stock). */
  const priceyBarelyUsed = useMemo(() => {
    const candidates = INGREDIENTS.filter(
      (ing) => (used[ing.id] ?? 0) <= ing.startQty * 0.1,
    );
    if (candidates.length === 0) return null;
    let best = candidates[0];
    for (const c of candidates) {
      if (c.unitCost > best.unitCost) best = c;
    }
    return { ing: best, qty: used[best.id] ?? 0 };
  }, [used]);

  /* Tomorrow's grocery list — registry prices first, then 20 km search. */
  const grocery = useMemo<GroceryLine[]>(() => {
    if (!closed) return [];
    const lines: GroceryLine[] = [];
    for (const ing of INGREDIENTS) {
      const todayUsed = used[ing.id] ?? 0;
      const cur = current[ing.id] ?? 0;
      let target: number;
      if (ing.section === 'daily') target = Math.max(ing.par, todayUsed);
      else if (ing.section === 'bulk') target = Math.max(ing.par, todayUsed * 4);
      else target = ing.par;
      let qty = target - cur;
      if (qty <= 0) continue;
      if (ing.unit === 'portion' || ing.unit === 'each') qty = Math.ceil(qty);
      else qty = Math.ceil(qty * 10) / 10;
      const reg = REGISTRY.find((r) => r.item === ing.id);
      const found = SEARCH_PRICES.find((sp) => sp.item === ing.id);
      const supplier = reg
        ? `${reg.supplier} (${reg.note})`
        : found
          ? `${found.store} (${found.distance})`
          : 'Last cost';
      const price = reg ? reg.price : found ? found.price : ing.unitCost;
      const source = reg
        ? 'Supplier registry'
        : found
          ? '20 km search'
          : 'Last cost';
      lines.push({
        ingId: ing.id,
        name: ing.name,
        qty,
        unit: ing.unit,
        supplier,
        price,
        total: Math.round(qty * price * 100) / 100,
        source,
      });
    }
    return lines;
  }, [closed, used, current]);

  const groceryTotal = grocery.reduce((sum, line) => sum + line.total, 0);
  const groceryBySection = (section: Section) =>
    grocery.filter((line) => ING_MAP[line.ingId].section === section);

  const usedIngredients = INGREDIENTS.filter((ing) => (used[ing.id] ?? 0) > 0);
  const recentReceipts = [...orders].reverse().slice(0, 12);

  return (
    <div style={s.app}>
      <div style={s.header}>
        <div>
          <h1 style={s.title}>Overnight Kitchen Manager</h1>
          <p style={s.subtitle}>
            Demo restaurant — POS, live cost &amp; waste, and tomorrow&apos;s
            grocery list. The agent never buys anything on its own: a human
            presses BUY.
          </p>
        </div>
        <button style={s.ghostButton} onClick={resetDemo}>
          Reset demo
        </button>
      </div>

      {/* Scoreboard */}
      <div style={s.scoreRow}>
        <div style={s.scoreCard}>
          <div style={s.scoreLabel}>Revenue</div>
          <div style={s.scoreValue}>{money(revenue)}</div>
        </div>
        <div style={s.scoreCard}>
          <div style={s.scoreLabel}>Orders</div>
          <div style={s.scoreValue}>{orders.length}</div>
        </div>
        <div style={s.scoreCard}>
          <div style={s.scoreLabel}>Food cost %</div>
          <div style={s.scoreValue}>
            {revenue > 0 ? `${foodCostPct.toFixed(1)}%` : '—'}
          </div>
        </div>
        <div style={s.scoreCard}>
          <div style={s.scoreLabel}>Waste</div>
          <div style={s.scoreValue}>{wasteKg.toFixed(1)} kg</div>
          {!closed && <div style={s.note}>counted at close</div>}
        </div>
        <div style={s.scoreCard}>
          <div style={s.scoreLabel}>Daily profit</div>
          <div style={s.scoreValue}>{money(profit)}</div>
        </div>
      </div>

      <div style={s.grid2}>
        {/* POS */}
        <div style={s.panel}>
          <h2 style={s.panelTitle}>POS — tap a dish to sell it</h2>
          <div style={s.posGrid}>
            {DISHES.map((dish) => {
              const out = is86(dish);
              return (
                <button
                  key={dish.id}
                  style={out ? s.posButtonDisabled : s.posButton}
                  disabled={out || closed}
                  onClick={() => placeOrder(dish)}
                >
                  <span style={s.dishName}>{dish.name}</span>{' '}
                  <span style={s.dishPrice}>{money(dish.price)}</span>
                  <div style={s.dishRecipe}>
                    {out ? '86’d — unavailable' : recipeText(dish)}
                  </div>
                </button>
              );
            })}
          </div>
          {closed && (
            <p style={s.note}>Service is closed for the day — see the overnight list below.</p>
          )}
        </div>

        {/* Menu board */}
        <div style={s.panel}>
          <h2 style={s.panelTitle}>Menu board</h2>
          {DISHES.map((dish) => {
            const out = is86(dish);
            const manual = manual86.has(dish.id);
            const stockOut = !canMake(dish);
            return (
              <div key={dish.id} style={s.menuRow}>
                <div style={out ? s.crossed : undefined}>
                  <strong>{dish.name}</strong> — {money(dish.price)}
                  <div style={s.dishRecipe}>{recipeText(dish)}</div>
                </div>
                <div>
                  {out && (
                    <span style={s.tagRed}>
                      {stockOut ? '86’d — out of stock' : '86’d'}
                    </span>
                  )}{' '}
                  {manual ? (
                    <button
                      style={s.smallButton}
                      onClick={() => toggle86(dish.id)}
                      disabled={stockOut}
                      title={stockOut ? 'Stock is too low to bring it back' : 'Bring it back'}
                    >
                      Un-86
                    </button>
                  ) : (
                    <button style={s.smallButtonDanger} onClick={() => toggle86(dish.id)}>
                      86 it
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          <p style={s.note}>
            A dish auto-86s when any recipe ingredient runs out. Salmon only
            covers 3 orders — sell 3 Miso Salmons and watch it 86 live.
          </p>
        </div>
      </div>

      <div style={s.grid2}>
        {/* Inventory */}
        <div style={s.panel}>
          <h2 style={s.panelTitle}>Inventory</h2>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Ingredient</th>
                <th style={s.th}>Stock</th>
                <th style={s.th}>Cost</th>
                <th style={s.th}>Status</th>
              </tr>
            </thead>
            <tbody>
              {INGREDIENTS.map((ing) => {
                const qty = current[ing.id] ?? 0;
                const low = qty > 0 && qty <= ing.startQty * 0.25;
                return (
                  <tr key={ing.id}>
                    <td style={s.td}>{ing.name}</td>
                    <td style={s.td}>
                      {fmtQty(qty)} {ing.unit}
                    </td>
                    <td style={s.td}>{money(ing.unitCost)}/{ing.unit}</td>
                    <td style={s.td}>
                      {qty <= 0 ? (
                        <span style={s.tagRed}>OUT</span>
                      ) : low ? (
                        <span style={s.tagAmber}>LOW</span>
                      ) : (
                        <span style={s.tagGreen}>OK</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Receipt log */}
        <div style={s.panel}>
          <h2 style={s.panelTitle}>Receipt log</h2>
          {recentReceipts.length === 0 ? (
            <p style={s.note}>No orders yet. Tap a dish on the POS to start service.</p>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>#</th>
                  <th style={s.th}>Dish</th>
                  <th style={s.th}>Price</th>
                  <th style={s.th}>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentReceipts.map((r) => (
                  <tr key={r.orderNo}>
                    <td style={s.td}>{r.orderNo}</td>
                    <td style={s.td}>{r.dish}</td>
                    <td style={s.td}>{money(r.price)}</td>
                    <td style={s.td}>{r.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* End Sales / close view */}
      {!closed ? (
        <button style={s.bigButton} onClick={() => setClosed(true)}>
          End Sales — close the day &amp; build tomorrow&apos;s grocery list
        </button>
      ) : (
        <div style={s.panel}>
          <h2 style={s.panelTitle}>Overnight — close of day</h2>

          <div style={s.scoreRow}>
            <div style={s.scoreCard}>
              <div style={s.scoreLabel}>Day&apos;s profit</div>
              <div style={s.scoreValue}>{money(profit)}</div>
            </div>
            <div style={s.scoreCard}>
              <div style={s.scoreLabel}>Food cost %</div>
              <div style={s.scoreValue}>
                {revenue > 0 ? `${foodCostPct.toFixed(1)}%` : '—'}
              </div>
            </div>
            <div style={s.scoreCard}>
              <div style={s.scoreLabel}>Waste (spoiled perishables)</div>
              <div style={s.scoreValue}>{wasteKg.toFixed(1)} kg</div>
            </div>
            <div style={s.scoreCard}>
              <div style={s.scoreLabel}>Most-used ingredient</div>
              <div style={s.scoreValue}>
                {mostUsed
                  ? `${mostUsed.ing.name} ${fmtQty(mostUsed.qty)} ${mostUsed.ing.unit}`
                  : '—'}
              </div>
            </div>
            <div style={s.scoreCard}>
              <div style={s.scoreLabel}>Expensive, barely used</div>
              <div style={s.scoreValue}>
                {priceyBarelyUsed
                  ? `${priceyBarelyUsed.ing.name} (${money(priceyBarelyUsed.ing.unitCost)}/${priceyBarelyUsed.ing.unit})`
                  : '—'}
              </div>
              {priceyBarelyUsed && (
                <div style={s.note}>
                  used only {fmtQty(priceyBarelyUsed.qty)} {priceyBarelyUsed.ing.unit} today
                </div>
              )}
            </div>
          </div>

          <h3 style={s.sectionTitle}>Ingredients used today</h3>
          {usedIngredients.length === 0 ? (
            <p style={s.note}>Nothing sold today.</p>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Ingredient</th>
                  <th style={s.th}>Used</th>
                  <th style={s.th}>Left</th>
                </tr>
              </thead>
              <tbody>
                {usedIngredients.map((ing) => (
                  <tr key={ing.id}>
                    <td style={s.td}>{ing.name}</td>
                    <td style={s.td}>
                      {fmtQty(used[ing.id] ?? 0)} {ing.unit}
                    </td>
                    <td style={s.td}>
                      {fmtQty(current[ing.id] ?? 0)} {ing.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 style={s.sectionTitle}>Tomorrow&apos;s grocery list</h3>
          {grocery.length === 0 ? (
            <p style={s.note}>Nothing to order — stock covers tomorrow.</p>
          ) : (
            <>
              {(
                [
                  ['Daily perishables — fish, milk, eggs', 'daily'],
                  ['Bulk — 3–4 days (rice, oil, flour)', 'bulk'],
                  ['Weekly — spices, dry goods', 'weekly'],
                ] as [string, Section][]
              ).map(([title, section]) => {
                const lines = groceryBySection(section);
                if (lines.length === 0) return null;
                return (
                  <div key={section}>
                    <h4 style={s.sectionTitle}>{title}</h4>
                    <table style={s.table}>
                      <thead>
                        <tr>
                          <th style={s.th}>Item</th>
                          <th style={s.th}>Qty</th>
                          <th style={s.th}>Supplier</th>
                          <th style={s.th}>Price</th>
                          <th style={s.th}>Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lines.map((line) => (
                          <tr key={line.ingId}>
                            <td style={s.td}>{line.name}</td>
                            <td style={s.td}>
                              {fmtQty(line.qty)} {line.unit}
                            </td>
                            <td style={s.td}>
                              {line.supplier}{' '}
                              <span style={s.tag}>{line.source}</span>
                            </td>
                            <td style={s.td}>{money(line.price)}/{line.unit}</td>
                            <td style={s.td}>{money(line.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
              <p style={{ marginTop: 12, fontSize: 16 }}>
                <strong>Estimated total: {money(groceryTotal)}</strong>
              </p>
            </>
          )}

          <div style={{ marginTop: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              style={s.buyButton}
              onClick={() => setBought(true)}
              disabled={bought || grocery.length === 0}
            >
              {bought ? 'Order confirmed' : 'BUY — approve this order'}
            </button>
            <button
              style={s.ghostButton}
              onClick={() => {
                setClosed(false);
                setBought(false);
              }}
            >
              Back to service
            </button>
          </div>
          {bought && (
            <div style={s.confirmBox}>
              Order confirmed — human approval recorded. Nothing was actually
              purchased. The agent never buys on its own.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
