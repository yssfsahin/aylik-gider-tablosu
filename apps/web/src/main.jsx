import React, { useMemo, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import GradientBackground from "./components/GradientBackground";

import * as XLSX from "xlsx";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
} from "@react-pdf/renderer";

// ================== Yardımcılar ==================
const tl = (n) =>
  Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
const uuid = () =>
  (crypto.randomUUID?.() || String(Math.random())).slice(0, 12);
const moneyTone = (n) =>
  n > 0 ? "text-emerald-600" : n < 0 ? "text-rose-600" : "text-slate-900";
const moneyText = (n) => (n < 0 ? `-${tl(Math.abs(n))}` : tl(n));
const ymNum = (ym) => Number((ym || "0000-00").replace("-", ""));
const isActiveInMonth = (targetYM, startYM, endYM) => {
  const t = ymNum(targetYM);
  const s = ymNum(startYM || targetYM);
  const e = endYM ? ymNum(endYM) : 999999;
  return t >= s && t <= e;
};

// Next year-month helper
const nextYM = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const m2 = m === 12 ? 1 : m + 1;
  const y2 = m === 12 ? y + 1 : y;
  return `${y2}-${String(m2).padStart(2, "0")}`;
};

// Date <-> YYYY-MM helpers for the month picker
const dateToYM = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const ymToDate = (ym) => {
  if (!ym) return new Date();
  const [y, m] = ym.split("-").map(Number);
  return new Date(y || new Date().getFullYear(), (m ? m - 1 : 0), 1);
};

// YYYY-MM -> "Eylül 2025" (TR)
const formatYM = (ym) => {
  if (!ym) return "";
  try {
    const d = new Date(`${ym}-01T00:00:00`);
    const s = d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
    // Baş harfi büyüt
    return s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
  } catch {
    return ym;
  }
};

// ================== PDF Styles & Components (React-PDF) ==================
const pdfStyles = StyleSheet.create({
  page: { padding: 32 },
  h1: { fontSize: 16, marginBottom: 12, color: "#0f172a", fontWeight: "bold" },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  th: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 11,
    color: "#334155",
    fontWeight: "bold",
  },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    borderBottomStyle: "solid",
  },
  td: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    fontSize: 11,
    color: "#334155",
  },
  tdRight: { textAlign: "right" },
  totalRow: { flexDirection: "row", backgroundColor: "#f8fafc" },
  totalLabel: {
    flex: 2,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: "bold",
  },
  totalValue: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "right",
    color: "#4f46e5",
  },
});

const TableHeader = ({ headers = [] }) => (
  <View style={pdfStyles.tableHeader}>
    {headers.map((h, i) => (
      <Text
        key={i}
        style={[pdfStyles.th, i === headers.length - 1 && pdfStyles.tdRight]}
      >
        {h}
      </Text>
    ))}
  </View>
);

const TableRows = ({ rows = [] }) => (
  <>
    {rows.map((r, i) => (
      <View key={i} style={pdfStyles.row}>
        <Text style={pdfStyles.td}>{r.tip}</Text>
        <Text style={pdfStyles.td}>{r.kategori}</Text>
        <Text style={[pdfStyles.td, pdfStyles.tdRight]}>{`${tl(
          r.tutar
        )} ₺`}</Text>
      </View>
    ))}
  </>
);

const PlanPDFDoc = ({ month, rows, total }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.h1}>{`${formatYM(month)} – Bu Ay Harcama Özeti`}</Text>
      <TableHeader headers={["Tip", "Kategori", "Tutar"]} />
      <TableRows rows={rows} />
      <View style={pdfStyles.totalRow}>
        <Text style={pdfStyles.totalLabel}>Toplam</Text>
        <Text style={pdfStyles.totalValue}>{`${tl(total)} ₺`}</Text>
      </View>
    </Page>
  </Document>
);

const MonthlyPDFDoc = ({ month, rows, total }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.h1}>{`${formatYM(month)} – Aylık Giderler`}</Text>
      <TableHeader
        headers={["Tip", "Kategori", "Başlangıç", "Bitiş", "Tutar"]}
      />
      {rows.map((r, i) => (
        <View key={i} style={pdfStyles.row}>
          <Text style={pdfStyles.td}>{r.tip}</Text>
          <Text style={pdfStyles.td}>{r.kategori}</Text>
          <Text style={pdfStyles.td}>{r.start || ""}</Text>
          <Text style={pdfStyles.td}>{r.end || ""}</Text>
          <Text style={[pdfStyles.td, pdfStyles.tdRight]}>{`${tl(
            r.tutar
          )} ₺`}</Text>
        </View>
      ))}
      <View style={pdfStyles.totalRow}>
        <Text style={pdfStyles.totalLabel}>Toplam</Text>
        <Text style={pdfStyles.totalValue}>{`${tl(total)} ₺`}</Text>
      </View>
    </Page>
  </Document>
);

