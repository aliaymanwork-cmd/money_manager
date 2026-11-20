-- PocketPlan 2.0: persistent per-user AI request throttling.
-- Stored in an unexposed schema. No historical finance data is changed.
create schema if not exists pocketplan_private;
revoke all on schema pocketplan_private from public, anon, authenticated;
create table if not exists pocketplan_private.ai_request_limits (
  user_id uuid primary key,
  window_started timestamptz not null,
  request_count integer not null default 0
);
revoke all on pocketplan_private.ai_request_limits from public, anon, authenticated;

create or replace function public.pocketplan_allow_ai_request()
returns boolean
language plpgsql
security definer
set search_path=''
as $$
declare
  v_user uuid := (select auth.uid());
  v_count integer;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  insert into pocketplan_private.ai_request_limits as quota (user_id,window_started,request_count)
  values(v_user,now(),1)
  on conflict (user_id) do update set
    request_count=case when quota.window_started <= now()-interval '1 hour' then 1 else quota.request_count+1 end,
    window_started=case when quota.window_started <= now()-interval '1 hour' then now() else quota.window_started end
  returning request_count into v_count;
  return v_count<=30;
end;
$$;
revoke all on function public.pocketplan_allow_ai_request() from public, anon;
grant execute on function public.pocketplan_allow_ai_request() to authenticated;
