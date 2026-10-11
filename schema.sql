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


-- Country workspaces: India and UAE data are kept fully separate.
alter table entries add column if not exists country text not null default 'IN' check (country in ('IN','AE'));
alter table debts add column if not exists country text not null default 'IN' check (country in ('IN','AE'));
alter table todos add column if not exists country text not null default 'IN' check (country in ('IN','AE'));
alter table accounts add column if not exists country text not null default 'IN' check (country in ('IN','AE'));
alter table budgets add column if not exists country text not null default 'IN' check (country in ('IN','AE'));
alter table todos add column if not exists due_date date;
-- Replace the old budget uniqueness rule with country-aware uniqueness.
alter table budgets drop constraint if exists budgets_user_id_category_key;
create unique index if not exists budgets_user_category_country_key on budgets(user_id, category, country);

-- Keep previously entered AED-denominated records in the UAE workspace.
update entries set country='AE' where currency='AED';
update debts set country='AE' where currency='AED';
update accounts set country='AE' where currency='AED';
update budgets set country='AE' where currency='AED';

-- v3: borrowed money, account-linked transactions and loan payments.
-- 'borrowed' = money you received from a person, 'settled' = money you paid back to them,
-- 'loanpay' = a payment towards a loan. None of these count as income or expense in your monthly totals.
alter table entries drop constraint if exists entries_kind_check;
alter table entries add constraint entries_kind_check check (kind in ('income','expense','borrowed','settled','loanpay'));
alter table entries add column if not exists account_id uuid references accounts(id) on delete set null;
alter table entries add column if not exists debt_id uuid references debts(id) on delete set null;
alter table entries add column if not exists person text;
create index if not exists entries_person_idx on entries(user_id, country, lower(person));

-- PocketPlan extended planning features: manually tracked assets and savings goals.
create table if not exists assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  country text not null default 'IN' check (country in ('IN','AE')),
  name text not null,
  asset_type text not null default 'other',
  value numeric not null default 0 check (value >= 0),
  currency text not null default 'INR',
  created_at timestamptz not null default now()
);
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  country text not null default 'IN' check (country in ('IN','AE')),
  name text not null,
  target numeric not null check (target > 0),
  saved numeric not null default 0 check (saved >= 0),
  deadline date,
  currency text not null default 'INR',
  created_at timestamptz not null default now()
);
do $$ declare t text; begin
  foreach t in array array['assets','goals'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists own on %I', t);
    execute format('create policy own on %I for all using (user_id=auth.uid()) with check (user_id=auth.uid())', t);
  end loop;
end $$;
create index if not exists assets_user_country_idx on assets(user_id,country);
create index if not exists goals_user_country_idx on goals(user_id,country);

-- Optional reminder recurrence (one-time reminders remain the default).
alter table todos add column if not exists repeat_every text not null default 'none' check (repeat_every in ('none','weekly','monthly','yearly'));


-- v4: receipt attachments, budget rollover, and scheduled future cash flows.
alter table entries add column if not exists receipt_data text;
alter table budgets add column if not exists carryover boolean not null default false;
create table if not exists schedules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid(),
  country text not null default 'IN' check (country in ('IN','AE')),
  title text not null,
  kind text not null check (kind in ('income','expense')),
  amount numeric not null check (amount > 0),
  currency text not null default 'INR',
  category text not null default 'Scheduled',
  next_date date not null,
  repeat_every text not null default 'monthly' check (repeat_every in ('none','weekly','monthly','yearly')),
  account_id uuid references accounts(id) on delete set null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table schedules enable row level security;
drop policy if exists own on schedules;
create policy own on schedules for all using (user_id=auth.uid()) with check (user_id=auth.uid());
create index if not exists schedules_user_country_date_idx on schedules(user_id,country,next_date) where active=true;

-- v5: person-to-person lending and settlement metadata.
alter table entries add column if not exists payment_method text;
alter table entries add column if not exists notes text;
alter table entries drop constraint if exists entries_kind_check;
alter table entries add constraint entries_kind_check check (kind in ('income','expense','borrowed','settled','loanpay','lent','received'));
