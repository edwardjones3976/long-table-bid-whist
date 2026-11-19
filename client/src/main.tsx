import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { Pose } from "../../shared/protocol";
import App from "./App";
import { desk } from "./controls/input";
import { standing } from "./controls/motion";
import { net } from "./net/store";
import { local } from "./state/local";
import { ground } from "./world/ground";
import "./styles.css";

// For browser tests and debugging; it holds nothing the tab does not already have (the token is not in it).
if (import.meta.env.DEV || new URLSearchParams(location.search).has("e2e")) {
  (window as unknown as { __mansion: unknown }).__mansion = {
    getState: net.getState,
    net,
    local,
    // The real ground, as a walker on the floor meets it: the same rule the rig uses for a free spot.
    isWalkable: (x: number, z: number) => standing(ground, x, z) !== null,
    teleport: (pose: Pose) => void (desk.warp = pose),
    // Where the body is and what it is doing: x, z, ry, y (feet height), vy, grounded, running, floating, aiming, aimValid.
    rig: () => desk.rig?.(),
    three: () => desk.three?.(),
  };
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
