// apps/web/src/main.jsx
import React, { useMemo, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

// UI parçaları
import Header from "./components/Header";
import Footer from "./components/Footer";
import MonthField from "./components/MonthField";
import DonutChart from "./components/DonutChart";
import DistributionBarWeb from "./components/DistributionBarWeb";
import AdviceBox from "./components/AdviceBox";
import LoginModal from "./components/LoginModal";

// PDF dokümanları
import { PlanPDFDoc, MonthlyPDFDoc, YearlyPDFDoc } from "./components/pdf";

// Yardımcılar
import { tl, uuid, moneyTone, moneyText } from "./lib/utils";
import { ymNum, isActiveInMonth, nextYM, formatYM } from "./lib/date";
import { FIXED_MAIN_CATEGORIES, VARIABLE_CATEGORIES } from "./lib/categories";
import { LS_PLAN, LS_MONTHLY } from "./lib/storage";
import usePersistentState from "./hooks/usePersistentState";
import { supabase } from "./lib/supabaseClient";

// Export için
import * as XLSX from "xlsx";
import { pdf } from "@react-pdf/renderer";

function Planner() {
  const todayYM = new Date().toISOString().slice(0, 7);
  const [authOpen, setAuthOpen] = useState(false);

  // ---------- Auth (kullanıcı) ----------
  const [user, setUser] = useState(null);
  useEffect(() => {
    let mounted = true;
    // mevcut kullanıcıyı yükle
    supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      setUser(data?.user ?? null);
    });
    // değişimleri dinle
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleSignOut = async () => {
    try { await supabase.auth.signOut(); } catch (e) { console.error(e); }
  };

  // ---------- Sekme ----------
  const [tab, setTab] = useState("zam"); // "plan" | "aylik" | "zam"

  // ---------- ZAM sekmesi ----------
  const [zamOld, setZamOld] = useState("");
  const [zamNew, setZamNew] = useState("");
  const zamDiff = useMemo(() => Number(zamNew || 0) - Number(zamOld || 0), [zamOld, zamNew]);
  const zamPercent = useMemo(() => {
    const o = Number(zamOld);
    const n = Number(zamNew);
    if (!o && !n) return null;
    if (o <= 0) return null;
    return ((n - o) / o) * 100;
  }, [zamOld, zamNew]);

  // ---------- PLAN sekmesi ----------
  const [planState, setPlanState] = usePersistentState(LS_PLAN, {
    planMonth: todayYM,
    incomes: [],
    planExpenses: [], // {id, category, amount}
  });
  const { planMonth, incomes, planExpenses } = planState;
  const setPlanMonth = (v) =>
    setPlanState((s) => ({ ...s, planMonth: v }));
  const setIncomes = (updater) =>
    setPlanState((s) => ({
      ...s,
      incomes: typeof updater === "function" ? updater(s.incomes) : updater,
    }));
  const setPlanExpenses = (updater) =>
    setPlanState((s) => ({
      ...s,
      planExpenses:
        typeof updater === "function" ? updater(s.planExpenses) : updater,
    }));

  // ---------- AYLIK sekmesi ----------
  const [monthlyState, setMonthlyState] = usePersistentState(LS_MONTHLY, {
    monthlyMonth: "",
    monthlyEndMonth: "",
    monthlyFixed: [],     // {id, category, amount, start, end}
    monthlyVariable: [],  // {id, category, amount, start, end}  // değişken giderler de tarih aralıklı
  });
  const { monthlyMonth, monthlyEndMonth, monthlyFixed, monthlyVariable } = monthlyState;
  const setMonthlyMonth = (v) =>
    setMonthlyState((s) => ({ ...s, monthlyMonth: v }));
  const setMonthlyEndMonth = (v) =>
    setMonthlyState((s) => ({ ...s, monthlyEndMonth: v }));
  const setMonthlyFixed = (updater) =>
    setMonthlyState((s) => ({
      ...s,
      monthlyFixed:
        typeof updater === "function" ? updater(s.monthlyFixed) : updater,
    }));
  const setMonthlyVariable = (updater) =>
    setMonthlyState((s) => ({
      ...s,
      monthlyVariable:
        typeof updater === "function" ? updater(s.monthlyVariable) : updater,
    }));

  // ---------- Aylık kartlar (canlı toplamlar) ----------
  const ymToNum = (ym) => (ym ? parseInt(ym.replace("-", ""), 10) : 0);
  const inRange = (targetYM, startYM, endYM) => {
    if (!targetYM) return false;
    const t = ymToNum(targetYM);
    const s = startYM ? ymToNum(startYM) : -Infinity;
    const e = endYM ? ymToNum(endYM) : Infinity;
    return t >= s && t <= e;
  };

  const monthlyFixedTotal = useMemo(
    () =>
      monthlyFixed
        .filter((e) => inRange(monthlyMonth, e.start, e.end))
        .reduce((a, e) => a + (+e.amount || 0), 0),
    [monthlyFixed, monthlyMonth]
  );

  const monthlyVariableTotal = useMemo(
    () =>
      monthlyVariable
        .filter((e) => inRange(monthlyMonth, e.start, e.end))
        .reduce((a, e) => a + (+e.amount || 0), 0),
    [monthlyVariable, monthlyMonth]
  );

  const monthlyIncomeTotal = useMemo(
    () => incomes.reduce((a, b) => a + (+b || 0), 0),
    [incomes]
  );

  const monthlyAvailable = useMemo(
    () => monthlyIncomeTotal - (monthlyFixedTotal + monthlyVariableTotal),
    [monthlyIncomeTotal, monthlyFixedTotal, monthlyVariableTotal]
  );


  // ---------- SIFIRLA ----------
  const [planView, setPlanView] = useState(null);
  const [monthlyView, setMonthlyView] = useState(null);

  const clearPlan = () => {
    try { localStorage.removeItem(LS_PLAN); } catch {}
    setPlanState({ planMonth: todayYM, incomes: [], planExpenses: [] });
    setPlanView(null);
  };
  const clearMonthly = () => {
    try { localStorage.removeItem(LS_MONTHLY); } catch {}
    setMonthlyState({
      monthlyMonth: "",
      monthlyEndMonth: "",
      monthlyFixed: [],
      monthlyVariable: [],
    });
    // Aylık temizlenince istersen plan gelirlerini de temizleyelim:
    setIncomes([]);
    setMonthlyView(null);
  };
  const clearZam = () => {
    setZamOld("");
    setZamNew("");
  };

  // ---------- PLAN özet ----------
  const ALL_CATEGORIES = useMemo(
    () => Array.from(new Set([...FIXED_MAIN_CATEGORIES, ...VARIABLE_CATEGORIES])),
    []
  );

  const planSummary = useMemo(() => {
    const incomeSum = incomes.reduce((a, b) => a + (Number(b) || 0), 0);
    const variableSum = planExpenses.reduce((a, e) => a + (Number(e.amount) || 0), 0);
    const expenseSum = variableSum;
    const available = incomeSum - expenseSum;
    return { incomeSum, variableSum, expenseSum, available };
  }, [incomes, planExpenses]);

  const calcPlan = () => {
    const rows = planExpenses.map((e) => ({
      tip: "Gider",
      kategori: e.category,
      tutar: +e.amount || 0,
    }));
    setPlanView({ month: planMonth, monthBreakdown: rows });
  };

  // ---------- AYLIK özet ----------
  const monthlySummary = useMemo(() => {
    const fixed = monthlyFixed
      .filter((e) => isActiveInMonth(monthlyMonth, e.start, e.end))
      .reduce((a, e) => a + (Number(e.amount) || 0), 0);
    const variable = monthlyVariable
      .filter((e) => isActiveInMonth(monthlyMonth, e.start, e.end))
      .reduce((a, e) => a + (Number(e.amount) || 0), 0);
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
        ...monthlyVariable
          .filter((e) => isActiveInMonth(cursor, e.start, e.end))
          .map((e) => ({
            tip: "Değişken",
            kategori: e.category,
            tutar: +e.amount || 0,
            start: e.start || "",
            end: e.end || "",
          })),
      ];
      if (rows.length > 0) months.push({ month: cursor, rows });
      cursor = nextYM(cursor);
    }
    setMonthlyView(months);
  };
  const monthlyViewFilled = useMemo(
    () => (monthlyView || []).filter((m) => m.rows && m.rows.length > 0),
    [monthlyView]
  );

  // ---------- EXPORT (Plan) ----------
  const exportPlanXLSX = () => {
    if (!planView) return;
    const wb = XLSX.utils.book_new();
    const rows = planView.monthBreakdown.map((x) => ({
      Tip: x.tip,
      Kategori: x.kategori,
      Tutar: x.tutar,
    }));
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

  // ---------- EXPORT (Aylık) ----------
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
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), `${m.month}`);
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
      // Derle: YearlyPDFDoc'un beklediği months dizisi
      const months = monthlyViewFilled
        .map((m) => {
          const total = m.rows.reduce((a, r) => a + (+r.tutar || 0), 0);
          const incSum = incomes.reduce((a, b) => a + (+b || 0), 0);
          // PDF bileşeninin kullandığı alan adlarıyla hizala
          return {
            month: m.month,
            incomeSum: incSum,
            total,
            rows: (m.rows || []).map((r) => ({
              tip: r.tip,
              kategori: r.kategori,
              start: r.start || "",
              end: r.end || "",
              tutar: +r.tutar || 0,
            })),
          };
        })
        // Güvenli sıralama: "YYYY-MM"
        .sort((a, b) => (a.month || "").localeCompare(b.month || ""));

      // Tek Document, çoklu Page
      const docElement = <YearlyPDFDoc months={months} />;
      const blob = await pdf(docElement).toBlob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const first = months[0].month;
      const last = months[months.length - 1].month;
      a.href = url;
      a.download = months.length === 1 ? `aylik-${first}.pdf` : `aylik-${first}_to_${last}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("React-PDF export failed", e);
      alert("PDF oluşturulamadı.");
    }
  };

  // ---------- UI ----------
  return (
    <div className="flex flex-col min-h-screen">
      <Header
        activeTab={tab}
        onSelectTab={setTab}
        user={user}
        onOpenAuth={() => setAuthOpen(true)}
        onSignOut={handleSignOut}
      />
      <main className="flex-1">
        <div className="container mt-8 sm:mt-10 mb-8">
          {/* PLAN */}
          {tab === "plan" && (
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-3xl font-bold">Hesaplasana</h1>
              </div>

              {/* Özet */}
              <div className="grid md:grid-cols-2 gap-3">
                <div className="card p-4">
                  <div className="text-xs text-slate-500">Gelir</div>
                  <div className="text-xl font-semibold">{tl(planSummary.incomeSum)} ₺</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-slate-500">Bu Ay Kullanılabilir</div>
                  <div className={`text-xl font-semibold ${moneyTone(planSummary.available)}`}>
                    {moneyText(planSummary.available)} ₺
                  </div>
                </div>
              </div>

              {/* Gelirler */}
              <div className="card p-4 mt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Gelirler</h3>
                  <button className="button" onClick={() => setIncomes((v) => [...v, ""])}>
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
                        onChange={(e) => setIncomes((v) => v.map((x, idx) => (idx === i ? e.target.value : x)))}
                      />
                      <button className="button" onClick={() => setIncomes((v) => v.filter((_, idx) => idx !== i))}>
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Giderler */}
              <div className="card p-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Giderler</h3>
                  <button
                    className="button"
                    onClick={() => setPlanExpenses((v) => [...v, { id: uuid(), category: "Market", amount: "" }])}
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
                          setPlanExpenses((v) => v.map((x, idx) => (idx === i ? { ...x, category: e.target.value } : x)))
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
                          setPlanExpenses((v) => v.map((x, idx) => (idx === i ? { ...x, amount: e.target.value } : x)))
                        }
                      />
                      <button className="button" onClick={() => setPlanExpenses((v) => v.filter((_, idx) => idx !== i))}>
                        ✕
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Aksiyonlar */}
              <div className="flex justify-end gap-2 mt-6">
                <button className="button button-primary" onClick={calcPlan}>Hesapla</button>
                <button className="button" onClick={clearPlan}>Sıfırla</button>
              </div>

              {/* Sonuç */}
              {planView && (
                <div className="card p-5 mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">{formatYM(planView.month)} – Bu Ay Harcama Özeti</h3>
                    <div className="flex gap-2">
                      <button className="button" onClick={exportPlanXLSX}>Excel</button>
                      <button className="button" onClick={exportPlanPDF}>PDF</button>
                    </div>
                  </div>

                  {/* Grafik ve Öneri ALanı */}
                  {(() => {
                    const chartData = (planView.monthBreakdown || []).reduce((acc, r) => {
                      const k = r.kategori || "Diğer";
                      acc[k] = (acc[k] || 0) + (+r.tutar || 0);
                      return acc;
                    }, {});
                    const COLORS = ["#4f46e5","#22c55e","#eab308","#ef4444","#06b6d4","#f97316","#a78bfa","#14b8a6","#84cc16","#f43f5e"];
                    const entries = Object.entries(chartData).sort((a,b)=>b[1]-a[1]);
                    const top = entries.slice(0,8);
                    const rest = entries.slice(8).reduce((a, [,v])=>a+v,0);
                    const data = [...top, ...(rest>0?[["Diğer", rest]]:[])]
                      .map(([label, value], i)=>({ label, value, color: COLORS[i % COLORS.length] }));
                    const total = data.reduce((a,b)=>a + (b.value||0), 0);
                    return (
                      <div className="space-y-4 mt-6">
                        <div className="grid md:grid-cols-2 gap-6">
                          <div className="flex items-center justify-center">
                            <DonutChart
                              data={data}
                              size={240}
                              stroke={28}
                              centerText={{ title: `${tl(total)} ₺`, subtitle: "Toplam Gider" }}
                            />
                          </div>
                          <DistributionBarWeb data={data} />
                        </div>
                        <AdviceBox data={data} income={planSummary.incomeSum} />
                      </div>
                    );
                  })()}
                  <div className="overflow-x-auto mt-6">
                    <table className="w-full border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700"><strong>Tip</strong></th>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-slate-700"><strong>Kategori</strong></th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-slate-700"><strong>Tutar</strong></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-800 text-sm">
                        {planView.monthBreakdown.map((x, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition">
                            <td className="px-4 py-2">{x.tip}</td>
                            <td className="px-4 py-2">{x.kategori}</td>
                            <td className="px-4 py-2 text-right font-medium">{tl(x.tutar)} ₺</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-semibold">
                          <td className="px-4 py-2" colSpan={2}><strong>Toplam</strong></td>
                          <td className="px-4 py-2 text-right text-indigo-600 font-bold">{tl(planSummary.expenseSum)} ₺</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* AYLIK */}
          {tab === "aylik" && (
            <div className="card p-5">
              <div className="mb-4">
                <div className="flex items-start justify-between">
                  <h1 className="text-3xl font-bold">Hesaplasana</h1>
                  <div className="hidden md:flex items-center gap-2">
                    <MonthField value={monthlyMonth} onChange={(e) => setMonthlyMonth(e.target.value)} placeholder="Başlangıç" aria="Başlangıç" />
                    <MonthField value={monthlyEndMonth} onChange={(e) => setMonthlyEndMonth(e.target.value)} placeholder="Bitiş" aria="Bitiş" />
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-2 md:hidden">
                  <MonthField value={monthlyMonth} onChange={(e) => setMonthlyMonth(e.target.value)} placeholder="Başlangıç" aria="Başlangıç" />
                  <MonthField value={monthlyEndMonth} onChange={(e) => setMonthlyEndMonth(e.target.value)} placeholder="Bitiş" aria="Bitiş" />
                </div>
              </div>

              {/* Özet */}
              <div className="grid md:grid-cols-4 gap-3 mb-4">
                <div className="card p-4">
                  <div className="text-xs text-slate-500">Gelir</div>
                  <div className="text-xl font-semibold">{tl(monthlyIncomeTotal)} ₺</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-slate-500">Sabit Giderler</div>
                  <div className="text-xl font-semibold">{tl(monthlyFixedTotal)} ₺</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-slate-500">Değişken Giderler</div>
                  <div className="text-xl font-semibold">{tl(monthlyVariableTotal)} ₺</div>
                </div>
                <div className="card p-4">
                  <div className="text-xs text-slate-500">Bu Ay Kullanılabilir</div>
                  <div className={`text-xl font-semibold ${moneyTone(monthlyAvailable)}`}>
                    {moneyText(monthlyAvailable)} ₺
                  </div>
                </div>
              </div>

              {/* Gelirler */}
              <div className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Gelirler</h3>
                  <button className="button" onClick={() => setIncomes((v) => [...v, ""])}>+ Ekle</button>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {incomes.map((n, i) => (
                    <div key={i} className="flex gap-2">
                      <input className="input flex-1" type="number" value={n ?? ""} onChange={(e)=>setIncomes((v)=>v.map((x,idx)=>idx===i? e.target.value: x))}/>
                      <button className="button" onClick={()=>setIncomes((v)=>v.filter((_,idx)=>idx!==i))}>✕</button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sabit Giderler */}
              <div className="card p-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Sabit Giderler</h3>
                  <button
                    className="button"
                    onClick={() => setMonthlyFixed((v)=>[...v,{ id:uuid(), category:"Kira / Aidat", amount:"", start:"", end:"" }])}
                  >+ Ekle</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {monthlyFixed.map((item,i)=>(
                    <React.Fragment key={item.id}>
                      <select className="input" value={item.category} onChange={(e)=>setMonthlyFixed((v)=>v.map((x,idx)=>idx===i? {...x, category:e.target.value}: x))}>
                        {FIXED_MAIN_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                      <input className="input" type="number" placeholder="Tutar" value={item.amount ?? ""} onChange={(e)=>setMonthlyFixed((v)=>v.map((x,idx)=>idx===i? {...x, amount:e.target.value}: x))}/>
                      <MonthField value={item.start || ""} onChange={(e)=>setMonthlyFixed((v)=>v.map((x,idx)=>idx===i? {...x, start:e.target.value}: x))} placeholder="Başlangıç" aria="Başlangıç"/>
                      <MonthField value={item.end || ""} onChange={(e)=>setMonthlyFixed((v)=>v.map((x,idx)=>idx===i? {...x, end:e.target.value}: x))} placeholder="Bitiş" aria="Bitiş"/>
                      <button className="button" onClick={()=>setMonthlyFixed((v)=>v.filter((_,idx)=>idx!==i))}>✕</button>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Değişken Giderler */}
              <div className="card p-4 mt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">Değişken Giderler</h3>
                  <button className="button" onClick={()=>setMonthlyVariable((v)=>[...v,{ id:uuid(), category:"Market", amount:"", start:"", end:"" }])}>+ Ekle</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  {monthlyVariable.map((item,i)=>(
                    <React.Fragment key={item.id}>
                      <select
                        className="input"
                        value={item.category}
                        onChange={(e)=>setMonthlyVariable((v)=>v.map((x,idx)=>idx===i? {...x, category:e.target.value}: x))}
                      >
                        {VARIABLE_CATEGORIES.map(c=><option key={c} value={c}>{c}</option>)}
                      </select>
                      <input
                        className="input"
                        type="number"
                        placeholder="Tutar"
                        value={item.amount ?? ""}
                        onChange={(e)=>setMonthlyVariable((v)=>v.map((x,idx)=>idx===i? {...x, amount:e.target.value}: x))}
                      />
                      <MonthField
                        value={item.start || ""}
                        onChange={(e)=>setMonthlyVariable((v)=>v.map((x,idx)=>idx===i? {...x, start:e.target.value}: x))}
                        placeholder="Başlangıç"
                        aria="Başlangıç"
                      />
                      <MonthField
                        value={item.end || ""}
                        onChange={(e)=>setMonthlyVariable((v)=>v.map((x,idx)=>idx===i? {...x, end:e.target.value}: x))}
                        placeholder="Bitiş"
                        aria="Bitiş"
                      />
                      <button className="button" onClick={()=>setMonthlyVariable((v)=>v.filter((_,idx)=>idx!==i))}>✕</button>
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Aksiyonlar */}
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

              {/* Sonuç listesi */}
              {monthlyViewFilled && monthlyViewFilled.length > 0 && (
                <div className="space-y-6">
                  {monthlyViewFilled.map((m) => {
                    const total = m.rows.reduce((a, r) => a + (+r.tutar || 0), 0);
                    const chartData = m.rows.reduce((acc, r) => {
                      const k = r.kategori || "Diğer";
                      acc[k] = (acc[k] || 0) + (+r.tutar || 0);
                      return acc;
                    }, {});
                    const COLORS = ["#4f46e5","#22c55e","#eab308","#ef4444","#06b6d4","#f97316","#a78bfa","#14b8a6","#84cc16","#f43f5e"];
                    const entries = Object.entries(chartData).sort((a,b)=>b[1]-a[1]);
                    const top = entries.slice(0,8);
                    const rest = entries.slice(8).reduce((a, [,v])=>a+v,0);
                    const data = [...top, ...(rest>0?[["Diğer", rest]]:[])]
                      .map(([label, value], i)=>({ label, value, color: COLORS[i % COLORS.length] }));
                    const incomesSum = incomes.reduce((a,b)=>a+(+b||0),0);

                    return (
                      <div key={m.month} className="card p-5 mt-6">
                        <h3 className="text-lg font-semibold">{formatYM(m.month)} – Aylık Giderler</h3>

                        <div className="space-y-4 mt-3">
                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="flex items-center justify-center">
                              <DonutChart data={data} size={200} stroke={24} centerText={{ title: `${tl(total)} ₺`, subtitle: "Toplam" }}/>
                            </div>
                            <DistributionBarWeb data={data} />
                          </div>
                          <AdviceBox data={data} income={incomesSum} />
                        </div>

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
                                  <td className="px-4 py-2">{x.start ? formatYM(x.start) : ""}</td>
                                  <td className="px-4 py-2">{x.end ? formatYM(x.end) : ""}</td>
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

          {/* ZAM */}
          {tab === "zam" && (
            <div className="card p-5">
              <h1 className="text-3xl font-bold mb-6">Zam Hesaplama</h1>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-500 mb-1">Mevcut Fiyat / Maaş</label>
                  <input className="input w-full" type="number" value={zamOld} onChange={(e)=>setZamOld(e.target.value)} placeholder="Örn: 25.000" inputMode="decimal"/>
                </div>
                <div>
                  <label className="block text-sm text-slate-500 mb-1">Yeni Fiyat / Maaş</label>
                  <input className="input w-full" type="number" value={zamNew} onChange={(e)=>setZamNew(e.target.value)} placeholder="Örn: 28.500" inputMode="decimal"/>
                </div>
              </div>

              <div className="mt-8 text-center">
                {zamPercent === null ? (
                  <div className="text-slate-400">Değerleri girince oranı burada göreceksiniz</div>
                ) : (
                  <>
                    <div className={`text-5xl font-extrabold ${zamPercent >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                      {zamPercent.toLocaleString("tr-TR", { maximumFractionDigits: 2, minimumFractionDigits: 2 })}%
                    </div>
                    <div className="mt-2 text-slate-600">Fark: {moneyText(zamDiff)} ₺</div>
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
      {authOpen && <LoginModal open={authOpen} onClose={() => setAuthOpen(false)} />}
      <Footer onSelectTab={setTab} />
    </div>
  );
}

createRoot(document.getElementById("root")).render(<Planner />);