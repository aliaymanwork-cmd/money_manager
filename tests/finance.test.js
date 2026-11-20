import test from 'node:test';
import assert from 'node:assert/strict';
import '../finance.js';
const {debtPayoff,financialPulse,convert} = globalThis.PocketPlanFinance;
test('avalanche and snowball both retire principal',()=>{
  for(const method of ['avalanche','snowball']){
    const p=debtPayoff([{name:'A',balance:12000,rate:18,emi:500},{name:'B',balance:6000,rate:0,emi:250}],300,method);
    assert.ok(p.months>0&&p.months<600);
    assert.ok(p.paid >= 18000);
    assert.equal(p.startingBalance,18000);
    assert.equal(p.monthlyBudget,1050);
  }
});
test('zero debt and non-amortizing debt cannot be misreported',()=>{
  assert.equal(debtPayoff([]).months,0);
  assert.equal(debtPayoff([{balance:10000,rate:30,emi:1}]).months,null);
});
test('extra payments improve or preserve payoff time',()=>{
  const debt=[{name:'Loan',balance:100000,rate:12,emi:4000}];
  assert.ok(debtPayoff(debt,1000).months < debtPayoff(debt,0).months);
});
test('financial pulse reports negative surplus and low runway',()=>{
  const p=financialPulse({income:5000, expenses:4500, emi:1000,cash:500,debts:15000});
  assert.equal(p.surplus,-500);
  assert.ok(p.runway<1);
  assert.ok(p.alerts.length>=2);
});
test('FX conversion requires positive rate',()=>{
  assert.equal(convert(100,'AED','INR',24),2400);
  assert.equal(convert(2400,'INR','AED',24),100);
  assert.throws(()=>convert(100,'AED','INR',0),RangeError);
});
