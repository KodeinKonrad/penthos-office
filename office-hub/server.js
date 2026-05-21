const http = require("http");
const crypto = require("crypto");

const PORT = 3001;
const TOKEN = process.env.OFFICE_HUB_TOKEN;
if (!TOKEN) {
  console.error("FATAL: OFFICE_HUB_TOKEN env var not set — refusing to start.");
  process.exit(1);
}
const GITHUB_SECRET = process.env.GITHUB_WEBHOOK_SECRET || "";
const MAX_HISTORY = 50;
const MAX_BODY_BYTES = 5 * 1024 * 1024; // cap — GitHub push payloads can be large

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

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let total = 0;
    req.on("data", chunk => {
      total += chunk.length;
      if (total > MAX_BODY_BYTES) {
        reject(new Error("body-too-large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function readJson(req) {
  return readRawBody(req).then(buf => {
    if (!buf.length) return {};
    return JSON.parse(buf.toString("utf8"));
  });
}

function verifyGithubSig(secret, raw, header) {
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(header);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
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

  if (req.method === "POST" && url.pathname === "/github") {
    let raw;
    try { raw = await readRawBody(req); }
    catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: false, error: "read-error" }));
    }
    // Fail-open if GITHUB_WEBHOOK_SECRET is unset; fail-closed once configured.
    if (GITHUB_SECRET) {
      const sig = req.headers["x-hub-signature-256"];
      if (!verifyGithubSig(GITHUB_SECRET, raw, sig)) {
        res.writeHead(401, { "Content-Type": "application/json" });
        return res.end(JSON.stringify({ ok: false, error: "bad-signature" }));
      }
    }
    let body;
    try { body = raw.length ? JSON.parse(raw.toString("utf8")) : {}; }
    catch (e) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: false, error: "bad-json" }));
    }
    const ghEvent = req.headers["x-github-event"] || "";
    if (ghEvent === "push") {
      const branch = typeof body.ref === "string" ? body.ref.split("/").pop() : "";
      const repo = (body.repository && body.repository.name) || "";
      const commits = Array.isArray(body.commits) ? body.commits.length : 0;
      const event = {
        id: crypto.randomUUID(),
        ts: Date.now(),
        agent: "porthos",
        action: "git.push",
        meta: { repo, commits, branch }
      };
      broadcast(event);
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ ok: true, broadcast: true, event }));
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify({ ok: true, broadcast: false, ghEvent }));
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: false, error: "not-found" }));
});

server.listen(PORT, () => {
  console.log(`office-hub listening on :${PORT}`);
});
