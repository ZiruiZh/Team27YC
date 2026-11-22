import { Beef, Carrot, Coffee, Croissant, Fish, Milk, Package, Wheat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Category } from "../data/types";

export type View = "dashboard" | "inventory" | "orders" | "menu" | "scout" | "shopping";

/** Counts smoothly from the previous value to the new one. */
export function AnimatedNumber({ value, format = (n) => Math.round(n).toLocaleString() }: { value: number; format?: (n: number) => string }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const dur = 700;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(a + (value - a) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      from.current = value;
    };
  }, [value]);
  return <span className="num">{format(shown)}</span>;
}

const categoryIcon: Record<Category, LucideIcon> = {
  produce: Carrot,
  meat: Beef,
  seafood: Fish,
  dairy: Milk,
  pantry: Wheat,
  bakery: Croissant,
  drinks: Coffee,
};

export function ItemIcon({ category, size, bare }: { category?: Category; size?: "sm" | "lg"; bare?: boolean }) {
  const Icon = category ? categoryIcon[category] : Package;
  const px = size === "lg" ? 24 : size === "sm" ? 17 : 20;
  if (bare) return <Icon size={16} strokeWidth={2.2} aria-hidden />;
  return (
    <span className={`item-icon ${size ?? ""}`} aria-hidden>
      <Icon size={px} strokeWidth={2} />
    </span>
  );
}
