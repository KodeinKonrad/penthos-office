# office-hub

Tiny zero-dependency Node server that relays events into the Penthos office. Lives in a Docker container next to Caddy on the Hetzner box.

```
┌────────────┐    POST /office/event     ┌──────────────┐    SSE /events     ┌────────────┐
│  Claude /  │ ─────────────────────────▶│  office-hub  │ ──────────────────▶│  office.   │
│  GH / n8n  │                           │  (port 3001) │                    │  penthos.  │
└────────────┘                           └──────────────┘                    │  app       │
                                                                              └────────────┘
```

## Endpoints

- `GET  /health` → `{ ok, ts, clients, recent }` — smoketest, includes connected SSE client count
- `POST /event` (JSON body) → broadcast event to all SSE listeners, returns `{ ok, id, broadcast }`
- `GET  /events` → Server-Sent-Events stream. Replays last 50 events on connect, then live tail.

The hub does **not** persist anything. Events live in an in-memory ring buffer (last 50). Crash = backlog gone.

## Auth

Set `HUB_TOKEN` env var to require `x-hub-token: <token>` on POST /event. Empty/unset = no auth (fine while everything is internal-only).

## Event format

Whatever JSON you POST gets forwarded verbatim, augmented with `id` and `ts`. The frontend understands at least:

```json
{ "type": "move",
  "target": "dartagnan",
  "direction": "left",
  "duration": 3000,
  "distance": 144,
  "returnToHome": true }
```

- `target`: agent id from `agents.json` (`paul` / `dartagnan` / `porthos`)
- `direction`: `left` | `right` | `up` | `down`
- `duration`: ms for the outbound walk
- `distance`: pixels; defaults to 144 (3 tiles)
- `returnToHome`: if true, walk back to home after the outbound trip

## Local dev

```bash
cd office-hub
node server.js
# in another shell:
curl http://localhost:3001/health
curl -N http://localhost:3001/events   # tail SSE
curl -X POST http://localhost:3001/event -H 'content-type: application/json' \
  -d '{"type":"move","target":"dartagnan","direction":"left","duration":3000,"returnToHome":true}'
```

## Deploy to Hetzner

1. Copy this `office-hub/` directory to the Hetzner box (e.g. into the same dir as your existing `docker-compose.yml`).
2. Merge `docker-compose.snippet.yml` into the main `docker-compose.yml` (or just put this dir alongside and add the service block). Make sure the service joins whatever network Caddy is on.
3. Merge `caddy.snippet` into `api.penthos.app`'s site block in the Caddyfile. The two routes mount the hub under `/office/event` and `/office/events`.
4. (Optional) Set `OFFICE_HUB_TOKEN=…` in your `.env` or shell, then update Caddy POST callers to send `x-hub-token: …`.
5. Reload:
   ```bash
   docker compose up -d office-hub
   docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
   ```
6. Smoketest:
   ```bash
   curl https://api.penthos.app/office/health
   curl -N https://api.penthos.app/office/events    # should hang open, prints `event: ready` line
   curl -X POST https://api.penthos.app/office/event -H 'content-type: application/json' \
     -d '{"type":"move","target":"dartagnan","direction":"left","duration":3000,"returnToHome":true}'
   ```
   At step 3 of the smoketest, D'Artagnan should walk left for 3 s on `office.penthos.app` and return.
