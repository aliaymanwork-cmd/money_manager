// Vercel serverless function: verifies the Supabase session and asks Gemini.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) return res.status(401).json({ error: 'Please sign in again before using AI Coach.' });
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
    return res.status(500).json({ error: 'Server configuration is missing SUPABASE_URL or SUPABASE_ANON_KEY.' });
  }
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini is not configured. Add GEMINI_API_KEY in Vercel → Settings → Environment Variables, then redeploy.' });
  }

  try {
    const userResponse = await fetch(process.env.SUPABASE_URL.replace(/\/$/, '') + '/auth/v1/user', {
      headers: { Authorization: 'Bearer ' + token, apikey: process.env.SUPABASE_ANON_KEY }
    });
    if (!userResponse.ok) return res.status(401).json({ error: 'Your login session is invalid or expired. Sign in again.' });

    const { summary, question } = req.body || {};
    if (!summary || !['IN', 'AE'].includes(summary.country)) {
      return res.status(400).json({ error: 'Choose Manage India or Manage UAE before asking the AI Coach.' });
    }
    const countryName = summary.country === 'IN' ? 'India' : 'UAE';
    const currencyName = summary.country === 'IN' ? 'Indian rupees (INR)' : 'UAE dirhams (AED)';
    const prompt = `You are a practical personal finance coach. The user is currently in their ${countryName} workspace and all amounts are in ${currencyName}. Answer the user's actual question first and directly. For questions about total balance, use the supplied accounts and balances exactly; do not infer live bank balances or invent missing records. If there are no accounts, say no accounts have been added yet. Do not convert or combine India and UAE finances. Use concise plain language and useful bullet points.

Financial data (JSON): ${JSON.stringify(summary)}

User question: ${String(question || 'Give me the next three practical steps to improve my finances.').slice(0, 2000)}`;

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const apiMessage = payload?.error?.message || `Gemini API returned HTTP ${response.status}.`;
      return res.status(502).json({ error: `Gemini request failed: ${apiMessage}` });
    }
    const answer = payload?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('').trim();
    if (answer) return res.status(200).json({ text: answer });
    if (payload?.promptFeedback?.blockReason) {
      return res.status(502).json({ error: `Gemini blocked this request (${payload.promptFeedback.blockReason}). Try asking in a different way.` });
    }
    return res.status(502).json({ error: 'Gemini returned an empty response. Check your Gemini API key, model access, and API quota in Google AI Studio.' });
  } catch (error) {
    return res.status(500).json({ error: `AI Coach server error: ${error?.message || 'Unknown error'}` });
  }
}
