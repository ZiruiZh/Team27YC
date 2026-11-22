import { Check } from "lucide-react";
import { groceryList, mostUsed, priceyBarelyUsed, sectionLong, totals, used, wasteKg } from "../lib/engine";
import { money, qty } from "../lib/format";
import { useKitchen } from "../state/kitchen";

export function Orders() {
  const { state, actions } = useKitchen();
  const lines = groceryList(state);
  const total = lines.reduce((s, l) => s + l.total, 0);
  const t = totals(state);
  const top = mostUsed(state);
  const pricey = priceyBarelyUsed(state);
  const receipts = [...state.receipts].reverse();

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Orders</h2>
          <p>
            {state.closed
              ? "Service is closed. Here's tomorrow's order, priced from your supplier registry first, then the 20 km search."
              : "Tomorrow's order builds itself from today's sales. Close the day to lock it in."}
          </p>
        </div>
        <div className="actions">
          {state.closed ? (
            <>
              <button className="btn ghost" onClick={actions.reopen}>Back to service</button>
              <button className="btn primary buy-btn" disabled={state.bought || !lines.length} onClick={actions.buy}>
                {state.bought ? <><Check size={17} /> Approved</> : `BUY · ${money(total, 2)}`}
              </button>
            </>
          ) : (
            <button className="btn primary" onClick={actions.endSales}>End Sales · close the day</button>
          )}
        </div>
      </div>

      {state.closed && (
        <section className="stats-row">
          <div className="card"><div className="row-sub">Day's profit</div><div className="big-num num">{money(t.profit, 2)}</div></div>
          <div className="card"><div className="row-sub">Food cost</div><div className="big-num num">{t.revenue > 0 ? `${t.foodCostPct.toFixed(1)}%` : "—"}</div></div>
          <div className="card"><div className="row-sub">Waste, spoiled perishables</div><div className="big-num num">{wasteKg(state).toFixed(1)}<small>kg</small></div></div>
          <div className="card"><div className="row-sub">Most used</div><div className="stat-text">{top ? `${top.name} · ${qty(used(top))} ${top.unit}` : "—"}</div>
            <div className="row-sub" style={{ marginTop: 10 }}>Expensive, barely used</div><div className="stat-text">{pricey ? `${pricey.name} · ${money(pricey.unitCost)}/${pricey.unit}` : "—"}</div></div>
        </section>
      )}

      <div className="two-col">
        <section className="card order-card">
          <div className="card-head">
            <h3 className="card-title">{state.closed ? "Tomorrow's order" : "Tomorrow's order (preview)"}</h3>
            <span className="faint num">{lines.length} items · {money(total, 2)}</span>
          </div>
          {lines.length === 0 && <div className="empty" style={{ padding: 24 }}>Nothing to order. Stock covers tomorrow.</div>}
          {(["daily", "bulk", "weekly"] as const).map((sec) => {
            const ls = lines.filter((l) => l.section === sec);
            if (!ls.length) return null;
            return (
              <div key={sec}>
                <div className="sec-title">{sectionLong[sec]}</div>
                <table className="tbl" style={{ marginTop: 4 }}>
                  <thead><tr><th>Item</th><th>Qty</th><th>Supplier</th><th>Price</th><th className="right">Total</th></tr></thead>
                  <tbody>
                    {ls.map((l) => (
                      <tr key={l.ingId}>
                        <td style={{ fontWeight: 500 }}>{l.name}</td>
                        <td className="num">{qty(l.qty)} {l.unit}</td>
                        <td>{l.supplier}<span className={`src-tag ${l.source === "Supplier registry" ? "reg" : ""}`}>{l.source}</span></td>
                        <td className="num">{money(l.price, 2)}/{l.unit}</td>
                        <td className="num right">{money(l.total, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
          {state.bought && <p className="eod-note">Order approved. Human approval recorded; nothing was actually purchased. The agent never buys on its own.</p>}
        </section>

        <section className="card">
          <div className="card-head">
            <h3 className="card-title">Receipts</h3>
            <span className="faint num">{state.receipts.length} today · {money(t.revenue, 2)}</span>
          </div>
          {receipts.length === 0 ? (
            <div className="empty" style={{ padding: 24 }}>No orders yet. Sell a dish from the POS on the dashboard.</div>
          ) : (
            <table className="tbl">
              <thead><tr><th>#</th><th>Dish</th><th>Price</th><th className="right">Time</th></tr></thead>
              <tbody>
                {receipts.slice(0, 20).map((r) => (
                  <tr key={r.orderNo}>
                    <td className="num">{r.orderNo}</td>
                    <td style={{ fontWeight: 500 }}>{r.dish}</td>
                    <td className="num">{money(r.price)}</td>
                    <td className="num right">{r.time}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  );
}
