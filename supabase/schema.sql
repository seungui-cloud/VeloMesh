-- VeloMesh MVP v0.2 스키마 (기획서 4장: Club → Ride → Pack, 5장: 역할)
-- Supabase SQL Editor에서 실행하거나 `supabase db push`로 적용한다.

create type ride_role as enum ('ride_leader', 'pack_leader', 'sweeper', 'rider');
create type pack_pace as enum ('fast', 'normal', 'recovery');

create table clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table club_members (
  club_id uuid not null references clubs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  joined_at timestamptz not null default now(),
  primary key (club_id, user_id)
);

create table rides (
  id uuid primary key default gen_random_uuid(),
  club_id uuid not null references clubs(id) on delete cascade,
  title text not null,
  ride_date date not null,
  code text not null unique, -- 앱에서 입력하는 Ride 코드
  gpx_url text,              -- MVP v0.5 Route Intelligence
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table packs (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references rides(id) on delete cascade,
  name text not null,        -- 'A', 'B', 'C'
  pace pack_pace not null default 'normal',
  unique (ride_id, name)
);

create table ride_participants (
  ride_id uuid not null references rides(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  pack_id uuid references packs(id) on delete set null,
  role ride_role not null default 'rider',
  joined_at timestamptz not null default now(),
  primary key (ride_id, user_id)
);

-- RLS: 소속 클럽 멤버만 조회 가능
alter table clubs enable row level security;
alter table club_members enable row level security;
alter table rides enable row level security;
alter table packs enable row level security;
alter table ride_participants enable row level security;

create policy "member can read club" on clubs for select using (
  exists (select 1 from club_members m where m.club_id = id and m.user_id = auth.uid())
);
create policy "member can read members" on club_members for select using (
  exists (select 1 from club_members m where m.club_id = club_members.club_id and m.user_id = auth.uid())
);
create policy "member can read rides" on rides for select using (
  exists (select 1 from club_members m where m.club_id = rides.club_id and m.user_id = auth.uid())
);
create policy "member can read packs" on packs for select using (
  exists (
    select 1 from rides r join club_members m on m.club_id = r.club_id
    where r.id = packs.ride_id and m.user_id = auth.uid()
  )
);
create policy "member can read participants" on ride_participants for select using (
  exists (
    select 1 from rides r join club_members m on m.club_id = r.club_id
    where r.id = ride_participants.ride_id and m.user_id = auth.uid()
  )
);
