create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  target_calories int default 2000,
  target_protein int default 120,
  created_at timestamptz default now()
);

create table if not exists public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exercise_name text not null,
  weight_kg numeric not null default 0,
  reps int not null,
  set_number int not null,
  muscle_group text,
  logged_at timestamptz default now()
);

create table if not exists public.nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calories int not null,
  protein_g int default 0,
  carbs_g int default 0,
  fat_g int default 0,
  logged_at timestamptz default now()
);

create table if not exists public.custom_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  muscle_group text not null,
  created_at timestamptz default now()
);

create table if not exists public.active_workouts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workout jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;
alter table public.workout_logs enable row level security;
alter table public.nutrition_logs enable row level security;
alter table public.custom_exercises enable row level security;
alter table public.active_workouts enable row level security;

create policy "Users manage own profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users manage own workout logs" on public.workout_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own nutrition logs" on public.nutrition_logs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own custom exercises" on public.custom_exercises for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users manage own active workout" on public.active_workouts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
