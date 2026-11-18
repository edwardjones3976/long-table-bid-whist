# Rules for AI agents in this repository

This is a card game app (Tonk, Spades, Bid Whist) that people play together in a browser or a VR headset, inside a 3D mansion.
A Node server deals the cards and checks every move. A React client draws the world.

## The one rule that matters most

**Work only in your own lane. Never edit files in the main folder. Never commit.**

Many agents work here at the same time, and this rule keeps them from overwriting each other. The main folder belongs to the workspace owner: the session that keeps it and puts finished work into the game.

The main folder is the repository's first checkout: the one that is not under `_provider_worktrees/`. You are the workspace owner only if the person who runs this workspace told you so. An agent the workspace owner starts to work in the main folder for it counts as the owner for that task, and stays inside the areas the owner claimed there. The owner's duties are in section 9 of [docs/workspace.html](docs/workspace.html). Everybody else is a provider and follows every rule below.

## Get a lane

A lane is your own copy of the code. It has its own folder, its own branch, its own two ports, and its own areas: the folders and files that only you may edit.

If you were asked to review a lane, it is not yours: make no lane and change nothing in it. Follow "If you are asked to review a lane" in docs/workspace.html, section 8.
If the folder you were started in is under `_provider_worktrees/`, it is your lane already: do not make another one.
If you cannot run commands, or your only shell is PowerShell, ask the workspace owner, where you were asked to report, to make the lane and to run the checks for you, then change nothing until it tells you your lane folder (docs/workspace.html, section 4).
Otherwise run this in the folder you were started in, with your own names and areas. Making your lane is the only thing you do outside it:

    npm run lane -- new codex tonk-bot --area server/games/tonk-bot.ts --area tests/server/tonk.test.ts --install

- `codex` and `tonk-bot` are the provider (you) and the task: lower-case letters, digits and dashes.
- `--area`: a folder or one file, written from the top of the repository with forward slashes. Give one or more. Ask for the smallest areas that cover your task, tests included.
- `--install`: also runs `npm ci` in the lane, so the lane has its own packages. Use it unless the workspace owner tells you not to.

If the command refuses, it has changed nothing and it says why. An area that somebody else holds is named with its holder: choose a narrower area, or ask the workspace owner.

The command prints your lane folder and your ports. Go to that folder and do all your work there. If your tool starts every command in the main folder again, begin each command with `cd "<your lane folder>" &&`. Your file tools need the same care: read and save files by their full path inside your lane folder. A path such as `server/games/tonk-bot.ts`, given from the folder you were started in, is the main folder's file. If `handin` does not list the files you changed, your edits went to the wrong folder: stop and tell the workspace owner. A lane starts from the last commit in the main folder: work there that is not committed yet is not in your lane.

## Commands

Run these inside your lane. Keep the two dashes after `lane`.

| Command | What it does |
|---|---|
| `npm run lane -- status` | Shows the main folder and every lane: areas, ports, changed files, and files outside its areas. |
| `npm run lane -- run typecheck` | Checks the types. |
| `npm run lane -- run test` | Runs the unit tests. |
| `npm run lane -- run build` | Builds the app. |
| `npm run lane -- run e2e` | Runs the browser tests. |
| `npm run lane -- run server` | Starts the game server on your server port. It keeps running until you stop it. |
| `npm run lane -- run client` | Starts the client on your client port, and keeps running too. Open `http://localhost:<your client port>`. |
| `npm run lane -- handin` | Runs the checks and prints your hand-in block. |

To run one unit-test file while you work: `npm test -- tests/server/tonk.test.ts`, inside your lane. The unit tests use no fixed port. The hand-in still runs every test.

`run server` and `run client` do not return, so start each one in the background or in its own terminal, and stop both when you are done. If your port is still busy after you closed the terminal or stopped the command, the server is still running: the longer guide shows how to stop it under "Ports".

## Working rules

1. Work only inside your lane folder.
2. Edit only inside your lane's areas. If you need more, ask the workspace owner to widen them. Never edit `.lane.json` yourself.
3. Do not commit, push, merge or rebase, and do not delete a lane or a branch. The workspace owner commits your lane with you as the author, after a provider other than you has reviewed that exact diff.
4. Do not change the dependencies in `package.json`, or `package-lock.json`, without asking the workspace owner first.
5. Never use ports 3000 or 5173. They belong to the main folder. Start the app only with `npm run lane -- run server` and `run client`. Typed by hand, `npm run dev:server`, `dev:client`, `dev:xr` and `npm start` use those ports unless you set `PORT` and `CLIENT_PORT` to your lane's numbers.
6. Do not use PowerShell in any form. If it is the only shell you have, ask the workspace owner to run commands for you.
7. Write LF line endings.
8. Put nothing private in any file: no names of people, email addresses, home-folder paths, keys, tokens or names of private chat channels. The repository is public.
9. Use only original art and sound, made in code. No downloaded images, sounds, fonts or models.
10. The server stays the authority for cards, turns and scoring. The client never decides them.
11. Finish with `npm run lane -- handin` and paste its block where you were asked to report.

## What to hand in

- Run `npm run lane -- handin` in your lane. Add `--build` or `--e2e` when you were asked to.
- Fix every `FAIL` and every file it marks as outside your areas, then run it again. To put back a file you did not mean to change, use `git -C "<your lane folder>" restore <path>`; a new file you did not mean to make, remove.
- If a check fails for a reason that is not your change (a test you did not touch runs out of time, for example), run it once more. If it still fails, paste the block as it is and say so under it.
- Paste the whole block, from the line `LANE HAND-IN` to the end of the output, unchanged, where you were asked to report. Never write or edit the block yourself.
- Then stop editing the lane, and wait for the review.

## More help

- [docs/workspace.html](docs/workspace.html): the longer guide. A first session step by step, areas, ports, a sample hand-in block, a map of the code, and fixes for common problems.
- [docs/mansion-app.html](docs/mansion-app.html): what the app is and how it is built.
