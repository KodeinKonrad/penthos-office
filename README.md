# Penthos Office

A pixel-art browser office where virtual Penthos agents (Paul, D'Artagnan, Porthos) idle and react to incoming events.

Planned live URL: **office.penthos.app** (not deployed yet)

## Tech stack

- [Phaser 4.1.0](https://phaser.io/) — game/render engine, loaded from jsDelivr CDN
- Single-file `index.html` with inline script and style — no build step, no bundler
- LimeZu pixel-art tilesets (Modern Office, Modern Interiors) under `assets/sprites/`
- [Cloudflare Pages](https://pages.cloudflare.com/) for static hosting
- Server-Sent Events from `api.penthos.app/office/events` — Phase 2, served by the [`office-hub`](./office-hub/) Node container on Hetzner

## How to add a new agent

1. Crop the top 16px from your chosen LimeZu Premade_Character PNG and drop it in `assets/sprites/char_<id>.png`.
2. Open `agents.json` and append a new entry:
   ```json
   {
     "id": "athos",
     "displayName": "Athos",
     "role": "Operations",
     "spritesheetKey": "char_athos",
     "spritesheetPath": "assets/sprites/char_athos.png",
     "idleFrame": 0,
     "walkDownFrames":  [56, 57, 58, 59, 60, 61],
     "walkUpFrames":    [62, 63, 64, 65, 66, 67],
     "walkLeftFrames":  [68, 69, 70, 71, 72, 73],
     "walkRightFrames": [74, 75, 76, 77, 78, 79],
     "homeX": 480,
     "homeY": 400,
     "stations": {}
   }
   ```
   - `homeX` / `homeY` are pixel coordinates on the 1280×720 canvas.
   - Frame indices follow the LimeZu Modern Interiors layout — see "Character sheet layout" below.
3. Commit and push — Cloudflare Pages picks up the new agent on the next deploy.

No code changes required. The `OfficeScene` iterates `agents.json` at boot and wires up each entry automatically.

## Project structure

```
.
├── index.html                       # Single-file Phaser app (frontend)
├── agents.json                      # Agent roster (idleFrame, walk frames, home positions)
├── assets/sprites/
│   ├── interior_walls.png           # LimeZu Room_Builder — floor tile (frame 1004)
│   ├── interior_furniture.png       # LimeZu Interiors (currently unused, shipped for Phase 3)
│   ├── office_furniture.png         # LimeZu Modern Office Revamped (desks, racks, plants…)
│   ├── char_paul.png                # 16×32 chibi sheet (56 cols × 20 char-rows)
│   ├── char_dartagnan.png
│   └── char_porthos.png
├── office-hub/                      # Phase 2 — Node SSE relay (deployed on Hetzner)
│   ├── server.js                    # ~80 LOC, zero deps
│   ├── Dockerfile
│   ├── caddy.snippet
│   ├── docker-compose.snippet.yml
│   └── README.md
├── _headers                         # Cloudflare Pages cache headers
└── README.md
```

### Character sheet layout

The 3 `char_*.png` sheets are the original LimeZu Modern Interiors Premade Characters (896×656). Each chibi character occupies a **16×32 cell** (hair row + body row stacked). Convention used in `agents.json`:

| Animation     | Char-row | Frame indices         |
|---------------|---------:|-----------------------|
| Idle still    |        0 | `3` (Down, full face) |
| Walk-Down     |        1 | `74–79` (6 frames)    |
| Walk-Up       |        1 | `56–61`               |
| Walk-Left     |        1 | `62–67`               |
| Walk-Right    |        1 | `68–73`               |

Walk-direction mapping is a guess from the LimeZu animation guide. Use **`?debug=1`** on the live site — each char gets a cyan bbox + frame label; click a char to step through frames and find the real mapping.

## Live events (Phase 2)

The office is wired to a Server-Sent-Events stream at `api.penthos.app/office/events`, served by [`office-hub`](./office-hub/) — a tiny Node container deployed next to Caddy on the Hetzner box. POST any JSON to `api.penthos.app/office/event` and it gets broadcast to every open browser tab.

Move a character via:

```bash
curl -X POST https://api.penthos.app/office/event \
  -H 'content-type: application/json' \
  -d '{"type":"move","target":"dartagnan","direction":"left","duration":3000,"returnToHome":true}'
```

The connection status is shown as a small dot in the top-right corner of the canvas (● live / ● offline).

See [`office-hub/README.md`](./office-hub/README.md) for the event schema and deploy instructions.

## Credits

Pixel-art assets used under the standard LimeZu license (paid asset, see `assets/` upstream LICENSE):

- **Modern Office Revamped** by LimeZu — https://limezu.itch.io/modernoffice
- **Modern Interiors** by LimeZu — https://limezu.itch.io/moderninteriors
