-- Delivery claims are only accessible to the service_role dispatcher.
create or replace function public.pocketplan_claim_push_delivery(p_subscription_id uuid,p_event_key text)
returns boolean language plpgsql security definer set search_path=''
as $$
declare v_user uuid;
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then
  raise exception 'Not authorized';
 end if;
 select user_id into v_user from public.push_subscriptions where id=p_subscription_id;
 if v_user is null or length(p_event_key)>200 then return false; end if;
 insert into pocketplan_private.push_deliveries(user_id,subscription_id,event_key)
 values(v_user,p_subscription_id,p_event_key)
 on conflict do nothing;
 return found;
end;
$$;
revoke all on function public.pocketplan_claim_push_delivery(uuid,text) from public,anon,authenticated;
grant execute on function public.pocketplan_claim_push_delivery(uuid,text) to service_role;

create or replace function public.pocketplan_release_push_delivery(p_subscription_id uuid,p_event_key text)
returns void language plpgsql security definer set search_path=''
as $$
begin
 if current_setting('request.jwt.claim.role',true) is distinct from 'service_role' then
  raise exception 'Not authorized';
 end if;
 delete from pocketplan_private.push_deliveries where subscription_id=p_subscription_id and event_key=p_event_key;
end;
$$;
revoke all on function public.pocketplan_release_push_delivery(uuid,text) from public,anon,authenticated;
grant execute on function public.pocketplan_release_push_delivery(uuid,text) to service_role;
