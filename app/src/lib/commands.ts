// Turns a spoken or typed kitchen command into an action and a spoken reply.
// "buy the eggs now", "new dish is $25 using 3 eggs and half a cup of cream",
// "86 the burger", "we dropped 2 eggs", "Raj does chicken at 5.50", ...
import type { Ingredient, KitchenState, RecipeLine } from "../data/types";
import { findByName, is86, ingMap, stockStatus, totals } from "./engine";
import { money, qty } from "./format";

export interface CommandActions {
  snapshot: () => KitchenState;
  buyNow: (item: string, amount?: number, who?: string) => string;
  addDishWithRecipe: (name: string, price: number, recipe: RecipeLine[], who?: string) => string;
  eightySix: (name: string, who?: string) => string;
  restoreDish: (name: string, who?: string) => string;
  logWaste: (item: string, amount: number, reason?: string, who?: string) => string;
  addSupplier: (name: string, item: string, rate: string, who?: string) => string;
  updatePrice: (item: string, newPrice: string, who?: string) => string;
  addShopping: (text: string, who?: string) => string;
  sellByName: (name: string, count: number) => string;
  groceryList: () => string;
  endSales: () => void;
  buy: () => void;
  reopen: () => void;
  reset: () => void;
  runScout: () => void;
  refreshLedger: () => Promise<void>;
  addExtra: (ingId: string, quiet?: boolean) => void;
}

export const EXAMPLES = [
  "Buy the eggs now",
  "New dish is $25 using 3 eggs and half a cup of cream",
  "86 the burger",
  "We dropped 2 eggs",
  "Sell two Caesar salads",
  "How much salmon is left?",
  "Raj does beef at 10.50 a kilo",
  "Add limes and foil to the shopping list",
  "What's on tomorrow's list?",
];

const WORD_NUM: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, dozen: 12, "a dozen": 12, half: 0.5, "a half": 0.5, quarter: 0.25, "a quarter": 0.25,
};

const NUM = String.raw`(\d+(?:\.\d+)?|a dozen|a half|a quarter|dozen|half|quarter|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|an|a)`;
const UNIT = String.raw`(cups?|tbsps?|tablespoons?|tsps?|teaspoons?|grams?|g|kgs?|kilos?|kilograms?|mls?|millilit(?:er|re)s?|l|lit(?:er|re)s?|portions?|pieces?|slices?|fillets?|lbs?|pounds?|oz|ounces?)`;

