export const ymNum = (ym) => Number((ym || "0000-00").replace("-", ""));

export const isActiveInMonth = (targetYM, startYM, endYM) => {
  const t = ymNum(targetYM);
  const s = ymNum(startYM || targetYM);
  const e = endYM ? ymNum(endYM) : 999999;
  return t >= s && t <= e;
};

export const nextYM = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const m2 = m === 12 ? 1 : m + 1;
  const y2 = m === 12 ? y + 1 : y;
  return `${y2}-${String(m2).padStart(2, "0")}`;
};

export const formatYM = (ym) => {
  if (!ym) return "";
  try {
    const d = new Date(`${ym}-01T00:00:00`);
    const s = d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
    return s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
  } catch {
    return ym;
  }
};