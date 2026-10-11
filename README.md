# PocketPlan — Personal Finance Planner

A responsive personal finance web app with separate India (INR) and UAE (AED) workspaces. Built with vanilla HTML/CSS/JavaScript, Supabase Auth/Postgres, Vercel serverless functions, and Google Gemini AI.

## Features

- Password-protected sign-in using Supabase Auth; row-level security for user-owned data.
- India and UAE workspaces kept separate.
- Income, expenses, borrowed money, account-linked transactions, and CSV export.
- Person-wise borrowed-money tracking with partial/full settlements and history.
- Loans/EMIs, payoff estimates, payments, due dates, reminders, and repeating weekly/monthly/yearly reminders.
- Monthly category budgets with 70%, 90%, and over-budget indicators.
- Bank/cash accounts and balances.
- Financial planning page with tracked net worth, manual assets/investments, savings goals, progress bars, and a simple 30-day cash-flow estimate.
- Six-month income/expense trend, print/save-as-PDF, and quick transaction voice entry on supported browsers.
- Gemini AI Coach uses the selected workspace's saved financial snapshot for advice. API key remains server-side.
- Responsive mobile layout and installable PWA shell.

## 1. Create the Supabase project

1. Create a project at https://supabase.com.
2. Open **SQL Editor**, paste the complete `schema.sql`, and run it. This creates/updates the tables, indexes, and row-level security policies, including `goals` and `assets`.
3. Under **Authentication → Users**, create your own user. For a private single-user app, turn off public sign-ups in **Authentication → Sign In / Providers**.
4. In **Project Settings → API**, copy the Project URL and anon/public key.

> If you already have data in an older version, back up your database first, then run the full updated `schema.sql`. Existing records are retained; old entries default to the India workspace unless their currency is AED.

## 2. Configure the frontend

Edit `config.js` and replace the placeholders:

```js
window.CONFIG = {
  SUPABASE_URL: 'https://YOUR_PROJECT.supabase.co',
  SUPABASE_ANON_KEY: 'YOUR_SUPABASE_ANON_KEY'
};
```

The Supabase anon key is intended for browser use with correct RLS policies. Never put a Supabase service-role key in this file.

## 3. Configure Google Gemini AI

1. Create an API key in Google AI Studio: https://aistudio.google.com/app/apikey
2. In your Vercel project, open **Settings → Environment Variables** and add:
   - `GEMINI_API_KEY` = your Google Gemini API key
   - `SUPABASE_URL` = the same Supabase project URL
   - `SUPABASE_ANON_KEY` = the same Supabase anon/public key
   - Optional: `GEMINI_MODEL` = `gemini-2.5-flash` (default)
3. Redeploy after adding or changing environment variables.

The Gemini key is only read by `/api/advice.js` on the server. Do not add it to `config.js`, HTML, or a public repository. Review Google's current API pricing, quota, and data terms before use. Gemini responses are advice only; the app does not connect to banks or execute payments.

## 4. Deploy to Vercel

1. Put the contents of this folder in a private Git repository.
2. Import that repository into https://vercel.com.
3. Add the environment variables above and deploy.
4. Open the deployed URL, sign in, then choose **Manage India** or **Manage UAE**.
5. On mobile, use the browser's **Add to Home Screen** option to install the PWA shell.

The included `api/advice.js` is a Vercel serverless function. The app expects the `/api/advice` endpoint to be deployed with it.

## Feature notes and limitations

- **Recorded balances only:** balances are what you enter in PocketPlan, not live bank balances.
- **Net worth:** the app calculates tracked cash/bank + manually entered assets − tracked loans − outstanding borrowed-from-people amounts. Add all relevant assets/liabilities for a more complete estimate.
- **30-day estimate:** a simple estimate based on the selected month's income, expenses, EMIs, and current recorded account balances; it does not know future variable spending or unentered income.
- **Recurring reminders:** when you mark a dated repeating reminder complete, the next occurrence is created. This does not automatically create a transaction or pay a bill.
- **Notifications:** browser notifications are checked while the app is open. No server-side push notifications are sent when the browser is closed.
- **Voice entry:** uses the browser's speech recognition when supported (commonly Chrome/Edge). Check the captured description and amount before saving.
- **CSV/PDF:** CSV export downloads transaction records. Print / Save PDF uses your browser's print dialog.
- **Security:** use a strong unique password, keep Vercel environment variables private, enable RLS, and do not deploy a public signup flow unless you intend to support multiple users.
- **Financial advice:** Gemini may make mistakes. Verify important decisions and never share bank passwords, card PINs, or other secrets with the AI Coach.

## Troubleshooting

- **Workspace fails to load:** confirm the full `schema.sql` ran successfully and that the Supabase URL/key are correct.
- **Gemini error:** check `GEMINI_API_KEY`, `GEMINI_MODEL`, Google AI Studio quota/model access, and Vercel function logs. Redeploy after environment-variable changes.
- **Budget save conflict:** the updated schema uses a country-aware unique key; rerun the updated schema if the database reports a conflict-target error.
- **No live bank data:** this is a manual finance tracker and does not connect to UPI, bank accounts, or payment rails.
