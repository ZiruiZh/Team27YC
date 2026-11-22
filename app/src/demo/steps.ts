// The demo journey: one day at the restaurant, start to finish.
import type { View } from "../components/ui";
import type { KitchenState } from "../data/types";
import { SCOUT_STEPS } from "../lib/engine";
import type { KitchenActions } from "../state/kitchen";

export interface TourCtx {
  actions: KitchenActions;
  fast: boolean; // replaying earlier steps instantly (Back / jump)
  wait: (ms: number) => Promise<void>;
  /** A cook's line spoken aloud, then the action, then the Manager's spoken reply. */
  say: (line: string, run: () => string) => Promise<void>;
  /** A command typed or said by the owner, run through the interpreter and answered aloud. */
  command: (text: string) => Promise<void>;
}

export type Chapter = "Before service" | "Service" | "Your turn" | "Close of day" | "Trust";

export interface Step {
  chapter: Chapter;
  title: string;
  body: string;
  view: View;
  target?: string[];
  run?: (c: TourCtx) => Promise<void> | void;
  /** Waits for the viewer to do something; autoplay or "Do it for me" performs it instead. */
  waitFor?: (s: KitchenState, start: KitchenState, tried: boolean) => boolean;
  doIt?: { label: string; run: (c: TourCtx) => Promise<void> | void };
  /** Shows the command box inside the coach card. */
  commandBox?: boolean;
}

const sellMany = async (c: TourCtx, ids: string[], gap = 650) => {
  for (const id of ids) {
    c.actions.sell(id);
    await c.wait(gap);
  }
};

