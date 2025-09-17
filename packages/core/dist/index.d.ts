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
export declare function planOneMonth(args: {
    month: string;
    strategy: Strategy;
    incomes: Decimal[];
    expenses: Decimal[];
    debts: DebtItem[];
}): MonthPlan;
