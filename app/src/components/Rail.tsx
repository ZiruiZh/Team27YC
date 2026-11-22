import { ChefHat, RotateCcw } from "lucide-react";
import { navItems as items } from "../lib/views";
import { useKitchen } from "../state/kitchen";
import type { View } from "./ui";

export function Rail({ view, onNavigate }: { view: View; onNavigate: (v: View) => void }) {
  const { state, actions } = useKitchen();
  const index = Math.max(0, items.findIndex((i) => i.id === view));
  const pending = state.closed && !state.bought;

  return (
    <div className="rail-col">
      <button className="logo" onClick={() => onNavigate("dashboard")} aria-label="Kitchen Manager home">
        <ChefHat size={32} strokeWidth={2.2} />
      </button>
      <nav className="rail" aria-label="Main">
        <div className="rail-nav" style={{ ["--i" as string]: index }}>
          <span className="rail-bulge" />
          <span className="rail-dot" />
          {items.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`rail-btn ${view === id ? "active" : ""}`}
              onClick={() => onNavigate(id)}
              aria-label={label}
              aria-current={view === id ? "page" : undefined}
              title={label}
            >
              <Icon size={21} strokeWidth={2} />
              {id === "orders" && pending && <span className="pip" />}
            </button>
          ))}
        </div>
        <div className="rail-foot">
          <div className="rail-avatar" title={`Chef ${state.chef}`}>{state.chef[0]}</div>
          <button className="rail-btn" onClick={actions.reset} aria-label="Reset demo data" title="Reset demo data">
            <RotateCcw size={19} strokeWidth={2} />
          </button>
        </div>
      </nav>
    </div>
  );
}
