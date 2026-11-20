/* PocketPlan 2.0 pure finance calculations. No network calls and no personal data storage. */
(function (root) {
  'use strict';
  const num = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const round = value => Math.round((value + Number.EPSILON) * 100) / 100;
  const convert = (amount, from, to, aedInrRate) => {
    const n = num(amount), rate = num(aedInrRate);
    if (from === to) return n;
    if (!(rate > 0) || !['INR','AED'].includes(from) || !['INR','AED'].includes(to)) throw new RangeError('A valid AED/INR exchange rate is required.');
    return from === 'AED' ? n * rate : n / rate;
  };
  function debtPayoff(debts, extra = 0, strategy = 'avalanche') {
    if (!['avalanche', 'snowball'].includes(strategy)) throw new RangeError('Unknown repayment strategy');
    const topup = num(extra);
    if (topup < 0) throw new RangeError('Extra payment cannot be negative');
    const rows = (debts || []).map((item, i) => ({
      name: String(item.name || 'Loan ' + (i + 1)),
      balance: Math.max(0, num(item.balance)),
      rate: Math.max(0, num(item.rate)),
      emi: Math.max(0, num(item.emi)),
      order: i
    })).filter(item => item.balance > 0);
    const startingBalance = round(rows.reduce((sum, item) => sum + item.balance, 0));
    const minimums = rows.reduce((sum, item) => sum + item.emi, 0);
    const monthlyBudget = minimums + topup;
    if (!rows.length) return { months: 0, interest: 0, paid: 0, startingBalance: 0, monthlyBudget: round(monthlyBudget), order: [], timeline: [] };
    if (monthlyBudget <= 0) return { months: null, interest: null, paid: null, startingBalance, monthlyBudget: 0, order: [], timeline: [] };
    const priority = [...rows].sort((a,b) => strategy === 'avalanche' ? b.rate-a.rate || a.balance-b.balance : a.balance-b.balance || b.rate-a.rate);
    const order = priority.map(row => row.name);
    const timeline = [];
    let interest = 0, paid = 0, months = 0;
    for (let month=1; month<=600; month++) {
      const outstanding = rows.filter(x => x.balance > 0.005);
      if (!outstanding.length) break;
      months = month;
      let remaining = monthlyBudget;
      let totalDue = 0;
      for (const item of outstanding) {
        const added = item.balance * item.rate / 1200;
        item.balance += added;
        interest += added;
        totalDue += item.balance;
      }
      for (const item of outstanding) {
        const payment = Math.min(item.emi, item.balance, remaining);
        item.balance = Math.max(0, item.balance-payment);
        remaining -= payment;
        paid += payment;
      }
      for (const item of priority) {
        if (remaining <= 0) break;
        const payment = Math.min(item.balance, remaining);
        item.balance = Math.max(0, item.balance-payment);
        remaining -= payment;
        paid += payment;
      }
      if (month <= 12 || month % 12 === 0) timeline.push({ month, balance: round(rows.reduce((s,x) => s+x.balance,0)) });
      if (rows.every(x => x.balance < 0.005)) return { months, interest: round(interest), paid: round(paid), startingBalance, monthlyBudget: round(monthlyBudget), order, timeline };
    }
    return { months: null, interest: null, paid: null, startingBalance, monthlyBudget: round(monthlyBudget), order, timeline };
  }
  function financialPulse({income=0, expenses=0, emi=0, cash=0, debts=0, borrowed=0, lent=0, investments=0, plannedBills=0}={}) {
    const surplus = round(num(income)-num(expenses)-num(emi));
    const essential = Math.max(0, num(expenses)+num(emi)+num(plannedBills));
    const runway = essential > 0 ? round(Math.max(0,num(cash))/essential) : null;
    const worth = round(num(cash)+num(investments)+num(lent)-num(debts)-num(borrowed));
    const savingsRate = num(income) > 0 ? round(100*surplus/num(income)) : null;
    const incomeNumber=num(income), debtServiceRatio=incomeNumber>0 ? num(emi)/incomeNumber : null;
    const hasData=[income,expenses,emi,cash,debts,borrowed,lent,investments].some(v=>Math.abs(num(v))>0);
    let score=null;
    if(hasData){
      let points=50;
      if(savingsRate!==null)points+=savingsRate>=20?15:savingsRate>=0?5:-20;
      if(runway!==null)points+=runway>=6?20:runway>=3?12:runway>=1?4:-15;
      if(debtServiceRatio!==null)points+=debtServiceRatio>0.4?-15:5;
      points+=worth>=0?5:-10;
      score=Math.max(0,Math.min(100,Math.round(points)));
    }
    const alerts=[];
    if (surplus < 0) alerts.push('Expenses and scheduled minimum repayments exceed recorded income this month.');
    if (essential > 0 && runway < 1) alerts.push('Recorded cash is less than one month of current outflows.');
    if (num(debts)+num(borrowed)>0 && num(emi)>num(income)*0.4 && num(income)>0) alerts.push('Scheduled loan payments exceed 40% of recorded income.');
    return {surplus, runway, netWorth: worth, savingsRate, debtServiceRatio, score, alerts};
  }
  root.PocketPlanFinance = Object.freeze({ convert, debtPayoff, financialPulse });
})(globalThis);
