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
  Font,
  pdf,
} from "@react-pdf/renderer";

/// Google Fonts ile fontu public içine attık. Sonrasında Burada Fontu tanımladık
Font.register({
  family: "Roboto",
  src: "/fonts/Roboto-Regular.ttf", // public klasöründen erişilebilir
  format: "truetype",
});
// İkinci bir font olan Open Sans'ı kaydetme
Font.register({
  family: "Roboto Bold",
  src: "/fonts/Roboto-Bold.ttf",
  format: "truetype",
});

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
  return new Date(y || new Date().getFullYear(), m ? m - 1 : 0, 1);
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

// ---- Donut renkleri (istersen artır) ----
const COLORS = [
  "#4f46e5", "#22c55e", "#eab308", "#ef4444", "#06b6d4",
  "#f97316", "#a78bfa", "#14b8a6", "#84cc16", "#f43f5e"
];

// Kategorileri topla -> [{label, value}]
const groupByKategori = (rows) => {
  const map = new Map();
  rows.forEach(r => {
    const k = r.kategori || "Diğer";
    map.set(k, (map.get(k) || 0) + (+r.tutar || 0));
  });
  return Array.from(map.entries()).map(([label, value]) => ({ label, value }));
};

// Donut için veri: ilk 8 + "Diğer"
const buildChartData = (rows) => {
  const grouped = groupByKategori(rows).sort((a,b) => b.value - a.value);
  const top = grouped.slice(0, 8);
  const restSum = grouped.slice(8).reduce((a,x)=>a+x.value, 0);
  if (restSum > 0) top.push({ label: "Diğer", value: restSum });
  return top.map((d,i)=> ({ ...d, color: COLORS[i % COLORS.length] }));
};

const DonutChart = ({ data = [], size = 220, stroke = 28, centerText }) => {
  const total = data.reduce((a,b)=>a + (b.value||0), 0) || 1;
  const R = (size - stroke) / 2;
  const C = Math.PI * 2 * R;
  let acc = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* arka halka */}
      <circle
        cx={size/2} cy={size/2} r={R}
        fill="none" stroke="#e2e8f0" strokeWidth={stroke}
      />
      {/* dilimler */}
      {data.map((d,i) => {
        const frac = d.value / total;
        const dash = C * frac;
        const gap = C - dash;
        const offset = C * 0.25 - acc; // saat 12'den başlat
        acc += dash;
        return (
          <circle
            key={i}
            cx={size/2} cy={size/2} r={R}
            fill="none"
            stroke={d.color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={offset}
            strokeLinecap="butt"
          />
        );
      })}
      {/* merkez yazısı */}
      {centerText && (
        <>
          <text
            x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
            fontSize="18" fontWeight="700" fill="#0f172a"
          >
            {centerText.title}
          </text>
          <text
            x="50%" y="62%" textAnchor="middle"
            fontSize="12" fill="#64748b"
          >
            {centerText.subtitle}
          </text>
        </>
      )}
    </svg>
  );
};


const Legend = ({ data = [] }) => (
  <ul className="rounded-lg border border-slate-200 divide-y divide-slate-200 overflow-hidden max-h-72 md:max-h-80 overflow-y-auto">
    {data.map((d, i) => (
      <li
        key={i}
        className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50/80 transition"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ background: d.color }}
          />
          <span className="text-sm text-slate-700 truncate max-w-[12rem] sm:max-w-[16rem]">
            {d.label}
          </span>
        </div>
        <div className="text-sm font-medium tabular-nums text-slate-900">
          {tl(d.value)} ₺
        </div>
      </li>
    ))}
  </ul>
);

