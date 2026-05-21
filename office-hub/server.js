const http = require("http");
const crypto = require("crypto");

const PORT = 3001;
const TOKEN = process.env.OFFICE_HUB_TOKEN || "change-me-token";
const MAX_HISTORY = 50;

const clients = new Set();
const history = [];

function broadcast(event) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch (e) {}
  }
  history.push(event);
  if (history.length > MAX_HISTORY) history.shift();
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      if (!body) return resolve({});
      try { resolve(JSON.parse(body)); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, clients: clients.size, history: history.length }));
  }

  if (req.method === "GET" && url.pathname === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no"
    });
    res.write(":connected\n\n");
    res.write(`data: ${JSON.stringify({ type: "hello", ts: Date.now() })}\n\n`);
    clients.add(res);
    const keepalive = setInterval(() => {
      try { res.write(":ping\n\n"); } catch (e) {}
    }, 25000);
    req.on("close", () => {
      clearInterval(keepalive);
      clients.delete(res);
    });
    return;
  }

  if (req.method === "POST" && url.pathname === "/event") {
    const auth = req.headers["authorization"] || "";
    const provided = auth.replace(/^Bearer\s+/i, "");
    if (provided !== TOKEN) {
      res.writeHead(401, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: false, error: "unauthorized" }));
    }
    try {
      const body = await readJson(req);
      const event = {
        id: crypto.randomUUID(),
        ts: Date.now(),
        agent: body.agent || "unknown",
        action: body.action || "idle",
        meta: body.meta || {}
      };
      broadcast(event);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true, event }));
    } catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: false, error: "bad-json" }));
    }
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "not-found" }));
});

server.listen(PORT, () => {
  console.log(`office-hub listening on :${PORT}`);
});
