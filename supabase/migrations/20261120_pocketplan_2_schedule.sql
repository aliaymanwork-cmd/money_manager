-- PocketPlan 2.0: record a scheduled payment and advance the schedule in one transaction.
create or replace function public.pocketplan_pay_schedule(
  p_schedule_id uuid,
  p_country text,
  p_paid_date date default current_date
) returns public.entries
language plpgsql
security invoker
set search_path=''
as $$
declare
  v_user uuid := (select auth.uid());
  v_schedule public.schedules%rowtype;
  v_entry public.entries%rowtype;
  v_next date;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  select * into v_schedule from public.schedules
    where id=p_schedule_id and user_id=v_user and country=p_country and active=true
    for update;
  if not found then raise exception 'Active schedule not found'; end if;
  v_entry := public.pocketplan_record_entry(jsonb_build_object(
    'country',v_schedule.country,'currency',v_schedule.currency,'kind',v_schedule.kind,
    'title',v_schedule.title,'amount',v_schedule.amount,'category',v_schedule.category,
    'date',p_paid_date,'account_id',v_schedule.account_id
  ));
  if v_schedule.repeat_every='none' then
    update public.schedules set active=false where id=v_schedule.id and user_id=v_user;
  else
    v_next := case v_schedule.repeat_every
      when 'weekly' then v_schedule.next_date + 7
      when 'monthly' then (v_schedule.next_date + interval '1 month')::date
      when 'yearly' then (v_schedule.next_date + interval '1 year')::date
      else null end;
    if v_next is null then raise exception 'Unknown schedule recurrence'; end if;
    update public.schedules set next_date=v_next where id=v_schedule.id and user_id=v_user;
  end if;
  return v_entry;
end;
$$;
revoke all on function public.pocketplan_pay_schedule(uuid,text,date) from public;
grant execute on function public.pocketplan_pay_schedule(uuid,text,date) to authenticated;
