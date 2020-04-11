create extension if not exists "uuid-ossp";

drop table if exists txs;

create table if not exists txs (
  id uuid primary key default uuid_generate_v1(),
  data jsonb,
  created_at timestamp,
  type text,
  body text,
  parent text,
  from_address text,
  txhash text
);

create or replace function public.notify_newtx()
  returns trigger
as $function$
begin
  perform pg_notify('new_newtx', row_to_json(NEW)::text);
  return null;
end;
$function$
  language plpgsql volatile
  cost 100;

create trigger updated_test_trigger after insert on txs
for each row execute procedure notify_newtx();