export const steps: Step[] = [
  {
    chapter: "Before service",
    title: "Meet the Manager",
    body: "An AI coworker for your kitchen. It tracks every ingredient, keeps the menu honest and plans tomorrow's order. Let's follow one day at the restaurant.",
    view: "dashboard",
    run: (c) => {
      c.actions.reset();
      c.actions.clearToasts();
    },
  },
  {
    chapter: "Before service",
    title: "Tell it about a deal",
    body: "Before opening, the owner mentions a friend's price out loud. The Manager saves it to the supplier registry, which always beats store prices.",
    view: "dashboard",
    target: [".voice-card"],
    run: (c) => c.say("Raj does chicken at five fifty a kilo", () => c.actions.addSupplier("Raj's Meat Co.", "chicken", "5.50", "Owner")),
  },
  {
    chapter: "Before service",
    title: "Scout prices nearby",
    body: "For everything else, the price scout checks stores within 20 kilometres and lines them up against your registry.",
    view: "scout",
    target: [".scout-hero"],
    run: async (c) => {
      c.actions.scoutStart();
      for (const s of SCOUT_STEPS) {
        await c.wait(750);
        c.actions.scoutStep(s);
      }
      c.actions.scoutFinish();
    },
  },
  {
    chapter: "Before service",
    title: "Your deals, remembered",
    body: "Raj's new chicken price is already on the list. Tomorrow's order buys from whoever is cheapest, automatically.",
    view: "scout",
    target: [".scout-registry"],
  },
  {
    chapter: "Service",
    title: "Doors open",
    body: "Every tap on the POS is a sale. Each dish's recipe comes off live stock the moment it's sold.",
    view: "dashboard",
    target: [".pos-card"],
    run: (c) => sellMany(c, ["burger", "chickenCurry", "pizza", "caesar", "burger"]),
  },
  {
    chapter: "Service",
    title: "Live numbers",
    body: "Orders served, profit and food cost update with every receipt. No spreadsheets at the end of the night.",
    view: "dashboard",
    target: [".blob-wrap"],
  },
  {
    chapter: "Service",
    title: "A run on the salmon",
    body: "Three Miso Salmons and the fish is gone. The dish takes itself off the menu, so nobody sells what the kitchen can't make.",
    view: "dashboard",
    target: [".pos-card", ".eod-card"],
    run: (c) => sellMany(c, ["misoSalmon", "misoSalmon", "misoSalmon"], 800),
  },
  {
    chapter: "Service",
    title: "Cooks just talk",
    body: "Hands full, a cook reports dropped eggs. The Manager corrects the stock and logs the waste.",
    view: "dashboard",
    target: [".voice-card"],
    run: (c) => c.say("We dropped two eggs", () => c.actions.logWaste("eggs", 2, "dropped", "Line cook")),
  },
  {
    chapter: "Service",
    title: "86 by voice",
    body: "Eighty-six the truffle pasta, and it's gone from the POS and the menu at once.",
    view: "dashboard",
    target: [".voice-card", ".pos-card"],
    run: (c) => c.say("86 the truffle pasta", () => c.actions.eightySix("truffle pasta", "Line cook")),
  },
  {
    chapter: "Your turn",
    title: "Buy it now, by voice",
    body: "The owner can act right away too. “Buy the eggs now” restocks eggs from the cheapest source, and because you said it, it counts as your approval.",
    view: "dashboard",
    target: [".voice-card", ".blob-wrap"],
    run: (c) => c.command("Buy the eggs now"),
  },
  {
    chapter: "Your turn",
    title: "Invent a dish out loud",
    body: "Describe a dish with amounts and a price. The Manager converts the units, costs it and puts it on the POS.",
    view: "dashboard",
    target: [".pos-card"],
    run: (c) => c.command("New dish is $25 using 3 eggs and half a cup of cream"),
  },
  {
    chapter: "Your turn",
    title: "Now you try",
    body: "Say or type anything a busy owner would: buy something, 86 a dish, log waste, add a supplier, ask what's left. Then press Next.",
    view: "dashboard",
    target: [".pos-card", ".eod-card"],
    commandBox: true,
    waitFor: (_s, _start, tried) => tried,
    doIt: { label: "Try one for me", run: (c) => c.command("How much salmon is left?") },
  },
  {
    chapter: "Service",
    title: "One kitchen log",
    body: "Sales alerts, voice requests and agent actions all land in one place, with who and when.",
    view: "dashboard",
    target: [".log-card"],
  },
  {
    chapter: "Service",
    title: "Inventory, always current",
    body: "What's out or running low rises to the top. Tap plus to add more of anything to tomorrow's order.",
    view: "inventory",
    target: [".inv-grid .inv-card:nth-child(-n+4)"],
    run: async (c) => {
      await c.wait(900);
      c.actions.addExtra("salmon");
    },
  },
  {
    chapter: "Service",
    title: "Quick store runs",
    body: "Small things go on the shopping list by voice, grouped by store and ready to check off on a phone.",
    view: "shopping",
    target: [".shop-groups"],
    run: async (c) => {
      await c.wait(700);
      c.actions.addShopping("limes and foil", "Line cook");
    },
  },
  {
    chapter: "Close of day",
    title: "End Sales",
    body: "One tap closes the day. The Manager turns today's sales into tomorrow's order, split into daily, bulk and weekly.",
    view: "dashboard",
    target: [".eod-card"],
    run: async (c) => {
      await c.wait(900);
      c.actions.endSales();
    },
  },
  {
    chapter: "Close of day",
    title: "Tomorrow's order, priced",
    body: "Every line comes from the cheapest source: your registry first, then stores within 20 kilometres.",
    view: "orders",
    target: [".order-card"],
  },
  {
    chapter: "Close of day",
    title: "How the day went",
    body: "Profit, food cost, overnight waste from leftover perishables, and the pricey ingredient that barely moved.",
    view: "orders",
    target: [".stats-row"],
  },
  {
    chapter: "Close of day",
    title: "Your call: press BUY",
    body: "The agent drafts, you decide. Nothing is ever purchased without a human pressing BUY.",
    view: "orders",
    target: [".buy-btn"],
    waitFor: (s) => s.bought,
    doIt: { label: "Press BUY for me", run: (c) => c.actions.buy() },
  },
  {
    chapter: "Trust",
    title: "Scoped agent access",
    body: "The Manager has its own identity. It can read the ledger and write orders, but it can never move money, and every access is audited.",
    view: "dashboard",
    target: [".alter-card"],
    run: (c) => {
      if (!c.fast) void c.actions.refreshLedger();
    },
  },
  {
    chapter: "Trust",
    title: "That's a day with the Manager",
    body: "Restart the tour, or explore on your own. Tap the mic on the dashboard to talk to the live ElevenLabs agent.",
    view: "dashboard",
  },
];
