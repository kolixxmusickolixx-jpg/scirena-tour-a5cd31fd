create or replace function public.reorder_items(p_table text, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_table not in ('shows','faq_items','social_links','gallery_albums','gallery_photos','media_items','releases') then
    raise exception 'Reordering is not allowed for table %', p_table;
  end if;
  if p_ids is null or array_length(p_ids, 1) is null then
    return;
  end if;
  execute format(
    'update public.%I t set sort_order = v.ord from (select unnest($1::uuid[]) as id, generate_series(1, array_length($1, 1)) as ord) v where t.id = v.id',
    p_table
  ) using p_ids;
end;
$$;

revoke all on function public.reorder_items(text, uuid[]) from public, anon;
grant execute on function public.reorder_items(text, uuid[]) to authenticated;