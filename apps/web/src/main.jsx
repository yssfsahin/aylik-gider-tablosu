import React, { useMemo, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import * as XLSX from "xlsx";
import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";

// ================== Yardımcılar ==================
const tl = (n) => Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });
const uuid = () => (crypto.randomUUID?.() || String(Math.random())).slice(0, 12);
const moneyTone = (n) => (n > 0 ? "text-emerald-600" : n < 0 ? "text-rose-600" : "text-slate-900");
const moneyText = (n) => (n < 0 ? `-${tl(Math.abs(n))}` : tl(n));
const ymNum = (ym) => Number((ym || "0000-00").replace("-", ""));
const isActiveInMonth = (targetYM, startYM, endYM) => {
  const t = ymNum(targetYM);
  const s = ymNum(startYM || targetYM);
  const e = endYM ? ymNum(endYM) : 999999;
  return t >= s && t <= e;
};


// ================== PDF Styles & Components (React-PDF) ==================
const pdfStyles = StyleSheet.create({
  page: { padding: 32 },
  h1: { fontSize: 16, marginBottom: 12, color: "#0f172a", fontWeight: "bold" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  th: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, fontSize: 11, color: "#334155", fontWeight: "bold" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", borderBottomStyle: "solid" },
  td: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, fontSize: 11, color: "#334155" },
  tdRight: { textAlign: "right" },
  totalRow: { flexDirection: "row", backgroundColor: "#f8fafc" },
  totalLabel: { flex: 2, paddingVertical: 10, paddingHorizontal: 10, fontSize: 12, fontWeight: "bold" },
  totalValue: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, fontSize: 12, fontWeight: "bold", textAlign: "right", color: "#4f46e5" }
});

const TableHeader = ({ headers = [] }) => (
  <View style={pdfStyles.tableHeader}>
    {headers.map((h, i) => (
      <Text key={i} style={[pdfStyles.th, i === headers.length - 1 && pdfStyles.tdRight]}>{h}</Text>
    ))}
  </View>
);

const TableRows = ({ rows = [] }) => (
  <>
    {rows.map((r, i) => (
      <View key={i} style={pdfStyles.row}>
        <Text style={pdfStyles.td}>{r.tip}</Text>
        <Text style={pdfStyles.td}>{r.kategori}</Text>
        <Text style={[pdfStyles.td, pdfStyles.tdRight]}>{`${tl(r.tutar)} ₺`}</Text>
      </View>
    ))}
  </>
);

const PlanPDFDoc = ({ month, rows, total }) => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.h1}>{`${month} – Bu Ay Harcama Özeti`}</Text>
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
      <Text style={pdfStyles.h1}>{`${month} – Aylık Giderler`}</Text>
      <TableHeader headers={["Tip", "Kategori", "Başlangıç", "Bitiş", "Tutar"]} />
      {rows.map((r, i) => (
        <View key={i} style={pdfStyles.row}>
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
  "Market","Alışveriş","Yeme-İçme","Benzin/Araç","Ulaşım",
  "Eğlence / Sosyal","Sağlık","Hediye / Bağış","Ev Bakımı","Evcil Hayvan","Diğer (Değişken)"
];

// ================== LocalStorage Keys ==================
const LS_PLAN = "hys.plan.v1";
const LS_MONTHLY = "hys.monthly.v1";

// küçük helper
const saveLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const loadLS = (k, fallback) => {
  try { const raw = localStorage.getItem(k); return raw ? JSON.parse(raw) : fallback; } catch { return fallback; }
};

// ================== Ana Bileşen ==================
function Planner() {
  const todayYM = new Date().toISOString().slice(0, 7);

  // ---------- Sekme ----------
  const [tab, setTab] = useState("plan"); // "plan" | "aylik"

  // ---------- PLAN sekmesi state ----------
  const [planMonth, setPlanMonth] = useState(todayYM);
  const [incomes, setIncomes] = useState([]);
  const [planExpenses, setPlanExpenses] = useState([]); // {id, category, amount}

  // ---------- AYLIK sekmesi state ----------
  const [monthlyMonth, setMonthlyMonth] = useState(todayYM);
  const [monthlyFixed, setMonthlyFixed] = useState([]);      // {id, category, amount}
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
      setMonthlyMonth(m.monthlyMonth || todayYM);
      setMonthlyFixed(m.monthlyFixed || []);
      setMonthlyVariable(m.monthlyVariable || []);
    }
  }, []);

  // ---------- LS kaydet ----------
  useEffect(() => {
    saveLS(LS_PLAN, { planMonth, incomes, planExpenses });
  }, [planMonth, incomes, planExpenses]);

  useEffect(() => {
    saveLS(LS_MONTHLY, { monthlyMonth, monthlyFixed, monthlyVariable });
  }, [monthlyMonth, monthlyFixed, monthlyVariable]);

  // ---------- SIFIRLA (cache temizle) ----------
  const clearPlan = () => {
    try { localStorage.removeItem(LS_PLAN); } catch {}
    setPlanMonth(todayYM);
    setIncomes([]);
    setPlanExpenses([]);
    setPlanView(null);
  };

  const clearMonthly = () => {
    try { localStorage.removeItem(LS_MONTHLY); } catch {}
    setMonthlyMonth(todayYM);
    setMonthlyFixed([]);
    setMonthlyVariable([]);
    setMonthlyView(null);
  };

  // ---------- PLAN: kategori listesi (tek gider select'i için) ----------
  const ALL_CATEGORIES = useMemo(
    () => Array.from(new Set([...FIXED_MAIN_CATEGORIES, ...VARIABLE_CATEGORIES])),
    []
  );

  // ---------- PLAN: özet ----------
  const planSummary = useMemo(() => {
    const incomeSum   = incomes.reduce((a,b)=> a + (Number(b)||0), 0);
    const variableSum = planExpenses.reduce((a,e)=> a + (Number(e.amount)||0), 0);
    const fixedSum    = 0; // plan sekmesinde sabit/ay bazlı ayrım yok
    const expenseSum  = variableSum;
    const available   = incomeSum - expenseSum;
    return { incomeSum, fixedSum, variableSum, expenseSum, available };
  }, [incomes, planExpenses]);

  // ---------- PLAN: hesapla (sadece tablo oluştur) ----------
  const [planView, setPlanView] = useState(null);
  const [monthlyView, setMonthlyView] = useState(null);
  const calcPlan = () => {
    const rows = planExpenses.map(e => ({ tip:"Gider", kategori:e.category, tutar:+e.amount||0 }));
    setPlanView({ month: planMonth, monthBreakdown: rows });
  };

  // ---------- AYLIK: özet ----------
