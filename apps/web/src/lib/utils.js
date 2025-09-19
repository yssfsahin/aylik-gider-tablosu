export const tl = (n) =>
  Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });

export const uuid = () =>
  (crypto.randomUUID?.() || String(Math.random())).slice(0, 12);

export const moneyTone = (n) =>
  n > 0 ? "text-emerald-600" : n < 0 ? "text-rose-600" : "text-slate-900";

export const moneyText = (n) => (n < 0 ? `-${tl(Math.abs(n))}` : tl(n));