import { useEffect, useMemo, useState } from 'react';
import './App.css';

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
  par: number;
  kgPerUnit: number;
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

type LedgerState =
  | { status: 'idle' }
  | { status: 'loading' }
  | {
      status: 'live';
      inventory: { item: string; onHand: number; unit: string }[];
      orderCount: number;
    }
  | { status: 'offline' };

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
  { id: 'misoSalmon', name: 'Miso Salmon', price: 24, recipe: [{ ing: 'salmon', qty: 1 }, { ing: 'rice', qty: 0.2 }, { ing: 'miso', qty: 0.05 }] },
  { id: 'chickenCurry', name: 'Chicken Curry', price: 18, recipe: [{ ing: 'chicken', qty: 0.25 }, { ing: 'rice', qty: 0.2 }, { ing: 'spices', qty: 0.03 }] },
  { id: 'pizza', name: 'Margherita Pizza', price: 16, recipe: [{ ing: 'dough', qty: 0.3 }, { ing: 'cheese', qty: 0.15 }, { ing: 'tomato', qty: 0.2 }] },
  { id: 'burger', name: 'Beef Burger', price: 19, recipe: [{ ing: 'beef', qty: 0.2 }, { ing: 'bun', qty: 1 }, { ing: 'cheese', qty: 0.05 }, { ing: 'lettuce', qty: 0.05 }] },
  { id: 'caesar', name: 'Caesar Salad', price: 14, recipe: [{ ing: 'lettuce', qty: 0.15 }, { ing: 'chicken', qty: 0.1 }, { ing: 'parmesan', qty: 0.05 }, { ing: 'croutons', qty: 0.05 }] },
  { id: 'trufflePasta', name: 'Truffle Pasta', price: 22, recipe: [{ ing: 'pasta', qty: 0.2 }, { ing: 'cream', qty: 0.1 }, { ing: 'truffleOil', qty: 0.02 }, { ing: 'parmesan', qty: 0.05 }] },
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

const SHORT_NAME: Record<string, string> = {
  misoSalmon: 'Miso',
  chickenCurry: 'Curry',
  pizza: 'Pizza',
  burger: 'Burger',
  caesar: 'Caesar',
  trufflePasta: 'Pasta',
};

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
/* App                                                                 */
/* ------------------------------------------------------------------ */

