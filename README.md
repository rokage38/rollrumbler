# Roll Rumble

A phone-first multiplayer party game. Everyone balances on a ball on a tilting dome platform, bashes into each other, and the last one still rolling wins the round. First to three rounds wins the match.

## How it works

- **Web app, no install.** Runs in the phone browser and can be added to the home screen (PWA). Portrait and landscape both work.
- **Online rooms with a code.** One phone hosts and gets a four-letter code (or a share link). Friends join from their own phones. The host phone runs the simulation and streams positions to everyone at 20 updates a second; the other phones only send their joystick. Connections are direct phone-to-phone over WebRTC using the free public PeerJS signalling server, so there is no game server to run.
- **Bots.** "Play vs bots" is fully offline. In rooms, empty spots are filled with bots (toggle in the lobby).
- **Controls.** Touch anywhere to get a floating joystick. Big DASH button for a burst with a 2.4 second cooldown. Arrow keys / WASD and space work on a laptop for testing.

## Run locally

```bash
npm install
npm run dev        # http://localhost:5173, open on your phone via the LAN address it prints
npm run build      # production build in dist/
```

## Deploy

Pushing to `main` runs the GitHub Actions workflow in `.github/workflows/pages.yml`, which builds the site and publishes it to GitHub Pages at `https://<user>.github.io/<repo>/`. The first run also switches the repo's Pages setting to "GitHub Actions" on its own. It also works on Vercel or Netlify as a plain Vite site (build `vite build`, output `dist`).

## Optional networking settings

See `.env.example`. Out of the box the game uses the public PeerJS server plus Google and Cloudflare STUN. If two phones on strict mobile networks cannot see each other, add a TURN relay (a free Metered.ca account is enough) through the `VITE_TURN_*` variables, or self-host the signalling server with `npx peerjs --port 9000 --path /` and point `VITE_PEER_*` at it.

## Tuning the feel

Everything that shapes the gameplay lives at the top of `src/core/sim.js`: acceleration, friction, slide strength (tilt and dome), bump force, dash speed and cooldown, round length before sudden death, and wins needed. `test/simstats.mjs` runs bot-only matches headlessly and prints median round length, handy after changing numbers.

## Project layout

```
index.html              the screens: title, play, wardrobe, settings, lobby, results, in-game HUD
src/main.js             app flow and orchestration: screens, solo/host/client loops, HUD
src/core/sim.js         game rules and physics (host-authoritative), bot AI, snapshots
src/core/prediction.js  client-side prediction of the local player
src/core/net.js         host and client transports (PeerJS WebRTC raced against a Supabase relay)
src/looks/catalog.js    every wardrobe option: bodies, colours, patterns, outfits, faces, hats, extras, balls
src/looks/textures.js   procedural canvas textures (skins, faces, ball designs)
src/looks/builder.js    builds and animates a rumbler rig from a look
src/render/renderer.js  quality levels, camera, environment lighting
src/render/world.js     the carnival island: sky, stage, pool, bleachers, tents, ferris wheel
src/render/actors.js    one animated rumbler per player, kept in sync with the view
src/render/effects.js   bursts, confetti, camera shake
src/render/preview.js   wardrobe turntable and thumbnails
src/ui/screens.js       screen switching
src/ui/wardrobe.js      wardrobe tabs and options
src/ui/input.js         floating joystick, dash button, keyboard
src/ui/style.css        all styling
src/audio.js            synthesised sound effects and music
public/                 manifest, icons, service worker
test/                   Playwright smoke tests and the headless balance script
```
