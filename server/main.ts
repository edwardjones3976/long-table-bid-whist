import { existsSync } from "node:fs";
import { createGameServer, serveStatic } from "./index";

const port = Number(process.env.PORT) || 3000;
/** Time between bot moves, so players can follow each bot card; a finished trick stays twice as long. BOT_DELAY_MS (0 to 10000) overrides it; 0 makes bots instant. */
const BOT_DELAY_MS = 1500;
// An unset or blank variable keeps the default; Number("") would be 0, which means instant.
const fromEnv = process.env.BOT_DELAY_MS?.trim() ? Number(process.env.BOT_DELAY_MS) : NaN;
const botDelayMs = Number.isFinite(fromEnv) && fromEnv >= 0 && fromEnv <= 10_000 ? fromEnv : BOT_DELAY_MS;
const { http } = createGameServer({ botDelayMs, trickPauseMs: botDelayMs * 2 });
// Resolved from the folder the server is started in, which is the project root for every npm script.
http.on(
  "request",
  existsSync("client/dist")
    ? serveStatic("client/dist")
    : // Without this a plain page request would hang: Socket.IO answers only its own paths.
      (req, res) => void (req.url?.startsWith("/socket.io/") || res.writeHead(404).end("The client has not been built")),
);
http.listen(port, () => console.log(`Game server listening on http://localhost:${port}`));
