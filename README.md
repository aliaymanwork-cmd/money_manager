# PocketPlan — Personal Finance Planner

A responsive personal finance web app with separate India (INR) and UAE (AED) workspaces. Built with vanilla HTML/CSS/JavaScript, Supabase Auth/Postgres, Vercel serverless functions, and Groq AI.

## Features

- Password-protected sign-in using Supabase Auth; row-level security for user-owned data.
- India and UAE workspaces kept separate.
- Income, expenses, borrowed money, account-linked transactions, and CSV export.
- Person-wise borrowed-money tracking with partial/full settlements, date/method/notes, full history, plus separate person-wise lending and repayments received.
- Loans/EMIs, payoff estimates, payments, due dates, reminders, and repeating weekly/monthly/yearly reminders.
- Monthly category budgets with 70%, 90%, and over-budget indicators plus optional unused-budget rollover.
- Bank/cash accounts and balances.
- Financial planning page with tracked net worth, manual assets/investments, savings goals and contributions, and 7/30/90-day cash-flow estimates using scheduled cash flows and recent average expenses.
- Six-month reports, category spending breakdown, CSV export, JSON workspace backup/restore, print/save-as-PDF, voice entry, duplicate warnings, and optional receipt photos (JPEG/PNG/WebP/GIF up to 1 MB).
- AI Coach uses the selected workspace's recorded financial snapshot and scheduled cash flows. It uses Groq's chat completions API with `llama-3.3-70b-versatile`; the API key remains server-side.
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

## 3. Configure Groq AI

1. Create an API key at https://console.groq.com/keys
2. In your Vercel project, open **Settings → Environment Variables** and add:
   - `GROQ_API_KEY` = your Groq API key
   - `GROQ_MODEL` = `llama-3.3-70b-versatile`
   - `SUPABASE_URL` = the same Supabase project URL
   - `SUPABASE_ANON_KEY` = the same Supabase anon/public key
   - Optional: `GROQ_FALLBACK_MODEL` = `llama-3.1-8b-instant` (used automatically if the main model is slow or rate-limited)
3. Redeploy after adding or changing environment variables. You can delete the old `GEMINI_*` variables.

The Groq key is only read by `/api/advice.js` on the server. Do not add it to `config.js`, HTML, or a public repository. Review Groq's current pricing, rate limits, and data terms before use. AI responses are advice only; the app does not connect to banks or execute payments.

## 4. Deploy to Vercel

1. Put the contents of this folder in a private Git repository.
2. Import that repository into https://vercel.com.
3. Add the environment variables above and deploy.
4. Open the deployed URL, sign in, then choose **Manage India** or **Manage UAE**.
5. On mobile, use the browser's **Add to Home Screen** option to install the PWA shell.

The included `api/advice.js` is a Vercel serverless function. It calls Groq's OpenAI-compatible endpoint (`https://api.groq.com/openai/v1/chat/completions`) with your `GROQ_API_KEY`. The app expects `/api/advice` to be deployed with it. After changing the model/environment variables, redeploy Vercel.

## Predefined categories and interface

The transaction, monthly-budget, and scheduled-cash-flow forms include predefined category groups for Housing & Home, Utilities & Bills, Food & Dining, Transportation & Travel, Shopping & Lifestyle, Entertainment & Subscriptions, Health & Wellness, Education & Self-Improvement, Financial & Investments, and Miscellaneous & Others. Income transactions also include Salary, Freelance / Side Income, Business Income, Interest / Dividends, Refunds, and Other Income. Categories are stored with their group prefix to keep similarly named items distinguishable in reports. Existing historical category labels are retained.

The interface is a single mobile-first design system (ink-indigo + marigold accent, Figtree / Bricolage Grotesque type) that follows the device's light or dark setting. On phones it has a bottom tab bar (Overview, Activity, Loans, Plan, More) with a quick-add button on Overview; on desktop it becomes a left sidebar with all pages.

## Feature notes and limitations

- **Recorded balances only:** balances are what you enter in PocketPlan, not live bank balances.
- **Net worth:** the app calculates tracked cash/bank + manually entered assets + outstanding money lent to people − tracked loans − outstanding borrowed-from-people amounts. Add all relevant assets/liabilities for a more complete estimate.
- **Forecasts:** 7/30/90-day estimates combine active scheduled cash flows, EMI dates, and recent average expenses. They are approximations and cannot know unentered income or future variable spending.
- **Recurring reminders:** when you mark a dated repeating reminder complete, the next occurrence is created. Scheduled cash-flow items can be marked paid/received; this creates a transaction, updates the linked account when selected, and advances or deactivates the schedule. This does not initiate an actual bank payment.
- **Notifications:** browser notifications are checked while the app is open. No server-side push notifications are sent when the browser is closed.
- **Voice entry:** uses the browser's speech recognition when supported (commonly Chrome/Edge). Check the captured description and amount before saving.
- **Excel/CSV/PDF/backup:** Excel export is an Excel-compatible HTML spreadsheet with an `.xls` extension; CSV export downloads transactions. JSON backup includes the current country workspace and can be restored into the same signed-in account and country. Restore upserts matching IDs and leaves records absent from the backup untouched. Print / Save PDF uses the browser print dialog.
- **Security:** use a strong unique password, keep Vercel environment variables private, enable RLS, and do not deploy a public signup flow unless you intend to support multiple users. Privacy mode only hides displayed amounts. The optional local PIN screen is a convenience lock, not a replacement for authentication or device security; it can be bypassed by someone with developer-tools access. Biometric authentication is not implemented. Receipt images are stored as data URLs in your private database rows, so use small, non-sensitive receipts. Browser notifications require the app to be open; there is no server-side push service.
- **Financial advice:** The AI may make mistakes. Verify important decisions and never share bank passwords, card PINs, or other secrets with the AI Coach.

## Troubleshooting

- **Workspace fails to load:** confirm the full `schema.sql` ran successfully and that the Supabase URL/key are correct.
- **AI error:** check `GROQ_API_KEY`, set `GROQ_MODEL=llama-3.3-70b-versatile`, check Groq quota/rate limits, inspect Vercel function logs, and redeploy after environment-variable changes.
- **Budget save conflict:** the updated schema uses a country-aware unique key; rerun the updated schema if the database reports a conflict-target error.
- **No live bank data:** this is a manual finance tracker and does not connect to UPI, bank accounts, or payment rails.
