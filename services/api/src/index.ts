import express from "express";
import cors from "cors";
import { z } from "zod";
import Decimal from "decimal.js";
import { planOneMonth } from "@hys/core";

const app = express();
app.use(cors());
app.use(express.json());

// ---- helpers ----
const ymToNum = (ym: string) => Number((ym || "0000-00").replace("-", ""));
const isActive = (targetYM: string, start?: string, end?: string) => {
  const t = ymToNum(targetYM);
  const s = ymToNum(start || targetYM);
  const e = end ? ymToNum(end) : 999999;
  return t >= s && t <= e;
};
const nextYM = (ym: string) => {
  const [y, m] = ym.split("-").map(Number);
  const m2 = m === 12 ? 1 : m + 1;
  const y2 = m === 12 ? y + 1 : y;
  return `${y2}-${String(m2).padStart(2, "0")}`;
};

// Zod shortcuts
const N = z.coerce.number(); // "123" -> 123, NaN olursa hata
const YM = z.string().regex(/^\d{4}-\d{2}$/); // YYYY-MM

app.get("/health", (_req, res) => res.json({ ok: true }));

// ---------- /plan/preview (tek ay) ----------
app.post("/plan/preview", (req, res) => {
  const schema = z.object({
    month: YM,
    // UI'da strateji yok ama geriye dönük uyum için default tutuyoruz
    strategy: z.enum(["snowball", "avalanche", "hybrid"]).default("hybrid"),
    incomes: z.array(N).default([]),
    expenses: z.array(N).default([]),
    // Borç eklenmemiş olabilir → default []
    debts: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          balance: N,
          apr: N,
          minPayment: N,
        })
      )
      .default([]),
  });

  try {
    const body = schema.parse(req.body);

    // Hiç borç yoksa boş plan dön
    if (!body.debts.length) {
      return res.json({
        month: body.month,
        totalInterest: 0,
        rows: [] as any[],
      });
    }

    const plan = planOneMonth({
      month: body.month,
      strategy: body.strategy,
      incomes: body.incomes.map((n) => new Decimal(n)),
      expenses: body.expenses.map((n) => new Decimal(n)),
      debts: body.debts.map((d) => ({
        ...d,
        balance: new Decimal(d.balance),
        apr: new Decimal(d.apr),
        minPayment: new Decimal(d.minPayment),
      })),
    });

    return res.json({
      month: plan.month,
      totalInterest: plan.totalInterest.toNumber(),
      rows: plan.rows.map((r) => ({
        debtId: r.debtId,
        name: r.name,
        scheduledPayment: r.scheduledPayment.toNumber(),
        interestAccrued: r.interestAccrued.toNumber(),
        newBalance: r.newBalance.toNumber(),
      })),
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error", issues: err.issues });
    }
    console.error(err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// ---------- /plan/forecast (çok ay) ----------
app.post("/plan/forecast", (req, res) => {
  const schema = z.object({
    startMonth: YM,
    strategy: z.enum(["snowball", "avalanche", "hybrid"]).default("hybrid"),
    incomes: z.array(N).default([]),

    // Sabit giderler: aylık tutar + (opsiyonel) başlangıç/bitiş YYYY-MM
    fixedExpenses: z
      .array(
        z.object({
          amount: N,
          start: YM.optional(),
          end: YM.optional(),
        })
      )
      .default([]),

    // v1: değişkenler her ay aynı toplam
    variableMonthly: N.default(0),

    debts: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          balance: N,
          apr: N,
          minPayment: N,
        })
      )
      .default([]),

    maxMonths: z.coerce.number().min(1).max(360).default(120),
  });

  try {
    const body = schema.parse(req.body);

    // Borç yoksa direkt boş program dön
    if (!body.debts.length) {
      return res.json({
        startMonth: body.startMonth,
        endMonth: body.startMonth,
        remaining: 0,
        schedule: [] as any[],
      });
    }

    let month = body.startMonth;
    const incomeSum = body.incomes.reduce((a, b) => a + b, 0);
    let debts = body.debts.map((d) => ({
      ...d,
      balance: new Decimal(d.balance),
      apr: new Decimal(d.apr),
      minPayment: new Decimal(d.minPayment),
    }));

    const schedule: any[] = [];

    for (let i = 0; i < body.maxMonths; i++) {
      const fixedSum = body.fixedExpenses
        .filter((f) => isActive(month, f.start, f.end))
        .reduce((a, f) => a + f.amount, 0);

      const expenses = [fixedSum + body.variableMonthly];

      const plan = planOneMonth({
        month,
        strategy: body.strategy,
        incomes: [new Decimal(incomeSum)],
        expenses: expenses.map((n) => new Decimal(n)),
        debts,
      });

      schedule.push({
        month: plan.month,
        totalInterest: plan.totalInterest.toNumber(),
        rows: plan.rows.map((r) => ({
          debtId: r.debtId,
          name: r.name,
          scheduledPayment: r.scheduledPayment.toNumber(),
          interestAccrued: r.interestAccrued.toNumber(),
          newBalance: r.newBalance.toNumber(),
        })),
      });

      // sonraki aya borç bakiyeleri
      debts = debts.map((d) => {
        const pr = plan.rows.find((r) => r.debtId === d.id)!;
        return { ...d, balance: pr.newBalance };
      });

      // bitti mi?
      if (debts.every((d) => d.balance.lte(0))) break;

      month = nextYM(month);
    }

    const endMonth = schedule.length ? schedule[schedule.length - 1].month : body.startMonth;
    const remaining = debts.reduce((a, d) => a + Math.max(d.balance.toNumber(), 0), 0);

    return res.json({ startMonth: body.startMonth, endMonth, remaining, schedule });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: "validation_error", issues: err.issues });
    }
    console.error(err);
    return res.status(500).json({ error: "internal_error" });
  }
});

// ---- start server (en sonda) ----
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`API on :${PORT}`));