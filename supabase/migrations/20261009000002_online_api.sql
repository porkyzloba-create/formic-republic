-- Weekly league + alliances: the API (called from the game as POST /rest/v1/rpc/fr_*).
-- fr_submit is replaced by the token-bucket version in 20261009000003.
create or replace function private.rate() returns numeric language sql immutable set search_path = '' as $$ select 2.5::numeric $$;     -- points/second
create or replace function private.burst() returns numeric language sql immutable set search_path = '' as $$ select 2500::numeric $$;  -- bucket size
create or replace function private.max_members() returns int language sql immutable set search_path = '' as $$ select 20 $$;

create or replace function public.fr_register(p_name text) returns json
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_secret text := encode(extensions.gen_random_bytes(24), 'hex'); v_name text;
begin
  v_name := private.clean_name(p_name, 2, 20);
  insert into public.players(name) values (v_name) returning id into v_id;
  insert into private.player_secrets(player_id, secret_hash) values (v_id, encode(extensions.digest(v_secret, 'sha256'), 'hex'));
  return json_build_object('id', v_id, 'secret', v_secret, 'name', v_name, 'season', private.season_now());
end $$;

create or replace function public.fr_rename(p_id uuid, p_secret text, p_name text) returns json
language plpgsql security definer set search_path = '' as $$
declare v_name text;
begin
  perform private.check_player(p_id, p_secret);
  v_name := private.clean_name(p_name, 2, 20);
  update public.players set name = v_name where id = p_id;
  return json_build_object('name', v_name);
end $$;

create or replace function public.fr_leaderboard(p_season text, p_id uuid default null, p_limit int default 50) returns json
language sql security definer stable set search_path = '' as $$
  with ranked as (
    select s.player_id, p.name, s.score, a.name as alliance,
           rank() over (order by s.score desc, s.updated_at asc) as rank
      from public.scores s join public.players p on p.id = s.player_id
      left join public.alliances a on a.id = p.alliance_id
     where s.season = coalesce(p_season, private.season_now()) and s.score > 0
  )
  select json_build_object(
    'season', coalesce(p_season, private.season_now()),
    'current', private.season_now(),
    'players', (select count(*) from ranked),
    'top', coalesce((select json_agg(json_build_object('rank', rank, 'name', name, 'score', score, 'alliance', alliance, 'me', player_id = p_id) order by rank)
                      from (select * from ranked order by rank limit least(greatest(coalesce(p_limit,50),1),100)) t), '[]'::json),
    'me', (select json_build_object('rank', rank, 'score', score) from ranked where player_id = p_id),
    'around', coalesce((select json_agg(json_build_object('rank', r.rank, 'name', r.name, 'score', r.score, 'alliance', r.alliance, 'me', r.player_id = p_id) order by r.rank)
                      from ranked r, (select rank from ranked where player_id = p_id) m
                     where r.rank between m.rank - 2 and m.rank + 2), '[]'::json)
  );
$$;

create or replace function public.fr_alliance_board(p_season text, p_limit int default 50) returns json
language sql security definer stable set search_path = '' as $$
  with t as (
    select a.id, a.name, coalesce(sum(c.points),0) as total,
           (select count(*) from public.players p where p.alliance_id = a.id) as members
      from public.alliances a
      left join public.alliance_contrib c on c.alliance_id = a.id and c.season = coalesce(p_season, private.season_now())
     group by a.id, a.name
  ), r as (select *, rank() over (order by total desc, name) as rank from t where members > 0 or total > 0)
  select json_build_object('season', coalesce(p_season, private.season_now()),
    'alliances', coalesce((select json_agg(json_build_object('id', id, 'rank', rank, 'name', name, 'total', total, 'members', members) order by rank)
                             from (select * from r order by rank limit least(greatest(coalesce(p_limit,50),1),100)) x), '[]'::json));
$$;

