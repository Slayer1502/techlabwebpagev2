const { WebSocketServer } = require("ws");
const jwt = require("jsonwebtoken");
const config = require("../config");

let wss = null;

const clients = new Map();
const MAX_CONNECTIONS_PER_USER = 3;

const initWebSocket = (server) => {
  wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }
    const token = parseCookie(request.headers.cookie || "").techlab_token;
    if (!token) {
      socket.destroy();
      return;
    }
    try {
      const payload = jwt.verify(token, config.JWT_SECRET);
      request.user = payload;
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } catch (e) {
      socket.destroy();
    }
  });

  wss.on("connection", (ws, request) => {
    const user = request.user;
    if (!user) {
      ws.close();
      return;
    }

    const userClients = clients.get(user.id) || new Set();
    if (userClients.size >= MAX_CONNECTIONS_PER_USER) {
      ws.close(1013, "Too many connections");
      return;
    }

    ws.user = user;

    if (!clients.has(user.id)) clients.set(user.id, new Set());
    clients.get(user.id).add(ws);

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "ping") ws.send(JSON.stringify({ type: "pong" }));
      } catch (e) {}
    });

    ws.on("close", () => {
      const set = clients.get(user.id);
      if (set) {
        set.delete(ws);
        if (set.size === 0) clients.delete(user.id);
      }
    });

    ws.send(JSON.stringify({ type: "connected", userId: user.id }));
  });

  return wss;
};

const parseCookie = (cookieStr) => {
  const out = {};
  cookieStr.split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx > -1) out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  });
  return out;
};

const send = (ws, event, data) => {
  if (ws.readyState === 1) ws.send(JSON.stringify({ type: event, ...data }));
};

const broadcastToUser = (userId, event, data) => {
  const userClients = clients.get(String(userId));
  if (!userClients) return 0;
  let count = 0;
  userClients.forEach((ws) => {
    send(ws, event, data);
    count++;
  });
  return count;
};

const broadcastToRole = (role, event, data) => {
  let count = 0;
  clients.forEach((set, userId) => {
    set.forEach((ws) => {
      if (ws.user && ws.user.role === role) {
        send(ws, event, data);
        count++;
      }
    });
  });
  return count;
};

const broadcast = (event, data) => {
  let count = 0;
  clients.forEach((set) => {
    set.forEach((ws) => {
      send(ws, event, data);
      count++;
    });
  });
  return count;
};

module.exports = {
  initWebSocket,
  broadcastToUser,
  broadcastToRole,
  broadcast,
  getConnectedCount: () => clients.size,
};
