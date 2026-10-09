-- Anti-cheat for weekly scores: a token bucket per player and week.
-- Each player may add at most private.burst() points at once, and the bucket refills at
-- private.rate() points per second (2.5/s, about 9,000 an hour). Points above that are not
-- rejected: the game keeps them and reports them again later, so honest bursts (opening
-- many packs) still count, while an edited save can never climb faster than a very
-- active real player. Points only count toward an alliance while the player is in it.
alter table public.scores add column credit numeric not null default 0;

create or replace function public.fr_submit(p_id uuid, p_secret text, p_season text, p_score bigint) returns json
language plpgsql security definer set search_path = '' as $$
declare me public.players; v_season text := private.season_now(); v_old bigint; v_at timestamptz; v_credit numeric; v_delta bigint; v_new bigint;
begin
  me := private.check_player(p_id, p_secret);
  if p_season is distinct from v_season then
    return json_build_object('season', v_season, 'score', 0, 'accepted', 0, 'stale', true);
  end if;
  select score, updated_at, credit into v_old, v_at, v_credit from public.scores where season = v_season and player_id = p_id for update;
  if not found then v_old := 0; v_at := null; v_credit := private.burst();
  else v_credit := least(private.burst(), v_credit + private.rate() * extract(epoch from (now() - v_at))); end if;
  v_delta := least(greatest(0, coalesce(p_score,0) - v_old), floor(v_credit)::bigint);
  v_new := v_old + v_delta;
  insert into public.scores(season, player_id, score, updated_at, credit) values (v_season, p_id, v_new, now(), v_credit - v_delta)
    on conflict (season, player_id) do update set score = excluded.score, updated_at = now(), credit = excluded.credit;
  if v_delta > 0 and me.alliance_id is not null then
    insert into public.alliance_contrib(season, alliance_id, player_id, points) values (v_season, me.alliance_id, p_id, v_delta)
      on conflict (season, alliance_id, player_id) do update set points = public.alliance_contrib.points + excluded.points;
  end if;
  return json_build_object('season', v_season, 'score', v_new, 'accepted', v_delta);
end $$;
revoke all on function public.fr_submit(uuid,text,text,bigint) from public;
grant execute on function public.fr_submit(uuid,text,text,bigint) to anon, authenticated;