const toNum = (s?: string) => (s == null ? undefined : /^\d/.test(s) ? parseFloat(s) : WORD_NUM[s.trim()]);
const clean = (s: string) => s.toLowerCase().replace(/[“”"!?]/g, "").replace(/\s+/g, " ").trim();

/** "half a cup of cream" → { qty: 0.5, unit: "cup", item: "cream" } */
export function parseAmount(part: string): { qty?: number; unit?: string; item: string } {
  const re = new RegExp(`^(?:${NUM}\\s+)?(?:(?:a|an)\\s+)?(?:${UNIT}\\s+)?(?:of\\s+)?(.+)$`);
  const m = clean(part).match(re);
  if (!m) return { item: clean(part) };
  return { qty: toNum(m[1]), unit: m[2]?.replace(/s$/, ""), item: m[3].replace(/^(the|some|fresh)\s+/, "") };
}

/** Convert a spoken amount into the ingredient's own unit. */
export function toIngredientUnit(i: Ingredient, amount = 1, unit?: string): number {
  const u = unit ?? "";
  const count = i.unit === "each" || i.unit === "portion";
  if (count) return amount;
  const kgPer: Record<string, number> = { g: 0.001, gram: 0.001, kg: 1, kilo: 1, kilogram: 1, lb: 0.454, pound: 0.454, oz: 0.028, ounce: 0.028, cup: 0.2, tbsp: 0.015, tablespoon: 0.015, tsp: 0.005, teaspoon: 0.005 };
  const lPer: Record<string, number> = { ml: 0.001, milliliter: 0.001, millilitre: 0.001, l: 1, liter: 1, litre: 1, cup: 0.24, tbsp: 0.015, tablespoon: 0.015, tsp: 0.005, teaspoon: 0.005 };
  const table = i.unit === "L" ? lPer : kgPer;
  const per = table[u] ?? (u ? 1 : 0.1); // no unit: ~100 g / 100 ml per piece
  return Math.round(amount * per * 1000) / 1000;
}

export function parseRecipe(text: string, ingredients: Ingredient[]) {
  const parts = clean(text).split(/,|\band\b|\bplus\b/).map((p) => p.trim()).filter(Boolean);
  const recipe: RecipeLine[] = [];
  const missed: string[] = [];
  for (const p of parts) {
    const a = parseAmount(p);
    const i = findByName(ingredients, a.item);
    if (!i) {
      missed.push(a.item);
      continue;
    }
    recipe.push({ ing: i.id, qty: toIngredientUnit(i, a.qty ?? 1, a.unit) });
  }
  return { recipe, missed };
}

const findPrice = (t: string) => {
  const m = t.match(/\$\s*(\d+(?:\.\d+)?)|(\d+(?:\.\d+)?)\s*(?:\$|dollars?|bucks)/);
  return m ? parseFloat(m[1] ?? m[2]) : undefined;
};

const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

const VIEWS: [RegExp, string, string][] = [
  [/^(dashboard|home|the pos|pos)$/, "dashboard", "the dashboard"],
  [/^(inventory|stock|the stock)$/, "inventory", "inventory"],
  [/^(orders?|tomorrow'?s order|receipts|the order)$/, "orders", "orders"],
  [/^(menu|the menu|dishes)$/, "menu", "the menu"],
  [/^(price scout|scout|prices|suppliers?|supplier registry)$/, "scout", "the price scout"],
  [/^(shopping|shopping list|the list|list)$/, "shopping", "the shopping list"],
];

/** Runs a command if it's one the kitchen understands. Returns the spoken reply, or null if it isn't a command. */
export function tryInterpret(raw: string, a: CommandActions): string | null {
  const t = clean(raw).replace(/^(hey |ok |okay )?(manager|kitchen manager)[, ]+/, "").replace(/^(please|can you|could you|would you|i need you to|i want you to|go ahead and)\s+/, "").replace(/\s+please$/, "");
  if (!t) return null;
  const s = a.snapshot();

  // What can you do?
  if (/^(help|what can you do|what do you do)\b/.test(t)) {
    return "I can sell dishes, 86 or bring them back, buy stock now, log waste, add dishes, save supplier deals, change prices, manage the shopping list, scout prices, close the day and approve tomorrow's order. Just say it.";
  }

  // Back to service.
  if (/\b(reopen|back to service|open back up|we'?re open)\b/.test(t)) {
    if (!s.closed) return "We're already open.";
    a.reopen();
    return "Back to service. The POS is open.";
  }

  // Navigate: "show me inventory", "go to orders"
  const nav = t.match(/^(?:go to|open|show(?: me)?|take me to|switch to|pull up)\s+(?:the\s+)?(.+?)(?:\s+page)?$/);
  if (nav) {
    const v = VIEWS.find(([re]) => re.test(nav[1].trim()));
    if (v) {
      window.location.hash = v[1];
      return `Here's ${v[2]}.`;
    }
  }

  // Run the price scout.
  if (/\b(run|start|do)\b.*\b(scout|price search|price check)\b|\bscout (?:the )?prices\b|\bfind (?:better|cheaper) prices\b|\bsearch (?:for )?prices\b/.test(t)) {
    a.runScout();
    return "Running the price scout across stores within 20 kilometres.";
  }

  // Check the ledger.
  if (/\b(check|refresh|read)\b.*\bledger\b/.test(t)) {
    void a.refreshLedger();
    return "Checking the ledger with a fresh 5-minute token.";
  }

  // Reset the demo.
  if (/\breset\b.*\b(demo|day|everything|data)\b|^start over$/.test(t)) {
    a.reset();
    return "Reset. It's a fresh day.";
  }

  // Money questions.
  if (/\b(how much (?:did we|have we) (?:make|made)|profit|revenue|sales today|how are we doing|how'?s (?:the day|service) going|food cost)\b/.test(t)) {
    const x = totals(s);
    if (!s.receipts.length) return "No sales yet today.";
    return `${s.receipts.length} orders, ${money(x.revenue, 2)} in sales and ${money(x.profit, 2)} profit. Food cost is ${x.foodCostPct.toFixed(1)}%.`;
  }

  // What's low / out?
  if (/\bwhat'?s (?:low|running low|out|short)\b|\bwhat are we (?:low|out|short) on\b|\blow stock\b|\bwhat do we need to restock\b/.test(t)) {
    const low = s.ingredients.filter((i) => stockStatus(i) !== "ok");
    if (!low.length) return "Nothing's low right now.";
    return `Running low: ${low.map((i) => (stockStatus(i) === "out" ? `${i.name.toLowerCase()} (out)` : `${i.name.toLowerCase()} (${qty(i.onHand)} ${i.unit})`)).join(", ")}.`;
  }

  // What's 86'd?
  if (/\bwhat'?s (?:86'?d|eighty[- ]six(?:ed)?|off the menu|unavailable)\b|\bwhat can'?t we (?:make|sell)\b/.test(t)) {
    const ings = ingMap(s);
    const off = s.dishes.filter((d) => is86(d, ings));
    return off.length ? `86'd right now: ${off.map((d) => d.name).join(", ")}.` : "Everything's on the menu.";
  }

  // Top up tomorrow's order: "add salmon to tomorrow's order"
  const extra = t.match(/^(?:add|put|bump up|increase)\s+(?:more\s+)?(.+?)\s+(?:to|on|in)\s+tomorrow'?s?\s+(?:order|list|delivery)/);
  if (extra) {
    const i = findByName(s.ingredients, parseAmount(extra[1]).item);
    if (!i) return `I couldn't find ${extra[1]} in inventory.`;
    a.addExtra(i.id);
    return `Added more ${i.name.toLowerCase()} to tomorrow's order.`;
  }

  // New dish: "new dish is $25 using 3 eggs and half a cup of cream", "add a dish called X for 18 with ..."
  if (/\b(new dish|add (?:a )?dish|new special|create (?:a )?dish|add (?:a )?special)\b/.test(t)) {
    const price = findPrice(t) ?? 20;
    const withPart = t.split(/\b(?:using|made with|made of|with|contains?)\b/)[1] ?? "";
    const { recipe, missed } = parseRecipe(withPart.replace(/\b(for|at)\s+\$?\d+(\.\d+)?\s*(dollars?|bucks|\$)?/, ""), s.ingredients);
    const named = t.match(/\b(?:called|named)\s+(.+?)(?=\s+(?:for|at|is|using|with|made|that)\b|$)/)?.[1];
    const name = named
      ? titleCase(named)
      : recipe.length
        ? `${titleCase(recipe.map((l) => s.ingredients.find((i) => i.id === l.ing)!.name.split(" ")[0]).slice(0, 2).join(" & "))} Special`
        : "Chef's Special";
    const reply = a.addDishWithRecipe(name, price, recipe, "You");
    return missed.length ? `${reply} I couldn't find ${missed.join(" or ")} in stock.` : reply;
  }

  // Approve tomorrow's order.
  if (/\b(approve|confirm)\b.*\b(order|list)\b|^buy it\b|\bbuy the order\b|\bbuy everything\b/.test(t)) {
    if (s.bought) return "Tomorrow's order is already approved.";
    if (!s.closed) a.endSales();
    a.buy();
    return "Done. Day closed and tomorrow's order is approved.";
  }

  // Buy now: "buy the eggs now", "order 12 eggs", "get two kilos of beef"
  if (/^(?:please\s+)?(buy|order|purchase|get|restock|grab)\b/.test(t)) {
    const rest = t.replace(/^(?:please\s+)?(buy|order|purchase|get|restock|grab)\s+/, "").replace(/\b(now|right now|immediately|asap|please|more|for me|today)\b/g, "").trim();
    const amt = parseAmount(rest);
    const i = findByName(s.ingredients, amt.item);
    if (!i) return `I couldn't find ${amt.item} in inventory.`;
    const n = amt.qty != null && !/^(a|an)\b/.test(rest) ? toIngredientUnit(i, amt.qty, amt.unit) : undefined;
    return a.buyNow(i.name, n, "You");
  }

  // Bring a dish back.
  if (/\b(un-?86|bring back|back on|unblock|put .+ back)\b/.test(t)) {
    const name = t.replace(/\b(un-?86|bring back|is back on|back on|unblock|put|back|the|menu|on|please)\b/g, " ").trim();
    return a.restoreDish(name, "You");
  }

  // 86 a dish.
  if (/\b(86|eighty[- ]?six)\b|\btake .+ off\b/.test(t)) {
    const name = t.replace(/\b(86|eighty[- ]?six|take|off|the|menu|please|now)\b/g, " ").trim();
    return a.eightySix(name, "You");
  }

  // Waste: "we dropped 2 eggs", "throw out a kilo of tomatoes"
  const waste = t.match(/\b(dropped|drop|spilled|spill|burnt|burned|threw out|throw out|tossed|toss|wasted|waste|spoiled|ruined|binned)\b\s*(.*)$/);
  if (waste) {
    const amt = parseAmount(waste[2].replace(/\b(the|some|all)\b/g, " ").trim());
    const i = findByName(s.ingredients, amt.item);
    if (!i) return `What did we lose? I couldn't find ${amt.item || "that"} in inventory.`;
    const reason = /spoil/.test(waste[1]) ? "spoiled" : /burn/.test(waste[1]) ? "burnt" : /spill/.test(waste[1]) ? "spilled" : "dropped";
    return a.logWaste(i.name, toIngredientUnit(i, amt.qty ?? 1, amt.unit), reason, "You");
  }

  // Supplier deal: "Raj does chicken at 5.50", "add supplier Bob for beef at 10 a kilo"
  const deal = t.match(/^(.+?)\s+(?:does|sells|has|will do)\s+(.+?)\s+(?:at|for)\s+(.+)$/) ?? t.match(/^add supplier\s+(.+?)\s+for\s+(.+?)\s+at\s+(.+)$/);
  if (deal) return a.addSupplier(titleCase(deal[1].replace(/^(my friend|our guy|the guy)\s+/, "")), deal[2], deal[3], "You");

  // Price change: "salmon is now 11 dollars", "price of beef is 12"
  const price = t.match(/^(?:the )?(?:price of )?(.+?)\s+(?:is now|now costs|costs|went up to|went down to|is)\s+\$?(\d+(?:\.\d+)?)/);
  if (price && findByName(s.ingredients, price[1])) return a.updatePrice(price[1], price[2], "You");

  // Shopping list.
  const shop = t.match(/^(?:add|put)\s+(.+?)\s+(?:to|on)\s+(?:the\s+)?(?:shopping\s+)?list/);
  if (shop) return a.addShopping(shop[1], "You");

  // Sell: "sell two caesar salads", "ring up a burger"
  const sell = t.match(/^(?:sell|ring up|ring in|fire)\s+(.+)$/);
  if (sell) {
    const amt = parseAmount(sell[1]);
    return a.sellByName(amt.item, Math.max(1, Math.round(amt.qty ?? 1)));
  }

  // Stock question: "how much salmon is left?", "how many eggs do we have"
  if (/\b(how (?:much|many)|do we have|is left|are left|in stock)\b/.test(t)) {
    const item = t.replace(/\b(how|much|many|do|we|have|is|are|left|in|stock|of|the|there|got)\b/g, " ").trim();
    const i = findByName(s.ingredients, item);
    if (!i) return `I couldn't find ${item || "that"} in inventory.`;
    const st = stockStatus(i);
    const unit = i.unit === "each" ? "" : ` ${i.unit}${i.unit === "portion" && i.onHand !== 1 ? "s" : ""} of`;
    return st === "out" ? `We're out of ${i.name.toLowerCase()}.` : `${qty(i.onHand)}${unit} ${i.name.toLowerCase()} left${st === "low" ? ", that's running low" : ""}.`;
  }

  // Tomorrow's list.
  if (/\b(grocery|tomorrow'?s? (?:list|order)|what do we need|shopping for tomorrow)\b/.test(t)) return a.groceryList();

  // Close the day.
  if (/\b(end sales|close the day|close out|we'?re closed|close up)\b/.test(t)) {
    if (s.closed) return "We're already closed for the day.";
    a.endSales();
    return "Day closed. Tomorrow's order is ready for you to approve.";
  }

  return null;
}

export const NOT_UNDERSTOOD = "Sorry, I didn't get that. Try “buy the eggs now” or “86 the burger”.";

/** Like tryInterpret, but always returns something to say. */
export function interpret(raw: string, a: CommandActions): string {
  return tryInterpret(raw, a) ?? NOT_UNDERSTOOD;
}

