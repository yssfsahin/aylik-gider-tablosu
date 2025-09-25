import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";

// Fontlar
Font.register({
  family: "Roboto",
  src: "/fonts/Roboto-Regular.ttf",
  format: "truetype",
});
Font.register({
  family: "Roboto Bold",
  src: "/fonts/Roboto-Bold.ttf",
  format: "truetype",
});

// Ortak stiller
const pdfStyles = StyleSheet.create({
  page: { padding: 32, fontFamily: "Roboto" },
  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  brandIcon: { width: 18, height: 18, borderRadius: 4, backgroundColor: "#4f46e5", marginRight: 8 },
  brandTitle: { fontSize: 12, color: "#334155", fontFamily: "Roboto Bold" },
  brandSub: { fontSize: 10, color: "#64748b", marginTop: 2 },
  h1: { fontSize: 16, marginTop: 10, marginBottom: 12, color: "#0f172a", fontFamily: "Roboto Bold" },
  tableHeader: { flexDirection: "row", backgroundColor: "#f1f5f9", borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  th: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, fontSize: 11, color: "#334155", fontFamily: "Roboto Bold" },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e2e8f0", borderBottomStyle: "solid" },
  rowAlt: { backgroundColor: "#f8fafc" },
  td: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, fontSize: 11, color: "#334155", fontFamily: "Roboto" },
  tdRight: { textAlign: "right" },
  totalRow: { flexDirection: "row", backgroundColor: "#eef2ff", borderBottomLeftRadius: 6, borderBottomRightRadius: 6 },
  totalLabel: { flex: 2, paddingVertical: 10, paddingHorizontal: 10, fontSize: 12, fontFamily: "Roboto Bold", color: "#3730a3" },
  totalValue: { flex: 1, paddingVertical: 10, paddingHorizontal: 10, fontSize: 12, fontFamily: "Roboto Bold", textAlign: "right", color: "#4f46e5" },
  footer: { position: "absolute", left: 32, right: 32, bottom: 24, fontSize: 9, color: "#94a3b8", flexDirection: "row", justifyContent: "space-between" },
});

const formatYM = (ym) => {
  if (!ym) return "";
  try {
    const d = new Date(`${ym}-01T00:00:00`);
    const s = d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
    return s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
  } catch { return ym; }
};

const tl = (n) => Number(n || 0).toLocaleString("tr-TR", { maximumFractionDigits: 2 });

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
      <Text key={i} style={[pdfStyles.th, i === headers.length - 1 && pdfStyles.tdRight]}>
        {h}
      </Text>
    ))}
  </View>
);

