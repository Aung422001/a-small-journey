# A Small Journey

A dependency-free, top-down browser game set in a fictional Myanmar-inspired town. Ride a bicycle through a market street, residential lane, tea shop, and riverside path. Collect a parcel, help a neighbor gather three fallen mangoes, and deliver the parcel to the tea shop. Keep exploring after completing the quest.

## Play

Requires Node.js 22 or later. From this folder:

```sh
node server.js
```

Open **http://localhost:3000**. No installation or build step is needed. The server binds to your computer only. Set `PORT` to use another port if needed.

- **WASD / arrow keys:** cycle
- **E:** talk or collect when nearby; close a conversation
- **M:** open the town map
- **Escape:** close a dialog or pause/resume
- On smaller screens, use the on-screen direction and interaction buttons.

The gold diamond points to your next task. Delivery and helping can be completed in either order. Use the journal to track progress. There is no timer, combat, or failure penalty. A new afternoon asks before resetting your progress.

## Check

```sh
node --test
```

Tests exercise the complete quest, alternate task order, proximity rules, duplicate interactions, movement/collision behavior, and flood-fill reachability of every quest and discovery location.

The equivalent package scripts are `npm start` and `npm test` (use `npm.cmd` in PowerShell if its execution policy blocks npm's PowerShell wrapper).

## Scope

This is a short playable slice, not yet a measured 15-minute experience. All characters and dialogue are fictional. Buildings and scenery are drawn in canvas; there are no downloaded art assets. The fonts optionally load from Google Fonts with local fallbacks. The game otherwise runs locally without network requests.

Progress is in memory and resets on refresh. No audio, interiors, Burmese translation, accounts, or multiplayer are included. Canvas movement is visual; the journal and conversations use accessible HTML, but the prototype does not offer equivalent nonvisual navigation. Cultural representation needs research and review with people from Myanmar before the setting is expanded or described as authentic.
