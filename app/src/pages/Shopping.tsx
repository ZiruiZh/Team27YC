import { Check, Plus, ShoppingBasket, Trash2 } from "lucide-react";
import { useState } from "react";
import { useKitchen } from "../state/kitchen";

export function Shopping() {
  const { state, actions } = useKitchen();
  const [text, setText] = useState("");
  const stores = [...new Set(state.shopping.map((s) => s.store))];

  const add = () => {
    if (!text.trim()) return;
    actions.addShopping(text.trim(), "You");
    setText("");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h2>Shopping list</h2>
          <p>For store runs between deliveries. Cooks add to it by voice, and you check things off on your phone.</p>
        </div>
      </div>

      <form className="shop-add" onSubmit={(e) => { e.preventDefault(); add(); }}>
        <label className="search-pill">
          <ShoppingBasket size={18} />
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add items, e.g. limes, foil and deli cups" />
        </label>
        <button className="btn primary" style={{ height: 56 }} disabled={!text.trim()}><Plus size={18} strokeWidth={2.4} /> Add</button>
      </form>

      <div className="shop-groups">
        {stores.map((store) => {
          const items = state.shopping.filter((s) => s.store === store);
          return (
            <div key={store} className="card">
              <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
                <h3 style={{ fontSize: 19, fontWeight: 600 }}>{store}</h3>
                <span className="chip" style={{ marginLeft: "auto" }}>{items.filter((i) => !i.checked).length} left</span>
              </div>
              {items.map((i) => (
                <div key={i.id} className={`shop-item ${i.checked ? "done" : ""}`}>
                  <button className={`check ${i.checked ? "on" : ""}`} onClick={() => actions.toggleShopping(i.id)} aria-label={`Mark ${i.text} ${i.checked ? "not bought" : "bought"}`}>
                    {i.checked && <Check size={15} strokeWidth={3} />}
                  </button>
                  <span className="txt">{i.text}</span>
                  <span className="row-sub">{i.addedBy}</span>
                  <button className="btn ghost sm" style={{ width: 38, padding: 0 }} onClick={() => actions.removeShopping(i.id)} aria-label={`Remove ${i.text}`}>
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}
