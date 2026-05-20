# Penthos Office

A pixel-art browser office where virtual Penthos agents (Paul, D'Artagnan, Porthos) idle and react to incoming events.

Planned live URL: **office.penthos.app** (not deployed yet)

## Tech stack

- [Phaser 4.1.0](https://phaser.io/) — game/render engine, loaded from jsDelivr CDN
- Single-file `index.html` with inline script and style — no build step, no bundler
- Kenney pixel-art tilesets (Tiny Town, Tiny Dungeon) under `assets/sprites/`
- [Cloudflare Pages](https://pages.cloudflare.com/) for static hosting
- Server-Sent Events (SSE) for live event push — **arrives in Phase 2**

## How to add a new agent

1. Open `agents.json`.
2. Append a new entry with the following shape:
   ```json
   {
     "id": "athos",
     "displayName": "Athos",
     "role": "Operations",
     "spritesheetKey": "dungeon",
     "idleFrames": [104, 105],
     "homeX": 480,
     "homeY": 400,
     "stations": {}
   }
   ```
   - `idleFrames` are two 0-indexed frames from the 16×16 spritesheet (`dungeon.png` is the Tiny Dungeon tilemap).
   - `homeX` / `homeY` are pixel coordinates on the 1280×720 canvas.
3. Commit and push — Cloudflare Pages picks up the new agent on the next deploy.

No code changes required. The `OfficeScene` iterates `agents.json` at boot and wires up each entry automatically.

## Project structure

```
.
├── index.html         # Single-file app (Phaser + OfficeScene)
├── agents.json        # Agent roster
├── assets/sprites/
│   ├── dungeon.png    # Kenney Tiny Dungeon tilemap_packed
│   └── town.png       # Kenney Tiny Town tilemap_packed
├── _headers           # Cloudflare Pages cache headers
└── README.md
```
