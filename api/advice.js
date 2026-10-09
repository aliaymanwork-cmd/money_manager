// Vercel serverless function: checks your Supabase login, then asks Gemini.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const u = await fetch(process.env.SUPABASE_URL + '/auth/v1/user', {
    headers: { Authorization: 'Bearer ' + token, apikey: process.env.SUPABASE_ANON_KEY } });
  if (!u.ok) return res.status(401).json({ error: 'Not signed in' });
  const { summary, question } = req.body || {};
  const prompt = `You are a practical personal finance coach for someone in India (amounts in INR). 
Data (JSON): ${JSON.stringify(summary)}
${question ? 'Question: ' + question : 'Give a monthly plan: budget split, which debt to clear first, and 3 concrete actions.'}
Be concise, use short bullet points, no generic disclaimers.`;
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) });
  const j = await r.json();
  res.json({ text: j?.candidates?.[0]?.content?.parts?.[0]?.text || 'No answer from Gemini.' });
}
