import { Check, ChevronRight, ClipboardList, DollarSign, Info, Keyboard, Mic, Package, PencilLine, Plus, RefreshCw, ShieldCheck, Sparkles, Truck, User, UtensilsCrossed, Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import { CornerBlob, TileBlobs, Topo } from "../components/Shapes";
import { AnimatedNumber, ItemIcon } from "../components/ui";
import type { View } from "../components/ui";
import type { FeedSource } from "../data/types";
import { dishCost, groceryList, ingMap, is86, registrySavings, sectionLabel, stockStatus, totals } from "../lib/engine";
import { money, qty } from "../lib/format";
import { smooth } from "../lib/smooth";
import { useKitchen } from "../state/kitchen";
import { playExchange } from "../lib/voiceDemo";
import { VoiceManager } from "../VoiceManager";

type Nav = { onNavigate: (v: View) => void };

/* ── Top row ─────────────────────────────────────────────── */

function OrdersBlob({ onNavigate }: Nav) {
  const { state } = useKitchen();
  return (
    <button className="blob-wrap" onClick={() => onNavigate("orders")}>
      <span className="badge-circ yellow"><UtensilsCrossed size={20} strokeWidth={2.2} /></span>
      <div className="blob-card">
        <CornerBlob tone="yellow" />
        <div className="blob-text tilt">
          <b><AnimatedNumber value={state.receipts.length} /> orders</b>
          <span>served today</span>
        </div>
      </div>
    </button>
  );
}

function ProfitBlob({ onNavigate }: Nav) {
  const { state } = useKitchen();
  const t = totals(state);
  return (
    <button className="blob-wrap" onClick={() => onNavigate("menu")}>
      <span className="badge-circ red"><DollarSign size={20} strokeWidth={2.2} /></span>
      <div className="blob-card">
        <CornerBlob tone="red" />
        <div className="blob-text">
          <b><AnimatedNumber value={t.profit} format={(n) => money(n, 2)} /></b>
          <span>profit · {t.revenue > 0 ? `${t.foodCostPct.toFixed(1)}% food cost` : "no sales yet"}</span>
        </div>
      </div>
    </button>
  );
}

/**
 * The Manager. The mic starts a live ElevenLabs session (VoiceManager). "Sample"
 * plays a scripted kitchen request out loud; "Type" opens the command box.
 */
function VoiceCard({ onCommand }: { onCommand: () => void }) {
  const { state, actions } = useKitchen();
  const { phase, said, reply, live, interim } = state.voice;
  const turn = useRef(0);

  const samples: { say: string; run: () => string }[] = [
    { say: "Raj does chicken at five fifty", run: () => actions.addSupplier("Raj's Meat Co.", "chicken", "5.50", "Owner") },
    { say: "We dropped two eggs", run: () => actions.logWaste("eggs", 2, "dropped", "Line cook") },
    { say: "86 the truffle pasta", run: () => actions.eightySix("truffle pasta", "Line cook") },
    { say: "What's on tomorrow's list?", run: () => actions.groceryList() },
  ];

  const sample = () => {
    if (phase === "listening") return;
    const s = samples[turn.current++ % samples.length];
    playExchange(actions, s.say, s.run);
  };

  const tip = live === "off" ? "Mic talks to the live ElevenLabs agent" : "Live · ElevenLabs agent";
  const label =
    live === "connecting" ? "Connecting…"
      : live === "speaking" ? "The Manager is speaking"
        : live === "listening" && phase !== "done" ? "Listening… go ahead"
          : phase === "idle" ? "Talk to the Manager"
            : `“${said}”`;
  const sub =
    phase === "done" ? reply
      : phase === "listening" ? "…"
        : live !== "off" ? "Try “86 the burger” or “buy the eggs now”"
          : "Tap the mic, play a sample, or type a command";

  return (
    <div className="voice-card">
      <div className="tip"><Info size={13} /> {tip}</div>
      {interim ? (
        <div className="label live-caption">“{interim}”<span className="caret" /></div>
      ) : (
        <div className="label">{label}</div>
      )}
      <div className="reply">{interim ? "Hearing you…" : sub}</div>
      <div className="voice-actions">
        <button className="mini-pill" onClick={sample} disabled={phase === "listening"}><Volume2 size={15} /> Sample</button>
        <VoiceManager />
        <button className="mini-pill" onClick={onCommand}><Keyboard size={15} /> Type</button>
      </div>
    </div>
  );
}

function ScoutPromo({ onNavigate }: Nav) {
  const { state } = useKitchen();
  const saved = registrySavings(state);
  return (
    <button className="promo-wrap" onClick={() => onNavigate("scout")}>
      <span className="promo-badge"><Sparkles size={22} strokeWidth={2.2} /></span>
      <div className="promo">
        <Topo />
        <h3>Supplier deals</h3>
        <div className="price num">
          <AnimatedNumber value={saved} format={(n) => money(n, 2)} />
          <small>per restock</small>
        </div>
        <div className="promo-pills">
          <span>{state.registry.length} deals</span>
          <i />
          <span>beat 20 km</span>
        </div>
      </div>
    </button>
  );
}

/* ── POS ─────────────────────────────────────────────────── */

function PosCard() {
  const { state, actions } = useKitchen();
  const ings = ingMap(state);
  const [pulse, setPulse] = useState<string | null>(null);
  const sold = (id: string) => state.receipts.filter((r) => r.dishId === id).length;

  return (
    <section className="white-card span-3 pos-card">
      <div className="card-head">
        <h3 className="card-title">POS</h3>
        <span className="faint">{state.closed ? "Service is closed for the day" : "Tap a dish to sell it. Stock updates live."}</span>
      </div>
      <div className="pos-grid">
        {state.dishes.map((d) => {
          const off = is86(d, ings);
          const outOfStock = off && !d.manual86;
          return (
            <button
              key={d.id}
              className={`pos-btn ${off ? "off" : ""} ${pulse === d.id ? "pulse" : ""}`}
              disabled={off || state.closed}
              onClick={() => {
                actions.sell(d.id);
                setPulse(d.id);
                window.setTimeout(() => setPulse(null), 350);
              }}
            >
              {sold(d.id) > 0 && <span className="pos-count num">{sold(d.id)}</span>}
              <span className="pos-name">{d.name}</span>
              <span className="pos-price num">{money(d.price)}</span>
              <span className="pos-meta">
                {off ? (outOfStock ? "86'd, out of stock" : "86'd") : `${money(dishCost(d, ings), 2)} cost`}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/* ── End of day (yellow side card) ───────────────────────── */

function EndOfDayCard({ onNavigate }: Nav) {
  const { state, actions } = useKitchen();
  const low = state.ingredients.filter((i) => stockStatus(i) !== "ok");
  const lines = state.closed ? groceryList(state) : [];
  const total = lines.reduce((s, l) => s + l.total, 0);

  return (
    <section className="side-card yellow eod-card">
      <div className="side-title">
        <span className="tile-ico"><TileBlobs /><ClipboardList className="ico" size={22} strokeWidth={2} /></span>
        <h3>{state.closed ? "Tomorrow's order" : "Stock alerts"}</h3>
      </div>

      {!state.closed ? (
        <>
          <div className="prog-list">
            {low.length === 0 && <div className="side-empty">Nothing low. Sell 3 Miso Salmons and watch it 86.</div>}
            {low.slice(0, 4).map((i) => (
              <div key={i.id} className={`prog static ${stockStatus(i) === "out" ? "out" : ""}`}>
                <span className="fill" style={{ width: `${Math.max(0, Math.min(100, (i.onHand / i.startQty) * 100))}%` }} />
                <span className="what">{i.name}</span>
                <span className="amt num">{stockStatus(i) === "out" ? "OUT" : `${qty(i.onHand)} ${i.unit}`}</span>
              </div>
            ))}
          </div>
          <button className="btn primary block" onClick={actions.endSales}>End Sales · close the day</button>
        </>
      ) : (
        <>
          <div className="prog-list">
            {lines.length === 0 && <div className="side-empty">Nothing to order. Stock covers tomorrow.</div>}
            {(["daily", "bulk", "weekly"] as const).map((sec) => {
              const ls = lines.filter((l) => l.section === sec);
              if (!ls.length) return null;
              return (
                <div key={sec} className="prog static">
                  <span className="what">{sectionLabel[sec]} · {ls.length} items</span>
                  <span className="amt num">{money(ls.reduce((s, l) => s + l.total, 0), 2)}</span>
                </div>
              );
            })}
            {lines.length > 0 && (
              <div className="eod-total"><span>Estimated total</span><b className="num">{money(total, 2)}</b></div>
            )}
          </div>
          <button className="btn primary block" disabled={state.bought || !lines.length} onClick={actions.buy}>
            {state.bought ? <><Check size={17} strokeWidth={2.6} /> Order approved</> : "BUY · approve this order"}
          </button>
          {state.bought && <p className="eod-note">Human approval recorded. Nothing was purchased; the agent never buys on its own.</p>}
          <button className="side-more" style={{ marginTop: 14 }} onClick={() => onNavigate("orders")}>
            See the full list
            <span className="circ"><ChevronRight size={18} strokeWidth={2} /></span>
          </button>
          <button className="text-btn" onClick={actions.reopen}>Back to service</button>
        </>
      )}
    </section>
  );
}

/* ── Week chart ──────────────────────────────────────────── */

function WeekCard() {
  const { state } = useKitchen();
  const t = totals(state);
  const [unit, setUnit] = useState<"orders" | "sales">("orders");
  const H = 290;
  const per = unit === "orders" ? 6 : 120; // one square = 6 orders or $120
  const step = 44;
  const label = (v: number) => (unit === "orders" ? String(v) : `$${Math.round(v)}`);
  const days = state.week.map((d) => (d.today ? { ...d, orders: state.receipts.length, sales: t.revenue } : d));

  const pts = days.map((d, i) => {
    const v = unit === "orders" ? d.lastOrders : d.lastSales;
    return { x: (i + 0.5) * 100, y: Math.max(12, H - (v / per) * step - 6) };
  });

  return (
    <section className="white-card span-3">
      <div className="week-days">
        {days.map((d) => <span key={d.day} className={d.today ? "today" : ""}>{d.today ? "Today" : d.day}</span>)}
      </div>
      <div className="week-plot">
        {days.map((d, i) => {
          const v = unit === "orders" ? d.orders : d.sales;
          const units = Math.max(1, Math.round(v / per));
          const expected = unit === "orders" ? state.expectedOrders : state.expectedSales;
          const ghosts = d.today ? Math.max(0, Math.round((expected - v) / per)) : 0;
          return (
            <div key={`${unit}-${d.day}`} className="stack" title={`${d.day}: ${label(v)}${d.today ? " so far" : ""}`}>
              {d.today ? (
                <>
                  <span className="sq label num" style={{ ["--d" as string]: i }}>{label(v)}</span>
                  {Array.from({ length: ghosts }, (_, k) => <span key={k} className="sq ghost" style={{ ["--d" as string]: i + k + 1 }} />)}
                </>
              ) : (
                <>
                  {Array.from({ length: units - 1 }, (_, k) => <span key={k} className="sq" style={{ ["--d" as string]: i + k }} />)}
                  <span className="sq label num" style={{ ["--d" as string]: i + units }}>{label(v)}</span>
                </>
              )}
            </div>
          );
        })}
        <svg className="week-line" viewBox={`0 0 700 ${H}`} preserveAspectRatio="none" aria-hidden>
          <path key={unit} d={smooth(pts, 0.2)} fill="none" stroke="#eb3b2e" strokeWidth={4} strokeLinecap="round" pathLength={1} vectorEffect="non-scaling-stroke" />
        </svg>
        <div className="track">
          <div>{unit === "orders" ? "Orders" : "Sales"} this week</div>
          <div className="faint" style={{ fontSize: 12.5 }}><span className="legend-line" />last week</div>
          <div className="track-pills">
            <button className={unit === "orders" ? "on" : ""} onClick={() => setUnit("orders")}>orders</button>
            <i />
            <button className={unit === "sales" ? "on" : ""} onClick={() => setUnit("sales")}>sales</button>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Voice log (blush) ───────────────────────────────────── */

const logIcon: Record<FeedSource, typeof Mic> = { voice: Mic, agent: Sparkles, delivery: Truck, you: User };

function VoiceLogCard() {
  const { state } = useKitchen();
  return (
    <section className="side-card blush log-card">
      <div className="side-title">
        <span className="tile-ico"><TileBlobs /><Mic className="ico" size={22} strokeWidth={2} /></span>
        <h3>Kitchen log</h3>
      </div>
      <div className="log-list">
        {state.feed.slice(0, 4).map((f) => {
          const Icon = logIcon[f.source];
          return (
            <div key={f.id} className="log-item">
              <span className="ico"><Icon size={16} strokeWidth={2.2} /></span>
              <div style={{ minWidth: 0 }}>
                <div className="log-title">{f.title}</div>
                <div className="log-meta">{f.time}{f.who ? ` · ${f.who}` : ""}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Inventory table ─────────────────────────────────────── */

function AddCell({ id }: { id: string }) {
  const { actions } = useKitchen();
  const [done, setDone] = useState(false);
  return (
    <button
      className={`add-btn ${done ? "done" : ""}`}
      aria-label="Add to tomorrow's order"
      title="Add to tomorrow's order"
      onClick={() => {
        actions.addExtra(id);
        setDone(true);
        window.setTimeout(() => setDone(false), 1500);
      }}
    >
      {done ? <Check size={17} strokeWidth={3} /> : <Plus size={18} strokeWidth={2.6} />}
    </button>
  );
}

function InventoryTable() {
  const { state, actions } = useKitchen();
  const [q, setQ] = useState("");
  const rank = { out: 0, low: 1, ok: 2 } as const;
  const rows = state.ingredients
    .filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => rank[stockStatus(a)] - rank[stockStatus(b)]);
  const lowIds = state.ingredients.filter((i) => stockStatus(i) !== "ok").map((i) => i.id);

  return (
    <section className="white-card span-3">
      <div className="table-head">
        <label className="pill-input">
          <Package size={22} strokeWidth={2} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Inventory" aria-label="Filter inventory" />
          <span className="edit"><PencilLine size={19} strokeWidth={2} /></span>
        </label>
        <button className="blob-btn" onClick={() => lowIds.length && actions.addExtras(lowIds)} aria-label="Top up everything low" title="Top up everything low on tomorrow's order">
          <TileBlobs />
          <Plus className="ico" size={24} strokeWidth={2.4} />
        </button>
      </div>
      <table className="tbl">
        <thead>
          <tr><th>Ingredient</th><th>Stock</th><th>Cost</th><th>Buy</th><th>Status</th><th /></tr>
        </thead>
        <tbody>
          {rows.map((i) => {
            const st = stockStatus(i);
            return (
              <tr key={i.id}>
                <td><span className="item"><span className="mini-ico"><ItemIcon category={i.category} bare /></span>{i.name}</span></td>
                <td className="num">{qty(i.onHand)} {i.unit}</td>
                <td className="num">{money(i.unitCost, 2)}/{i.unit}</td>
                <td>{sectionLabel[i.section]}</td>
                <td>{st === "out" ? <span className="chip red">OUT</span> : st === "low" ? <span className="chip yellow">LOW</span> : <span className="chip">OK</span>}</td>
                <td className="right"><AddCell id={i.id} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

/* ── Agent access (Alter + ledger API) ───────────────────── */

function AlterCard() {
  const { state, actions } = useKitchen();
  const l = state.ledger;
  return (
    <section className="side-card dark alter-card">
      <div className="side-title">
        <span className="tile-ico light"><ShieldCheck className="ico" size={22} strokeWidth={2} /></span>
        <h3>Agent access</h3>
      </div>
      <p className="alter-copy">Kitchen Manager · Alter identity with scoped access to the ledger. No money movement. Every access audited.</p>
      <div className="alter-scopes">
        <span>ledger:read</span>
        <span>orders:write</span>
      </div>
      <div className="alter-status">
        {l.status === "live" && <><b>Ledger live</b><span>{l.orderCount} order{l.orderCount === 1 ? "" : "s"} on the books · {l.inventory.length} items</span></>}
        {(l.status === "loading" || l.status === "idle") && <><b>Checking the ledger…</b><span>Minting a 5-minute token</span></>}
        {l.status === "offline" && <><b>Ledger API offline</b><span>Start it with <code>node ledger-api.js</code></span></>}
      </div>
      <button className="side-more" onClick={() => actions.refreshLedger()}>
        Recheck ledger
        <span className="circ"><RefreshCw size={16} strokeWidth={2} className={l.status === "loading" ? "spin" : ""} /></span>
      </button>
    </section>
  );
}

/* ── Page ────────────────────────────────────────────────── */

export function Dashboard({ onNavigate, onCommand }: Nav & { onCommand: () => void }) {
  return (
    <div className="page">
      <div className="dash">
        <OrdersBlob onNavigate={onNavigate} />
        <ProfitBlob onNavigate={onNavigate} />
        <VoiceCard onCommand={onCommand} />
        <ScoutPromo onNavigate={onNavigate} />

        <PosCard />
        <EndOfDayCard onNavigate={onNavigate} />

        <WeekCard />
        <VoiceLogCard />

        <InventoryTable />
        <AlterCard />
      </div>
    </div>
  );
}
