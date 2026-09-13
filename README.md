# Gridiron Playbook — Football Playbook Designer

**[Open the app](https://mrbeanington.github.io/gridiron-playbook/)** · **[New here? Start with the Field Guide](https://claude.ai/code/artifact/dab6784d-b1f5-4a23-9a01-d085a6dd6d5f)** (plain-English setup for PC and iPhone — no tech background needed)

A complete, self-contained football play designer and playbook builder that runs entirely in
the browser. Build offensive, defensive, and special-teams plays with a real SVG field canvas
(players, routes, blocking assignments, motion, and coaching annotations), organize them into
a playbook with sections and installation plans, and print a professional, binder-ready
playbook — all with **no backend, no build step, and no external services**.

Everything is plain HTML/CSS/JavaScript (ES modules) and IndexedDB. There is nothing to
compile — you can open `index.html` through any static file server and it works, including
completely offline once loaded.

## Features

- **Play Designer** — SVG field canvas (full field / half field / red zone / goal line,
  vertical or horizontal orientation) with draggable offensive and defensive players,
  a route tool (25 preset route concepts + fully custom click-to-draw routes), a blocking
  tool (15 block/protection types with distinct line styles), a motion tool, zones/shapes,
  freehand drawing, text annotations, and a football marker.
- **Undo/redo**, keyboard shortcuts (Ctrl/Cmd+Z, Ctrl/Cmd+D, Delete, Escape, Enter/double-click
  to finish a path), snap-to-grid, zoom/fit/fullscreen.
- **Formations gallery** — 20 offensive formations and 8 defensive fronts you can drop onto
  any play and then fully customize.
- **Play metadata** — formation, personnel, concept, down/distance/hash/field position,
  situational tags, coaching points, notes, install/practice info, favorites, and play
  variations/families (duplicate a play without touching the original).
- **Play Library** — search, filter by category/situation/favorites, grid or list view,
  sortable, with bulk "add to playbook" selection.
- **Playbook Builder** — cover page (team name, logo upload, season, coach), auto-generated
  table of contents, section dividers, notes/blank pages, and drag-and-drop page ordering.
- **Installation Plan** — group plays into install days/sessions with per-play notes.
- **Printing** — dedicated print stylesheet that produces an actual binder-ready playbook on
  US Letter paper (extra-wide left margin for 3-ring binder holes), with color/black-and-white
  and diagram-only/full-detail options. "Print" uses the real browser print dialog, so choosing
  "Save as PDF" there gives you a PDF with zero extra dependencies.
- **Export/Import** — PNG export of any individual play diagram (canvas-rendered, not a
  screenshot), a self-contained downloadable HTML version of the whole playbook, and full
  JSON export/import of a playbook (versioned schema) for backup and transfer between
  browsers/devices.
- **Persistence** — IndexedDB-backed autosave (with a localStorage fallback) — your work
  survives a refresh. Multiple playbooks are supported, with team branding/colors,
  dark and light themes, and a responsive layout down to mobile.
- **Starter content** — ships with a demo playbook (9 offensive plays, 6 defensive plays,
  3 special-teams plays) so the app is immediately useful; everything in it is fully editable
  or deletable.

## Running locally

No install, no dependencies, no build. Any static file server works, for example:

```bash
python -m http.server 5500
```

Then open `http://localhost:5500`. (Opening `index.html` directly via `file://` will not work
because ES modules and IndexedDB require an HTTP origin.)

## "Building" for production

There is no build step — the `src/` folder you see is exactly what ships. Just make sure the
files are served as static assets with correct MIME types (any standard static host does this).

## Deploying to GitHub Pages

**Option A — no Actions, simplest:**
1. Push this repository to GitHub.
2. In the repo, go to **Settings → Pages**.
3. Under "Build and deployment", choose **Deploy from a branch**, pick `main` and `/ (root)`.
4. Save. Your app will be live at `https://<username>.github.io/<repo-name>/` within a minute.

**Option B — GitHub Actions (included):** this repo already includes
`.github/workflows/deploy.yml`, which publishes the repository to GitHub Pages on every push to
`main` using the official `actions/deploy-pages` action (no build command — it just uploads the
static files). To use it, go to **Settings → Pages** and set the source to **GitHub Actions**.

All asset references in `index.html` and all JavaScript module imports use **relative paths**,
so the app works correctly whether it's hosted at the domain root or at a project subpath like
`/repo-name/`.

## File structure

```
index.html                     Entry point — loads styles and src/main.js
.github/workflows/deploy.yml   Optional GitHub Pages Actions workflow
src/
  main.js                      Boots the store, then mounts the app
  App.js                       Shell: sidebar/topbar navigation, view router
  state/
    store.js                   Central app state, pub/sub, IndexedDB persistence, undo/redo
    models.js                  Play/Playbook/Player factory + clone/duplicate/variation logic
    demoContent.js             Generates the starter demo playbook
  storage/
    db.js                      IndexedDB wrapper (with localStorage fallback)
  utils/
    constants.js               Field dimensions, position lists, tag vocab, defaults
    formations.js               Offensive/defensive formation presets
    routes.js                   Route-path generators for preset pass routes
    geometry.js                  Path/point math, SVG coordinate helpers
    id.js                       ID + timestamp helpers
    exportPng.js                Canvas-based PNG export of a play diagram
  components/
    designer/
      PlayDesigner.js           The interactive play-design canvas + tool logic
      DesignerView.js            Route wrapper / "new play" flow
      playRenderer.js            Pure function: play data -> SVG markup (used live, in
                                  thumbnails, in PNG export, and in print — one renderer)
    formations/FormationsGallery.js
    library/PlayLibrary.js
    playbook/PlaybookBuilder.js, InstallationPlan.js
    print/PrintView.js           Builds printable pages and drives window.print()
    dashboard/Dashboard.js
    settings/Settings.js
    common/common.js             Modal, confirm dialog, empty state, toasts
  styles/
    theme.css                   CSS custom properties (light/dark)
    global.css                  App shell, buttons, forms, cards, modal, toast
    designer.css                 Play designer layout and canvas styling
    library.css                  Cards/list/playbook page-list styling
    print.css                    Print-only stylesheet (media="print")
```

## Data format

Playbooks export as versioned JSON:

```json
{
  "version": 1,
  "exportedAt": "2026-01-01T00:00:00.000Z",
  "playbook": {
    "version": 1,
    "id": "pbk_...",
    "name": "My Playbook",
    "team": "My Team",
    "season": "2026",
    "branding": { "primaryColor": "#1e5c33", "...": "..." },
    "sections": [ { "id": "sec_...", "name": "Run Game", "category": "offense" } ],
    "plays": [ { "id": "play_...", "name": "Inside Zone", "players": [...], "routes": [...] } ],
    "playbookPages": [ { "type": "play", "refId": "play_..." } ],
    "installations": []
  }
}
```

Importing validates the shape and shows a clear error on malformed/unrecognized files rather
than crashing.

## Known limitations

- Routes/blocks/motion paths are drawn relative to a player's position at creation time; moving
  a player afterward does not automatically re-anchor paths already drawn from it (redraw the
  path after repositioning). This mirrors how most whiteboard-style play tools behave.
- PDF export goes through the browser's native print-to-PDF (via **Print Playbook** → *Save as
  PDF* in the print dialog) rather than a bundled PDF library — this was a deliberate choice for
  reliability on a static, dependency-free site, per the brief.
- Marquee (drag-to-select-many) selection isn't implemented; multi-select uses Shift+Click,
  which supports group move/delete for players.
- Formation/route/blocking presets cover the concepts listed in the brief as ready-made
  starting points; because the drawing, blocking, and annotation tools are fully general, any
  additional named concept can still be created by hand and labeled freely.
