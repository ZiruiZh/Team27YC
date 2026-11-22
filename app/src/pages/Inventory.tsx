import { Check, Plus, Search } from "lucide-react";
import { useState } from "react";
import { ItemIcon } from "../components/ui";
import type { Ingredient, Section } from "../data/types";
import { sectionLabel, stockStatus } from "../lib/engine";
import { money, qty } from "../lib/format";
import { useKitchen } from "../state/kitchen";

function InvCard({ i, delay }: { i: Ingredient; delay: number }) {
  const { actions, state } = useKitchen();
  const [added, setAdded] = useState(false);
  const st = stockStatus(i);
  const extra = state.extras[i.id] ?? 0;
  return (
    <div className="card lift inv-card" style={{ animationDelay: `${delay}ms` }}>
      <div className="head">
        <ItemIcon category={i.category} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="row-title">{i.name}</div>
          <div className="row-sub">{sectionLabel[i.section]} · {money(i.unitCost, 2)}/{i.unit}</div>
        </div>
        {st !== "ok" && <span className={`chip ${st === "out" ? "red" : "yellow"}`}>{st === "out" ? "Out" : "Low"}</span>}
      </div>
      <div className="big-num num">
        {qty(i.onHand)}
        <small>{i.unit} left</small>
      </div>
      <div className={`progress ${st}`}><span style={{ width: `${Math.min(100, Math.max(2, (i.onHand / i.startQty) * 100))}%` }} /></div>
      <div className="foot">
        <span className="num">Started at {qty(i.startQty)} · par {qty(i.par)}{extra ? ` · +${qty(extra)} ordered` : ""}</span>
        <button
          className={`add-btn ${added ? "done" : ""}`}
          aria-label={`Add ${i.name} to tomorrow's order`}
          onClick={() => {
            actions.addExtra(i.id);
            setAdded(true);
            window.setTimeout(() => setAdded(false), 1500);
          }}
        >
          {added ? <Check size={17} strokeWidth={3} /> : <Plus size={18} strokeWidth={2.6} />}
        </button>
      </div>
    </div>
  );
}

export function Inventory({ initialQuery }: { initialQuery: string }) {
  const { state } = useKitchen();
  const [section, setSection] = useState<Section | "all">("all");
  const [onlyLow, setOnlyLow] = useState(false);
  const [q, setQ] = useState(initialQuery);
  const rank = { out: 0, low: 1, ok: 2 } as const;

  const list = state.ingredients
    .filter((i) => section === "all" || i.section === section)
    .filter((i) => !onlyLow || stockStatus(i) !== "ok")
    .filter((i) => !q || i.name.toLowerCase().includes(q.toLowerCase()) || i.aliases?.some((a) => a.includes(q.toLowerCase())))
    .sort((a, b) => rank[stockStatus(a)] - rank[stockStatus(b)]);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Inventory</h2>
          <p>Live stock. Every sale on the POS and every waste the kitchen reports comes off here.</p>
        </div>
        <div className="actions">
          <div className="segmented">
            <button className={!onlyLow ? "on" : ""} onClick={() => setOnlyLow(false)}>Everything</button>
            <button className={onlyLow ? "on" : ""} onClick={() => setOnlyLow(true)}>Low or out</button>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <div className="segmented">
          {(["all", "daily", "bulk", "weekly"] as const).map((s) => (
            <button key={s} className={section === s ? "on" : ""} onClick={() => setSection(s)}>{s === "all" ? "All" : sectionLabel[s]}</button>
          ))}
        </div>
        <label className="search-pill">
          <Search size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter" />
        </label>
      </div>

      {list.length ? (
        <div className="inv-grid">
          {list.map((i, idx) => <InvCard key={i.id} i={i} delay={idx * 25} />)}
        </div>
      ) : (
        <div className="card empty">Nothing matches “{q}”.</div>
      )}
    </div>
  );
}
