import { existsSync } from "node:fs";
import { createGameServer, serveStatic } from "./index";

const port = Number(process.env.PORT) || 3000;

/** A number from the environment in [0, max], else `fallback`. Unset or blank keeps the fallback: Number("") would be 0. */
function fromEnv(name: string, max: number, fallback: number): number {
  const raw = process.env[name]?.trim();
  const value = raw ? Number(raw) : NaN;
  return Number.isFinite(value) && value >= 0 && value <= max ? value : fallback;
}

/** Time between bot moves, so players can follow each bot card; a finished trick stays twice as long. BOT_DELAY_MS (0 to 10000) overrides it; 0 makes bots instant. */
const botDelayMs = fromEnv("BOT_DELAY_MS", 10_000, 1500);
/** Seconds a person has for each decision before a bot plays it for them and they get a strike. TURN_SECONDS (0 to 600) overrides it; 0 turns the clock off. */
const turnMs = fromEnv("TURN_SECONDS", 600, 45) * 1000;
const { http } = createGameServer({ botDelayMs, trickPauseMs: botDelayMs * 2, turnMs });
// Resolved from the folder the server is started in, which is the project root for every npm script.
http.on(
  "request",
  existsSync("client/dist")
    ? serveStatic("client/dist")
    : // Without this a plain page request would hang: Socket.IO answers only its own paths.
      (req, res) => void (req.url?.startsWith("/socket.io/") || res.writeHead(404).end("The client has not been built")),
);
http.listen(port, () => console.log(`Game server listening on http://localhost:${port}`));