// ================== Kategoriler ==================
const FIXED_MAIN_CATEGORIES = [
  "Kira / Aidat",
  "Kredi Taksitleri",
  "Faturalar",
  "Sigorta",
  "Eğitim / Okul / Kreş",
  "Vergi / MTV",
  "Abonelikler",
  "Bakım / Destek",
  "Diğer (Sabit)",
];

const VARIABLE_CATEGORIES = [
  "Market",
  "Alışveriş",
  "Yeme-İçme",
  "Benzin/Araç",
  "Ulaşım",
  "Eğlence / Sosyal",
  "Sağlık",
  "Hediye / Bağış",
  "Ev Bakımı",
  "Evcil Hayvan",
  "Diğer (Değişken)",
];

// ================== LocalStorage Keys ==================
const LS_PLAN = "hys.plan.v1";
const LS_MONTHLY = "hys.monthly.v1";

// küçük helper
const saveLS = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
const loadLS = (k, fallback) => {
  try {
    const raw = localStorage.getItem(k);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

// ================== Ana Bileşen ==================
function Planner() {
  const todayYM = new Date().toISOString().slice(0, 7);

  // ---------- Sekme ----------
  const [tab, setTab] = useState("zam"); // "plan" | "aylik" | "zam"

  // Mobile menu
  const [mobileOpen, setMobileOpen] = useState(false);
  // close on ESC & lock body scroll when open
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // ---------- ZAM sekmesi state ----------
  const [zamOld, setZamOld] = useState(""); // Mevcut fiyat/maaş
  const [zamNew, setZamNew] = useState(""); // Yeni fiyat/maaş

  const zamDiff = useMemo(() => (Number(zamNew || 0) - Number(zamOld || 0)), [zamOld, zamNew]);
  const zamPercent = useMemo(() => {
    const o = Number(zamOld);
    const n = Number(zamNew);
    if (!o && !n) return null; // boşken gösterme
    if (o <= 0) return null;   // 0'a bölme koruması
    return ((n - o) / o) * 100;
  }, [zamOld, zamNew]);

  // ---------- PLAN sekmesi state ----------
  const [planMonth, setPlanMonth] = useState(todayYM);
  const [incomes, setIncomes] = useState([]);
  const [planExpenses, setPlanExpenses] = useState([]); // {id, category, amount}

  // ---------- AYLIK sekmesi state ----------
  const [monthlyMonth, setMonthlyMonth] = useState("");
  const [monthlyEndMonth, setMonthlyEndMonth] = useState("");
  const [monthlyFixed, setMonthlyFixed] = useState([]); // {id, category, amount}
  const [monthlyVariable, setMonthlyVariable] = useState([]); // {id, category, amount}

  // ---------- LS yükle ----------
  useEffect(() => {
    const p = loadLS(LS_PLAN, null);
    if (p) {
      setPlanMonth(p.planMonth || todayYM);
      setIncomes(p.incomes || []);
      setPlanExpenses(p.planExpenses || []);
    }
    const m = loadLS(LS_MONTHLY, null);
    if (m) {
      setMonthlyMonth(m.monthlyMonth || "");
      setMonthlyEndMonth(m.monthlyEndMonth || (m.monthlyMonth || ""));
      setMonthlyFixed(m.monthlyFixed || []);
      setMonthlyVariable(m.monthlyVariable || []);
    }
  }, []);

  // ---------- LS kaydet ----------
  useEffect(() => {
    saveLS(LS_PLAN, { planMonth, incomes, planExpenses });
  }, [planMonth, incomes, planExpenses]);

  useEffect(() => {
    saveLS(LS_MONTHLY, { monthlyMonth, monthlyEndMonth, monthlyFixed, monthlyVariable });
  }, [monthlyMonth, monthlyEndMonth, monthlyFixed, monthlyVariable]);

  // ---------- SIFIRLA (cache temizle) ----------
  const clearPlan = () => {
    try {
      localStorage.removeItem(LS_PLAN);
    } catch {}
    setPlanMonth(todayYM);
    setIncomes([]);
    setPlanExpenses([]);
    setPlanView(null);
  };

  const clearMonthly = () => {
    try {
      localStorage.removeItem(LS_MONTHLY);
    } catch {}
    setMonthlyMonth("");
    setMonthlyEndMonth("");
    setMonthlyFixed([]);
    setMonthlyVariable([]);
    setIncomes([]); // also clear incomes for yearly view
    setMonthlyView(null);
  };

  const clearZam = () => {
    setZamOld("");
    setZamNew("");
  };

  // ---------- PLAN: kategori listesi (tek gider select'i için) ----------
  const ALL_CATEGORIES = useMemo(
    () =>
      Array.from(new Set([...FIXED_MAIN_CATEGORIES, ...VARIABLE_CATEGORIES])),
    []
  );

  // ---------- PLAN: özet ----------
  const planSummary = useMemo(() => {
    const incomeSum = incomes.reduce((a, b) => a + (Number(b) || 0), 0);
    const variableSum = planExpenses.reduce(
      (a, e) => a + (Number(e.amount) || 0),
      0
    );
    const fixedSum = 0; // plan sekmesinde sabit/ay bazlı ayrım yok
    const expenseSum = variableSum;
    const available = incomeSum - expenseSum;
    return { incomeSum, fixedSum, variableSum, expenseSum, available };
  }, [incomes, planExpenses]);

  // ---------- PLAN: hesapla (sadece tablo oluştur) ----------
  const [planView, setPlanView] = useState(null);
  const [monthlyView, setMonthlyView] = useState(null);
  const calcPlan = () => {
    const rows = planExpenses.map((e) => ({
      tip: "Gider",
      kategori: e.category,
      tutar: +e.amount || 0,
    }));
    setPlanView({ month: planMonth, monthBreakdown: rows });
  };

  // ---------- AYLIK: özet ----------
  const monthlySummary = useMemo(() => {
    const fixed = monthlyFixed
      .filter((e) => isActiveInMonth(monthlyMonth, e.start, e.end))
      .reduce((a, e) => a + (Number(e.amount) || 0), 0);
    const variable = monthlyVariable.reduce(
      (a, e) => a + (Number(e.amount) || 0),
      0
    );
    return { total: fixed + variable, fixed, variable };
  }, [monthlyFixed, monthlyVariable, monthlyMonth]);

  const calcMonthly = () => {
    if (!monthlyMonth || !monthlyEndMonth) {
      alert("Lütfen başlangıç ve bitiş aylarını seçin.");
      return;
    }
    const months = [];
    let cursor = monthlyMonth;
    const end = monthlyEndMonth || monthlyMonth;

    while (ymNum(cursor) <= ymNum(end)) {
      const rows = [
        ...monthlyFixed
          .filter((e) => isActiveInMonth(cursor, e.start, e.end))
          .map((e) => ({
            tip: "Sabit",
            kategori: e.category,
            tutar: +e.amount || 0,
            start: e.start || "",
            end: e.end || "",
          })),
        ...monthlyVariable.map((e) => ({
          tip: "Değişken",
          kategori: e.category,
          tutar: +e.amount || 0,
          start: "",
          end: "",
        })),
      ];
      if (rows.length > 0) {
        months.push({ month: cursor, rows });
      }
      cursor = nextYM(cursor);
    }
    setMonthlyView(months);
  };
  const monthlyViewFilled = useMemo(
    () => (monthlyView || []).filter((m) => m.rows && m.rows.length > 0),
    [monthlyView]
  );

  // ================== Exportlar ==================
  const exportPlanXLSX = () => {
    if (!planView) return;
    const wb = XLSX.utils.book_new();
    const rows = planView.monthBreakdown.map((x) => ({
      Tip: x.tip,
      Kategori: x.kategori,
      Tutar: x.tutar,
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(rows),
      "BuAy-Harcamalar"
    );
    XLSX.writeFile(wb, `plan-${planView.month}.xlsx`);
  };
  const exportPlanPDF = async () => {
    if (!planView) return;
    try {
      const element = (
        <PlanPDFDoc
          month={planView.month}
          rows={planView.monthBreakdown}
          total={planSummary.expenseSum}
        />
      );
      const blob = await pdf(element).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `plan-${planView.month}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("React-PDF export failed", e);
      alert("PDF oluşturulamadı.");
    }
  };

  const exportMonthlyXLSX = () => {
    if (!monthlyViewFilled || monthlyViewFilled.length === 0) return;
    const wb = XLSX.utils.book_new();
    monthlyViewFilled.forEach((m) => {
      const rows = m.rows.map((x) => ({
        Tip: x.tip,
        Kategori: x.kategori,
        Başlangıç: x.start || "",
        Bitiş: x.end || "",
        Tutar: x.tutar,
      }));
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.json_to_sheet(rows),
        `${m.month}`
      );
    });
    const fileName =
      monthlyViewFilled.length === 1
        ? `aylik-${monthlyViewFilled[0].month}.xlsx`
        : `aylik-${monthlyViewFilled[0].month}_to_${monthlyViewFilled[monthlyViewFilled.length - 1].month}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };
  const exportMonthlyPDF = async () => {
    if (!monthlyViewFilled || monthlyViewFilled.length === 0) return;
    try {
      const element = (
        <Document>
          {monthlyViewFilled.map((m, i) => {
            const total = m.rows.reduce((a, r) => a + (+r.tutar || 0), 0);
            return (
              <Page key={i} size="A4" style={pdfStyles.page}>
                <Text style={pdfStyles.h1}>{`${formatYM(m.month)} – Aylık Giderler`}</Text>
                <View style={pdfStyles.tableHeader}>
                  {["Tip","Kategori","Başlangıç","Bitiş","Tutar"].map((h, hi) => (
                    <Text key={hi} style={[pdfStyles.th, hi === 4 && pdfStyles.tdRight]}>{h}</Text>
                  ))}
                </View>
                {m.rows.map((r, ri) => (
                  <View key={ri} style={pdfStyles.row}>
                    <Text style={pdfStyles.td}>{r.tip}</Text>
                    <Text style={pdfStyles.td}>{r.kategori}</Text>
                    <Text style={pdfStyles.td}>{r.start || ""}</Text>
                    <Text style={pdfStyles.td}>{r.end || ""}</Text>
                    <Text style={[pdfStyles.td, pdfStyles.tdRight]}>{`${tl(r.tutar)} ₺`}</Text>
                  </View>
                ))}
                <View style={pdfStyles.totalRow}>
                  <Text style={pdfStyles.totalLabel}>Toplam</Text>
                  <Text style={pdfStyles.totalValue}>{`${tl(total)} ₺`}</Text>
                </View>
              </Page>
            );
          })}
        </Document>
      );
      const blob = await pdf(element).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const first = monthlyViewFilled[0].month;
      const last = monthlyViewFilled[monthlyViewFilled.length - 1].month;
      a.href = url;
      a.download = monthlyViewFilled.length === 1 ? `aylik-${first}.pdf` : `aylik-${first}_to_${last}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("React-PDF export failed", e);
      alert("PDF oluşturulamadı.");
    }
  };

  // ================== UI ==================
  const MonthField = ({ value, onChange, placeholder, aria }) => {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef(null);

    // close on outside click
    React.useEffect(() => {
      const onDocClick = (e) => {
        if (!ref.current) return;
        if (!ref.current.contains(e.target)) setOpen(false);
      };
      document.addEventListener("mousedown", onDocClick);
      return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    const handleMonthPick = (date) => {
      const ym = dateToYM(date);
      // adapt to existing onChange signature
      onChange({ target: { value: ym } });
      setOpen(false);
    };

    return (
      <div className="relative" ref={ref}>
        <input
          className={`input input-month ${value ? "has-value" : ""}`}
          type="text"
          readOnly
          value={value || ""}
          onClick={() => setOpen((v) => !v)}
          aria-label={aria}
          placeholder={placeholder}
        />
        {open && (
          <div className="absolute z-50 mt-2 rounded-lg border border-slate-200 bg-white shadow-lg">
            <Calendar
              onClickMonth={handleMonthPick}
              value={ymToDate(value)}
              defaultValue={ymToDate(value)}
              maxDetail="year"
              minDetail="decade"
              view="year"
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header / Full-width menu */}
      <nav className="w-full bg-white/10 backdrop-blur border-b border-white/15">
        <div className="container py-4 flex items-center justify-between">
          {/* Brand */}
          <div className="flex items-center gap-2 text-white">
            <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">💳</div>
            <div className="leading-tight">
              <div className="text-white/80 text-xs">Hesap Yönetim Sistemi</div>
              <div className="text-lg font-semibold">Hesabın Kralı</div>
            </div>
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setTab("plan")}
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                tab === "plan"
                  ? "bg-indigo-600 text-white"
                  : "text-white/90 hover:text-white hover:bg-white/10"
              }`}
            >
              Aylık Hesaplama
            </button>
            <button
              type="button"
              onClick={() => setTab("aylik")}
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                tab === "aylik"
                  ? "bg-indigo-600 text-white"
                  : "text-white/90 hover:text-white hover:bg-white/10"
              }`}
            >
              Yıllık Hesaplama
            </button>
            <button
              type="button"
              onClick={() => setTab("zam")}
              className={`px-3 py-2 rounded-md text-sm font-medium transition ${
                tab === "zam"
                  ? "bg-indigo-600 text-white"
                  : "text-white/90 hover:text-white hover:bg-white/10"
              }`}
            >
              Zam Hesaplama
            </button>
          </div>

          {/* Hamburger button (mobile) */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-md px-3 py-2 text-white/90 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/30"
            aria-label="Menüyü aç/kapat"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {/* Icon */}
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {mobileOpen ? (
                <path d="M6 18L18 6M6 6l12 12" />
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </nav>
      {/* Mobile menu drawer */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute right-0 top-0 h-full w-72 bg-slate-900/95 text-white backdrop-blur border-l border-white/10 p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">💳</div>
                <span className="font-semibold">Hesabın Kralı</span>
              </div>
              <button
                className="rounded-md p-2 hover:bg-white/10"
                onClick={() => setMobileOpen(false)}
                aria-label="Kapat"
              >
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <button
              className={`w-full text-left px-3 py-2 rounded-md ${tab === "plan" ? "bg-indigo-600" : "hover:bg-white/10"}`}
              onClick={() => { setTab("plan"); setMobileOpen(false); }}
            >Aylık Hesaplama</button>
            <button
              className={`w-full text-left px-3 py-2 rounded-md ${tab === "aylik" ? "bg-indigo-600" : "hover:bg-white/10"}`}
              onClick={() => { setTab("aylik"); setMobileOpen(false); }}
            >Yıllık Hesaplama</button>
            <button
              className={`w-full text-left px-3 py-2 rounded-md ${tab === "zam" ? "bg-indigo-600" : "hover:bg-white/10"}`}
              onClick={() => { setTab("zam"); setMobileOpen(false); }}
            >Zam Hesaplama</button>
          </div>
        </div>
      )}
      <main className="flex-1">
        <div className="container mt-8 sm:mt-10 mb-8">

      {/* ================== PLAN SEKME ================== */}
      {tab === "plan" && (
        <div className="card p-5">
          {/* Üst satır */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold">Hesaplasana</h1>
          </div>

          {/* Özet kartları (PLAN) — yalnızca Gelir ve Kullanılabilir */}
          <div className="grid md:grid-cols-2 gap-3">
            <div className="card p-4">
              <div className="text-xs text-slate-500">Gelir</div>
              <div className="text-xl font-semibold">
                {tl(planSummary.incomeSum)} ₺
              </div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-500">Bu Ay Kullanılabilir</div>
              <div
                className={`text-xl font-semibold ${moneyTone(
                  planSummary.available
                )}`}
              >
                {moneyText(planSummary.available)} ₺
              </div>
            </div>
          </div>

          {/* Gelirler */}
          <div className="card p-4 mt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Gelirler</h3>
              <button
                className="button"
                onClick={() => setIncomes((v) => [...v, ""])}
              >
                + Ekle
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {incomes.map((n, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input flex-1"
                    type="number"
                    value={n ?? ""}
                    onChange={(e) =>
                      setIncomes((v) =>
                        v.map((x, idx) => (idx === i ? e.target.value : x))
                      )
                    }
                  />
                  <button
                    className="button"
                    onClick={() =>
                      setIncomes((v) => v.filter((_, idx) => idx !== i))
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Giderler (Plan) */}
          <div className="card p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Giderler</h3>
              <button
                className="button"
                onClick={() =>
                  setPlanExpenses((v) => [
                    ...v,
                    { id: uuid(), category: "Market", amount: "" },
                  ])
                }
              >
                + Ekle
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {planExpenses.map((item, i) => (
                <React.Fragment key={item.id}>
                  <select
                    className="input"
                    value={item.category}
                    onChange={(e) =>
                      setPlanExpenses((v) =>
                        v.map((x, idx) =>
                          idx === i ? { ...x, category: e.target.value } : x
                        )
                      )
                    }
                  >
                    {ALL_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="number"
                    placeholder="Tutar"
                    value={item.amount ?? ""}
                    onChange={(e) =>
                      setPlanExpenses((v) =>
                        v.map((x, idx) =>
                          idx === i ? { ...x, amount: e.target.value } : x
                        )
                      )
                    }
                  />
                  <button
                    className="button"
                    onClick={() =>
                      setPlanExpenses((v) => v.filter((_, idx) => idx !== i))
                    }
                  >
                    ✕
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Plan – Aksiyonlar */}
          <div className="flex justify-end gap-2 mt-6">
            <button className="button button-primary" onClick={calcPlan}>Hesapla</button>
            <button className="button" onClick={clearPlan}>Sıfırla</button>
          </div>

          {/* PLAN – sonuç tablosu */}
          {planView && (
            <div className="card p-5 mt-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">
                  {formatYM(planView.month)} – Bu Ay Harcama Özeti
                </h3>
                <div className="flex gap-2">
                  <button className="button" onClick={exportPlanXLSX}>Excel</button>
                  <button className="button" onClick={exportPlanPDF}>PDF</button>
                </div>
              </div>
              <div className="overflow-x-auto mt-3">
                <table className="w-full border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        <strong>Tip</strong>
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                        <strong>Kategori</strong>
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                        <strong>Tutar</strong>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800 text-sm">
                    {planView.monthBreakdown.map((x, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-2">{x.tip}</td>
                        <td className="px-4 py-2">{x.kategori}</td>
                        <td className="px-4 py-2 text-right font-medium">
                          {tl(x.tutar)} ₺
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold">
                      <td className="px-4 py-2" colSpan={2}>
                        <strong>Toplam</strong>
                      </td>
                      <td className="px-4 py-2 text-right text-indigo-600 font-bold">
                        {tl(planSummary.expenseSum)} ₺
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================== AYLIK SEKME ================== */}
      {tab === "aylik" && (
        <div className="card p-5">
          <div className="mb-4">
            {/* Heading + desktop (md+) date fields on the right */}
            <div className="flex items-start justify-between">
              <h1 className="text-3xl font-bold">Hesaplasana</h1>
              <div className="hidden md:flex items-center gap-2">
                <MonthField
                  value={monthlyMonth}
                  onChange={(e) => setMonthlyMonth(e.target.value)}
                  placeholder="Başlangıç"
                  aria="Başlangıç"
                />
                <MonthField
                  value={monthlyEndMonth}
                  onChange={(e) => setMonthlyEndMonth(e.target.value)}
                  placeholder="Bitiş"
                  aria="Bitiş"
                />
              </div>
            </div>
            {/* Mobile-only (sm and below) date fields under the title */}
            <div className="mt-3 grid grid-cols-1 gap-2 md:hidden">
              <MonthField
                value={monthlyMonth}
                onChange={(e) => setMonthlyMonth(e.target.value)}
                placeholder="Başlangıç"
                aria="Başlangıç"
              />
              <MonthField
                value={monthlyEndMonth}
                onChange={(e) => setMonthlyEndMonth(e.target.value)}
                placeholder="Bitiş"
                aria="Bitiş"
              />
            </div>
          </div>

          {/* Özet kartları */}
          <div className="grid md:grid-cols-4 gap-3 mb-4">
            <div className="card p-4">
              <div className="text-xs text-slate-500">Gelir</div>
              <div className="text-xl font-semibold">
                {tl(incomes.reduce((a, b) => a + (+b || 0), 0))} ₺
              </div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-500">Sabit Giderler</div>
              <div className="text-xl font-semibold">
                {tl(monthlySummary.fixed)} ₺
              </div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-500">Değişken Giderler</div>
              <div className="text-xl font-semibold">
                {tl(monthlySummary.variable)} ₺
              </div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-500">Bu Ay Kullanılabilir</div>
              <div
                className={`text-xl font-semibold ${moneyTone(
                  incomes.reduce((a, b) => a + (+b || 0), 0) -
                    monthlySummary.total
                )}`}
              >
                {moneyText(
                  incomes.reduce((a, b) => a + (+b || 0), 0) -
                    monthlySummary.total
                )}{" "}
                ₺
              </div>
            </div>
          </div>

          {/* Gelirler (Aylık) */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Gelirler</h3>
              <button
                className="button"
                onClick={() => setIncomes((v) => [...v, ""])}
              >
                + Ekle
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {incomes.map((n, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    className="input flex-1"
                    type="number"
                    value={n ?? ""}
                    onChange={(e) =>
                      setIncomes((v) =>
                        v.map((x, idx) => (idx === i ? e.target.value : x))
                      )
                    }
                  />
                  <button
                    className="button"
                    onClick={() =>
                      setIncomes((v) => v.filter((_, idx) => idx !== i))
                    }
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Sabit Giderler (Aylık) */}
          <div className="card p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Sabit Giderler</h3>
              <button
                className="button"
                onClick={() =>
                  setMonthlyFixed((v) => [
                    ...v,
                    {
                      id: uuid(),
                      category: "Kira / Aidat",
                      amount: "",
                      start: "",
                      end: "",
                    },
                  ])
                }
              >
                + Ekle
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {monthlyFixed.map((item, i) => (
                <React.Fragment key={item.id}>
                  <select
                    className="input"
                    value={item.category}
                    onChange={(e) =>
                      setMonthlyFixed((v) =>
                        v.map((x, idx) =>
                          idx === i ? { ...x, category: e.target.value } : x
                        )
                      )
                    }
                  >
                    {FIXED_MAIN_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="number"
                    placeholder="Tutar"
                    value={item.amount ?? ""}
                    onChange={(e) =>
                      setMonthlyFixed((v) =>
                        v.map((x, idx) =>
                          idx === i ? { ...x, amount: e.target.value } : x
                        )
                      )
                    }
                  />

                  <MonthField
                    value={item.start || ""}
                    onChange={(e) =>
                      setMonthlyFixed((v) =>
                        v.map((x, idx) =>
                          idx === i ? { ...x, start: e.target.value } : x
                        )
                      )
                    }
                    placeholder="Başlangıç"
                    aria="Başlangıç"
                  />

                  <MonthField
                    value={item.end || ""}
                    onChange={(e) =>
                      setMonthlyFixed((v) =>
                        v.map((x, idx) =>
                          idx === i ? { ...x, end: e.target.value } : x
                        )
                      )
                    }
                    placeholder="Bitiş"
                    aria="Bitiş"
                  />
                  <button
                    className="button"
                    onClick={() =>
                      setMonthlyFixed((v) => v.filter((_, idx) => idx !== i))
                    }
                  >
                    ✕
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Değişken Giderler (Aylık) */}
          <div className="card p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Değişken Giderler</h3>
              <button
                className="button"
                onClick={() =>
                  setMonthlyVariable((v) => [
                    ...v,
                    { id: uuid(), category: "Market", amount: "" },
                  ])
                }
              >
                + Ekle
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {monthlyVariable.map((item, i) => (
                <React.Fragment key={item.id}>
                  <select
                    className="input"
                    value={item.category}
                    onChange={(e) =>
                      setMonthlyVariable((v) =>
                        v.map((x, idx) =>
                          idx === i ? { ...x, category: e.target.value } : x
                        )
                      )
                    }
                  >
                    {VARIABLE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="number"
                    placeholder="Tutar"
                    value={item.amount ?? ""}
                    onChange={(e) =>
                      setMonthlyVariable((v) =>
                        v.map((x, idx) =>
                          idx === i ? { ...x, amount: e.target.value } : x
                        )
                      )
                    }
                  />
                  <button
                    className="button"
                    onClick={() =>
                      setMonthlyVariable((v) => v.filter((_, idx) => idx !== i))
                    }
                  >
                    ✕
                  </button>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Aylık – Aksiyonlar */}
          <div className="flex justify-end gap-2 mt-6">
            <button className="button button-primary" onClick={calcMonthly}>Hesapla</button>
            {monthlyView && monthlyView.length > 0 && (
              <>
                <button className="button" onClick={exportMonthlyXLSX}>Excel</button>
                <button className="button" onClick={exportMonthlyPDF}>PDF</button>
              </>
            )}
            <button className="button" onClick={clearMonthly}>Sıfırla</button>
          </div>

          {/* AYLIK – sonuç tablosu */}
          {monthlyViewFilled && monthlyViewFilled.length > 0 && (
            <div className="space-y-6">
              {monthlyViewFilled.map((m) => {
                const total = m.rows.reduce((a, r) => a + (+r.tutar || 0), 0);
                return (
                  <div key={m.month} className="card p-5 mt-6">
                    <h3 className="text-lg font-semibold">{formatYM(m.month)} – Aylık Giderler</h3>
                    <div className="overflow-x-auto mt-3">
                      <table className="w-full border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700"><strong>Tip</strong></th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700"><strong>Kategori</strong></th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700"><strong>Başlangıç</strong></th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700"><strong>Bitiş</strong></th>
                            <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700"><strong>Tutar</strong></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-slate-800 text-sm">
                          {m.rows.map((x, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition">
                              <td className="px-4 py-2">{x.tip}</td>
                              <td className="px-4 py-2">{x.kategori}</td>
                              <td className="px-4 py-2">{x.start || ""}</td>
                              <td className="px-4 py-2">{x.end || ""}</td>
                              <td className="px-4 py-2 text-right font-medium">{tl(x.tutar)} ₺</td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 font-semibold">
                            <td className="px-4 py-2" colSpan={4}><strong>Toplam</strong></td>
                            <td className="px-4 py-2 text-right text-indigo-600 font-bold">{tl(total)} ₺</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ================== ZAM SEKME ================== */}
      {tab === "zam" && (
        <div className="card p-5">
          <h1 className="text-3xl font-bold mb-6">Zam Hesaplama</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-500 mb-1">Mevcut Fiyat / Maaş</label>
              <input
                className="input w-full"
                type="number"
                value={zamOld}
                onChange={(e) => setZamOld(e.target.value)}
                placeholder="Örn: 25.000"
                inputMode="decimal"
              />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1">Yeni Fiyat / Maaş</label>
              <input
                className="input w-full"
                type="number"
                value={zamNew}
                onChange={(e) => setZamNew(e.target.value)}
                placeholder="Örn: 28.500"
                inputMode="decimal"
              />
            </div>
          </div>

          {/* Sonuç */}
          <div className="mt-8 text-center">
            {zamPercent === null ? (
              <div className="text-slate-400">Değerleri girince oranı burada göreceksiniz</div>
            ) : (
              <>
                <div className={`text-5xl font-extrabold ${zamPercent >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {zamPercent.toLocaleString("tr-TR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}%
                </div>
                <div className="mt-2 text-slate-600">
                  Fark: {moneyText(zamDiff)} ₺
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end mt-8">
            <button className="button" onClick={clearZam}>Sıfırla</button>
          </div>
        </div>
      )}
      </div>
      </main>
      {/* Footer */}
      <footer className="w-full border-t border-white/15 bg-white/5 backdrop-blur mt-10">
        <div className="container py-10 grid grid-cols-1 md:grid-cols-4 gap-8 text-white/80">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">💳</div>
              <span className="font-semibold text-white">Hesabın Kralı</span>
            </div>
            <p className="text-sm leading-6 text-white/70">
              Kişisel bütçe ve gider planlamasını sade, modern ve hızlı bir deneyimle yap.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Ürün</h4>
            <ul className="space-y-2 text-sm">
              <li><button className="hover:text-white" onClick={() => setTab("plan")}>Aylık Hesaplama</button></li>
              <li><button className="hover:text-white" onClick={() => setTab("aylik")}>Yıllık Hesaplama</button></li>
              <li><button className="hover:text-white" onClick={() => setTab("zam")}>Zam Hesaplama</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Kaynaklar</h4>
            <ul className="space-y-2 text-sm">
              <li><a className="hover:text-white" href="#" rel="noreferrer">Sık Sorulanlar</a></li>
              <li><a className="hover:text-white" href="#" rel="noreferrer">Gizlilik</a></li>
              <li><a className="hover:text-white" href="#" rel="noreferrer">Kullanım Şartları</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Bizi Takip Et</h4>
            <div className="flex items-center gap-3">
              <a href="#" aria-label="Twitter" className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/></svg>
              </a>
              <a href="#" aria-label="GitHub" className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.9-.2.9-.6v-2c-3.3.7-4-1.4-4-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.6 1 1.6 1 .9 1.6 2.5 1.1 3.1.8.1-.7.3-1.1.6-1.4-2.6-.3-5.3-1.3-5.3-5.9 0-1.3.5-2.4 1.2-3.3-.1-.3-.5-1.6.1-3.4 0 0 1-.3 3.4 1.2a11.7 11.7 0 0 1 6.2 0C17.4 6 18.4 6.3 18.4 6.3c.6 1.8.2 3.1.1 3.4.8.9 1.2 2 1.2 3.3 0 4.6-2.7 5.6-5.3 5.9.3.3.6.9.6 1.8v2.7c0 .4.3.7.9.6A12 12 0 0 0 12 .5z"/></svg>
              </a>
              <a href="#" aria-label="LinkedIn" className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 8h5v15H0zM8 8h4.7v2h.1c.7-1.3 2.4-2.6 5-2.6 5.3 0 6.2 3.4 6.2 7.7V23h-5V16c0-1.7 0-3.9-2.4-3.9-2.4 0-2.8 1.8-2.8 3.8V23H8z"/></svg>
              </a>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="container py-4 text-center text-xs text-white/60">
            © {new Date().getFullYear()} Hesabın Kralı. Tüm hakları saklıdır.
          </div>
        </div>
      </footer>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<Planner />);