import { canMake, dishCost, ingMap, is86 } from "../lib/engine";
import { money, qty } from "../lib/format";
import { useKitchen } from "../state/kitchen";

export function Menu() {
  const { state, actions } = useKitchen();
  const ings = ingMap(state);

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Menu</h2>
          <p>Cost comes from live ingredient prices. Dishes 86 themselves when stock runs out, or flip the switch yourself.</p>
        </div>
      </div>

      <div className="menu-grid">
        {state.dishes.map((d, idx) => {
          const cost = dishCost(d, ings);
          const margin = Math.round((1 - cost / d.price) * 100);
          const off = is86(d, ings);
          const stockOut = !canMake(d, ings);
          const sold = state.receipts.filter((r) => r.dishId === d.id).length;
          return (
            <div key={d.id} className={`card lift dish ${off ? "off" : ""}`} style={{ animationDelay: `${idx * 30}ms` }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {d.special && <span className="chip yellow">Special</span>}
                {off && <span className="chip red">{stockOut ? "86'd · out of stock" : "86'd"}</span>}
                {!off && !d.special && <span className="chip">{sold} sold today</span>}
              </div>
              <div className="dish-name">{d.name}</div>
              <div className="dish-price num">{money(d.price)}</div>
              <div className="row-sub" style={{ whiteSpace: "normal" }}>
                {d.recipe.map((l) => `${ings[l.ing]?.name ?? l.ing} ${qty(l.qty)} ${ings[l.ing]?.unit ?? ""}`).join(" · ") || "No recipe yet"}
              </div>
              <div className="row-sub">Cost {money(cost, 2)} · {margin}% margin</div>
              <div className="dish-foot">
                <span />
                <button
                  className={`switch ${d.manual86 ? "on" : ""}`}
                  onClick={() => actions.toggle86(d.id)}
                  disabled={stockOut && !d.manual86}
                  aria-pressed={d.manual86}
                  title={stockOut ? "Out of stock" : "86 this dish"}
                >
                  86 <span className="track-sw" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
