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
├── index.html                       # Single-file app (Phaser + OfficeScene)
├── agents.json                      # Agent roster
├── assets/sprites/
│   ├── interior_walls.png           # LimeZu Modern Interiors — Room_Builder
│   ├── interior_furniture.png       # LimeZu Modern Interiors — Interiors (full theme sorter)
│   ├── office_furniture.png         # LimeZu Modern Office Revamped
│   ├── char_paul.png                # 16×32 character sheet, 56 cols × 20 char-rows
│   ├── char_dartagnan.png
│   └── char_porthos.png
├── _headers                         # Cloudflare Pages cache headers
└── README.md
```

### Character sheet layout

The 3 `char_*.png` sheets are LimeZu Modern Interiors Premade Characters with the top 16px spacer cropped, so they load cleanly as 16×32 frames (56 cols × 20 char-rows). Convention used in `agents.json`:

| Animation     | Row | Frame indices            |
|---------------|----:|--------------------------|
| Idle still    |   0 | `0` (Down standing)      |
| Walk-Down     |   1 | `56–61` (6 frames)       |
| Walk-Up       |   1 | `62–67`                  |
| Walk-Left     |   1 | `68–73`                  |
| Walk-Right    |   1 | `74–79`                  |

If a character looks wrong-facing during walk, swap the row arrays in `agents.json` — the layout convention is a guess based on the LimeZu animation guide and may need tuning.

## Credits

Pixel-art assets used under the standard LimeZu license (paid asset, see `assets/` upstream LICENSE):

- **Modern Office Revamped** by LimeZu — https://limezu.itch.io/modernoffice
- **Modern Interiors** by LimeZu — https://limezu.itch.io/moderninteriors