// ================== DistributionBarWeb ==================
const DistributionBarWeb = ({ data = [] }) => {
  const total = data.reduce((a, b) => a + (b.value || 0), 0) || 1;

  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-600 mb-2">Kategori Dağılımı</h4>

      {/* Stacked bar */}
      <div className="w-full h-3 rounded-full overflow-hidden border border-slate-200">
        <div className="flex h-full">
          {data.map((d, i) => (
            <div
              key={i}
              className="h-full"
              style={{ width: `${((d.value || 0) / total) * 100}%`, background: d.color }}
              title={`${d.label}: ${((d.value || 0) / total * 100).toFixed(1)}%`}
            />
          ))}
        </div>
      </div>

      {/* Legend with percentages */}
      <ul className="mt-3 space-y-1 text-sm">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2 text-slate-600">
            <span
              className="inline-block h-2.5 w-2.5 rounded-sm"
              style={{ background: d.color }}
            />
            <span className="truncate">
              {d.label} — {(((d.value || 0) / total) * 100).toFixed(1)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

// ================== Suggestions Paragraph ==================
const buildAdviceParagraph = (data = []) => {
  if (!data.length) return "";
  const total = data.reduce((a, b) => a + (b.value || 0), 0) || 1;
  // en yüksek ilk 2-3 kategoriyi bul
  const top = [...data].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, 3);

  const tips = {
    "Market": "alışverişi planlı yap ve gereksiz harcamaları azalt",
    "Kira / Aidat": "mümkünse kira/aidat konusunda pazarlık yap ya da alternatif değerlendir",
    "Sigorta": "farklı poliçeleri karşılaştır, teminatı koruyarak uygun fiyat bul",
    "Vergi / MTV": "erken ödeme veya taksit seçeneklerini gözden geçir",
    "Yeme-İçme": "dışarıda yeme sıklığını azalt, evde hazırlık yap",
    "Ulaşım": "toplu taşıma veya ortak yolculukları tercih et",
  };

  const sentences = top.map((c) => {
    const pct = ((c.value || 0) / total) * 100;
    const advice = tips[c.label] || "bu kategoride harcamalarını gözden geçir";
    return `${c.label} (${pct.toFixed(1)}%) için ${advice}`;
  });

  return `Bu ay harcamaların arasında ${sentences.join(", ")} önerilir.`;
};

const SuggestionsParagraph = ({ data = [] }) => {
  const text = buildAdviceParagraph(data);
  if (!text) return null;
  return (
    <div className="mt-4 p-4 rounded-lg border border-slate-200 bg-slate-50 text-sm text-slate-700 leading-6">
      {text}
    </div>
  );
};

// ================== AdviceBox ==================
const AdviceBox = ({ data = [], income = 0 }) => {
  // total spending from data
  const total = Array.isArray(data) ? data.reduce((a, b) => a + (b.value || 0), 0) : 0;
  const incomeSum = Number(income || 0);
  const ratio = incomeSum > 0 ? total / incomeSum : 0;

  // label pill (based on ratio)
  let label = "";
  let pillText = "";
  let pillBorder = "";
  if (ratio < 0.25) {
    label = "Cimrisin Galiba";
    pillText = "text-emerald-700";
    pillBorder = "border-emerald-300";
  } else if (ratio < 0.5) {
    label = "Güzel Harcama";
    pillText = "text-sky-700";
    pillBorder = "border-sky-300";
  } else if (ratio < 0.8) {
    label = "İdeal Harcama";
    pillText = "text-indigo-700";
    pillBorder = "border-indigo-300";
  } else {
    label = "Ocağa İncir Ağacı";
    pillText = "text-rose-700";
    pillBorder = "border-rose-300";
  }

  // find top categories (up to 3) by share
  const byShare = [...(data || [])]
    .map(d => ({ ...d, share: total ? (d.value || 0) / total : 0 }))
    .sort((a, b) => (b.share || 0) - (a.share || 0))
    .slice(0, 3);

  // short per-category tip map
  const tips = {
    "Market": "alışverişi planla ve gereksiz alımları azalt",
    "Kira / Aidat": "mümkünse pazarlık yap ya da alternatif değerlendir",
    "Sigorta": "poliçeleri karşılaştır, teminatı koruyarak uygun fiyat bul",
    "Vergi / MTV": "erken ödeme veya taksit seçeneklerini incele",
    "Yeme-İçme": "dışarıda yemeyi azalt, evde hazırlık yap",
    "Ulaşım": "toplu taşıma veya ortak yolculukları düşün",
  };

  return (
    <div className="relative my-6 p-4 rounded-lg border border-orange-300 bg-orange-50/40 text-slate-700">
      {/* Başlık etiketi (ribbon) */}
      <span className={`absolute -top-3 left-4 px-2 py-0.5 text-base font-semibold rounded-md border ${pillBorder} ${pillText} bg-white shadow-sm`}>
        {label}
      </span>

      {/* Metin: biraz küçük, önemli yerler bold */}
      <p className="text-[0.95rem] leading-7">
        Bu ay gider/gelir oranın <strong>{(ratio * 100).toFixed(1)}%</strong>.{" "}
        {(byShare.length > 0) && (
          <>
            Özellikle{" "}
            {byShare.map((c, i) => (
              <React.Fragment key={i}>
                <strong>{c.label}</strong> (<strong>{(c.share * 100).toFixed(1)}%</strong>)
                {i < byShare.length - 1 ? ", " : " "}
              </React.Fragment>
            ))}
            kalemlerinde dikkatli ol.{" "}
          </>
        )}
        {byShare.map((c, i) => {
          const advice = tips[c.label] || "bu kategoride harcamalarını gözden geçir";
          return (
            <React.Fragment key={`advice-${i}`}>
              {i === 0 ? "" : " "} <strong>{c.label}</strong> için {advice}.
            </React.Fragment>
          );
        })}
      </p>
    </div>
  );
};

// ================== PDF Styles & Components (React-PDF) ==================
/// Tanımladığımız Fontu burda style olarak Fontfamiliy ekledik
const pdfStyles = StyleSheet.create({
  page: { padding: 32, fontFamily: "Roboto" },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  brandIcon: { width: 18, height: 18, borderRadius: 4, backgroundColor: "#4f46e5", marginRight: 8 },
  brandTitle: { fontSize: 12, color: "#334155", fontFamily: "Roboto Bold" },
  brandSub: { fontSize: 10, color: "#64748b", marginTop: 2 },
  h1: { fontSize: 16, marginTop: 10, marginBottom: 12, color: "#0f172a", fontFamily: "Roboto Bold" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", borderTopLeftRadius: 6, borderTopRightRadius: 6, fontFamily: "Roboto" },
  th: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, fontSize: 11, color: "#334155", fontWeight: "bold", fontFamily: "Roboto" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", borderBottomStyle: "solid", fontFamily: "Roboto" },
  rowAlt: { backgroundColor: "#f8fafc" },
  td: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, fontSize: 11, color: "#334155", fontFamily: "Roboto" },
  tdRight: { textAlign: "right" },
  totalRow: { flexDirection: "row", backgroundColor: "#eef2ff", borderBottomLeftRadius: 6, borderBottomRightRadius: 6 },
  totalLabel: { flex: 2, paddingVertical: 10, paddingHorizontal: 10, fontSize: 12, fontFamily: "Roboto Bold", color: "#3730a3" },
  totalValue: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, fontSize: 12, fontFamily: "Roboto Bold", textAlign: "right", color: "#4f46e5" },
  footer: { position: "absolute", left: 32, right: 32, bottom: 24, fontSize: 9, color: "#94a3b8", flexDirection: "row", justifyContent: "space-between" }
});