const SummaryCards = ({ items = [] }) => (
  <View style={{ flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 10 }}>
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
  const total = segments.reduce((a, s) => a + (s.value || 0), 0);
  const safeTotal = total > 0 ? total : 1;

  return (
    <View style={{ marginTop: 8, marginBottom: 22 }}>
      {/* Kalınlaştır + kontrast artır */}
      <View
        style={{
          height: 16,                       // 10 -> 16
          borderRadius: 8,
          overflow: "hidden",
          flexDirection: "row",
          borderWidth: 1,
          borderColor: "#CBD5E1",          // biraz koyu kenar
          backgroundColor: "#E2E8F0",      // arka plan gri, renkler öne çıksın
        }}
      >
        {segments.map((s, i) => (
          <View
            key={i}
            style={{
              flex: (s.value || 0) / safeTotal,
              backgroundColor: s.color || "#6366F1",  // doygun varsayılan
              // segmentler arası ince beyaz ayraç
              borderRightWidth: i < segments.length - 1 ? 1 : 0,
              borderRightColor: "#FFFFFF",
            }}
          />
        ))}
      </View>
      {/* barın hemen altındaki liste */}
      {(() => {
        const maxRows = 4;
        const maxCols = 3;
        const colCount = Math.min(maxCols, Math.ceil(segments.length / maxRows));
        const cols = Array.from({ length: colCount }, (_, c) =>
          segments.slice(c * maxRows, (c + 1) * maxRows)
        );

        return (
          <View style={{ marginTop: 8, flexDirection: "row", gap: 12 }}>
            {cols.map((col, ci) => (
              <View key={ci} style={{ flex: 1, gap: 4 }}>
                {col.map((s, ri) => {
                  const globalIndex = ci * maxRows + ri + 1; // 1., 2., 3. ...
                  return (
                    <View key={ri} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={{ width: 14, fontSize: 10, color: "#475569", textAlign: "right" }}>
                        {globalIndex}.
                      </Text>
                      <View style={{ width: 8, height: 8, borderRadius: 2, backgroundColor: s.color || "#6366F1" }} />
                      <Text style={{ fontSize: 10, color: "#475569" }}>
                        {s.label} — {((s.value / safeTotal) * 100).toFixed(1)}%
                      </Text>
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        );
      })()}
    </View>
  );
};

// ============ Belgeler ============

export function PlanPDFDoc({ month, rows, total, incomeSum = 0, available = 0 }) {
  const palette = [
    "#6366F1", // indigo-500
    "#3B82F6", // blue-500
    "#22C55E", // green-500
    "#EF4444", // red-500
    "#F59E0B", // amber-500
    "#8B5CF6", // violet-500
  ];
  const byCat = rows.reduce((acc, r) => {
    const k = r.kategori || "Diğer";
    acc[k] = (acc[k] || 0) + (+r.tutar || 0);
    return acc;
  }, {});
  const sorted = Object.entries(byCat).sort((a,b)=> b[1]-a[1]);
  const top = sorted.slice(0,5);
  const rest = sorted.slice(5).reduce((a, [,v])=> a+v, 0);
  const segsArr = [...top, ...(rest>0 ? [["Diğer", rest]]:[])].map(([label, value], i)=> ({
    label, value, color: palette[i % palette.length],
  }));

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <BrandHeader subtitle={`Rapor tarihi: ${new Date().toLocaleDateString("tr-TR")}`} />
        <Text style={pdfStyles.h1}>{`${formatYM(month)} – Bu Ay Harcama Özeti`}</Text>

        <SummaryCards items={[
          { label: "Gelir", value: `${tl(incomeSum)} ₺` },
          { label: "Gider", value: `${tl(total)} ₺` },
          { label: "Kullanılabilir", value: `${available >= 0 ? tl(available) : "-" + tl(Math.abs(available))} ₺`, color: available >= 0 ? "#059669" : "#dc2626" },
        ]} />

        {segsArr.length > 0 && (
          <>
            <Text style={{ fontSize: 11, color: "#334155", marginTop: 20, marginBottom: 8, fontFamily: "Roboto Bold" }}>Kategori Dağılımı</Text>
            <DistributionBar segments={segsArr} />
          </>
        )}

        <TableHeader headers={["Tip", "Kategori", "Tutar"]} />
        {rows.map((r, i) => (
          <View key={i} style={[pdfStyles.row, i % 2 === 1 && pdfStyles.rowAlt]}>
            <Text style={pdfStyles.td}>{r.tip}</Text>
            <Text style={pdfStyles.td}>{r.kategori}</Text>
            <Text style={[pdfStyles.td, pdfStyles.tdRight]}>{`${tl(r.tutar)} ₺`}</Text>
          </View>
        ))}
        <View style={pdfStyles.totalRow}>
          <Text style={pdfStyles.totalLabel}>Toplam</Text>
          <Text style={pdfStyles.totalValue}>{`${tl(total)} ₺`}</Text>
        </View>

        <View style={pdfStyles.footer}>
          <Text render={() => `© ${new Date().getFullYear()} Hesabın Kralı`} />
          <Text render={({ pageNumber, totalPages }) => `Sayfa ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export function MonthlyPDFDoc({ month, rows, total, incomeSum = 0 }) {
  const palette = [
  "#6366F1", // indigo-500
  "#3B82F6", // blue-500
  "#22C55E", // green-500
  "#EF4444", // red-500
  "#F59E0B", // amber-500
  "#8B5CF6", // violet-500
];
  const byCat = rows.reduce((acc, r) => {
    const k = r.kategori || "Diğer";
    acc[k] = (acc[k] || 0) + (+r.tutar || 0);
    return acc;
  }, {});
  const sorted = Object.entries(byCat).sort((a,b)=> b[1]-a[1]);
  const top = sorted.slice(0,5);
  const rest = sorted.slice(5).reduce((a, [,v])=> a+v, 0);
  const segsArr = [...top, ...(rest>0 ? [["Diğer", rest]]:[])].map(([label, value], i)=> ({
    label, value, color: palette[i % palette.length],
  }));

  const avail = incomeSum - total;

  return (
    <Document>
      <Page size="A4" style={pdfStyles.page}>
        <BrandHeader subtitle={`Rapor tarihi: ${new Date().toLocaleDateString("tr-TR")}`} />
        <Text style={pdfStyles.h1}>{`${formatYM(month)} – Aylık Giderler`}</Text>

        <SummaryCards items={[
          { label: "Gelir", value: `${tl(incomeSum)} ₺` },
          { label: "Gider", value: `${tl(total)} ₺` },
          { label: "Kullanılabilir", value: `${avail >= 0 ? tl(avail) : "-" + tl(Math.abs(avail))} ₺`, color: avail >= 0 ? "#059669" : "#dc2626" },
        ]} />

        {segsArr.length > 0 && (
          <>
            <Text style={{ fontSize: 11, color: "#334155", marginTop: 6, marginBottom: 4, fontFamily: "Roboto Bold" }}>Kategori Dağılımı</Text>
            <DistributionBar segments={segsArr} />
          </>
        )}

        <View style={pdfStyles.tableHeader}>
          {["Tip", "Kategori", "Başlangıç", "Bitiş", "Tutar"].map((h, hi) => (
            <Text key={hi} style={[pdfStyles.th, hi === 4 && pdfStyles.tdRight]}>{h}</Text>
          ))}
        </View>
        {rows.map((r, i) => (
          <View key={i} style={[pdfStyles.row, i % 2 === 1 && pdfStyles.rowAlt]}>
            <Text style={pdfStyles.td}>{r.tip}</Text>
            <Text style={pdfStyles.td}>{r.kategori}</Text>
            <Text style={pdfStyles.td}>{r.start ? formatYM(r.start) : ""}</Text>
            <Text style={pdfStyles.td}>{r.end ? formatYM(r.end) : ""}</Text>
            <Text style={[pdfStyles.td, pdfStyles.tdRight]}>{`${tl(r.tutar)} ₺`}</Text>
          </View>
        ))}
        <View style={pdfStyles.totalRow}>
          <Text style={pdfStyles.totalLabel}>Toplam</Text>
          <Text style={pdfStyles.totalValue}>{`${tl(total)} ₺`}</Text>
        </View>

        <View style={pdfStyles.footer}>
          <Text render={() => `© ${new Date().getFullYear()} Hesabın Kralı`} />
          <Text render={({ pageNumber, totalPages }) => `Sayfa ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export function YearlyPDFDoc({ months = [] }) {
  // Defensive: normalize, sort by year-month ascending, and ensure array
  const asArray = Array.isArray(months)
    ? months
    : Object.values(months || {});

  const ymToNum = (ym = "") => Number(String(ym).replace("-", ""));
  const sorted = [...asArray].sort((a, b) => ymToNum(a?.month) - ymToNum(b?.month));

  const palette = [
    "#6366F1", // indigo-500
    "#3B82F6", // blue-500
    "#22C55E", // green-500
    "#EF4444", // red-500
    "#F59E0B", // amber-500
    "#8B5CF6", // violet-500
  ];

  const buildSegments = (rows = []) => {
    const byCat = rows.reduce((acc, r) => {
      const k = r.kategori || "Diğer";
      acc[k] = (acc[k] || 0) + (+r.tutar || 0);
      return acc;
    }, {});
    const entries = Object.entries(byCat);
    if (!entries.length) return [];
    const top = entries.sort((a, b) => b[1] - a[1]).slice(0, 5);
    const rest = entries.slice(5).reduce((a, [, v]) => a + v, 0);
    return [...top, ...(rest > 0 ? [["Diğer", rest]] : [])].map(([label, value], i) => ({
      label,
      value,
      color: palette[i % palette.length],
    }));
  };

  return (
    <Document>
      {sorted.map((m, idx) => {
        const rows = m?.rows || [];
        const total = m?.total || 0;
        const incomeSum = m?.incomeSum || 0;
        const segsArr = buildSegments(rows);
        const avail = incomeSum - total;

        return (
          <Page key={(m?.month || "m") + idx} size="A4" style={pdfStyles.page}>
            <BrandHeader subtitle={`Rapor tarihi: ${new Date().toLocaleDateString("tr-TR")}`} />
            <Text style={pdfStyles.h1}>{`${formatYM(m?.month)} – Maliyet Tablosu`}</Text>

            <SummaryCards
              items={[
                { label: "Gelir", value: `${tl(incomeSum)} ₺` },
                { label: "Gider", value: `${tl(total)} ₺` },
                {
                  label: "Kullanılabilir",
                  value: `${avail >= 0 ? tl(avail) : "-" + tl(Math.abs(avail))} ₺`,
                  color: avail >= 0 ? "#059669" : "#dc2626",
                },
              ]}
            />

            {segsArr.length > 0 && (
              <>
                <Text style={{ fontSize: 11, color: "#334155", marginTop: 6, marginBottom: 8, fontFamily: "Roboto Bold" }}>
                  Kategori Dağılımı
                </Text>
                <DistributionBar segments={segsArr} />
              </>
            )}

            <View style={pdfStyles.tableHeader}>
              {['Tip','Kategori','Başlangıç','Bitiş','Tutar'].map((h, i) => (
                <Text key={i} style={[pdfStyles.th, i === 4 && pdfStyles.tdRight]}>{h}</Text>
              ))}
            </View>
            {rows.map((r, i) => (
              <View key={i} style={[pdfStyles.row, i % 2 === 1 && pdfStyles.rowAlt]}>
                <Text style={pdfStyles.td}>{r.tip}</Text>
                <Text style={pdfStyles.td}>{r.kategori}</Text>
                <Text style={pdfStyles.td}>{r.start ? formatYM(r.start) : ""}</Text>
                <Text style={pdfStyles.td}>{r.end ? formatYM(r.end) : ""}</Text>
                <Text style={[pdfStyles.td, pdfStyles.tdRight]}>{`${tl(r.tutar)} ₺`}</Text>
              </View>
            ))}

            <View style={pdfStyles.totalRow}>
              <Text style={pdfStyles.totalLabel}>Toplam</Text>
              <Text style={pdfStyles.totalValue}>{`${tl(total)} ₺`}</Text>
            </View>

            <View style={pdfStyles.footer} wrap={false}>
              <Text render={() => `© ${new Date().getFullYear()} Hesabın Kralı`} />
              <Text render={({ pageNumber, totalPages }) => `Sayfa ${pageNumber} / ${totalPages}`} />
            </View>
          </Page>
        );
      })}
    </Document>
  );
}