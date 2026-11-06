# Dead Cells Companion

A static web app for browsing Dead Cells gear: weapons, shields, grenades, traps and powers, with their stats and icons.

## Features

- Tabs per item type, plus an all-items view with filters and search
- Unlock tracker for what you have found so far
- Favorites and per-item notes
- Compare up to three items side by side
- Settings panel

Favorites, unlocks and notes are kept in `localStorage`, so nothing leaves your browser.

## Run

Item data lives in `items.json` and is loaded with `fetch`, so serve the folder instead of opening the file directly:

```bash
python -m http.server 8000
```

Then open http://localhost:8000.

## Files

- `index.html`, `style.css`, `app.js`: the app
- `items.json`: item data
- `icons/`: item icons
