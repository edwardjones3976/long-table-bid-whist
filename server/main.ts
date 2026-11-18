import { existsSync } from "node:fs";
import { createGameServer, serveStatic } from "./index";

const port = Number(process.env.PORT) || 3000;
const { http } = createGameServer();
// Resolved from the folder the server is started in, which is the project root for every npm script.
http.on(
  "request",
  existsSync("client/dist")
    ? serveStatic("client/dist")
    : // Without this a plain page request would hang: Socket.IO answers only its own paths.
      (req, res) => void (req.url?.startsWith("/socket.io/") || res.writeHead(404).end("The client has not been built")),
);
http.listen(port, () => console.log(`Game server listening on http://localhost:${port}`));
