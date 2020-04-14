const express = require("express");
const router = express.Router();
const db = require("./db");

const fetchFollowing = async (address) => {
  const query = `
    select x.parent
    from (
      select
        row_number() over (partition by parent order by created_at desc) as r,
        t.*
      from
        txs t where (t.type = 'follow' or t.type = 'unfollow') and t.from_address = $1) x
    where x.r <= 1 and x.type = 'follow'
  `;
  const following = (await db.query(query, [address])).rows.map(
    (f) => f.parent
  );
  return [...following, address];
};

const fetchTimeline = async (following, after) => {
  const query = `
    select
      *,
      (select count(tx.*) from txs as tx where tx.type = 'like' and tx.parent = txs.txhash) as like_count,
      (select count(tx.*) from txs as tx where tx.type = 'repost' and tx.parent = txs.txhash) as repost_count,
      (select count(tx.*) from txs as tx where tx.type = 'comment' and tx.parent = txs.txhash) as comment_count,
      (select tx.body from txs as tx where tx.type = 'set-displayname' and tx.from_address = txs.from_address order by tx.created_at desc limit 1) as display_name
    from txs
    where
      txs.from_address = any ($1)
      and txs.type = 'post'
      and txs.created_at < $2
    order by created_at desc
    limit 10
  `;
  const timeline = (await db.query(query, [following, after])).rows;
  return timeline;
};

router.get("/", async (req, res) => {
  const data = await db.query("select 42");
  res.json({ hello: data });
});

router.get("/select", async (req, res) => {
  const data = await db.query("select * from txs order by created_at desc");
  res.send(data);
});

router.get("/timeline", async (req, res) => {
  const from_address = req.query.from_address;
  const after = req.query.after || "2099-01-01T12:00:00.000Z";
  const following = await fetchFollowing(from_address);
  const timeline = await fetchTimeline(following, after);
  res.send(timeline);
});

router.get("/following", async (req, res) => {
  const from_address = req.query.from_address;
  const data = await fetchFollowing(from_address);
  res.send(data);
});

router.get("/txs", async (req, res) => {
  const data = await db.query("select * from txs");
  res.send(data);
});

module.exports = router;
