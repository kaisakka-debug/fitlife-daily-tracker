-- FitLife Daily Tracker: Supabase PostgreSQL Schema & RLS Policies
-- รันสคริปต์นี้ใน Supabase Dashboard → SQL Editor

create extension if not exists pgcrypto;

-- 1. User Profiles Table
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  sync_code text unique not null, -- Simple personal ID/PIN or auth.uid()
  name text default '',
  gender text check (gender in ('male', 'female')) default 'male',
  age int default 23,
  height numeric default 175,
  weight numeric default 95,
  goal text check (goal in ('lose', 'maintain', 'gain')) default 'lose',
  activity_multiplier numeric default 1.2,
  workout_streak int default 0,
  updated_at timestamptz default now()
);

-- 2. Daily Food & Calorie Logs Table (Data Log)
create table if not exists public.food_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  log_date date not null default current_date,
  meal_name text not null,
  kcal int not null default 0,
  protein int not null default 0,
  created_at timestamptz default now()
);

-- 3. Weight History Table (Data Log)
create table if not exists public.weight_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  recorded_date date not null default current_date,
  weight numeric not null,
  created_at timestamptz default now(),
  constraint weight_logs_profile_date_unique unique (profile_id, recorded_date)
);

-- 4. Custom User Meals Table
create table if not exists public.custom_meals (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text not null,
  kcal int not null,
  protein int not null,
  carbs int default 0,
  fat int default 0,
  tip text default '',
  created_at timestamptz default now()
);

-- 5. Workout Plans & Session Logs Table (Data Log)
create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  day_index int not null, -- 0: Mon, 1: Wed, 2: Fri
  workout_state jsonb not null, -- Stores exercises, weights, reps, set checkmarks
  completed_at timestamptz,
  updated_at timestamptz default now(),
  constraint workout_logs_profile_day_unique unique (profile_id, day_index)
);

-- Indexes for fast date & profile queries
create index if not exists idx_profiles_sync_code on public.profiles (sync_code);
create index if not exists idx_food_logs_profile_date on public.food_logs (profile_id, log_date desc);
create index if not exists idx_weight_logs_profile_date on public.weight_logs (profile_id, recorded_date asc);
create index if not exists idx_custom_meals_profile on public.custom_meals (profile_id, created_at desc);
create index if not exists idx_workout_logs_profile on public.workout_logs (profile_id, day_index);

-- Enable Row Level Security (RLS) on all tables
alter table public.profiles enable row level security;
alter table public.food_logs enable row level security;
alter table public.weight_logs enable row level security;
alter table public.custom_meals enable row level security;
alter table public.workout_logs enable row level security;

-- RLS Policies
-- รองรับทั้งโหมดรหัสซิงก์ส่วนตัว (Zero-Friction Sync Code) และการล็อกอินด้วย Supabase Auth
-- หมายเหตุ: หากต้องการจำกัดเฉพาะผู้ใช้ที่ล็อกอิน Email เท่านั้น สามารถเปลี่ยนเงื่อนไขเป็น sync_code = auth.uid()::text

drop policy if exists "profiles_sync_policy" on public.profiles;
create policy "profiles_sync_policy"
  on public.profiles
  for all
  to anon, authenticated
  using (char_length(sync_code) >= 6)
  with check (char_length(sync_code) >= 6);

drop policy if exists "food_logs_sync_policy" on public.food_logs;
create policy "food_logs_sync_policy"
  on public.food_logs
  for all
  to anon, authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = food_logs.profile_id
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = food_logs.profile_id
    )
  );

drop policy if exists "weight_logs_sync_policy" on public.weight_logs;
create policy "weight_logs_sync_policy"
  on public.weight_logs
  for all
  to anon, authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = weight_logs.profile_id
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = weight_logs.profile_id
    )
  );

drop policy if exists "custom_meals_sync_policy" on public.custom_meals;
create policy "custom_meals_sync_policy"
  on public.custom_meals
  for all
  to anon, authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = custom_meals.profile_id
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = custom_meals.profile_id
    )
  );

drop policy if exists "workout_logs_sync_policy" on public.workout_logs;
create policy "workout_logs_sync_policy"
  on public.workout_logs
  for all
  to anon, authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = workout_logs.profile_id
    )
  )
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = workout_logs.profile_id
    )
  );
