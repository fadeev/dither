const ReconnectingWebSocket = require("reconnecting-websocket");
const WebSocket = require("ws");
const config = require("./config.json");
const db = require("./db.js");

const { blockchains } = config;

let sockets = blockchains.map((url) => {
  return new ReconnectingWebSocket(url, [], { WebSocket });
});

const subscribe = {
  jsonrpc: "2.0",
  method: "subscribe",
  id: "1",
  params: ["tm.event = 'NewTx'"],
};

const init = () => {
  sockets.forEach((socket) => {
    socket.onopen = () => {
      socket.send(JSON.stringify(subscribe));
    };
    socket.onmessage = (msg) => {
      const insert = "insert into txs (id, data) values (default, $1);";
      const data = msg.data;
      const hasData = !(Object.keys(JSON.parse(msg.data).result).length === 0);
      if (hasData) {
        db.query(insert, [data]).catch(() => console.log);
      }
    };
  });
};

module.exports = {
  init,
};
