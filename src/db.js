const fs = require("fs");
const path = require("path");
const { Client } = require("pg");
const axios = require("axios");
const ReconnectingWebSocket = require("reconnecting-websocket");
const WebSocket = require("ws");
const config = require("./config.json");
const init = fs.readFileSync(path.resolve(__dirname, "db.sql"), "utf8");

const client = new Client(config.db);

const subscribe = {
  jsonrpc: "2.0",
  method: "subscribe",
  id: "1",
  params: ["tm.event = 'NewBlock'"],
};

let socket = new ReconnectingWebSocket(config.lcd.wss, [], { WebSocket });

socket.onopen = () => {
  socket.send(JSON.stringify(subscribe));
};

socket.onmessage = async (msg) => {
  let msgData = JSON.parse(msg.data);
  if (msgData.result.data && msgData.result.data.value) {
    const height = msgData.result.data.value.block.header.height;
    const url = `${config.lcd.lcd}/txs?tx.height=${height}`;
    const txs = await axios.get(url);
    txs.data.txs.forEach((tx) => {
      const address = tx.tx.value.msg[0].value.to_address;
      const dither = "cosmos1lfq5rmxmlp8eean0cvr5lk49zglcm5aqyz7mgq";
      if (address === dither) {
        insertTx(tx);
      }
    });
  }
};

const insertTx = async (tx) => {
  const col = "id, data, created_at, type, body, parent, from_address, txhash";
  const val = "default, $1, $2, $3, $4, $5, $6, $7";
  const insert = `insert into txs (${col}) values (${val});`;
  await client.query(insert, [
    tx,
    tx.timestamp,
    JSON.parse(tx.tx.value.memo).type,
    JSON.parse(tx.tx.value.memo).body,
    JSON.parse(tx.tx.value.memo).parent,
    tx.tx.value.msg[0].value.from_address,
    tx.txhash,
  ]);
};

const fetchTxs = async (page = 1) => {
  try {
    const res = await axios.get(config.lcd.url + `&page=${page}`);
    res.data.txs.forEach(async (tx) => {
      try {
        if (typeof JSON.parse(tx.tx.value.memo) === "object") {
          insertTx(tx);
        }
      } catch {
        return false;
      }
    });
    fetchTxs(page + 1);
  } catch {
    console.log("Finished fetching txs.");
  }
};

module.exports = {
  init: async () => {
    client.connect();
    // client.query(init);
    // fetchTxs();
  },
  query: (text, params, callback) => {
    return client.query(text, params, callback);
  },
  client,
};
