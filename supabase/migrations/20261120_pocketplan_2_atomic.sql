-- PocketPlan 2.0 additive, non-destructive database upgrade.
-- Run only after taking a project backup. No existing rows are deleted or rewritten.
-- Atomic entry posting prevents partial account/loan updates.
create or replace function public.pocketplan_record_entry(p_entry jsonb)
returns public.entries
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_country text := p_entry->>'country';
  v_currency text := p_entry->>'currency';
  v_kind text := p_entry->>'kind';
  v_amount numeric;
  v_account uuid;
  v_debt uuid;
  v_row public.entries%rowtype;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  if p_entry is null or jsonb_typeof(p_entry) <> 'object' then raise exception 'Invalid transaction data'; end if;
  if v_country not in ('IN','AE') or v_currency is distinct from (case when v_country='IN' then 'INR' else 'AED' end) then
    raise exception 'Workspace currency does not match country';
  end if;
  if v_kind not in ('income','expense','borrowed','settled','loanpay','lent','received') then
    raise exception 'Invalid transaction type';
  end if;
  v_amount := (p_entry->>'amount')::numeric;
  if v_amount is null or v_amount <= 0 or v_amount > 1000000000000 then raise exception 'Invalid amount'; end if;
  if length(coalesce(p_entry->>'title','')) > 500 or length(coalesce(p_entry->>'title','')) = 0 then raise exception 'Invalid title'; end if;
  if p_entry ? 'account_id' and nullif(p_entry->>'account_id','') is not null then v_account := (p_entry->>'account_id')::uuid; end if;
  if p_entry ? 'debt_id' and nullif(p_entry->>'debt_id','') is not null then v_debt := (p_entry->>'debt_id')::uuid; end if;
  if v_debt is not null and v_kind <> 'loanpay' then raise exception 'Only loan repayments may reference a loan'; end if;
  if v_kind = 'loanpay' and v_debt is null then raise exception 'Loan repayment requires a loan'; end if;
  if v_account is not null then
    update public.accounts
      set balance = balance + (case when v_kind in ('income','borrowed','received') then v_amount else -v_amount end)
    where id=v_account and user_id=v_user and country=v_country and currency=v_currency;
    if not found then raise exception 'Account not found in this workspace'; end if;
  end if;
  if v_debt is not null then
    update public.debts set balance=balance-v_amount
    where id=v_debt and user_id=v_user and country=v_country and currency=v_currency and balance>=v_amount;
    if not found then raise exception 'Loan not found or amount exceeds outstanding balance'; end if;
  end if;
  insert into public.entries (
    user_id,country,kind,title,amount,currency,category,date,account_id,debt_id,
    person,receipt_data,payment_method,notes
  ) values (
    v_user,v_country,v_kind,p_entry->>'title',v_amount,v_currency,
    coalesce(nullif(p_entry->>'category',''),'General'),(p_entry->>'date')::date,
    v_account,v_debt,nullif(p_entry->>'person',''),p_entry->>'receipt_data',
    p_entry->>'payment_method',p_entry->>'notes'
  ) returning * into v_row;
  return v_row;
end;
$$;
revoke all on function public.pocketplan_record_entry(jsonb) from public;
grant execute on function public.pocketplan_record_entry(jsonb) to authenticated;

create or replace function public.pocketplan_delete_entry(p_id uuid, p_country text)
returns public.entries
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user uuid := (select auth.uid());
  v_row public.entries%rowtype;
  v_delta numeric;
begin
  if v_user is null then raise exception 'Sign in required'; end if;
  delete from public.entries where id=p_id and user_id=v_user and country=p_country
    returning * into v_row;
  if not found then raise exception 'Transaction not found in this workspace'; end if;
  v_delta := case when v_row.kind in ('income','borrowed','received') then -v_row.amount else v_row.amount end;
  if v_row.account_id is not null then
    update public.accounts set balance=balance+v_delta
    where id=v_row.account_id and user_id=v_user and country=p_country;
    -- If the account was deleted, its original balance cannot be restored.
  end if;
  if v_row.kind='loanpay' and v_row.debt_id is not null then
    update public.debts set balance=balance+v_row.amount
    where id=v_row.debt_id and user_id=v_user and country=p_country;
  end if;
  return v_row;
end;
$$;
revoke all on function public.pocketplan_delete_entry(uuid,text) from public;
grant execute on function public.pocketplan_delete_entry(uuid,text) to authenticated;

-- Match current application authorization pattern without exposing other users.
-- The legacy schema attempted to create a policy on settings.user_id using generic table logic.
-- settings has user_id, so it is valid; this policy is kept explicitly for auditability.
alter table public.settings enable row level security;
drop policy if exists own on public.settings;
create policy own on public.settings
  for all to authenticated
  using ((select auth.uid())=user_id)
  with check ((select auth.uid())=user_id);
