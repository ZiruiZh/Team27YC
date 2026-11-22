// App state + actions. Every action is a plain function so the voice tools
// (VoiceManager.tsx) and the ledger API client can call the same ones the UI calls.
import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { demoNow, initialState } from "../data/mock";
import type { FeedSource, KitchenState, RecipeLine } from "../data/types";
import { parseRecipe } from "../lib/commands";
import { SCOUT_STEPS, bestSource, canMake, dishCost, findByName, groceryList, ingMap, is86 } from "../lib/engine";
import { clockTime, money, qty } from "../lib/format";

const LEDGER_URL = "http://localhost:3002";

let seq = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(seq++).toString(36)}`;
const parsePrice = (s: string) => {
  const m = String(s).match(/\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
};

function useKitchenStore() {
  const [state, setState] = useState<KitchenState>(initialState);
  const ref = useRef(state);
  const commit = useCallback((fn: (s: KitchenState) => KitchenState) => {
    ref.current = fn(ref.current);
    setState(ref.current);
  }, []);

  const toast = useCallback((text: string) => {
    const id = uid("t");
    commit((s) => ({ ...s, toasts: [...s.toasts, { id, text }] }));
    window.setTimeout(() => commit((s) => ({ ...s, toasts: s.toasts.filter((t) => t.id !== id) })), 3200);
  }, [commit]);

  const log = useCallback((source: FeedSource, title: string, who?: string) => {
    commit((s) => ({ ...s, feed: [{ id: uid("f"), time: clockTime(demoNow()), source, who, title }, ...s.feed].slice(0, 30) }));
  }, [commit]);

  const actions = useMemo(() => {
    const api = {
      toast,
      snapshot: () => ref.current,

      /* ── Service ─────────────────────────────────────────── */

      /** POS: sell one dish. Takes its recipe off live stock; dishes that can't be made 86 themselves. */
      sell(dishId: string) {
        const s = ref.current;
        const ings = ingMap(s);
        const dish = s.dishes.find((d) => d.id === dishId);
        if (!dish) return;
        if (s.closed) return toast("Service is closed for the day");
        if (is86(dish, ings)) return toast(`${dish.name} is 86'd`);
        const before = s.dishes.filter((d) => !is86(d, ings)).map((d) => d.id);
        commit((st) => ({
          ...st,
          ingredients: st.ingredients.map((i) => {
            const line = dish.recipe.find((l) => l.ing === i.id);
            return line ? { ...i, onHand: Math.round((i.onHand - line.qty) * 1000) / 1000 } : i;
          }),
          receipts: [...st.receipts, { orderNo: st.receipts.length + 1, dishId: dish.id, dish: dish.name, price: dish.price, time: clockTime(demoNow()) }],
        }));
        const after = ingMap(ref.current);
        for (const id of before) {
          const d = ref.current.dishes.find((x) => x.id === id)!;
          if (!canMake(d, after)) {
            const short = d.recipe.find((l) => (after[l.ing]?.onHand ?? 0) < l.qty);
            const name = short ? after[short.ing].name.toLowerCase() : "stock";
            log("agent", `Auto-86'd ${d.name}: out of ${name}`, "The Manager");
            toast(`${d.name} is 86'd, out of ${name}`);
          }
        }
      },

      toggle86(dishId: string, who = "You") {
        const d = ref.current.dishes.find((x) => x.id === dishId);
        if (!d) return;
        const next = !d.manual86;
        commit((s) => ({ ...s, dishes: s.dishes.map((x) => (x.id === dishId ? { ...x, manual86: next } : x)) }));
        log(who === "You" ? "you" : "voice", next ? `86'd ${d.name}` : `${d.name} is back on`, who);
        toast(next ? `${d.name} is 86'd` : `${d.name} is back on the menu`);
      },

      /** Voice: eighty_six_dish */
      eightySix(name: string, who = "Kitchen") {
        const d = findByName(ref.current.dishes, name);
        if (!d) return `I couldn't find a dish called ${name}.`;
        if (!d.manual86) api.toggle86(d.id, who);
        return `${d.name} is 86'd and off the menu.`;
      },

      /** Voice: log waste ("we dropped the eggs") */
      logWaste(item: string, amount: number, reason = "dropped", who = "Kitchen") {
        const i = findByName(ref.current.ingredients, item);
        if (!i) return `I couldn't find ${item} in inventory.`;
        const n = Math.min(amount, i.onHand);
        commit((s) => ({ ...s, ingredients: s.ingredients.map((x) => (x.id === i.id ? { ...x, onHand: Math.round((x.onHand - n) * 1000) / 1000 } : x)) }));
        log("voice", `Logged waste: ${qty(n)} ${i.unit} ${i.name.toLowerCase()} (${reason})`, who);
        toast(`Logged ${qty(n)} ${i.name.toLowerCase()} as waste · ${money(n * i.unitCost)}`);
        return `Logged ${qty(n)} ${i.name.toLowerCase()} as ${reason}. ${qty(i.onHand - n)} left.`;
      },

      /** Voice: add_supplier. Saves an off-market deal to the registry (registry beats the 20 km search). */
      addSupplier(name: string, item: string, rate: string, who = "Owner") {
        const i = findByName(ref.current.ingredients, item);
        const price = parsePrice(rate);
        if (!i) return `I couldn't find ${item} in inventory.`;
        const p = Number.isNaN(price) ? (/free/i.test(rate) ? 0 : i.unitCost) : price;
        commit((s) => ({
          ...s,
          registry: [...s.registry.filter((r) => r.item !== i.id), { item: i.id, supplier: name, price: p, note: /free/i.test(rate) ? "FREE" : "your deal" }],
        }));
        log("voice", `Saved ${name} for ${i.name.toLowerCase()} at ${money(p)}/${i.unit}`, who);
        toast(`${name} saved for ${i.name.toLowerCase()}`);
        return `Saved ${name} as your ${i.name.toLowerCase()} supplier at ${money(p)} per ${i.unit}.`;
      },

      /** Voice: update_price */
      updatePrice(item: string, newPrice: string, who = "Owner") {
        const i = findByName(ref.current.ingredients, item);
        const p = parsePrice(newPrice);
        if (!i || Number.isNaN(p)) return `I couldn't update that price.`;
        commit((s) => ({ ...s, ingredients: s.ingredients.map((x) => (x.id === i.id ? { ...x, unitCost: p } : x)) }));
        log("voice", `${i.name} now ${money(p)}/${i.unit}`, who);
        toast(`${i.name} is now ${money(p)}/${i.unit}`);
        return `${i.name} is now ${money(p)} per ${i.unit}.`;
      },

      /** Add a dish with a known recipe and price. */
      addDishWithRecipe(name: string, price: number, recipe: RecipeLine[], who = "Chef") {
        const id = uid("d");
        const dish = { id, name, short: name.split(" ")[0], price, manual86: false, special: true, recipe };
        commit((s) => ({ ...s, dishes: [...s.dishes, dish] }));
        const ings = ingMap(ref.current);
        const cost = dishCost(dish, ings);
        const parts = recipe.map((l) => `${qty(l.qty)} ${ings[l.ing].unit === "each" ? "" : ings[l.ing].unit + " "}${ings[l.ing].name.toLowerCase()}`);
        log(who === "You" ? "you" : "voice", `New dish: ${name} at ${money(price)}`, who);
        toast(`${name} is on the POS at ${money(price)}`);
        if (!recipe.length) return `Added ${name} at ${money(price)}. Add its ingredients anytime.`;
        return `Added ${name} at ${money(price)}: ${parts.join(", ")}. It costs ${money(cost, 2)} to make, ${Math.round((cost / price) * 100)}% food cost.`;
      },

      /** Voice: add_dish. Parses spoken quantities ("3 eggs and half a cup of cream"). */
      addDish(name: string, ingredients: string, who = "Chef", price = 20) {
        const { recipe } = parseRecipe(ingredients, ref.current.ingredients);
        if (!recipe.length) return "I couldn't match any of those ingredients to stock.";
        return api.addDishWithRecipe(name, price, recipe, who);
      },

      restoreDish(name: string, who = "You") {
        const d = findByName(ref.current.dishes, name);
        if (!d) return `I couldn't find a dish called ${name}.`;
        if (d.manual86) api.toggle86(d.id, who);
        return canMake(d, ingMap(ref.current)) ? `${d.name} is back on.` : `${d.name} is still out of stock, so it stays 86'd.`;
      },

      sellByName(name: string, count: number) {
        const d = findByName(ref.current.dishes, name);
        if (!d) return `I couldn't find a dish called ${name}.`;
        const before = ref.current.receipts.length;
        for (let k = 0; k < count; k++) api.sell(d.id);
        const sold = ref.current.receipts.length - before;
        return sold === count ? (count === 1 ? `Rang up one ${d.name}.` : `Rang up ${count} of the ${d.name}.`) : `Rang up ${sold}. ${d.name} ran out after that.`;
      },

      /** The owner says "buy the eggs now": a human-approved purchase, stock goes up right away. */
      buyNow(item: string, amount?: number, who = "You") {
        const s0 = ref.current;
        const i = findByName(s0.ingredients, item);
        if (!i) return `I couldn't find ${item} in inventory.`;
        const count = i.unit === "each" || i.unit === "portion";
        const need = Math.max(i.par - i.onHand, count ? 1 : 0.5);
        const q = amount && amount > 0 ? amount : count ? Math.ceil(need) : Math.ceil(need * 10) / 10;
        const src = bestSource(i.id, s0.registry, s0.searchPrices, i.unitCost);
        const cost = q * src.price;
        const where = src.supplier.split(" (")[0];
        commit((s) => ({ ...s, ingredients: s.ingredients.map((x) => (x.id === i.id ? { ...x, onHand: Math.round((x.onHand + q) * 1000) / 1000 } : x)) }));
        log("you", `Bought ${qty(q)} ${i.unit} ${i.name.toLowerCase()} from ${where} · ${money(cost, 2)}`, who);
        toast(`Bought ${qty(q)} ${i.name.toLowerCase()} · ${money(cost, 2)}`);
        return `Done. ${qty(q)} ${count ? "" : i.unit + " "}${i.name.toLowerCase()} from ${where} for ${money(cost, 2)}. It's on the books.`;
      },

      /* ── Lists ───────────────────────────────────────────── */

      addShopping(text: string, who = "You", store = "No Frills") {
        const items = text.split(/,| and /).map((t) => t.trim()).filter(Boolean);
        commit((s) => ({
          ...s,
          shopping: [...items.map((t) => ({ id: uid("s"), text: t[0].toUpperCase() + t.slice(1), store, checked: false, addedBy: who })), ...s.shopping],
        }));
        log(who === "You" ? "you" : "voice", `Added ${items.join(", ").toLowerCase()} to the shopping list`, who);
        toast("Added to shopping list");
        return `Added ${items.join(" and ")} to the shopping list.`;
      },
      toggleShopping(id: string) {
        commit((s) => ({ ...s, shopping: s.shopping.map((i) => (i.id === id ? { ...i, checked: !i.checked } : i)) }));
      },
      removeShopping(id: string) {
        commit((s) => ({ ...s, shopping: s.shopping.filter((i) => i.id !== id) }));
      },

      /** Bump an ingredient on tomorrow's order (one more par's worth of a unit). */
      addExtra(ingId: string, quiet = false) {
        const i = ref.current.ingredients.find((x) => x.id === ingId);
        if (!i) return;
        const step = i.unit === "each" || i.unit === "portion" ? Math.max(1, Math.ceil(i.par / 2)) : Math.max(0.5, Math.round(i.par * 5) / 10);
        commit((s) => ({ ...s, extras: { ...s.extras, [ingId]: (s.extras[ingId] ?? 0) + step }, bought: false }));
        if (!quiet) toast(`+${qty(step)} ${i.unit} ${i.name.toLowerCase()} on tomorrow's order`);
      },
      addExtras(ids: string[]) {
        ids.forEach((id) => api.addExtra(id, true));
        toast(`Topped up ${ids.length} items on tomorrow's order`);
      },

      /* ── End of day ──────────────────────────────────────── */

      endSales() {
        commit((s) => ({ ...s, closed: true, bought: false }));
        log("you", "Closed the day: tomorrow's order is ready", "You");
        toast("Service closed. Tomorrow's order is ready.");
      },
      reopen() {
        commit((s) => ({ ...s, closed: false, bought: false }));
        toast("Back to service");
      },
      /** The human presses BUY. Nothing is actually purchased — the agent never buys on its own. */
      buy() {
        const total = groceryList(ref.current).reduce((s, l) => s + l.total, 0);
        commit((s) => ({ ...s, bought: true }));
        log("you", `Approved tomorrow's order · ${money(total)}`, "You");
        toast("Order approved. Human approval recorded.");
      },

      /** Voice: request_order_approval. The agent acts on its own: closes the day if needed and approves. */
      requestApproval(summary: string, who = "The Manager") {
        if (!ref.current.closed) api.endSales();
        if (!ref.current.bought) api.buy();
        log("agent", `Approved: ${summary}`, who);
        return `Done. ${summary} is approved and on the books.`;
      },

      /** Voice: get_grocery_list. Speaks tomorrow's list by cadence. */
      groceryList() {
        const lines = groceryList(ref.current);
        const by = (sec: string) => lines.filter((l) => l.section === sec).map((l) => l.name.toLowerCase());
        const part = (label: string, xs: string[]) => `${label}: ${xs.length ? xs.join(", ") : "nothing"}.`;
        return [part("Daily", by("daily")), part("Bulk", by("bulk")), part("Weekly", by("weekly"))].join(" ");
      },

      /* ── Agents ──────────────────────────────────────────── */

      scoutStart() {
        commit((s) => ({ ...s, scout: { ...s.scout, running: true, steps: [] } }));
      },
      scoutStep(step: string) {
        commit((s) => ({ ...s, scout: { ...s.scout, steps: [...s.scout.steps, step] } }));
      },
      scoutFinish() {
        commit((s) => ({
          ...s,
          scout: { ...s.scout, running: false, lastRun: `Today, ${clockTime(demoNow())}` },
          searchPrices: s.searchPrices.some((p) => p.store === "FreshCo") ? s.searchPrices : [...s.searchPrices, { item: "milk", store: "FreshCo", distance: "3 km", price: 1.69 }],
        }));
        log("agent", "Price scout: milk $1.69/L at FreshCo (3 km)", "Price scout");
        toast("Price scout found a better milk price");
      },
      runScout() {
        if (ref.current.scout.running) return;
        api.scoutStart();
        SCOUT_STEPS.forEach((step, k) =>
          window.setTimeout(() => {
            api.scoutStep(step);
            if (k === SCOUT_STEPS.length - 1) api.scoutFinish();
          }, 850 * (k + 1)),
        );
      },

      /* ── Voice card (VoiceManager can drive these too) ──── */

      voiceListen(said: string) {
        commit((s) => ({ ...s, voice: { ...s.voice, phase: "listening", said, reply: "", interim: "" } }));
      },
      /** Live ElevenLabs session status. */
      voiceLive(status: string, speaking: boolean) {
        const live = status === "connected" ? (speaking ? "speaking" : "listening") : status === "connecting" ? "connecting" : "off";
        if (ref.current.voice.live !== live) commit((s) => ({ ...s, voice: { ...s.voice, live } }));
      },
      /** Live caption while someone is talking (ElevenLabs tentative transcript or browser speech). */
      voiceInterim(text: string) {
        if (ref.current.voice.interim !== text) commit((s) => ({ ...s, voice: { ...s.voice, interim: text } }));
      },
      /** Transcript lines from the live agent. */
      voiceTranscript(role: "user" | "agent", text: string) {
        commit((s) => ({ ...s, voice: role === "user" ? { ...s.voice, phase: "listening", said: text, reply: "", interim: "" } : { ...s.voice, phase: "done", reply: text, interim: "" } }));
      },
      voiceReply(reply: string) {
        commit((s) => ({ ...s, voice: { ...s.voice, phase: "done", reply } }));
      },
      clearToasts() {
        commit((s) => ({ ...s, toasts: [] }));
      },

      /** Alter ledger check: mint a 5-minute token, then read the ledger. The token lives in memory only. */
      async refreshLedger() {
        commit((s) => ({ ...s, ledger: { status: "loading" } }));
        try {
          const login = await fetch(`${LEDGER_URL}/auth/demo-login`);
          if (!login.ok) throw new Error("demo login failed");
          const { access_token } = (await login.json()) as { access_token: string };
          const res = await fetch(`${LEDGER_URL}/ledger`, { headers: { Authorization: `Bearer ${access_token}` } });
          if (!res.ok) throw new Error("ledger read failed");
          const data = (await res.json()) as { inventory?: { item: string; onHand: number; unit: string }[]; orders?: unknown[] };
          commit((s) => ({ ...s, ledger: { status: "live", inventory: data.inventory ?? [], orderCount: Array.isArray(data.orders) ? data.orders.length : 0 } }));
        } catch {
          commit((s) => ({ ...s, ledger: { status: "offline" } }));
        }
      },

      reset() {
        commit((s) => ({ ...initialState, ledger: s.ledger, voice: { ...initialState.voice, live: s.voice.live } }));
        toast("Demo reset");
      },
    };
    return api;
  }, [commit, log, toast]);

  return { state, actions };
}

type Store = ReturnType<typeof useKitchenStore>;
export type KitchenActions = Store["actions"];
const Ctx = createContext<Store | null>(null);

export function KitchenProvider({ children }: { children: ReactNode }) {
  const store = useKitchenStore();
  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useKitchen() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useKitchen must be used inside <KitchenProvider>");
  return v;
}
