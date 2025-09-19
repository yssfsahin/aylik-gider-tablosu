import React from "react";

export default function DonutChart({ data = [], size = 220, stroke = 28, centerText }) {
  const total = data.reduce((a, b) => a + (b.value || 0), 0) || 1;
  const R = (size - stroke) / 2;
  const C = Math.PI * 2 * R;
  let acc = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={R} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
      {data.map((d, i) => {
        const frac = d.value / total;
        const dash = C * frac;
        const gap = C - dash;
        const offset = C * 0.25 - acc; // 12’den başlat
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
      {centerText && (
        <>
          <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" fontSize="18" fontWeight="700" fill="#0f172a">
            {centerText.title}
          </text>
          <text x="50%" y="62%" textAnchor="middle" fontSize="12" fill="#64748b">
            {centerText.subtitle}
          </text>
        </>
      )}
    </svg>
  );
}