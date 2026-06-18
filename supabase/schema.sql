-- ═══════════════════════════════════════════════════════════════════════
-- GlennSales — Supabase Postgres schema
-- Kjør i: Supabase Dashboard → SQL Editor → Kjør
-- ═══════════════════════════════════════════════════════════════════════

-- ─── 1. Selskaper ─────────────────────────────────────────────────────
create table if not exists public.companies (
  id         uuid        primary key default gen_random_uuid(),
  name       text        not null unique,
  short_name text        not null,
  color      text        not null default 'bg-gray-100 text-gray-600',
  created_at timestamptz not null default now()
);

-- ─── 2. Brukerprofiler (utvider auth.users) ───────────────────────────
create table if not exists public.profiles (
  id         uuid        primary key references auth.users(id) on delete cascade,
  company_id uuid        references public.companies(id),
  name       text        not null default '',
  email      text        not null default '',
  role       text        not null default 'rep'
               check (role in ('rep', 'leder', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Auto-opprett tom profil når en bruker registrerer seg
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, coalesce(new.email, ''))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── 3. Møter ─────────────────────────────────────────────────────────
create table if not exists public.meetings (
  id            uuid        primary key default gen_random_uuid(),
  owner_user_id uuid        not null references public.profiles(id) on delete cascade,
  company_id    uuid        not null references public.companies(id),
  customer_name text        not null,
  starts_at     timestamptz not null,
  location      text        not null,
  agenda        text,
  status        text        not null default 'active'
                  check (status in ('active', 'cancelled')),
  created_at    timestamptz not null default now()
);

-- ─── 4. Interessemeldinger ────────────────────────────────────────────
create table if not exists public.meeting_interests (
  id          uuid        primary key default gen_random_uuid(),
  meeting_id  uuid        not null references public.meetings(id) on delete cascade,
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  status      text        not null default 'pending'
                check (status in ('pending', 'approved', 'rejected', 'withdrawn')),
  reviewed_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (meeting_id, user_id)   -- én aktiv rad per bruker per møte; bruk upsert ved re-registrering
);

-- ─── 5. Varsler ───────────────────────────────────────────────────────
create table if not exists public.notifications (
  id                uuid        primary key default gen_random_uuid(),
  recipient_user_id uuid        not null references public.profiles(id) on delete cascade,
  from_user_id      uuid        references public.profiles(id) on delete set null,
  meeting_id        uuid        references public.meetings(id) on delete cascade,
  type              text        not null
                      check (type in ('new_interest', 'interest_approved', 'interest_rejected')),
  read_at           timestamptz,
  created_at        timestamptz not null default now()
);

-- ─── 6. Row Level Security ────────────────────────────────────────────

alter table public.companies         enable row level security;
alter table public.profiles          enable row level security;
alter table public.meetings          enable row level security;
alter table public.meeting_interests enable row level security;
alter table public.notifications     enable row level security;

-- Companies: alle innloggede kan lese
create policy "companies_select" on public.companies
  for select using (auth.role() = 'authenticated');

-- Profiles: alle innloggede kan lese; eier kan sette inn og oppdatere sin
create policy "profiles_select"     on public.profiles
  for select using (auth.role() = 'authenticated');

create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Meetings: alle innloggede kan lese/opprette; eier kan oppdatere
create policy "meetings_select"        on public.meetings
  for select using (auth.role() = 'authenticated');

create policy "meetings_insert"        on public.meetings
  for insert with check (auth.uid() = owner_user_id);

create policy "meetings_update_owner"  on public.meetings
  for update using (auth.uid() = owner_user_id);

-- Interesser: alle kan lese; eier kan sette inn/oppdatere sin;
--             møteeier kan godkjenne/avslå
create policy "interests_select"      on public.meeting_interests
  for select using (auth.role() = 'authenticated');

create policy "interests_insert_own"  on public.meeting_interests
  for insert with check (auth.uid() = user_id);

create policy "interests_update"      on public.meeting_interests
  for update using (
    auth.uid() = user_id
    or auth.uid() = (
      select owner_user_id from public.meetings where id = meeting_id
    )
  );

-- Varsler: kun egne; innloggede kan opprette (avsender = seg selv)
create policy "notifications_select_own" on public.notifications
  for select using (auth.uid() = recipient_user_id);

create policy "notifications_insert"     on public.notifications
  for insert with check (
    auth.role() = 'authenticated'
    and auth.uid() = from_user_id
  );

create policy "notifications_update_own" on public.notifications
  for update using (auth.uid() = recipient_user_id);

-- ─── 7. Realtime ──────────────────────────────────────────────────────
-- Aktiver Realtime for varsler manuelt i Supabase Dashboard:
-- Database → Replication → toggle 'notifications' ON
-- Dette gir live varsel-oppdatering uten polling.
