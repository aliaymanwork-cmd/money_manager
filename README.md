# Money Planner: setup (about 15 minutes)

**1. Database (Supabase)**
- supabase.com > New project.
- SQL Editor > paste all of `schema.sql` > Run. (Safe to run again later.)
- Authentication > Users > Add user > your email and password, tick "Auto Confirm User".
- Authentication > Sign In / Providers > turn OFF "Allow new users to sign up". Now only you can log in.
- Project Settings > API: copy the Project URL and the anon key.

**2. Config**
- Open `config.js` and paste the Project URL and anon key.

**3. Vercel AI Gateway key**
- Open Vercel > AI Gateway and create an API key. Check the selected model’s pricing and available credits before using it.

**4. Deploy (Vercel)**
- Put this folder on GitHub (new private repo, upload the files).
- vercel.com > Add New > Project > import the repo > before Deploy, add Environment Variables:
  `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `AI_GATEWAY_API_KEY` > Deploy. Optional: set `AI_GATEWAY_MODEL` to a model ID shown in the Vercel AI Gateway model catalogue (default: `anthropic/claude-sonnet-4.5`).
- If you add the variables after deploying, click Redeploy.

**5. Phone**
- Open your Vercel link > browser menu > "Add to Home screen". It opens like an app, full screen.

Notes: your data is private to your login (row-level security). The exchange rate is editable on the Overview page.

\n## Redesign notes\n\nThis version includes a cleaner responsive interface, improved navigation, more consistent cards and forms, focus states, and clearer validation for transaction, budget, account, task, and loan inputs. It also displays a helpful retry panel when database reads fail. Your existing Supabase tables and deployment flow are retained.\n
## India and UAE workspaces

The home screen lets you choose **Manage India** or **Manage UAE**. Records are tagged with a country (`IN` or `AE`) and each workspace uses its own currency (INR or AED); no currency conversion or combined totals are shown. Run the updated `schema.sql` in the Supabase SQL Editor before deploying this version. Existing records default to India (`IN`); review and reassign any UAE records in Supabase before using the new country switch.

## Reminders

You can create dated reminders for EMIs, bills, transfers, and other payments. Opt in to browser notifications from the Reminders page. Notifications are checked while the app is open; this version does not send alerts while the browser/app is fully closed, and it does not execute payments.


## AI Coach troubleshooting

The AI Coach now reports configuration/API errors instead of silently displaying “No answer from the AI model.” In Vercel, confirm `AI_GATEWAY_API_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` are set for the deployment environment, then redeploy. Check the Vercel function logs if AI Gateway reports a key, credit, model-access, or request error. Simple balance questions are answered directly from the currently selected workspace's saved account records and do not require an AI model; they are not live bank balances.


## Vercel AI Gateway Money Coach

The AI Coach calls Vercel AI Gateway from the server-side `/api/advice` function. Set `AI_GATEWAY_API_KEY` in Vercel Environment Variables. You can optionally set `AI_GATEWAY_MODEL` to a model ID currently listed in the Vercel AI Gateway catalogue. Do not put the gateway key in `config.js` or frontend code.

The app sends the currently selected workspace's saved account balances, loans and EMI due days, open reminders with due dates, budgets, monthly spending categories, and recent transactions to the AI endpoint after checking the Supabase login session. India and UAE records remain separated. Balance answers are based on records entered in this app, not a live bank connection. The AI Coach only advises; it does not create reminders or make payments.

For EMI dates, loan records use the recurring `due_day` field. For specific reminder dates, add a due date in the Reminders tab. Keep your gateway API key private and review model pricing/credits in Vercel before deploying.
