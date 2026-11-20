import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');

test('all PocketPlan inline JavaScript blocks parse cleanly',()=>{
  const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(Boolean);
  assert.ok(scripts.length>0,'Application inline JavaScript not found');
  for(const script of scripts)assert.doesNotThrow(()=>new Script(script));
});
test('finance module loads before application inline script',()=>{
  assert.ok(html.includes('src="/finance.js"'));
  assert.ok(html.indexOf('src="/finance.js"')<html.indexOf('const db=supabase.createClient'));
});
test('financial dashboards are present',()=>{
  assert.match(html,/financialPulseCard/);
  assert.match(html,/Debt payoff simulator/);
});
