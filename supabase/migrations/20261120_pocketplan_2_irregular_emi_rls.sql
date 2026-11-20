drop policy if exists own_irregular_emi on public.debt_monthly_emis;
create policy own_irregular_emi on public.debt_monthly_emis for all to authenticated
using (
 (select auth.uid())=user_id
 and exists(select 1 from public.debts d
 where d.id=debt_monthly_emis.debt_id
 and d.user_id=(select auth.uid())
 and d.country=debt_monthly_emis.country)
)
with check (
 (select auth.uid())=user_id
 and exists(select 1 from public.debts d
 where d.id=debt_monthly_emis.debt_id
 and d.user_id=(select auth.uid())
 and d.country=debt_monthly_emis.country)
);