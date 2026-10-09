-- Run in Supabase > SQL Editor. Safe to run again (also upgrades the first version).
create table if not exists entries(id uuid primary key default gen_random_uuid(), user_id uuid default auth.uid() not null,
  kind text check (kind in ('income','expense')) not null, title text not null, amount numeric not null,
  category text default 'General', date date not null default current_date);
create table if not exists debts(id uuid primary key default gen_random_uuid(), user_id uuid default auth.uid() not null,
  name text not null, balance numeric not null, emi numeric not null, rate numeric default 0, due_day int default 1);
create table if not exists todos(id uuid primary key default gen_random_uuid(), user_id uuid default auth.uid() not null,
  text text not null, done boolean default false, created timestamptz default now());
create table if not exists accounts(id uuid primary key default gen_random_uuid(), user_id uuid default auth.uid() not null,
  name text not null, kind text default 'bank', balance numeric not null default 0, currency text default 'INR');
create table if not exists budgets(id uuid primary key default gen_random_uuid(), user_id uuid default auth.uid() not null,
  category text not null, amount numeric not null, currency text default 'INR', unique(user_id, category));
create table if not exists settings(user_id uuid primary key default auth.uid(), rate numeric default 24);
alter table entries add column if not exists currency text default 'INR';
alter table debts add column if not exists currency text default 'INR';
do $$ declare t text; begin
  foreach t in array array['entries','debts','todos','accounts','budgets','settings'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists own on %I', t);
    execute format('create policy own on %I for all using (user_id=auth.uid()) with check (user_id=auth.uid())', t);
  end loop; end $$;