const BrandHeader = ({ subtitle }) => (
  <View>
    <View style={pdfStyles.brandRow}>
      <View style={pdfStyles.brandIcon} />
      <View>
        <Text style={pdfStyles.brandTitle}>Hesabın Kralı</Text>
        {subtitle ? <Text style={pdfStyles.brandSub}>{subtitle}</Text> : null}
      </View>
    </View>
  </View>
);

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
      <View key={i} style={[pdfStyles.row, i % 2 === 1 && pdfStyles.rowAlt]}>
        <Text style={pdfStyles.td}>{r.tip}</Text>
        <Text style={pdfStyles.td}>{r.kategori}</Text>
        <Text style={[pdfStyles.td, pdfStyles.tdRight]}>{`${tl(r.tutar)} ₺`}</Text>
      </View>
    ))}
  </>
);

const SummaryCards = ({ items = [] }) => (
  <View style={{ flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 8 }}>
    {items.map((it, idx) => (
      <View
        key={idx}
        style={{
          flex: 1,
          paddingVertical: 10,
          paddingHorizontal: 12,
          backgroundColor: "#f8fafc",
          borderWidth: 1,
          borderColor: "#e2e8f0",
          borderRadius: 8,
        }}
      >
        <Text style={{ fontSize: 10, color: "#64748b", marginBottom: 4 }}>{it.label}</Text>
        <Text style={{ fontSize: 14, fontFamily: "Roboto Bold", color: it.color || "#0f172a" }}>
          {it.value}
        </Text>
      </View>
    ))}
  </View>
);

