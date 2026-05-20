// office-hub — relay events into the Penthos office (Server-Sent-Events).
// Endpoints:
//   GET  /health  → JSON smoketest
//   POST /event   → broadcast a JSON event to all SSE clients (optional x-hub-token auth)
//   GET  /events  → Server-Sent-Events stream (replays last ~50 events on connect)
// Zero dependencies. Node 18+ (uses node:http).

const http = require("node:http");

const PORT = Number(process.env.PORT || 3001);
const TOKEN = process.env.HUB_TOKEN || "";
const MAX_RECENT = 50;
const HEARTBEAT_MS = 25_000;

const clients = new Set();
const recent = [];

function broadcast(payload) {
  const line = `event: office\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const c of clients) {
    try { c.write(line); } catch (_) { clients.delete(c); }
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => {
      data += c;
      if (data.length > 65_536) { reject(new Error("payload too large")); req.destroy(); }
    });
    req.on("end", () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

function json(res, code, body) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "content-type, x-hub-token");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  if (req.method === "GET" && url.pathname === "/health") {
    return json(res, 200, { ok: true, ts: Date.now(), clients: clients.size, recent: recent.length });
  }

  if (req.method === "POST" && url.pathname === "/event") {
    if (TOKEN && req.headers["x-hub-token"] !== TOKEN) return json(res, 401, { error: "unauthorized" });
    try {
      const body = await readJsonBody(req);
      const event = { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, ts: Date.now(), ...body };
      recent.push(event);
      while (recent.length > MAX_RECENT) recent.shift();
      broadcast(event);
      return json(res, 200, { ok: true, id: event.id, broadcast: clients.size });
    } catch (e) {
      return json(res, 400, { error: e.message });
    }
  }

  if (req.method === "GET" && url.pathname === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    });
    for (const e of recent) res.write(`event: office\ndata: ${JSON.stringify(e)}\n\n`);
    res.write(`event: ready\ndata: ${JSON.stringify({ ts: Date.now(), backlog: recent.length })}\n\n`);
    clients.add(res);
    const hb = setInterval(() => { try { res.write(`: keepalive\n\n`); } catch (_) {} }, HEARTBEAT_MS);
    req.on("close", () => { clearInterval(hb); clients.delete(res); });
    return;
  }

  return json(res, 404, { error: "not found", path: url.pathname });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`office-hub listening on :${PORT}  token=${TOKEN ? "set" : "NONE"}`);
});