const monthlySummary = useMemo(() => {
  const fixed = monthlyFixed
    .filter(e => isActiveInMonth(monthlyMonth, e.start, e.end))
    .reduce((a, e) => a + (Number(e.amount) || 0), 0);
  const variable = monthlyVariable.reduce((a, e) => a + (Number(e.amount) || 0), 0);
  return { total: fixed + variable, fixed, variable };
}, [monthlyFixed, monthlyVariable, monthlyMonth]);

const calcMonthly = () => {
  const rows = [
    ...monthlyFixed
      .filter(e => isActiveInMonth(monthlyMonth, e.start, e.end))
      .map(e => ({
        tip:"Sabit",
        kategori:e.category,
        tutar:+e.amount||0,
        start: e.start || "",
        end: e.end || ""
      })),
    ...monthlyVariable.map(e => ({
      tip:"Değişken",
      kategori:e.category,
      tutar:+e.amount||0,
      start: "",
      end: ""
    })),
  ];
  setMonthlyView({ month: monthlyMonth, rows });
};

  // ================== Exportlar ==================
  const exportPlanXLSX = () => {
    if (!planView) return;
    const wb = XLSX.utils.book_new();
    const rows = planView.monthBreakdown.map(x => ({ Tip:x.tip, Kategori:x.kategori, Tutar:x.tutar }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "BuAy-Harcamalar");
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
    if (!monthlyView) return;
    const wb = XLSX.utils.book_new();
    const rows = monthlyView.rows.map(x => ({
  Tip: x.tip,
  Kategori: x.kategori,
  Başlangıç: x.start || "",
  Bitiş: x.end || "",
  Tutar: x.tutar
}));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), `Giderler-${monthlyView.month}`);
    XLSX.writeFile(wb, `aylik-${monthlyView.month}.xlsx`);
  };
  const exportMonthlyPDF = async () => {
    if (!monthlyView) return;
    try {
      const element = (
        <MonthlyPDFDoc
          month={monthlyView.month}
          rows={monthlyView.rows}
          total={monthlySummary.total}
        />
      );
      const blob = await pdf(element).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `aylik-${monthlyView.month}.pdf`;
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
  const TabButton = ({active, onClick, children}) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg border ${active ? "bg-indigo-600 text-white border-transparent" : "bg-white text-ink border-slate-300 hover:bg-slate-50"}`}
    >
      {children}
    </button>
  );

  return (
    <div className="container">
      {/* Header */}
      <div className="py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-white/10 backdrop-blur ring-1 ring-white/20 flex items-center justify-center">💳</div>
          <div>
            <div className="text-white/80 text-sm">Hesap Yönetim Sistemi</div>
            <h1 className="text-2xl font-semibold">Planlama</h1>
          </div>
        </div>
        <div className="flex gap-2">
          <TabButton active={tab==="plan"} onClick={()=>setTab("plan")}>Plan Hesaplama</TabButton>
          <TabButton active={tab==="aylik"} onClick={()=>setTab("aylik")}>Aylık Hesaplama</TabButton>
        </div>
      </div>

      {/* ================== PLAN SEKME ================== */}
      {tab === "plan" && (
        <div className="card p-5">
          {/* Üst satır */}
          <div className="grid md:grid-cols-5 gap-3 mb-4">
            <input className="input input-month" type="month" value={planMonth} onChange={e=> setPlanMonth(e.target.value)} />
            <button className="button button-primary" onClick={calcPlan}>Planı Hesapla</button>
            {planView && (
              <>
                <button className="button" onClick={exportPlanXLSX}>Excel</button>
                <button className="button" onClick={exportPlanPDF}>PDF</button>
              </>
            )}
            <button className="button" onClick={clearPlan}>Sıfırla</button>
          </div>

          {/* Özet kartları (PLAN) — yalnızca Gelir ve Kullanılabilir */}
          <div className="grid md:grid-cols-2 gap-3">
            <div className="card p-4">
              <div className="text-xs text-slate-500">Gelir</div>
              <div className="text-xl font-semibold">{tl(planSummary.incomeSum)} ₺</div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-slate-500">Bu Ay Kullanılabilir</div>
              <div className={`text-xl font-semibold ${moneyTone(planSummary.available)}`}>{moneyText(planSummary.available)} ₺</div>
            </div>
          </div>

          {/* Gelirler */}
          <div className="card p-4 mt-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Gelirler</h3>
              <button className="button" onClick={()=> setIncomes(v=> [...v, ""])}>+ Ekle</button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {incomes.map((n,i)=>(
                <div key={i} className="flex gap-2">
                  <input className="input flex-1" type="number" value={n ?? ""} onChange={e=> setIncomes(v=> v.map((x,idx)=> idx===i? e.target.value : x))} />
                  <button className="button" onClick={()=> setIncomes(v=> v.filter((_,idx)=> idx!==i))}>✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Giderler (Plan) */}
          <div className="card p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Giderler</h3>
              <button className="button" onClick={() => setPlanExpenses(v => [...v, { id: uuid(), category: "Market", amount: "" }])}>+ Ekle</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {planExpenses.map((item, i) => (
                <React.Fragment key={item.id}>
                  <select
                    className="input"
                    value={item.category}
                    onChange={e => setPlanExpenses(v => v.map((x,idx)=> idx===i ? {...x, category:e.target.value} : x))}
                  >
                    {ALL_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
                    className="input"
                    type="number"
                    placeholder="Tutar"
                    value={item.amount ?? ""}
                    onChange={e => setPlanExpenses(v => v.map((x,idx)=> idx===i ? {...x, amount:e.target.value} : x))}
                  />
                  <button className="button" onClick={() => setPlanExpenses(v => v.filter((_,idx)=> idx!==i))}>✕</button>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* PLAN – sonuç tablosu */}
          {planView && (
            <div className="card p-5 mt-6">
              <h3 className="text-lg font-semibold">{planView.month} – Bu Ay Harcama Özeti</h3>
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
                    {planView.monthBreakdown.map((x, idx) => (
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
                      <td className="px-4 py-2 text-right text-indigo-600 font-bold">{tl(planSummary.expenseSum)} ₺</td>
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
          <div className="grid md:grid-cols-5 gap-3 mb-4">
            <input className="input input-month" type="month" value={monthlyMonth} onChange={e=> setMonthlyMonth(e.target.value)} />
            <button className="button button-primary" onClick={calcMonthly}>Aylığı Hesapla</button>
            {monthlyView && (
              <>
                <button className="button" onClick={exportMonthlyXLSX}>Excel</button>
                <button className="button" onClick={exportMonthlyPDF}>PDF</button>
              </>
            )}
            <button className="button" onClick={clearMonthly}>Sıfırla</button>
          </div>

          {/* Özet kartları */}
          <div className="grid md:grid-cols-4 gap-3 mb-4">
            <div className="card p-4"><div className="text-xs text-slate-500">Gelir</div><div className="text-xl font-semibold">{tl(incomes.reduce((a,b)=>a+(+b||0),0))} ₺</div></div>
            <div className="card p-4"><div className="text-xs text-slate-500">Sabit Giderler</div><div className="text-xl font-semibold">{tl(monthlySummary.fixed)} ₺</div></div>
            <div className="card p-4"><div className="text-xs text-slate-500">Değişken Giderler</div><div className="text-xl font-semibold">{tl(monthlySummary.variable)} ₺</div></div>
            <div className="card p-4">
              <div className="text-xs text-slate-500">Bu Ay Kullanılabilir</div>
              <div className={`text-xl font-semibold ${moneyTone(incomes.reduce((a,b)=>a+(+b||0),0) - monthlySummary.total)}`}>
                {moneyText(incomes.reduce((a,b)=>a+(+b||0),0) - monthlySummary.total)} ₺
              </div>
            </div>
          </div>

          {/* Gelirler (Aylık) */}
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Gelirler</h3>
              <button className="button" onClick={()=> setIncomes(v=> [...v, ""])}>+ Ekle</button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              {incomes.map((n,i)=>(
                <div key={i} className="flex gap-2">
                  <input className="input flex-1" type="number" value={n ?? ""} onChange={e=> setIncomes(v=> v.map((x,idx)=> idx===i? e.target.value : x))} />
                  <button className="button" onClick={()=> setIncomes(v=> v.filter((_,idx)=> idx!==i))}>✕</button>
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
    setMonthlyFixed(v => [
      ...v,
      { id: uuid(), category: "Kira / Aidat", amount: "", start: "", end: "" }
    ])
  }
>
  + Ekle
</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {monthlyFixed.map((item,i)=>(
                <React.Fragment key={item.id}>
                  <select className="input" value={item.category} onChange={e=> setMonthlyFixed(v=> v.map((x,idx)=> idx===i? {...x, category:e.target.value}:x))}>
                    {FIXED_MAIN_CATEGORIES.map(c=> <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input
  className="input"
  type="number"
  placeholder="Tutar"
  value={item.amount ?? ""}
  onChange={e =>
    setMonthlyFixed(v =>
      v.map((x, idx) => (idx === i ? { ...x, amount: e.target.value } : x))
    )
  }
/>

<input
  className="input input-month"
  type="month"
  value={item.start || ""}
  onChange={e =>
    setMonthlyFixed(v =>
      v.map((x, idx) => (idx === i ? { ...x, start: e.target.value } : x))
    )
  }
/>

<input
  className="input input-month"
  type="month"
  value={item.end || ""}
  onChange={e =>
    setMonthlyFixed(v =>
      v.map((x, idx) => (idx === i ? { ...x, end: e.target.value } : x))
    )
  }
/>
                  <button className="button" onClick={()=> setMonthlyFixed(v=> v.filter((_,idx)=> idx!==i))}>✕</button>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* Değişken Giderler (Aylık) */}
          <div className="card p-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Değişken Giderler</h3>
              <button className="button" onClick={()=> setMonthlyVariable(v=> [...v, {id:uuid(), category:"Market", amount:""}])}>+ Ekle</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {monthlyVariable.map((item,i)=>(
                <React.Fragment key={item.id}>
                  <select className="input" value={item.category} onChange={e=> setMonthlyVariable(v=> v.map((x,idx)=> idx===i? {...x, category:e.target.value}:x))}>
                    {VARIABLE_CATEGORIES.map(c=> <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input className="input" type="number" placeholder="Tutar" value={item.amount ?? ""} onChange={e=> setMonthlyVariable(v=> v.map((x,idx)=> idx===i? {...x, amount:e.target.value}:x))}/>
                  <button className="button" onClick={()=> setMonthlyVariable(v=> v.filter((_,idx)=> idx!==i))}>✕</button>
                </React.Fragment>
              ))}
            </div>
          </div>

          {/* AYLIK – sonuç tablosu */}
          {monthlyView && (
            <div className="card p-5 mt-6">
              <h3 className="text-lg font-semibold">{monthlyView.month} – Aylık Giderler</h3>
              <div className="overflow-x-auto mt-3">
                <table className="w-full border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700"><strong>Tip</strong></th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700"><strong>Kategori</strong></th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700"><strong>Tutar</strong></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800 text-sm">
                    {monthlyView.rows.map((x, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition">
                        <td className="px-4 py-2">{x.tip}</td>
                        <td className="px-4 py-2">{x.kategori}</td>
                        <td className="px-4 py-2 text-right font-medium">{tl(x.tutar)} ₺</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold">
                      <td className="px-4 py-2" colSpan={2}><strong>Toplam</strong></td>
                      <td className="px-4 py-2 text-right text-indigo-600 font-bold">{tl(monthlySummary.total)} ₺</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<Planner />);