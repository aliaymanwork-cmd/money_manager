import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/advice.js';

function response() {
  return {
    statusCode: 200, headers: {}, payload: undefined,
    setHeader(key, value) { this.headers[key] = value; return this; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.payload = body; return this; }
  };
}
const previous = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  GROQ_API_KEY: process.env.GROQ_API_KEY
};
process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_ANON_KEY = 'test-public-key';
process.env.GROQ_API_KEY = 'test-groq-key';

test('rejects non-POST requests without contacting upstream', async () => {
  const res = response();
  await handler({ method: 'GET', headers: {}, body: {} }, res);
  assert.equal(res.statusCode, 405);
});

test('requires a bearer token', async () => {
  const res = response();
  await handler({ method: 'POST', headers: {}, body: {} }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.headers['Cache-Control'], 'no-store');
});

test('rejects excessively long tokens before any network request', async () => {
  const res = response();
  await handler({ method: 'POST', headers: { authorization: 'Bearer ' + 'a'.repeat(8193) }, body: {} }, res);
  assert.equal(res.statusCode, 400);
});

test('rejects oversized financial snapshots after authentication', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true });
  try {
    const res = response();
    await handler({ method: 'POST', headers: { authorization: 'Bearer test' }, body: {
      summary: { country: 'AE', data: 'x'.repeat(11000) }, question: 'Help'
    } }, res);
    assert.equal(res.statusCode, 413);
  } finally { globalThis.fetch = originalFetch; }
});

test('rejects oversized questions after authentication', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({ ok: true });
  try {
    const res = response();
    await handler({ method: 'POST', headers: { authorization: 'Bearer test' }, body: {
      summary: { country: 'IN' }, question: 'x'.repeat(1501)
    } }, res);
    assert.equal(res.statusCode, 413);
  } finally { globalThis.fetch = originalFetch; }
});

process.on('exit', () => {
  for (const [key, value] of Object.entries(previous)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
