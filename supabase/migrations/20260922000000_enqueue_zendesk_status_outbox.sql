create or replace function public.enqueue_zendesk_status_outbox(
  p_ticket_id bigint,
  p_target_status text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if p_ticket_id is null or p_ticket_id = 0 then
    return;
  end if;

  if p_target_status not in (
    'to_print',
    'to_cut',
    'to_prepack',
    'to_pack',
    'to_ship',
    'shipped'
  ) then
    raise exception 'Unrecognized Zendesk target status: %', p_target_status;
  end if;

  insert into public.zendesk_status_outbox (
    ticket_id,
    target_status,
    state,
    next_attempt_at,
    attempts,
    updated_at
  )
  values (
    p_ticket_id,
    p_target_status,
    'pending',
    now(),
    0,
    now()
  )
  on conflict (ticket_id) where state in ('pending', 'processing') do update
  set
    target_status = excluded.target_status,
    last_error = null,
    next_attempt_at = now(),
    updated_at = now();
end;
$$;

create or replace function public.enqueue_zendesk_status_outbox_for_order(
  p_ticket_id bigint
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  sibling_count integer;
  all_statuses_recognized boolean;
  lowest_status_rank integer;
  derived_target_status text;
begin
  if p_ticket_id is null or p_ticket_id = 0 then
    return;
  end if;

  select
    count(*),
    bool_and(coalesce(production_status in ('print', 'cut', 'prepack', 'pack', 'ship', 'shipped'), false)),
    min(
      case production_status
        when 'print' then 1
        when 'cut' then 2
        when 'prepack' then 3
        when 'pack' then 4
        when 'ship' then 5
        when 'shipped' then 6
      end
    )
  into sibling_count, all_statuses_recognized, lowest_status_rank
  from public.orders
  where order_id = p_ticket_id;

  if sibling_count = 0 or all_statuses_recognized is not true then
    return;
  end if;

  derived_target_status := case lowest_status_rank
    when 1 then 'to_print'
    when 2 then 'to_cut'
    when 3 then 'to_prepack'
    when 4 then 'to_pack'
    when 5 then 'to_ship'
    when 6 then 'shipped'
  end;

  perform public.enqueue_zendesk_status_outbox(p_ticket_id, derived_target_status);
end;
$$;

revoke all on function public.enqueue_zendesk_status_outbox(bigint, text) from public;
revoke all on function public.enqueue_zendesk_status_outbox_for_order(bigint) from public;
grant execute on function public.enqueue_zendesk_status_outbox(bigint, text) to authenticated;
grant execute on function public.enqueue_zendesk_status_outbox_for_order(bigint) to authenticated;
