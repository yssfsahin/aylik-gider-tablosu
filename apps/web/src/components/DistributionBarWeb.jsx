import React from "react";
import { tl } from "../lib/utils";

export default function DistributionBarWeb({ data = [] }) {
  const total = data.reduce((a, b) => a + (b.value || 0), 0) || 1;

  return (
    <div>
      <h4 className="text-sm font-semibold text-slate-600 mb-2">Kategori Dağılımı</h4>

      <div className="w-full h-3 rounded-full overflow-hidden border border-slate-200">
        <div className="flex h-full">
          {data.map((d, i) => (
            <div
              key={i}
              className="h-full"
              style={{ width: `${((d.value || 0) / total) * 100}%`, background: d.color }}
              title={`${d.label}: ${(((d.value || 0) / total) * 100).toFixed(1)}%`}
            />
          ))}
        </div>
      </div>

      <ul className="mt-3 space-y-1 text-sm">
        {data.map((d, i) => (
          <li key={i} className="flex items-center gap-2 text-slate-600">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: d.color }} />
            <span className="truncate">
              {d.label} — {(((d.value || 0) / total) * 100).toFixed(1)}% ({tl(d.value)} ₺)
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}