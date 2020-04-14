const fs = require("fs");
const path = require("path");
const pg = require("pg");
const axios = require("axios");
const ReconnectingWebSocket = require("reconnecting-websocket");
const WebSocket = require("ws");
const config = require("./config.json");
const init = fs.readFileSync(path.resolve(__dirname, "db.sql"), "utf8");

const subscribe = {
  jsonrpc: "2.0",
  method: "subscribe",
  id: "1",
  params: ["tm.event = 'NewBlock'"],
};

let socket = new ReconnectingWebSocket(config.lcd.wss, [], { WebSocket });

socket.onopen = () => {
  console.log("Subscribing to a socket connection...");
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

const insertTx = (tx) => {
  const col = "txhash, tx, created_at, type, body, parent, from_address";
  const val = "$1, $2, $3, $4, $5, $6, $7";
  const insert = `insert into txs (${col}) values (${val}) on conflict do nothing;`;
  client.query(insert, [
    tx.txhash,
    tx,
    tx.timestamp,
    JSON.parse(tx.tx.value.memo).type,
    JSON.parse(tx.tx.value.memo).body,
    JSON.parse(tx.tx.value.memo).parent,
    tx.tx.value.msg[0].value.from_address,
  ]);
};

const fetchTxs = async (page = 1) => {
  return new Promise(async (resolve) => {
    try {
      console.log(`Fetching txs from page ${page}...`);
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
      resolve(fetchTxs(page + 1));
    } catch {
      console.log("Finished fetching txs.");
      resolve(true);
    }
  });
};

const connect = () => {
  return new Promise(function executor(resolve) {
    client = new pg.Client(config.db);
    client.connect((error) => {
      if (error) {
        console.log("DB connection failed. Retrying...");
        setTimeout(executor.bind(null, resolve), 1000);
      } else {
        console.log("DB connected.");
        resolve(client);
      }
    });
  });
};

let client;

module.exports = {
  init: async (io) => {
    client = await connect();
    client.query(init);
    // For testing:
    // setInterval(() => {
    //   io.emit("newtx", {
    //     body: "🎉",
    //     created_at: "2020-04-14T09:07:25.000Z",
    //     from_address: "cosmos1z9l4hmt29ejvqrxy4vpcwa2vf94aftgzlwfyg8",
    //     like_count: "0",
    //     parent:
    //       "96AEABBE1CE814C75662671AA273E4ECAE3527132691272F9D7A1C3C9252CA1E",
    //     repost_count: "0",
    //     txhash:
    //       "96AEABBE1CE814C75662671AA273E4ECAE3527132691272F9D7A1C3C9252CA1E",
    //     type: "post",
    //   });
    // }, 2000);
    client.query("listen newtx");
    client.on("notification", async (data) => {
      const payload = JSON.parse(data.payload);
      console.log("newtx", payload);
      io.emit("newtx", payload);
    });
    await fetchTxs();
  },
  query: (text, params, callback) => {
    return client.query(text, params, callback);
  },
};
