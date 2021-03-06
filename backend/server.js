require("dotenv").config();
const app = require("./app");
const debug = require("debug")("node-angular");
const http = require("http");
const socketio = require('socket.io');

const normalizePort = val => {
  let port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
};

const onError = error => {
  if (error.syscall !== "listen") {
    throw error;
  }

  const bind = typeof addr === "string" ? "pipe" + addr : "port" + port;
  switch (error.code) {
    case "EACCESS":
      console.error(bind + "requires elevated privileges");
      process.exit(1);
      break;
    case "EADDRINUSE":
      console.error(bind + " is already in use");
      process.exit(1);
      break;
    default:
      throw error;
  }
};

const onListenning = () => {
  const addr = server.address();
  const bind = typeof addr === "string" ? "pipe" + addr : "port" + port;
  debug("listenning on" + bind);
};

const port = normalizePort(process.env.PORT || "8080");

app.set("port", port);
const server = http.createServer(app);
const io = socketio.listen(server);
app.set('socketio', io);
server.on("error", onError);
server.on("Listenning", onListenning);

server.listen(port);