const DistributionBar = ({ segments = [] }) => {
  // segments: [{ label, value, color, percent }]
  const total = segments.reduce((a, s) => a + (s.value || 0), 0) || 1;
  return (
    <View style={{ marginTop: 6, marginBottom: 20 }}>
      <View style={{ height: 10, borderRadius: 6, overflow: "hidden", flexDirection: "row", borderWidth: 1, borderColor: "#e2e8f0" }}>
        {segments.map((s, i) => (
          <View
            key={i}
            style={{
              flex: (s.value || 0) / total,
              backgroundColor: s.color || "#c7d2fe",
            }}
          />
        ))}
      </View>
      <View style={{ marginTop: 6, flexDirection: "column", gap: 4 }}>
        {segments.map((s, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: s.color || "#c7d2fe" }} />
            <Text style={{ fontSize: 10, color: "#475569" }}>
              {s.label} — {((s.value / total) * 100).toFixed(1)}%
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const PlanPDFDoc = ({ month, rows, total, incomeSum = 0, available = 0 }) => {
  // kategori dağılımı (ilk 5 + Diğer)
  const palette = ["#a5b4fc","#93c5fd","#86efac","#fca5a5","#fcd34d","#cbd5e1"];
  const byCat = rows.reduce((acc, r) => {
    const k = r.kategori || "Diğer";
    acc[k] = (acc[k] || 0) + (+r.tutar || 0);
    return acc;
  }, {});
  const sorted = Object.entries(byCat).sort((a,b)=> b[1]-a[1]);
  const top = sorted.slice(0,5);
  const rest = sorted.slice(5).reduce((a, [,v])=> a+v, 0);
  const segsArr = [...top, ...(rest>0 ? [["Diğer", rest]]:[])].map(([label, value], i)=> ({
    label,
    value,
    color: palette[i % palette.length],
  }));

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <BrandHeader subtitle={`Rapor tarihi: ${new Date().toLocaleDateString("tr-TR")}`} />
        <Text style={pdfStyles.h1}>{`${formatYM(month)} – Bu Ay Harcama Özeti`}</Text>

        {/* Özet kartları */}
        <SummaryCards
          items={[
            { label: "Gelir", value: `${tl(incomeSum)} ₺` },
            { label: "Gider", value: `${tl(total)} ₺` },
            { label: "Kullanılabilir", value: `${available >= 0 ? tl(available) : "-" + tl(Math.abs(available))} ₺`, color: available >= 0 ? "#059669" : "#dc2626" },
          ]}
        />

        {/* Kategori dağılımı mini bar */}
        {segsArr.length > 0 && (
          <>
            <Text style={{ fontSize: 11, color: "#334155", marginTop: 20, marginBottom: 8, fontFamily: "Roboto Bold" }}>Kategori Dağılımı</Text>
            <DistributionBar segments={segsArr} />
          </>
        )}

        <TableHeader headers={["Tip", "Kategori", "Tutar"]} />
        <TableRows rows={rows} />
        <View style={pdfStyles.totalRow}>
          <Text style={pdfStyles.totalLabel}>Toplam</Text>
          <Text style={pdfStyles.totalValue}>{`${tl(total)} ₺`}</Text>
        </View>
        <View style={pdfStyles.footer}>
          <Text render={({ pageNumber, totalPages }) => `© ${new Date().getFullYear()} Hesabın Kralı`} />
          <Text render={({ pageNumber, totalPages }) => `Sayfa ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
};

const MonthlyPDFDoc = ({ month, rows, total }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <BrandHeader subtitle={`Rapor tarihi: ${new Date().toLocaleDateString("tr-TR")}`} />
      <Text style={pdfStyles.h1}>{`${formatYM(month)} – Aylık Giderler`}</Text>
      <TableHeader headers={["Tip", "Kategori", "Başlangıç", "Bitiş", "Tutar"]} />
      {rows.map((r, i) => (
        <View key={i} style={[pdfStyles.row, i % 2 === 1 && pdfStyles.rowAlt]}>
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
      <View style={pdfStyles.footer}>
        <Text render={({ pageNumber, totalPages }) => `© ${new Date().getFullYear()} Hesabın Kralı`} />
        <Text render={({ pageNumber, totalPages }) => `Sayfa ${pageNumber} / ${totalPages}`} />
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

  const zamDiff = useMemo(
    () => Number(zamNew || 0) - Number(zamOld || 0),
    [zamOld, zamNew]
  );
  const zamPercent = useMemo(() => {
    const o = Number(zamOld);
    const n = Number(zamNew);
    if (!o && !n) return null; // boşken gösterme
    if (o <= 0) return null; // 0'a bölme koruması
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
      setMonthlyEndMonth(m.monthlyEndMonth || m.monthlyMonth || "");
      setMonthlyFixed(m.monthlyFixed || []);
      setMonthlyVariable(m.monthlyVariable || []);
    }
  }, []);

  // ---------- LS kaydet ----------
  useEffect(() => {
    saveLS(LS_PLAN, { planMonth, incomes, planExpenses });
  }, [planMonth, incomes, planExpenses]);

  useEffect(() => {
    saveLS(LS_MONTHLY, {
      monthlyMonth,
      monthlyEndMonth,
      monthlyFixed,
      monthlyVariable,
    });
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
          incomeSum={planSummary.incomeSum}
          available={planSummary.available}
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
        : `aylik-${monthlyViewFilled[0].month}_to_${
            monthlyViewFilled[monthlyViewFilled.length - 1].month
          }.xlsx`;
    XLSX.writeFile(wb, fileName);
  };
  const exportMonthlyPDF = async () => {
    if (!monthlyViewFilled || monthlyViewFilled.length === 0) return;
    try {
      const element = (
        <Document>
          {monthlyViewFilled.map((m, i) => {
            const total = m.rows.reduce((a, r) => a + (+r.tutar || 0), 0);
            const incSum = incomes.reduce((a, b) => a + (+b || 0), 0);

            // kategori dağılımı (ilk 5 + Diğer)
            const palette = ["#a5b4fc","#93c5fd","#86efac","#fca5a5","#fcd34d","#cbd5e1"];
            const byCat = m.rows.reduce((acc, r) => {
              const k = r.kategori || "Diğer";
              acc[k] = (acc[k] || 0) + (+r.tutar || 0);
              return acc;
            }, {});
            const sorted = Object.entries(byCat).sort((a,b)=> b[1]-a[1]);
            const top = sorted.slice(0,5);
            const rest = sorted.slice(5).reduce((a, [,v])=> a+v, 0);
            const segsArr = [...top, ...(rest>0 ? [["Diğer", rest]]:[])].map(([label, value], idx)=> ({
              label,
              value,
              color: palette[idx % palette.length],
            }));

            const avail = incSum - total;

            return (
              <Page key={i} size="A4" style={pdfStyles.page}>
                <BrandHeader subtitle={`Rapor tarihi: ${new Date().toLocaleDateString("tr-TR")}`} />
                <Text style={pdfStyles.h1}>{`${formatYM(m.month)} – Aylık Giderler`}</Text>

                <SummaryCards
                  items={[
                    { label: "Gelir", value: `${tl(incSum)} ₺` },
                    { label: "Gider", value: `${tl(total)} ₺` },
                    { label: "Kullanılabilir", value: `${avail >= 0 ? tl(avail) : "-" + tl(Math.abs(avail))} ₺`, color: avail >= 0 ? "#059669" : "#dc2626" },
                  ]}
                />

                {segsArr.length > 0 && (
                  <>
                    <Text style={{ fontSize: 11, color: "#334155", marginTop: 6, marginBottom: 4, fontFamily: "Roboto Bold" }}>Kategori Dağılımı</Text>
                    <DistributionBar segments={segsArr} />
                  </>
                )}

                <View style={pdfStyles.tableHeader}>
                  {["Tip", "Kategori", "Başlangıç", "Bitiş", "Tutar"].map(
                    (h, hi) => (
                      <Text
                        key={hi}
                        style={[pdfStyles.th, hi === 4 && pdfStyles.tdRight]}
                      >
                        {h}
                      </Text>
                    )
                  )}
                </View>
                {m.rows.map((r, ri) => (
                  <View key={ri} style={[pdfStyles.row, ri % 2 === 1 && pdfStyles.rowAlt]}>
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
                <View style={pdfStyles.footer}>
                  <Text render={({ pageNumber, totalPages }) => `© ${new Date().getFullYear()} Hesabın Kralı`} />
                  <Text render={({ pageNumber, totalPages }) => `Sayfa ${pageNumber} / ${totalPages}`} />
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
      a.download =
        monthlyViewFilled.length === 1
          ? `aylik-${first}.pdf`
          : `aylik-${first}_to_${last}.pdf`;
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
            <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
              💳
            </div>
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
            <svg
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
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
                <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                  💳
                </div>
                <span className="font-semibold">Hesabın Kralı</span>
              </div>
              <button
                className="rounded-md p-2 hover:bg-white/10"
                onClick={() => setMobileOpen(false)}
                aria-label="Kapat"
              >
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <button
              className={`w-full text-left px-3 py-2 rounded-md ${
                tab === "plan" ? "bg-indigo-600" : "hover:bg-white/10"
              }`}
              onClick={() => {
                setTab("plan");
                setMobileOpen(false);
              }}
            >
              Aylık Hesaplama
            </button>
            <button
              className={`w-full text-left px-3 py-2 rounded-md ${
                tab === "aylik" ? "bg-indigo-600" : "hover:bg-white/10"
              }`}
              onClick={() => {
                setTab("aylik");
                setMobileOpen(false);
              }}
            >
              Yıllık Hesaplama
            </button>
            <button
              className={`w-full text-left px-3 py-2 rounded-md ${
                tab === "zam" ? "bg-indigo-600" : "hover:bg-white/10"
              }`}
              onClick={() => {
                setTab("zam");
                setMobileOpen(false);
              }}
            >
              Zam Hesaplama
            </button>
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
                  <div className="text-xs text-slate-500">
                    Bu Ay Kullanılabilir
                  </div>
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
                          setPlanExpenses((v) =>
                            v.filter((_, idx) => idx !== i)
                          )
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
                <button className="button button-primary" onClick={calcPlan}>
                  Hesapla
                </button>
                <button className="button" onClick={clearPlan}>
                  Sıfırla
                </button>
              </div>

              {/* PLAN – sonuç tablosu */}
              {planView && (
                <div className="card p-5 mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">
                      {formatYM(planView.month)} – Bu Ay Harcama Özeti
                    </h3>
                    <div className="flex gap-2">
                      <button className="button" onClick={exportPlanXLSX}>
                        Excel
                      </button>
                      <button className="button" onClick={exportPlanPDF}>
                        PDF
                      </button>
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
                          <tr
                            key={idx}
                            className="hover:bg-slate-50 transition"
                          >
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
                  {/* Harcamaların dağılımı (PLAN) */}
                  {(() => {
                    const chartData = buildChartData(planView.monthBreakdown || []);
                    const total = chartData.reduce((a, b) => a + b.value, 0);
                    return (
                      <div className="space-y-4 mt-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="flex items-center justify-center">
                            <DonutChart
                              data={chartData}
                              size={240}
                              stroke={28}
                              centerText={{
                                title: `${tl(total)} ₺`,
                                subtitle: "Toplam Gider"
                              }}
                            />
                          </div>
                          <DistributionBarWeb data={chartData} />
                        </div>
                        <AdviceBox data={chartData} income={planSummary.incomeSum} />
                      </div>
                    );
                  })()}
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
                  <div className="text-xs text-slate-500">
                    Değişken Giderler
                  </div>
                  <div className="text-xl font-semibold">
                    {tl(monthlySummary.variable)} ₺
                  </div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-slate-500">
                    Bu Ay Kullanılabilir
                  </div>
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
                          setMonthlyFixed((v) =>
                            v.filter((_, idx) => idx !== i)
                          )
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
                          setMonthlyVariable((v) =>
                            v.filter((_, idx) => idx !== i)
                          )
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
                <button className="button button-primary" onClick={calcMonthly}>
                  Hesapla
                </button>
                {monthlyView && monthlyView.length > 0 && (
                  <>
                    <button className="button" onClick={exportMonthlyXLSX}>
                      Excel
                    </button>
                    <button className="button" onClick={exportMonthlyPDF}>
                      PDF
                    </button>
                  </>
                )}
                <button className="button" onClick={clearMonthly}>
                  Sıfırla
                </button>
              </div>

              {/* AYLIK – sonuç tablosu */}
              {monthlyViewFilled && monthlyViewFilled.length > 0 && (
                <div className="space-y-6">
                  {monthlyViewFilled.map((m) => {
                    const total = m.rows.reduce(
                      (a, r) => a + (+r.tutar || 0),
                      0
                    );
                    return (
                      <div key={m.month} className="card p-5 mt-6">
                        <h3 className="text-lg font-semibold">
                          {formatYM(m.month)} – Aylık Giderler
                        </h3>
                        {/* Mini dağılım (AYLIK kart) */}
                        {(() => {
                          const chartData = buildChartData(m.rows || []);
                          const total = chartData.reduce((a, b) => a + b.value, 0);
                          return (
                            <div className="space-y-4 mt-3">
                              <div className="grid md:grid-cols-2 gap-6">
                                <div className="flex items-center justify-center">
                                  <DonutChart
                                    data={chartData}
                                    size={200}
                                    stroke={24}
                                    centerText={{ title: `${tl(total)} ₺`, subtitle: "Toplam" }}
                                  />
                                </div>
                                <DistributionBarWeb data={chartData} />
                              </div>
                              <AdviceBox data={chartData} income={incomes.reduce((a, b) => a + (+b || 0), 0)} />
                            </div>
                          );
                        })()}
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
                                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                  <strong>Başlangıç</strong>
                                </th>
                                <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700">
                                  <strong>Bitiş</strong>
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700">
                                  <strong>Tutar</strong>
                                </th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-slate-800 text-sm">
                              {m.rows.map((x, idx) => (
                                <tr
                                  key={idx}
                                  className="hover:bg-slate-50 transition"
                                >
                                  <td className="px-4 py-2">{x.tip}</td>
                                  <td className="px-4 py-2">{x.kategori}</td>
                                  <td className="px-4 py-2">{x.start || ""}</td>
                                  <td className="px-4 py-2">{x.end || ""}</td>
                                  <td className="px-4 py-2 text-right font-medium">
                                    {tl(x.tutar)} ₺
                                  </td>
                                </tr>
                              ))}
                              <tr className="bg-slate-50 font-semibold">
                                <td className="px-4 py-2" colSpan={4}>
                                  <strong>Toplam</strong>
                                </td>
                                <td className="px-4 py-2 text-right text-indigo-600 font-bold">
                                  {tl(total)} ₺
                                </td>
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
                  <label className="block text-sm text-slate-500 mb-1">
                    Mevcut Fiyat / Maaş
                  </label>
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
                  <label className="block text-sm text-slate-500 mb-1">
                    Yeni Fiyat / Maaş
                  </label>
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
                  <div className="text-slate-400">
                    Değerleri girince oranı burada göreceksiniz
                  </div>
                ) : (
                  <>
                    <div
                      className={`text-5xl font-extrabold ${
                        zamPercent >= 0 ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {zamPercent.toLocaleString("tr-TR", {
                        maximumFractionDigits: 2,
                        minimumFractionDigits: 2,
                      })}
                      %
                    </div>
                    <div className="mt-2 text-slate-600">
                      Fark: {moneyText(zamDiff)} ₺
                    </div>
                  </>
                )}
              </div>

              <div className="flex justify-end mt-8">
                <button className="button" onClick={clearZam}>
                  Sıfırla
                </button>
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
              <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                💳
              </div>
              <span className="font-semibold text-white">Hesabın Kralı</span>
            </div>
            <p className="text-sm leading-6 text-white/70">
              Kişisel bütçe ve gider planlamasını sade, modern ve hızlı bir
              deneyimle yap.
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Ürün</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  className="hover:text-white"
                  onClick={() => setTab("plan")}
                >
                  Aylık Hesaplama
                </button>
              </li>
              <li>
                <button
                  className="hover:text-white"
                  onClick={() => setTab("aylik")}
                >
                  Yıllık Hesaplama
                </button>
              </li>
              <li>
                <button
                  className="hover:text-white"
                  onClick={() => setTab("zam")}
                >
                  Zam Hesaplama
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">Kaynaklar</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a className="hover:text-white" href="#" rel="noreferrer">
                  Sık Sorulanlar
                </a>
              </li>
              <li>
                <a className="hover:text-white" href="#" rel="noreferrer">
                  Gizlilik
                </a>
              </li>
              <li>
                <a className="hover:text-white" href="#" rel="noreferrer">
                  Kullanım Şartları
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-white mb-3">
              Bizi Takip Et
            </h4>
            <div className="flex items-center gap-3">
              <a
                href="#"
                aria-label="Twitter"
                className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="GitHub"
                className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 .5a12 12 0 0 0-3.8 23.4c.6.1.9-.2.9-.6v-2c-3.3.7-4-1.4-4-1.4-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.6 1 1.6 1 .9 1.6 2.5 1.1 3.1.8.1-.7.3-1.1.6-1.4-2.6-.3-5.3-1.3-5.3-5.9 0-1.3.5-2.4 1.2-3.3-.1-.3-.5-1.6.1-3.4 0 0 1-.3 3.4 1.2a11.7 11.7 0 0 1 6.2 0C17.4 6 18.4 6.3 18.4 6.3c.6 1.8.2 3.1.1 3.4.8.9 1.2 2 1.2 3.3 0 4.6-2.7 5.6-5.3 5.9.3.3.6.9.6 1.8v2.7c0 .4.3.7.9.6A12 12 0 0 0 12 .5z" />
                </svg>
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="p-2 rounded-lg hover:bg-white/10 text-white/80 hover:text-white"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M4.98 3.5C4.98 4.88 3.86 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1s2.48 1.12 2.48 2.5zM0 8h5v15H0zM8 8h4.7v2h.1c.7-1.3 2.4-2.6 5-2.6 5.3 0 6.2 3.4 6.2 7.7V23h-5V16c0-1.7 0-3.9-2.4-3.9-2.4 0-2.8 1.8-2.8 3.8V23H8z" />
                </svg>
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