export default function App() {
  const [orders, setOrders] = useState<Receipt[]>([]);
  const [manual86, setManual86] = useState<ReadonlySet<string>>(new Set());
  const [closed, setClosed] = useState(false);
  const [bought, setBought] = useState(false);
  const [query, setQuery] = useState('');
  const [now, setNow] = useState(() => new Date());
  const [ledger, setLedger] = useState<LedgerState>({ status: 'idle' });

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  /* Alter ledger check: mint a 5-minute token, then read the ledger.
     No key or token is hardcoded — the token lives in state only. */
  const fetchLedger = async () => {
    setLedger({ status: 'loading' });
    try {
      const login = await fetch('http://localhost:3002/auth/demo-login');
      if (!login.ok) throw new Error('demo login failed');
      const { access_token } = (await login.json()) as { access_token: string };
      const res = await fetch('http://localhost:3002/ledger', {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      if (!res.ok) throw new Error('ledger read failed');
      const data = (await res.json()) as {
        inventory?: { item: string; onHand: number; unit: string }[];
        orders?: unknown[];
      };
      setLedger({
        status: 'live',
        inventory: data.inventory ?? [],
        orderCount: Array.isArray(data.orders) ? data.orders.length : 0,
      });
    } catch {
      setLedger({ status: 'offline' });
    }
  };

  useEffect(() => {
    fetchLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const talkToManager = () => {
    window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
    const el = document.querySelector('elevenlabs-convai') as HTMLElement | null;
    if (el) {
      el.style.transition = 'box-shadow 0.3s ease';
      el.style.boxShadow = '0 0 0 4px #dc2626, 0 0 28px rgba(220,38,38,0.65)';
      el.style.borderRadius = '18px';
      window.setTimeout(() => {
        el.style.boxShadow = '';
      }, 3000);
    }
  };

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
    setQuery('');
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

  /* Low / out-of-stock ingredients, live. */
  const lowStock = INGREDIENTS.filter((ing) => {
    const qty = current[ing.id] ?? 0;
    return qty <= 0 || qty <= ing.startQty * 0.25;
  });

  /* Search filters the dishes on the POS and the menu board. */
  const visibleDishes = DISHES.filter((d) =>
    d.name.toLowerCase().includes(query.trim().toLowerCase()),
  );

  /* Chart: orders per dish today (bars) + cumulative revenue (red line).
     Both come from the live receipt log. */
  const chart = useMemo(() => {
    const counts = DISHES.map(
      (d) => orders.filter((o) => o.dishId === d.id).length,
    );
    const revPerDish = DISHES.map((d) =>
      orders
        .filter((o) => o.dishId === d.id)
        .reduce((s, o) => s + o.price, 0),
    );
    const maxCount = Math.max(1, ...counts);
    const W = 560;
    const base = 180;
    const top = 24;
    const slot = W / DISHES.length;
    const barW = 44;
    const bars = DISHES.map((d, i) => {
      const h = (counts[i] / maxCount) * (base - top);
      const x = i * slot + (slot - barW) / 2;
      return { x, y: base - h, w: barW, h, count: counts[i], name: SHORT_NAME[d.id] };
    });
    let cum = 0;
    const line = revPerDish.map((_r, i) => {
      cum += revPerDish[i];
      const cx = i * slot + slot / 2;
      const cy = base - (cum / Math.max(1, revenue)) * (base - top);
      return `${cx},${cy}`;
    }).join(' ');
    return { bars, line, base, maxCount };
  }, [orders, revenue]);

  const clock = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateLine = now.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="side-logo">K</div>
        <nav className="side-nav">
          <span className="side-ic active" title="Dashboard">⌂</span>
          <span className="side-ic" title="POS">▦</span>
          <span className="side-ic" title="Inventory">◷</span>
          <span className="side-ic" title="Settings">⚙</span>
        </nav>
        <div className="side-avatar">C</div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div>
            <h1 className="hello">Hi, Chef</h1>
            <p className="hello-sub">{closed ? 'Service closed — overnight list is ready.' : 'Service is live. Tap a dish to sell it.'}</p>
          </div>
          <div className="top-actions">
            <input
              className="search"
              type="search"
              placeholder="Search dishes"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="talk-btn" onClick={talkToManager}>
              Talk to the Manager
            </button>
            <button className="ghost-btn" onClick={resetDemo}>
              Reset demo
            </button>
            <div className="clock">
              <span className="clock-time">{clock}</span>
              <span className="clock-date">{dateLine}</span>
            </div>
          </div>
        </header>

        <section className="stats">
          <div className="stat">
            <div className="stat-num">{revenue > 0 ? `${foodCostPct.toFixed(1)}%` : '—'}</div>
            <div className="stat-label">Food cost</div>
          </div>
          <div className="stat">
            <div className="stat-num">{wasteKg.toFixed(1)} kg</div>
            <div className="stat-label">{closed ? 'Waste, spoiled perishables' : 'Waste, counted at close'}</div>
          </div>
          <div className="stat accent">
            <div className="stat-num">{money(profit)}</div>
            <div className="stat-label">Daily profit</div>
          </div>
          <div className="stat">
            <div className="stat-num">{orders.length}</div>
            <div className="stat-label">Orders served</div>
          </div>
        </section>

        <section className="row-2">
          <div className="card chart-card">
            <div className="card-head">
              <h2>Today</h2>
              <span className="live-dot">● Live</span>
            </div>
            {orders.length === 0 ? (
              <p className="muted">No orders yet. Tap a dish on the POS and the bars move.</p>
            ) : (
              <svg viewBox="0 0 560 210" className="chart" role="img" aria-label="Orders per dish today">
                <line x1="0" y1={chart.base} x2="560" y2={chart.base} className="axis" />
                {chart.bars.map((b) => (
                  <g key={b.name}>
                    <rect x={b.x} y={b.y} width={b.w} height={Math.max(b.h, 2)} rx="7" className="bar" />
                    <text x={b.x + b.w / 2} y={b.y - 8} textAnchor="middle" className="bar-val">
                      {b.count}
                    </text>
                    <text x={b.x + b.w / 2} y={chart.base + 20} textAnchor="middle" className="bar-label">
                      {b.name}
                    </text>
                  </g>
                ))}
                {revenue > 0 && (
                  <polyline points={chart.line} className="rev-line" />
                )}
              </svg>
            )}
            <p className="muted">Bars: orders per dish. Red line: cumulative revenue, {money(revenue)} so far.</p>
          </div>

          <div className="card side-card">
            {!closed ? (
              <>
                <h2>Stock alerts</h2>
                {lowStock.length === 0 ? (
                  <p className="muted">Nothing low. Salmon covers 3 orders — sell 3 Miso Salmons and watch it 86.</p>
                ) : (
                  <ul className="alert-list">
                    {lowStock.map((ing) => {
                      const qty = current[ing.id] ?? 0;
                      return (
                        <li key={ing.id} className={qty <= 0 ? 'alert out' : 'alert low'}>
                          <strong>{ing.name}</strong>
                          <span>
                            {qty <= 0 ? 'OUT' : `${fmtQty(qty)} ${ing.unit} left`}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
                <button className="red-btn block" onClick={() => setClosed(true)}>
                  End Sales — close the day
                </button>
              </>
            ) : (
              <>
                <h2>Tomorrow&apos;s order</h2>
                {grocery.length === 0 ? (
                  <p className="muted">Nothing to order — stock covers tomorrow.</p>
                ) : (
                  <>
                    {(
                      [
                        ['Daily', 'daily'],
                        ['Bulk', 'bulk'],
                        ['Weekly', 'weekly'],
                      ] as [string, Section][]
                    ).map(([label, section]) => {
                      const lines = groceryBySection(section);
                      if (lines.length === 0) return null;
                      const subtotal = lines.reduce((s, l) => s + l.total, 0);
                      return (
                        <div key={section} className="groc-sum">
                          <span>{label} · {lines.length} items</span>
                          <strong>{money(subtotal)}</strong>
                        </div>
                      );
                    })}
                    <div className="groc-total">
                      <span>Estimated total</span>
                      <strong>{money(groceryTotal)}</strong>
                    </div>
                  </>
                )}
                <button
                  className="red-btn block"
                  onClick={() => setBought(true)}
                  disabled={bought || grocery.length === 0}
                >
                  {bought ? 'Order confirmed' : 'BUY — approve this order'}
                </button>
                {bought && (
                  <p className="confirm">
                    Order confirmed — human approval recorded. Nothing was actually purchased. The agent never buys on its own.
                  </p>
                )}
                <button
                  className="ghost-btn block"
                  onClick={() => {
                    setClosed(false);
                    setBought(false);
                  }}
                >
                  Back to service
                </button>
              </>
            )}
          </div>
        </section>

        <section className="row-2">
          <div className="card">
            <h2>POS</h2>
            <div className="pos-grid">
              {visibleDishes.map((dish) => {
                const out = is86(dish);
                return (
                  <button
                    key={dish.id}
                    className={out ? 'pos-btn off' : 'pos-btn'}
                    disabled={out || closed}
                    onClick={() => placeOrder(dish)}
                  >
                    <span className="pos-name">{dish.name}</span>
                    <span className="pos-price">{money(dish.price)}</span>
                    <span className="pos-recipe">
                      {out ? '86’d — unavailable' : recipeText(dish)}
                    </span>
                  </button>
                );
              })}
            </div>
            {visibleDishes.length === 0 && (
              <p className="muted">No dishes match “{query}”.</p>
            )}
            {closed && (
              <p className="muted">Service is closed for the day — see the overnight list below.</p>
            )}
          </div>

          <div className="card">
            <h2>Menu</h2>
            {visibleDishes.map((dish) => {
              const out = is86(dish);
              const manual = manual86.has(dish.id);
              const stockOut = !canMake(dish);
              return (
                <div key={dish.id} className="menu-row">
                  <div className={out ? 'crossed' : undefined}>
                    <strong>{dish.name}</strong> — {money(dish.price)}
                    <div className="pos-recipe">{recipeText(dish)}</div>
                  </div>
                  <div className="menu-actions">
                    {out && (
                      <span className="tag-red">
                        {stockOut ? '86’d — out of stock' : '86’d'}
                      </span>
                    )}
                    {manual ? (
                      <button
                        className="mini-btn"
                        onClick={() => toggle86(dish.id)}
                        disabled={stockOut}
                      >
                        Un-86
                      </button>
                    ) : (
                      <button className="mini-btn danger" onClick={() => toggle86(dish.id)}>
                        86 it
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="row-2">
          <div className="card">
            <h2>Inventory</h2>
            <table className="tbl">
              <thead>
                <tr>
                  <th>Ingredient</th>
                  <th>Stock</th>
                  <th>Cost</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {INGREDIENTS.map((ing) => {
                  const qty = current[ing.id] ?? 0;
                  const low = qty > 0 && qty <= ing.startQty * 0.25;
                  return (
                    <tr key={ing.id}>
                      <td>{ing.name}</td>
                      <td>
                        {fmtQty(qty)} {ing.unit}
                      </td>
                      <td>
                        {money(ing.unitCost)}/{ing.unit}
                      </td>
                      <td>
                        {qty <= 0 ? (
                          <span className="tag-red">OUT</span>
                        ) : low ? (
                          <span className="tag-amber">LOW</span>
                        ) : (
                          <span className="tag-green">OK</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h2>Receipts</h2>
            {recentReceipts.length === 0 ? (
              <p className="muted">No orders yet. Tap a dish on the POS to start service.</p>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Dish</th>
                    <th>Price</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentReceipts.map((r) => (
                    <tr key={r.orderNo}>
                      <td>{r.orderNo}</td>
                      <td>{r.dish}</td>
                      <td>{money(r.price)}</td>
                      <td>{r.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {closed && (
          <section className="card overnight">
            <h2>Overnight — close of day</h2>
            <div className="stats compact">
              <div className="stat">
                <div className="stat-num">{money(profit)}</div>
                <div className="stat-label">Day&apos;s profit</div>
              </div>
              <div className="stat">
                <div className="stat-num">{revenue > 0 ? `${foodCostPct.toFixed(1)}%` : '—'}</div>
                <div className="stat-label">Food cost</div>
              </div>
              <div className="stat">
                <div className="stat-num">{wasteKg.toFixed(1)} kg</div>
                <div className="stat-label">Waste, spoiled perishables</div>
              </div>
              <div className="stat">
                <div className="stat-num">
                  {mostUsed ? `${mostUsed.ing.name} ${fmtQty(mostUsed.qty)} ${mostUsed.ing.unit}` : '—'}
                </div>
                <div className="stat-label">Most-used ingredient</div>
              </div>
              <div className="stat">
                <div className="stat-num">
                  {priceyBarelyUsed
                    ? `${priceyBarelyUsed.ing.name} (${money(priceyBarelyUsed.ing.unitCost)}/${priceyBarelyUsed.ing.unit})`
                    : '—'}
                </div>
                <div className="stat-label">Expensive, barely used</div>
              </div>
            </div>

            <h3>Ingredients used today</h3>
            {usedIngredients.length === 0 ? (
              <p className="muted">Nothing sold today.</p>
            ) : (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Ingredient</th>
                    <th>Used</th>
                    <th>Left</th>
                  </tr>
                </thead>
                <tbody>
                  {usedIngredients.map((ing) => (
                    <tr key={ing.id}>
                      <td>{ing.name}</td>
                      <td>
                        {fmtQty(used[ing.id] ?? 0)} {ing.unit}
                      </td>
                      <td>
                        {fmtQty(current[ing.id] ?? 0)} {ing.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <h3>Tomorrow&apos;s grocery list</h3>
            {grocery.length === 0 ? (
              <p className="muted">Nothing to order — stock covers tomorrow.</p>
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
                      <h4>{title}</h4>
                      <table className="tbl">
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Qty</th>
                            <th>Supplier</th>
                            <th>Price</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lines.map((line) => (
                            <tr key={line.ingId}>
                              <td>{line.name}</td>
                              <td>
                                {fmtQty(line.qty)} {line.unit}
                              </td>
                              <td>
                                {line.supplier}{' '}
                                <span className="tag">{line.source}</span>
                              </td>
                              <td>
                                {money(line.price)}/{line.unit}
                              </td>
                              <td>{money(line.total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
                <p className="groc-total-line">
                  <strong>Estimated total: {money(groceryTotal)}</strong>
                </p>
              </>
            )}
          </section>
        )}

        <section className="card alter-card">
          <div className="alter-id">
            <div className="alter-mark">A</div>
            <div>
              <strong>Kitchen Manager · Alter</strong>
              <p className="muted">
                Agent identity, scoped access to the ledger. Scopes:{' '}
                <span className="tag">ledger:read</span>{' '}
                <span className="tag">orders:write</span>
              </p>
              <p className="muted">No money movement. Every access audited.</p>
            </div>
          </div>
          <div className="alter-live">
            {ledger.status === 'loading' && <p className="muted">Checking the ledger…</p>}
            {ledger.status === 'idle' && <p className="muted">Ledger check starting…</p>}
            {ledger.status === 'offline' && (
              <p className="muted">
                Ledger API offline — start it with <code>node ledger-api.js</code>
              </p>
            )}
            {ledger.status === 'live' && (
              <>
                <p className="alter-ok">● Ledger live — {ledger.orderCount} order(s) on the books</p>
                <ul className="alter-inv">
                  {ledger.inventory.slice(0, 3).map((item) => (
                    <li key={item.item}>
                      {item.item}: {item.onHand} {item.unit}
                    </li>
                  ))}
                </ul>
              </>
            )}
            <button className="ghost-btn" onClick={fetchLedger}>
              Recheck ledger
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
