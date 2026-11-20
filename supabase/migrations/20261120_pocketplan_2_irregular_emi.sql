-- Additive irregular EMI support; existing fixed loans remain unchanged.
alter table public.debts add column if not exists emi_type text not null default 'fixed';
alter table public.debts drop constraint if exists debts_emi_type_check;
alter table public.debts add constraint debts_emi_type_check check (emi_type in ('fixed','irregular'));
create table if not exists public.debt_monthly_emis (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid(),
 debt_id uuid not null references public.debts(id) on delete cascade,
 country text not null check(country in ('IN','AE')),
 month date not null,
 amount numeric not null check(amount>0 and amount<=1000000000000),
 created_at timestamptz not null default now(),
 unique (debt_id,month),
 constraint debt_month_first_day check (extract(day from month)=1)
);
create index if not exists debt_monthly_emis_user_country_idx on public.debt_monthly_emis(user_id,country,month);
alter table public.debt_monthly_emis enable row level security;
drop policy if exists own_irregular_emi on public.debt_monthly_emis;
create policy own_irregular_emi on public.debt_monthly_emis for all to authenticated
using ((select auth.uid())=user_id and exists(select 1 from public.debts d where d.id=debt_id and d.user_id=(select auth.uid()) and d.country=country))
with check ((select auth.uid())=user_id and exists(select 1 from public.debts d where d.id=debt_id and d.user_id=(select auth.uid()) and d.country=country));
grant select,insert,update,delete on public.debt_monthly_emis to authenticated;
