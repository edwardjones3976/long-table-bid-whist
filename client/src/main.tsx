import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { Pose } from "../../shared/protocol";
import App from "./App";
import { desk } from "./controls/input";
import { net } from "./net/store";
import { local } from "./state/local";
import { isWalkable } from "./world/layout";
import "./styles.css";

// For browser tests and debugging; it holds nothing the tab does not already have (the token is not in it).
if (import.meta.env.DEV || new URLSearchParams(location.search).has("e2e")) {
  (window as unknown as { __mansion: unknown }).__mansion = {
    getState: net.getState,
    net,
    local,
    isWalkable,
    teleport: (pose: Pose) => void (desk.jump = pose),
    three: () => desk.three?.(),
  };
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
