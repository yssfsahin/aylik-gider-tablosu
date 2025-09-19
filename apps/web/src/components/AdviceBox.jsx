import React from "react";

export default function AdviceBox({ data = [], income = 0 }) {
  const total = Array.isArray(data) ? data.reduce((a, b) => a + (b.value || 0), 0) : 0;
  const incomeSum = Number(income || 0);
  const ratio = incomeSum > 0 ? total / incomeSum : 0;

  let label = "";
  let pillText = "";
  let pillBorder = "";
  if (ratio < 0.25) { label = "Cimrisin Galiba"; pillText = "text-emerald-700"; pillBorder = "border-emerald-300"; }
  else if (ratio < 0.5) { label = "Güzel Harcama"; pillText = "text-sky-700"; pillBorder = "border-sky-300"; }
  else if (ratio < 0.8) { label = "İdeal Harcama"; pillText = "text-indigo-700"; pillBorder = "border-indigo-300"; }
  else { label = "Ocağa İncir Ağacı"; pillText = "text-rose-700"; pillBorder = "border-rose-300"; }

  const byShare = [...(data || [])]
    .map(d => ({ ...d, share: total ? (d.value || 0) / total : 0 }))
    .sort((a, b) => (b.share || 0) - (a.share || 0))
    .slice(0, 3);

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
      <span className={`absolute -top-3 left-4 px-2 py-0.5 text-base font-semibold rounded-md border ${pillBorder} ${pillText} bg-white shadow-sm`}>
        {label}
      </span>

      <p className="text-[0.95rem] leading-7">
        Bu ay gider/gelir oranın <strong>{(ratio * 100).toFixed(1)}%</strong>.{" "}
        {byShare.length > 0 && (
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
}