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
