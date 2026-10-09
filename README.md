# Money Planner: setup (about 15 minutes)

**1. Database (Supabase)**
- supabase.com > New project.
- SQL Editor > paste all of `schema.sql` > Run. (Safe to run again later.)
- Authentication > Users > Add user > your email and password, tick "Auto Confirm User".
- Authentication > Sign In / Providers > turn OFF "Allow new users to sign up". Now only you can log in.
- Project Settings > API: copy the Project URL and the anon key.

**2. Config**
- Open `config.js` and paste the Project URL and anon key.

**3. Gemini key**
- aistudio.google.com/apikey > Create API key.

**4. Deploy (Vercel)**
- Put this folder on GitHub (new private repo, upload the files).
- vercel.com > Add New > Project > import the repo > before Deploy, add Environment Variables:
  `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GEMINI_API_KEY` > Deploy.
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

The AI Coach now reports configuration/API errors instead of silently displaying “No answer from Gemini.” In Vercel, confirm `GEMINI_API_KEY`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` are set for the deployment environment, then redeploy. Check the Vercel function logs if Gemini reports an API key, quota, model-access, or request error. Simple balance questions are answered directly from the currently selected workspace's saved account records and do not require Gemini; they are not live bank balances.
