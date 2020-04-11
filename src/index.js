const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
const db = require("./db");
const config = require("./config.json");
const routes = require("./routes.js");
// const ws = require("./ws.js");

db.init();
// ws.init();

db.client.query("listen new_newtx");

db.client.on("notification", async (data) => {
  const payload = JSON.parse(data.payload);
  io.emit("memo", payload);
});

setInterval(() => {
  io.emit("memo", { type: "post", body: "body" });
}, 2000);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

app.use("/", routes);
http.listen(config.server.port);
