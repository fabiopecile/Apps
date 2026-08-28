# Star Striker Career

A New Star Soccer-inspired football career game — original art and code, same
core gameplay loop: rise from Sunday League obscurity to superstar through
timing-based match and training minigames.

## Features

- Create a player (name, nation, position) and start in the bottom division.
- Timing-bar minigames for training drills and in-match key moments (shots, tackles).
- Six divisions with promotion/relegation and a full league table.
- Stats, energy, fame tiers, wages, contracts and transfer offers.
- Shop for permanent stat boosts and energy items.
- Progress is auto-saved to `localStorage`.

## Running it

No build step required — plain HTML/CSS/JS with ES modules.

```bash
cd new-star-soccer
python3 -m http.server 8080
# open http://localhost:8080
```

Or open `index.html` via any static file server (must be served over
http/https, not `file://`, for ES modules to load).

## Project structure

```
index.html        entry page
style.css         all styling (retro/arcade look)
src/main.js       bootstraps the app
src/data.js       clubs, nations, drills, shop items, fame tiers
src/state.js      game state, save/load, league + contract logic
src/render.js     canvas drawing helpers (pitch, player avatar, ball, timing bar)
src/screens.js    all UI screens and event wiring
```
