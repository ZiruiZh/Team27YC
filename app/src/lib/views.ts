import { ClipboardList, House, Package, ShoppingBasket, Sparkles, UtensilsCrossed } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { View } from "../components/ui";

export const navItems: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Home", icon: House },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "menu", label: "Menu", icon: UtensilsCrossed },
  { id: "scout", label: "Price scout", icon: Sparkles },
  { id: "shopping", label: "Shopping list", icon: ShoppingBasket },
];

export const viewLabel = (v: View) => navItems.find((i) => i.id === v)?.label ?? "Home";
export const viewIcon = (v: View) => navItems.find((i) => i.id === v)?.icon ?? House;
