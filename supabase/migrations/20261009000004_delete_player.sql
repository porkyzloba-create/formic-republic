-- Lets a player delete their own league entry (privacy policy: "Delete my league entry").
-- Leaves the alliance first (handing ownership on, or deleting an alliance left empty), then
-- deletes the player row; scores, alliance points and the secret go with it (on delete cascade).
create or replace function public.fr_delete_player(p_id uuid, p_secret text) returns json
language plpgsql security definer set search_path = '' as $$
begin
  perform public.fr_leave_alliance(p_id, p_secret);   -- also checks the secret
  delete from public.players where id = p_id;
  return json_build_object('deleted', true);
end $$;

revoke all on function public.fr_delete_player(uuid,text) from public, anon, authenticated;
grant execute on function public.fr_delete_player(uuid,text) to anon, authenticated;
