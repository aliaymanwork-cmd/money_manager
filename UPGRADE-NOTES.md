# PocketPlan upgrade notes

This build uses Groq (`llama-3.3-70b-versatile`) for the AI Coach.

## Before deploying

1. Back up your existing Supabase data.
2. Run the entire updated `schema.sql` in the Supabase SQL Editor. It adds `schedules`, budget rollover, receipt data, settlement metadata, and `lent`/`received` transaction types. Existing records are retained.
3. In Vercel Environment Variables, set `GROQ_API_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY`. Set `GROQ_MODEL=llama-3.3-70b-versatile` or remove `GROQ_MODEL` to use the code default.
4. Deploy/redeploy the project. Do not add the Groq key to `config.js` or commit it to Git.
5. Test login, India/UAE separation, add/delete transactions, borrowed/lent settlement, receipt attachment, budgets, scheduled items, backup/restore, and AI Coach.

## Feature notes

- Scheduled items are trackers: **Mark paid** records the transaction and updates the selected account. It does not initiate a real bank payment.
- Cash-flow projections are estimates based on schedules, EMI dates, and recent average expenses.
- Browser notifications require permission and the app to remain open; no server-side push service is configured.
- PIN lock is a convenience screen gate, not a security boundary. Use Supabase authentication and your device lock for real protection.
- Excel export is an Excel-compatible HTML spreadsheet (`.xls`), not a native `.xlsx` workbook.
- Receipt images are stored as base64 data in the private `entries` table and are limited to 1 MB per image. Avoid attaching sensitive documents.

## UI refresh

- All styling was consolidated into one stylesheet in `index.html` (the old stacked redesigns were removed).
- Mobile: bottom tab bar with a **More** sheet, quick-add button on Overview, 16px form fields (no iOS zoom), larger tap targets, safe-area support, automatic dark mode.
- Desktop: left sidebar navigation.
- Redeploy and reload once; the service-worker cache was bumped to `v5` so phones pick up the new design.

## AI provider: Groq

- `api/advice.js` now calls Groq (`GROQ_API_KEY`, `GROQ_MODEL=llama-3.3-70b-versatile`, optional `GROQ_FALLBACK_MODEL`). Remove the old `GEMINI_*` variables in Vercel and redeploy.
- Balance questions (e.g. "what is my account balance") are answered instantly from your saved accounts, with a per-account breakdown, without calling the AI.
