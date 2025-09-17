import Decimal from "decimal.js";

export type Strategy = "snowball" | "avalanche" | "hybrid";

export interface DebtItem {
  id: string;
  name: string;
  balance: Decimal;
  apr: Decimal;
  minPayment: Decimal;
}

export interface MonthPlanRow {
  debtId: string;
  name: string;
  scheduledPayment: Decimal;
  interestAccrued: Decimal;
  newBalance: Decimal;
}

export interface MonthPlan {
  month: string;
  rows: MonthPlanRow[];
  totalInterest: Decimal;
}

const monthlyRate = (apr: Decimal) => apr.div(12);

export function planOneMonth(args: {
  month: string;
  strategy: Strategy;
  incomes: Decimal[];
  expenses: Decimal[];
  debts: DebtItem[];
}): MonthPlan {
  const { month, strategy, incomes, expenses, debts } = args;

  const incomeSum  = incomes.reduce((a,b)=>a.add(b), new Decimal(0));
  const expenseSum = expenses.reduce((a,b)=>a.add(b), new Decimal(0));
  const minSum     = debts.reduce((a,b)=>a.add(b.minPayment), new Decimal(0));
  const extra      = Decimal.max(incomeSum.sub(expenseSum).sub(minSum), 0);

  const order = debts
    .map((d,i)=>({ i, d }))
    .sort((a,b)=>{
      if (strategy === "avalanche") return b.d.apr.cmp(a.d.apr);
      if (strategy === "snowball")  return a.d.balance.cmp(b.d.balance);
      const byApr = b.d.apr.cmp(a.d.apr);
      if (byApr !== 0) return byApr;
      return a.d.balance.cmp(b.d.balance);
    })
    .map(x=>x.i);

  const extraAlloc = debts.map(()=> new Decimal(0));
  let remaining = extra;
  for (const idx of order) {
    if (remaining.lte(0)) break;
    const give = Decimal.min(remaining, debts[idx].balance);
    extraAlloc[idx] = extraAlloc[idx].add(give);
    remaining = remaining.sub(give);
  }

  const rows = debts.map((d,i)=>{
    const interest  = d.balance.mul(monthlyRate(d.apr));
    const scheduled = d.minPayment.add(extraAlloc[i]);
    const principal = Decimal.max(scheduled.sub(interest), 0);
    const newBal    = Decimal.max(d.balance.sub(principal), 0);
    return { debtId:d.id, name:d.name, scheduledPayment:scheduled, interestAccrued:interest, newBalance:newBal };
  });

  const totalInterest = rows.reduce((a,r)=>a.add(r.interestAccrued), new Decimal(0));
  return { month, rows, totalInterest };
}
