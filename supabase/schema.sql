-- Campagnola schema (Supabase)
-- Run this once in Supabase Dashboard → SQL Editor → New query → Run
create extension if not exists "pgcrypto";

create table if not exists public.app_settings (
  id integer primary key default 1,
  admin_pin text not null default '1234',
  slot_duration_minutes integer not null default 120,
  lead_time_minutes integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint app_settings_singleton check (id = 1)
);
insert into public.app_settings (id) values (1) on conflict do nothing;

create table if not exists public.restaurant_tables (
  id integer primary key,
  label text not null,
  capacity integer not null,
  zone text not null default 'Sala',
  adj_group text not null default 'A',
  span integer not null default 1,
  sort_order integer not null default 0
);
insert into public.restaurant_tables (id, label, capacity, zone, adj_group, span, sort_order) values
  (1,'T1',2,'Sala','A',1,1),
  (2,'T2',2,'Sala','A',1,2),
  (3,'T3',4,'Sala','B',1,3),
  (4,'T4',4,'Sala','B',1,4),
  (5,'T5',6,'Terrazza','C',1,5),
  (6,'T6',8,'Terrazza','C',1,6)
on conflict (id) do nothing;

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  guest_name text not null,
  phone text not null,
  email text,
  notes text,
  res_date date not null,
  res_time time not null,
  adults integer not null default 2,
  children integer not null default 0,
  table_ids integer[] not null default '{}',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);
create index if not exists reservations_date_idx on public.reservations (res_date, res_time);

create table if not exists public.menu_items (
  id text primary key,
  section text not null,
  name text not null,
  price numeric(10,2) not null default 0,
  description text not null default '',
  available boolean not null default true
);

create table if not exists public.orders (
  id text primary key,
  table_id integer not null,
  table_label text not null default '',
  dish_id text,
  dish_name text not null,
  unit_price numeric(10,2) not null default 0,
  quantity integer not null default 1,
  notes text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  created_by text not null default '',
  ready_at timestamptz,
  paid_at timestamptz
);
create index if not exists orders_table_status_idx on public.orders (table_id, status);

create table if not exists public.staff_users (
  id text primary key,
  username text not null unique,
  password text not null,
  name text not null,
  role text not null check (role in ('dirigente','cuoco','cassiere','cameriere')),
  active boolean not null default true
);

create table if not exists public.staff_messages (
  id text primary key,
  from_id text not null,
  from_name text not null,
  to_id text not null default 'all',
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.offers (
  id text primary key,
  title text not null,
  description text not null default '',
  price text not null default '',
  active boolean not null default true
);

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant select, insert, update, delete on all tables in schema public to anon, authenticated;

alter table public.app_settings enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.reservations enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.staff_users enable row level security;
alter table public.staff_messages enable row level security;
alter table public.offers enable row level security;

drop policy if exists "public read tables" on public.restaurant_tables;
create policy "public read tables" on public.restaurant_tables for select using (true);
drop policy if exists "public read menu" on public.menu_items;
create policy "public read menu" on public.menu_items for select using (true);
drop policy if exists "public insert reservations" on public.reservations;
create policy "public insert reservations" on public.reservations for insert with check (true);
drop policy if exists "public read own reservation code" on public.reservations;
create policy "public read own reservation code" on public.reservations for select using (true);
drop policy if exists "service all reservations" on public.reservations;
create policy "service all reservations" on public.reservations for all using (true) with check (true);
drop policy if exists "service all orders" on public.orders;
create policy "service all orders" on public.orders for all using (true) with check (true);
drop policy if exists "anon orders rw" on public.orders;
create policy "anon orders rw" on public.orders for all using (true) with check (true);
drop policy if exists "anon menu rw" on public.menu_items;
create policy "anon menu rw" on public.menu_items for all using (true) with check (true);
drop policy if exists "anon settings read" on public.app_settings;
create policy "anon settings read" on public.app_settings for select using (true);
