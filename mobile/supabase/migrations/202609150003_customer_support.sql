create or replace function public.send_support_message(p_id text,p_message text,p_subject text default 'Customer care') returns text
language plpgsql security definer set search_path = '' as $$
declare doc jsonb;
begin
  if auth.uid() is null then raise exception 'Sign in to contact the store.'; end if;
  if length(p_id) not between 8 and 100 or length(trim(p_message)) not between 1 and 4000 then raise exception 'Write a message of up to 4000 characters.'; end if;
  perform pg_advisory_xact_lock(hashtextextended('support:'||auth.uid()::text,0));
  select document into doc from public.admin_data where collection='tickets' and id=p_id;
  if found then
    if doc->>'customerId'<>auth.uid()::text then raise exception 'Invalid message reference.'; end if;
    return p_id;
  end if;
  if (select count(*) from public.admin_data where collection='tickets' and document->>'customerId'=auth.uid()::text and updated_at>now()-interval '1 hour')>=20 then raise exception 'Message limit reached. Please try later.'; end if;
  insert into public.admin_data(collection,id,document,actor) values('tickets',p_id,jsonb_build_object(
    'id',p_id,'customerId',auth.uid(),'source','customer-app','subject',left(trim(p_subject),150),
    'category','other','priority','normal','status','open','createdAt',now(),'updatedAt',now(),'revision',1,'deletedAt',null,
    'messages',jsonb_build_array(jsonb_build_object('author','customer','body',trim(p_message),'at',now()))),auth.uid()::text);
  return p_id;
end $$;
revoke all on function public.send_support_message(text,text,text) from public,anon;
grant execute on function public.send_support_message(text,text,text) to authenticated;

create or replace function public.my_support_tickets() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'subject',document->>'subject','status',document->>'status',
    'messages',document->'messages','updatedAt',updated_at) order by updated_at desc),'[]')
  from public.admin_data where collection='tickets' and document->>'customerId'=auth.uid()::text and nullif(document->>'deletedAt','') is null
$$;
revoke all on function public.my_support_tickets() from public,anon;
grant execute on function public.my_support_tickets() to authenticated;
