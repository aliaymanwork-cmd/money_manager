-- PocketPlan web push subscriptions; no financial records are modified.
create table if not exists public.push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid(),
 endpoint text not null,
 p256dh text not null,
 auth text not null,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(user_id,endpoint),
 constraint push_endpoint_https check (endpoint like 'https://%'),
 constraint push_endpoint_length check(length(endpoint)<=2048)
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
drop policy if exists own_push_subscriptions on public.push_subscriptions;
create policy own_push_subscriptions on public.push_subscriptions
for all to authenticated
using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id);
grant select,insert,update,delete on public.push_subscriptions to authenticated;

create table if not exists public.push_preferences (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default true,
 days_before integer[] not null default array[3,1,0],
 notify_irregular_unset boolean not null default true,
 timezone text not null default 'Asia/Dubai',
 notification_hour integer not null default 9 check(notification_hour between 0 and 23),
 updated_at timestamptz not null default now(),
 constraint allowed_days check(days_before <@ array[0,1,3,7]::integer[])
);
alter table public.push_preferences enable row level security;
drop policy if exists own_push_preferences on public.push_preferences;
create policy own_push_preferences on public.push_preferences for all to authenticated
using ((select auth.uid())=user_id)
with check ((select auth.uid())=user_id);
grant select,insert,update,delete on public.push_preferences to authenticated;

create table if not exists pocketplan_private.push_deliveries (
 user_id uuid not null,
 subscription_id uuid not null,
 event_key text not null,
 delivered_at timestamptz not null default now(),
 primary key(subscription_id,event_key)
);
revoke all on pocketplan_private.push_deliveries from public,anon,authenticated;
