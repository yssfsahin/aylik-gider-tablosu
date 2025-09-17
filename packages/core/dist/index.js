"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.planOneMonth = planOneMonth;
const decimal_js_1 = __importDefault(require("decimal.js"));
const monthlyRate = (apr) => apr.div(12);
function planOneMonth(args) {
    const { month, strategy, incomes, expenses, debts } = args;
    const incomeSum = incomes.reduce((a, b) => a.add(b), new decimal_js_1.default(0));
    const expenseSum = expenses.reduce((a, b) => a.add(b), new decimal_js_1.default(0));
    const minSum = debts.reduce((a, b) => a.add(b.minPayment), new decimal_js_1.default(0));
    const extra = decimal_js_1.default.max(incomeSum.sub(expenseSum).sub(minSum), 0);
    const order = debts
        .map((d, i) => ({ i, d }))
        .sort((a, b) => {
        if (strategy === "avalanche")
            return b.d.apr.cmp(a.d.apr);
        if (strategy === "snowball")
            return a.d.balance.cmp(b.d.balance);
        const byApr = b.d.apr.cmp(a.d.apr);
        if (byApr !== 0)
            return byApr;
        return a.d.balance.cmp(b.d.balance);
    })
        .map(x => x.i);
    const extraAlloc = debts.map(() => new decimal_js_1.default(0));
    let remaining = extra;
    for (const idx of order) {
        if (remaining.lte(0))
            break;
        const give = decimal_js_1.default.min(remaining, debts[idx].balance);
        extraAlloc[idx] = extraAlloc[idx].add(give);
        remaining = remaining.sub(give);
    }
    const rows = debts.map((d, i) => {
        const interest = d.balance.mul(monthlyRate(d.apr));
        const scheduled = d.minPayment.add(extraAlloc[i]);
        const principal = decimal_js_1.default.max(scheduled.sub(interest), 0);
        const newBal = decimal_js_1.default.max(d.balance.sub(principal), 0);
        return { debtId: d.id, name: d.name, scheduledPayment: scheduled, interestAccrued: interest, newBalance: newBal };
    });
    const totalInterest = rows.reduce((a, r) => a.add(r.interestAccrued), new decimal_js_1.default(0));
    return { month, rows, totalInterest };
}
