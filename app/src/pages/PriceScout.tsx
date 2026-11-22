import { Check, Loader2, Search } from "lucide-react";
import { Topo } from "../components/Shapes";
import { AnimatedNumber, ItemIcon } from "../components/ui";
import { bestSource, registrySavings } from "../lib/engine";
import { money } from "../lib/format";
import { useKitchen } from "../state/kitchen";

export function PriceScout() {
  const { state, actions } = useKitchen();
  const { running, steps, lastRun } = state.scout;
  const saved = registrySavings(state);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Price scout</h2>
          <p>Your supplier registry holds the deals you told the Manager about. Everything else is priced from stores within 20 km.</p>
        </div>
        <div className="actions">
          <button className="btn dark" onClick={actions.runScout} disabled={running}>
            {running ? <Loader2 size={17} className="spin" /> : <Search size={17} />}
            {running ? "Searching…" : "Search 20 km now"}
          </button>
        </div>
      </div>

      <section className="scout-hero">
        <Topo />
        <div>
          <div style={{ fontSize: 18 }}>Registry deals save</div>
          <div className="hero-num num"><AnimatedNumber value={saved} format={(n) => money(n, 2)} /></div>
          <div style={{ fontSize: 16, opacity: 0.9 }}>per restock to par, against the cheapest store nearby · last search {lastRun.toLowerCase()}</div>
        </div>
        <div className="steps" aria-live="polite">
          {steps.map((s, i) => (
            <div key={s + i} className="step"><span className="tick"><Check size={14} strokeWidth={3} /></span>{s}</div>
          ))}
          {running && <div className="step faint"><Loader2 size={18} className="spin" /> Working…</div>}
        </div>
      </section>

      <div className="two-col">
        <section className="card">
          <div className="card-head"><h3 className="card-title">Where each item comes from</h3></div>
          <table className="tbl">
            <thead><tr><th>Item</th><th>Last cost</th><th>Best nearby</th><th>Buying from</th></tr></thead>
            <tbody>
              {state.ingredients.map((i) => {
                const near = state.searchPrices.filter((p) => p.item === i.id).sort((a, b) => a.price - b.price)[0];
                const src = bestSource(i.id, state.registry, state.searchPrices, i.unitCost);
                return (
                  <tr key={i.id}>
                    <td><span className="item"><span className="mini-ico"><ItemIcon category={i.category} bare /></span>{i.name}</span></td>
                    <td className="num">{money(i.unitCost, 2)}</td>
                    <td className="num">{near ? `${money(near.price, 2)} · ${near.store} (${near.distance})` : "—"}</td>
                    <td>{src.supplier}<span className={`src-tag ${src.source === "Supplier registry" ? "reg" : ""}`}>{src.source === "Supplier registry" ? "registry" : src.source === "20 km search" ? "20 km" : "last"}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        <section className="side-card yellow scout-registry">
          <div className="side-title"><h3>Supplier registry</h3></div>
          <p className="row-sub" style={{ whiteSpace: "normal", marginTop: 8 }}>Say it to the Manager: “Raj does chicken at six dollars a kilo.”</p>
          <div className="prog-list">
            {state.registry.map((r) => {
              const i = state.ingredients.find((x) => x.id === r.item);
              return (
                <div key={r.item} className="prog static">
                  <span className="what">{r.supplier} · {i?.name ?? r.item}</span>
                  <span className="amt num">{r.price === 0 ? "FREE" : `${money(r.price, 2)}/${i?.unit ?? ""}`}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
