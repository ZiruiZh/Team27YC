import { X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { CommandBox } from "./components/CommandBox";
import { Header } from "./components/Header";
import { Rail } from "./components/Rail";
import { Toasts } from "./components/Toasts";
import type { View } from "./components/ui";
import { DemoTour } from "./demo/DemoTour";
import { useRubberBand } from "./lib/useRubberBand";
import { Dashboard } from "./pages/Dashboard";
import { Inventory } from "./pages/Inventory";
import { Menu } from "./pages/Menu";
import { Orders } from "./pages/Orders";
import { PriceScout } from "./pages/PriceScout";
import { Shopping } from "./pages/Shopping";
import { useKitchen } from "./state/kitchen";

const views: View[] = ["dashboard", "inventory", "orders", "menu", "scout", "shopping"];
const fromHash = (): View => {
  const h = window.location.hash.replace("#", "") as View;
  return views.includes(h) ? h : "dashboard";
};

function App() {
  const [view, setView] = useState<View>(fromHash);
  const [query, setQuery] = useState("");
  const [cmdOpen, setCmdOpen] = useState(false);
  const main = useRef<HTMLElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  useRubberBand(main, inner);
  const { actions } = useKitchen();

  // Check the ledger API once on load (it's fine if it isn't running).
  useEffect(() => {
    actions.refreshLedger();
  }, [actions]);

  useEffect(() => {
    const onHash = () => setView(fromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // "/" opens the command box, Esc closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        setCmdOpen(true);
      } else if (e.key === "Escape") setCmdOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const navigate = useCallback((v: View) => {
    if (window.location.hash !== `#${v}`) window.location.hash = v;
    main.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <DemoTour navigate={navigate}>
      <div className="app">
        <Rail view={view} onNavigate={navigate} />
        <main className="main" ref={main}>
          <div className="rb-inner" ref={inner}>
            <Header view={view} onNavigate={navigate} onSearch={(q) => { setQuery(q); navigate("inventory"); }} />
            <div key={view}>
              {view === "dashboard" && <Dashboard onNavigate={navigate} onCommand={() => setCmdOpen(true)} />}
              {view === "inventory" && <Inventory key={query} initialQuery={query} />}
              {view === "orders" && <Orders />}
              {view === "menu" && <Menu />}
              {view === "scout" && <PriceScout />}
              {view === "shopping" && <Shopping />}
            </div>
          </div>
        </main>
        <Toasts />
      </div>

      {cmdOpen && (
        <div className="palette" onMouseDown={(e) => e.target === e.currentTarget && setCmdOpen(false)}>
          <div className="palette-card" role="dialog" aria-label="Tell the Manager">
            <div className="palette-head">
              <h3>Tell the Manager</h3>
              <span className="faint">Say it or type it. Try buying, 86-ing, waste, suppliers, new dishes.</span>
              <button className="x-btn" onClick={() => setCmdOpen(false)} aria-label="Close"><X size={18} /></button>
            </div>
            <CommandBox examples={9} />
          </div>
        </div>
      )}
    </DemoTour>
  );
}

export default App;
