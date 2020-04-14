create extension if not exists "uuid-ossp";

-- drop table if exists txs;

create table if not exists txs (
  txhash text primary key,
  tx jsonb,
  created_at timestamp,
  type text,
  body text,
  parent text,
  from_address text
);

create or replace function notify_newtx()
  returns trigger
as $function$
begin
  perform pg_notify('newtx', row_to_json(NEW)::text);
  return null;
end;
$function$
  language plpgsql volatile
  cost 100;

drop trigger if exists updated_test_trigger on txs;
create trigger updated_test_trigger after insert on txs
for each row execute procedure notify_newtx();