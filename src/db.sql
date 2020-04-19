create extension if not exists "uuid-ossp";

-- drop table if exists txs;

create table if not exists txs (
  txhash text primary key,
  tx jsonb,
  created_at timestamp,
  inserted_at timestamp default now(),
  type text,
  body text,
  parent text,
  from_address text
--   like_count int,
--   repost_count int,
--   comment_count int,
--   like_self text,
--   repost_self text,
--   display_name text
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

-- drop function if exists fetch_memo;
-- create or replace function fetch_memo(txhash text, address text)
-- returns setof memo
-- as $$
--   select
--     *.txhash
--     *.tx,
--     *.created_at,
--     *.inserted_at,
--     *.type,
--     *.body,
--     *.parent,
--     *.from_address
--     -- (select count(distinct tx.from_address): from txs as tx where tx.type = 'like' and tx.parent = txs.txhash) as like_count,
--     -- (select count(distinct tx.from_address) from txs as tx where tx.type = 'repost' and tx.parent = txs.txhash) as repost_count,
--     -- (select count(tx.*) from txs as tx where tx.type = 'comment' and tx.parent = txs.txhash) as comment_count,
--     -- (select tx.txhash from txs as tx where tx.type = 'like' and tx.parent = txs.txhash and tx.from_address = $2 limit 1) as like_self,
--     -- (select tx.txhash from txs as tx where tx.type = 'repost' and tx.parent = txs.txhash and tx.from_address = $2 limit 1) as repost_self,
--     -- (select tx.body from txs as tx where tx.type = 'set-displayname' and tx.from_address = txs.from_address order by tx.created_at desc limit 1) as display_name
--   from txs
--   where
--     txs.txhash = $1
--   limit 1
-- $$ language sql