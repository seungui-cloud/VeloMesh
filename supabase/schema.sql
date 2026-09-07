-- VeloMesh v0.2 스키마 — 초대 기반 그룹 라이딩
-- 흐름: 그룹장이 Ride(그룹) + Pack 생성 → 초대 코드 공유 → 참가자는 코드로 참가, Pack 자동 배정
-- Supabase SQL Editor에서 전체 실행 (재실행 안전)
--
-- 사전 조건: Authentication → Sign In / Providers → "Anonymous sign-ins" 활성화

-- 이전 버전 정리
drop table if exists ride_participants cascade;
drop table if exists club_members cascade;
drop table if exists clubs cascade;
drop table if exists participants cascade;
drop table if exists packs cascade;
drop table if exists rides cascade;
drop type if exists ride_role cascade;
drop type if exists pack_pace cascade;
drop function if exists join_ride(text, text);
drop function if exists create_ride(text, text[]);

create type ride_role as enum ('ride_leader', 'pack_leader', 'sweeper', 'rider');

create table rides (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  code text not null unique,           -- 6자리 초대 코드
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table packs (
  id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references rides(id) on delete cascade,
  name text not null,                  -- 'A', 'B', 'C' …
  position int not null default 0,
  unique (ride_id, name)
);

create table participants (
  ride_id uuid not null references rides(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  pack_id uuid references packs(id) on delete set null,
  role ride_role not null default 'rider',
  joined_at timestamptz not null default now(),
  primary key (ride_id, user_id)
);

alter table rides enable row level security;
alter table packs enable row level security;
alter table participants enable row level security;

-- 조회는 로그인(익명 포함) 사용자에게 허용 — 초대 코드 자체가 접근 비밀
create policy "authenticated read rides" on rides for select to authenticated using (true);
create policy "authenticated read packs" on packs for select to authenticated using (true);
create policy "authenticated read participants" on participants for select to authenticated using (true);

-- 쓰기는 RPC(security definer)로만 수행하므로 직접 insert/update 정책은 만들지 않음
-- 예외: 본인 participant 행의 pack 이동/이름 변경
create policy "update own participant" on participants
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- 그룹장이 Ride + Pack들을 만들고 자신을 ride_leader로 등록
create or replace function create_ride(p_title text, p_pack_names text[], p_display_name text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text;
  v_ride rides;
  v_first_pack uuid;
  v_name text;
  v_i int := 0;
begin
  -- 중복되지 않는 6자리 코드 생성
  loop
    v_code := upper(substr(md5(random()::text), 1, 6));
    exit when not exists (select 1 from rides where code = v_code);
  end loop;

  insert into rides (title, code, created_by)
  values (p_title, v_code, auth.uid())
  returning * into v_ride;

  foreach v_name in array p_pack_names loop
    if v_i = 0 then
      insert into packs (ride_id, name, position) values (v_ride.id, v_name, v_i)
      returning id into v_first_pack;
    else
      insert into packs (ride_id, name, position) values (v_ride.id, v_name, v_i);
    end if;
    v_i := v_i + 1;
  end loop;

  insert into participants (ride_id, user_id, display_name, pack_id, role)
  values (v_ride.id, auth.uid(), p_display_name, v_first_pack, 'ride_leader');

  return json_build_object(
    'ride_id', v_ride.id, 'title', v_ride.title, 'code', v_ride.code,
    'pack_id', v_first_pack, 'pack_name', p_pack_names[1], 'role', 'ride_leader');
end;
$$;

-- 초대 코드로 참가: 인원이 가장 적은 Pack에 자동 배정
create or replace function join_ride(p_code text, p_display_name text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ride rides;
  v_pack packs;
  v_existing participants;
begin
  select * into v_ride from rides where code = upper(trim(p_code));
  if not found then
    raise exception 'INVALID_CODE';
  end if;

  -- 이미 참가한 경우 기존 배정 유지
  select * into v_existing from participants
  where ride_id = v_ride.id and user_id = auth.uid();
  if found then
    select * into v_pack from packs where id = v_existing.pack_id;
    return json_build_object(
      'ride_id', v_ride.id, 'title', v_ride.title, 'code', v_ride.code,
      'pack_id', v_pack.id, 'pack_name', v_pack.name, 'role', v_existing.role);
  end if;

  -- 인원 최소 Pack 자동 배정 (동률이면 position 순)
  select p.* into v_pack
  from packs p
  left join participants pt on pt.pack_id = p.id
  where p.ride_id = v_ride.id
  group by p.id
  order by count(pt.user_id) asc, p.position asc
  limit 1;
  if not found then
    raise exception 'NO_PACK';
  end if;

  insert into participants (ride_id, user_id, display_name, pack_id, role)
  values (v_ride.id, auth.uid(), p_display_name, v_pack.id, 'rider');

  return json_build_object(
    'ride_id', v_ride.id, 'title', v_ride.title, 'code', v_ride.code,
    'pack_id', v_pack.id, 'pack_name', v_pack.name, 'role', 'rider');
end;
$$;
