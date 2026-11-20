# PocketPlan 2.0 — iPhone push notification setup

The PWA's subscription UI, service worker, database schema and Supabase Edge Function are installed on the `pocketplan-v2` branch. **Push delivery is disabled until VAPID keys and a scheduled dispatcher are configured.** The existing app continues working normally.

## 1. Configure server-side secrets (Supabase Dashboard)

Open the Supabase project **Money Planner** (`ylmdaaiwwktdxvdebkdj`) → Edge Functions → Secrets. Never paste private keys into GitHub, `config.js`, or this chat.

Generate a VAPID key pair on your own machine:

```sh
npx --yes web-push@3.6.7 generate-vapid-keys
```

Add the following **Edge Function secrets**:
- `VAPID_PUBLIC_KEY` — generated public key.
- `VAPID_PRIVATE_KEY` — generated private key; server-only.
- `VAPID_CONTACT_EMAIL` — a real contact address you control.
- `PUSH_CRON_SECRET` — a unique random secret of at least 24 characters, e.g. generate using `openssl rand -hex 32`.

The built-in `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` secrets are used by the Edge Function; never expose them in browser code.

## 2. Schedule delivery (Supabase Cron)

The deployed Edge Function is `push-dispatch`. Use Supabase Cron / SQL with `pg_cron` and `pg_net`. The request MUST include the same `PUSH_CRON_SECRET` in the `x-push-cron-secret` header. Store it in Supabase Vault, not plaintext in a cron job.

In SQL Editor, run the following after replacing `<YOUR_SECRET>` with your secret. This SQL command contains the secret, so **run it directly in the private dashboard**, never commit a filled-in copy:

```sql
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
select vault.create_secret('<YOUR_SECRET>', 'pocketplan_push_cron_secret');
select cron.schedule(
  'pocketplan-push-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://ylmdaaiwwktdxvdebkdj.supabase.co/functions/v1/push-dispatch',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name='pocketplan_push_cron_secret')
    ),
    body := '{}'::jsonb
  );
  $$
);
```

The hourly job checks the recipient's chosen timezone and delivery hour (default 9 AM). A database claim prevents duplicate notifications for the same subscription and event. If a push service rejects an expired subscription, it is removed; temporary failures are eligible for retry.

## 3. iPhone opt-in

On iOS 16.4+, open the **installed Home Screen PocketPlan app** (not a regular Safari tab), sign in, select India or UAE, open Settings → iPhone push notifications → Enable. Allow the permission prompt. Choose UAE or India timezone and reminder hour.

The server sends notices 3 days before, 1 day before and on the EMI due date, plus a next-month irregular EMI setup reminder. It does not put balances or EMI amounts on the lock screen. Home Screen badges show a count where supported.

## 4. Verify

- `GET https://ylmdaaiwwktdxvdebkdj.supabase.co/functions/v1/push-dispatch` returns `ready: true` once all secrets are configured.
- Check `push_subscriptions` for your own subscription (via Supabase Dashboard, not by sharing the endpoint).
- Run the cron job from Supabase Dashboard, inspect Edge Function logs, and test on a real iPhone.
- Confirm no notification is sent twice for the same event and that disabling push removes that device's subscription.
- Merge to `main` only after testing; Vercel production has not been changed.

## Notes

iPhone native widgets are **not** supported by a web app. iOS Home Screen app icon badges are supported only when the OS grants the relevant permissions. Notifications require network connectivity and can be delayed by device or push-service conditions.
