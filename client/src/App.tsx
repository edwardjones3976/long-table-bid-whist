import { Canvas } from "@react-three/fiber";
import { XR } from "@react-three/xr";
import { Component, useEffect, useState, type ReactNode } from "react";
import type { TableId } from "../../shared/protocol";
import { Player } from "./controls/Player";
import { Entry } from "./hud/Entry";
import { Hint, Hud } from "./hud/Hud";
import { mySeat, myTable, net, useStore } from "./net/store";
import { local, useLocal } from "./state/local";
import { xrStore } from "./state/xr";
import { TablePanelDom } from "./tableui/TablePanelDom";
import { Tables } from "./tableui/Tables";
import { VrMenu } from "./tableui/VrMenu";
import { Avatars } from "./world/Avatars";
import { Bots } from "./world/Bots";
import { EYE_HEIGHT_STANDING, nearestTable, seatPose, spawn, TABLE_REACH } from "./world/layout";
import { World } from "./world/World";

/** Keeps the table panel and HUD usable on a device that cannot draw the 3D view. */
class SceneBoundary extends Component<{ children: ReactNode; onFailed: () => void }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onFailed();
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <p className="scene-failed" role="alert">
        The 3D view could not start on this device. You can still play from the table panel.
      </p>
    );
  }
}

/** While I am at a table, local.seated is my seat's pose (or the host corner); cleared when I stand. */
function useSeating(): void {
  const tableId = useStore((state) => myTable(state)?.id ?? null);
  const seat = useStore(mySeat);
  useEffect(() => {
    local.set({ seated: tableId ? seatPose(tableId, seat) : null, selection: [] });
  }, [tableId, seat]);
}

/** Ten times a second: report my pose, and offer the panel of the table I have walked up to. */
function usePoseLink(): void {
  useEffect(() => {
    let near: TableId | null = null;
    const timer = setInterval(() => {
      const pose = local.getState().playerPose;
      if (!pose) return;
      net.sendPose(pose);
      const { spot, distance } = nearestTable(pose.x, pose.z);
      const now = distance <= TABLE_REACH ? spot.id : null;
      // Only on arriving or leaving, so a table picked by hand stays picked while standing still.
      if (now !== near) local.set({ focusTable: now });
      near = now;
    }, 100);
    return () => clearInterval(timer);
  }, []);
}

function Mansion() {
  useSeating();
  usePoseLink();
  const theme = useLocal((state) => state.theme);
  const uiScale = useLocal((state) => state.comfort.uiScale);
  const textPanel = useLocal((state) => state.comfort.textPanel);
  const [failed, setFailed] = useState(false);
  const [pad, setPad] = useState(false);
  useEffect(() => {
    // The same test as controls/input.ts pollGamepad: only a standard-mapping pad is read.
    const check = (): void => setPad((navigator.getGamepads?.() ?? []).some((p) => p?.mapping === "standard"));
    check();
    addEventListener("gamepadconnected", check);
    addEventListener("gamepaddisconnected", check);
    return () => {
      removeEventListener("gamepadconnected", check);
      removeEventListener("gamepaddisconnected", check);
    };
  }, []);
  // The text panel is opt-in: the table itself is the interface. Without a 3D view it is the only one, and the
  // gamepad bumpers step through its controls, so it shows while a gamepad is connected.
  const panel = failed || textPanel || pad || new URLSearchParams(location.search).get("panel") === "1";
  return (
    <div className="mansion" data-theme={theme} style={{ fontSize: `${uiScale * 100}%` }}>
      <SceneBoundary onFailed={() => setFailed(true)}>
        <Canvas className="scene" camera={{ fov: 70, near: 0.05, far: 200, position: [spawn.x, EYE_HEIGHT_STANDING, spawn.z] }}>
          <XR store={xrStore}>
            <World />
            <Player>
              <VrMenu />
            </Player>
            <Tables />
            <Avatars />
            <Bots />
          </XR>
        </Canvas>
      </SceneBoundary>
      <Hud tables={!panel} />
      {panel ? <TablePanelDom /> : <Hint />}
    </div>
  );
}

export default function App() {
  const inRoom = useStore((state) => state.room !== null);
  useEffect(() => {
    net.open();
  }, []);
  // Out of the room (left, or the place was not kept): end VR so the entry page and its message can be seen.
  useEffect(() => {
    if (!inRoom) xrStore.getState().session?.end().catch(() => {});
  }, [inRoom]);
  return inRoom ? <Mansion /> : <Entry />;
}
