const express = require("express");
const router = express.Router();
const db = require("./db");
const config = require("./config.json");

router.get("/", async (req, res) => {
  const data = await db.query("select 42");
  res.json({ hello: data });
});

router.get("/select", async (req, res) => {
  const data = await db.query("select * from txs order by created_at desc");
  res.send(data);
});

router.get("/timeline", async (req, res) => {
  const address = req.query.from_address;
  const after = req.query.after || "2099-01-01T12:00:00.000Z";
  const following = await db.fetchFollowing(address);
  const timeline = await db.fetchTimeline(following, address, after);
  res.send(timeline);
});

router.get("/following", async (req, res) => {
  const address = req.query.from_address;
  const data = await db.fetchFollowing(address);
  res.send(data);
});

router.get("/txs", async (req, res) => {
  let data;
  const txhash = req.query.txhash;
  if (txhash) {
    data = await db.fetchMemo(txhash);
  } else {
    data = await db.query("select * from txs");
  }
  res.send(data);
});

router.get("/feed", async (req, res) => {
  const address = req.query.from_address;
  const after = req.query.after || "2099-01-01T12:00:00.000Z";
  const feed = await db.fetchTimeline([address], address, after);
  res.send(feed);
});

router.get("/tx", async (req, res) => {
  const txhash = req.query.txhash;
  const address = req.query.from_address;
  const data = await db.fetchMemo(txhash, address);
  res.send(data);
});

router.get("/comments", async (req, res) => {
  const txhash = req.query.txhash;
  const address = req.query.from_address;
  const data = await db.fetchComments(txhash, address);
  res.send(data);
});

module.exports = router;
