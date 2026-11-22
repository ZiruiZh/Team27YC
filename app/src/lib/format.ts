export const money = (n: number, digits?: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits ?? (n % 1 === 0 ? 0 : 2),
    maximumFractionDigits: digits ?? 2,
  });

export const clockTime = (d: Date) =>
  d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();

export const qty = (n: number) => {
  const r = Math.round(n * 1000) / 1000;
  if (Number.isInteger(r)) return String(r);
  return Math.abs(r) < 1 ? String(Math.round(r * 100) / 100) : r.toFixed(1);
};

