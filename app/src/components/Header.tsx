import { Bell, Play, Plus, Search, Sun, X } from "lucide-react";
import { useDemo } from "../demo/context";
import { createElement, useEffect, useRef, useState } from "react";
import { clockTime } from "../lib/format";
import { useNow } from "../lib/useNow";
import { useKitchen } from "../state/kitchen";
import { stockStatus } from "../lib/engine";
import { viewIcon, viewLabel } from "../lib/views";
import type { View } from "./ui";

export function Header({ view, onNavigate, onSearch }: { view: View; onNavigate: (v: View) => void; onSearch: (q: string) => void }) {
  const { state } = useKitchen();
  const demo = useDemo();
  const now = useNow(15_000);
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="header">
      <div className="hello">
        <h1>Hi {state.chef}</h1>
        <p>Glad to see you again!</p>
      </div>

      <div className="header-tools">
        <button className={`demo-btn ${demo.active ? "on" : ""}`} onClick={() => (demo.active ? demo.stop() : demo.start())}>
          {demo.active ? <X size={17} strokeWidth={2.4} /> : <Play size={16} strokeWidth={2.4} />}
          {demo.active ? "Exit demo" : "Demo tour"}
        </button>
        <div className="pill-group">
          <span className="cur">{createElement(viewIcon(view), { size: 18, strokeWidth: 2 })} {viewLabel(view)}</span>
          <button className="add" onClick={() => onNavigate("orders")}>
            <Plus size={16} strokeWidth={2.2} /> Tomorrow's order
          </button>
        </div>
        <form
          className="search-pill"
          onSubmit={(e) => {
            e.preventDefault();
            onSearch(q);
          }}
        >
          <Search size={18} strokeWidth={2} />
          <input ref={input} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" aria-label="Search ingredients" />
        </form>
        <button className="round" aria-label="Alerts" onClick={() => onNavigate("dashboard")}>
          <Bell size={21} strokeWidth={2} />
          {(state.ingredients.some((i) => stockStatus(i) !== "ok") || (state.closed && !state.bought)) && <span className="dot" />}
        </button>
        <div className="time-pill num">{clockTime(now).toUpperCase()}</div>
        <div className="weather">
          22 Nov, Sunday
          <b>{state.weather.label} {state.weather.temp}°C <Sun size={18} strokeWidth={2} /></b>
        </div>
      </div>
    </header>
  );
}
