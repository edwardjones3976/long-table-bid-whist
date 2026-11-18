import { createGameServer } from "./index";

const port = Number(process.env.PORT) || 3000;
createGameServer().http.listen(port, () => console.log(`Game server listening on port ${port}`));
