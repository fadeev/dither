const express = require("express");
const router = express.Router();
const db = require("./db");

const fetchFollowing = async (address) => {
  return db.query(
    `
      select * 
      from (
        select
          row_number() over (partition by parent order by created_at desc) as r,
          t.*
        from
          txs t where (t.type = 'follow' or t.type = 'unfollow') and t.from_address = $1) x
      where x.r <= 1 and x.type = 'follow'
    `,
    [address]
  );
};

router.get("/", function (req, res) {
  res.sendFile(__dirname + "/index.html");
});

router.get("/select", async (req, res) => {
  const data = await db.query("select * from txs order by created_at desc");
  res.send(data);
});

router.get("/timeline", async (req, res) => {
  const from_address = req.query.from_address;
  const following = (await fetchFollowing(from_address)).rows.map(
    (f) => f.parent
  );
  const after = req.query.after || "2099-01-01T12:00:00.000Z";
  // (select tx.* from txs as tx where tx.type = 'like' and tx.parent = txs.parent) as count
  const data = await db.query(
    `
    select
      *,
      (select count(tx.*) from txs as tx where tx.type = 'like' and tx.parent = txs.txhash) as like_count,
      (select count(tx.*) from txs as tx where tx.type = 'repost' and tx.parent = txs.txhash) as repost_count
    from txs
    where
      txs.from_address = any ($1)
      and txs.type = 'post'
      and txs.created_at < $2
    order by created_at desc
    limit 10
  `,
    [[...following, from_address], after]
  );
  res.send(data.rows);
});

router.get("/following", async (req, res) => {
  const from_address = req.query.from_address;
  const data = (await fetchFollowing(from_address)).rows;
  res.send(data);
});

module.exports = router;