create or replace function public.fr_my_alliance(p_id uuid, p_secret text, p_season text) returns json
language plpgsql security definer set search_path = '' as $$
declare me public.players; a public.alliances; v_season text := coalesce(p_season, private.season_now()); v_total bigint; v_rank bigint;
begin
  me := private.check_player(p_id, p_secret);
  if me.alliance_id is null then return json_build_object('alliance', null, 'season', v_season); end if;
  select * into a from public.alliances where id = me.alliance_id;
  select coalesce(sum(points),0) into v_total from public.alliance_contrib where alliance_id = a.id and season = v_season;
  select count(*) + 1 into v_rank from (
    select alliance_id, sum(points) s from public.alliance_contrib where season = v_season group by alliance_id
  ) x where x.s > v_total;
  return json_build_object('season', v_season, 'alliance', json_build_object(
    'id', a.id, 'name', a.name, 'code', a.code, 'owner', a.owner_id = p_id, 'total', v_total, 'rank', v_rank,
    'members', coalesce((select json_agg(json_build_object('name', p.name, 'points', coalesce(c.points,0), 'owner', p.id = a.owner_id, 'me', p.id = p_id) order by coalesce(c.points,0) desc, p.name)
                           from public.players p left join public.alliance_contrib c on c.player_id = p.id and c.alliance_id = a.id and c.season = v_season
                          where p.alliance_id = a.id), '[]'::json),
    'max', private.max_members()));
end $$;

create or replace function public.fr_create_alliance(p_id uuid, p_secret text, p_name text) returns json
language plpgsql security definer set search_path = '' as $$
declare me public.players; v_name text; v_code text; v_id uuid; i int := 0;
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  me := private.check_player(p_id, p_secret);
  if me.alliance_id is not null then raise exception 'already_in_alliance' using errcode = 'P0001'; end if;
  v_name := private.clean_name(p_name, 3, 24);
  if exists (select 1 from public.alliances where lower(name) = lower(v_name)) then raise exception 'name_taken' using errcode = 'P0001'; end if;
  loop
    v_code := ''; for k in 1..6 loop v_code := v_code || substr(alphabet, 1 + floor(random()*length(alphabet))::int, 1); end loop;
    exit when not exists (select 1 from public.alliances where code = v_code);
    i := i + 1; if i > 20 then raise exception 'code_failed'; end if;
  end loop;
  insert into public.alliances(name, code, owner_id) values (v_name, v_code, p_id) returning id into v_id;
  update public.players set alliance_id = v_id where id = p_id;
  return public.fr_my_alliance(p_id, p_secret, null);
end $$;

create or replace function public.fr_join_alliance(p_id uuid, p_secret text, p_code text) returns json
language plpgsql security definer set search_path = '' as $$
declare me public.players; a public.alliances; n int;
begin
  me := private.check_player(p_id, p_secret);
  if me.alliance_id is not null then raise exception 'already_in_alliance' using errcode = 'P0001'; end if;
  select * into a from public.alliances where code = upper(trim(coalesce(p_code,''))) for update;
  if not found then raise exception 'no_such_code' using errcode = 'P0001'; end if;
  select count(*) into n from public.players where alliance_id = a.id;
  if n >= private.max_members() then raise exception 'alliance_full' using errcode = 'P0001'; end if;
  update public.players set alliance_id = a.id where id = p_id;
  if a.owner_id is null then update public.alliances set owner_id = p_id where id = a.id; end if;
  return public.fr_my_alliance(p_id, p_secret, null);
end $$;

create or replace function public.fr_leave_alliance(p_id uuid, p_secret text) returns json
language plpgsql security definer set search_path = '' as $$
declare me public.players; v_next uuid;
begin
  me := private.check_player(p_id, p_secret);
  if me.alliance_id is null then return json_build_object('alliance', null); end if;
  update public.players set alliance_id = null where id = p_id;
  select id into v_next from public.players where alliance_id = me.alliance_id order by created_at limit 1;
  if v_next is null then delete from public.alliances where id = me.alliance_id;
  else update public.alliances set owner_id = v_next where id = me.alliance_id and owner_id = p_id; end if;
  return json_build_object('alliance', null);
end $$;

-- Lock everything down, then open only the API functions to the app's public key.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;
revoke all on schema private from public, anon, authenticated;
revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function public.fr_register(text), public.fr_rename(uuid,text,text),
  public.fr_leaderboard(text,uuid,int), public.fr_alliance_board(text,int), public.fr_my_alliance(uuid,text,text),
  public.fr_create_alliance(uuid,text,text), public.fr_join_alliance(uuid,text,text), public.fr_leave_alliance(uuid,text) to anon, authenticated;
