import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Entry } from "../../client/src/hud/Entry";
import { local } from "../../client/src/state/local";

afterEach(() => {
  cleanup();
  history.replaceState(null, "", "/");
});

describe("entry screen", () => {
  it("has labelled fields and prefills the code from an invite link", () => {
    history.replaceState(null, "", "/?room=abcd2345");
    render(<Entry />);
    expect(screen.getByLabelText("Your name")).toBeTruthy();
    expect((screen.getByLabelText("Room code from a friend") as HTMLInputElement).value).toBe("ABCD2345");
    expect(screen.getByRole("button", { name: "Create a room" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Join with a code" })).toBeTruthy();
    // The connection state is words plus a shape, never colour alone.
    expect(screen.getByRole("status").textContent).toMatch(/Connecting/);
  });

  it("asks for a name before contacting the server", () => {
    render(<Entry />);
    fireEvent.click(screen.getByRole("button", { name: "Create a room" }));
    expect(screen.getByRole("alert").textContent).toBe("Type your name first.");
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Ann" } });
    fireEvent.click(screen.getByRole("button", { name: "Join with a code" }));
    expect(screen.getByRole("alert").textContent).toBe("Type the room code first.");
  });
});

describe("local settings", () => {
  it("starts with the comfortable defaults and persists changes", () => {
    const { theme, comfort, seated, xrActive } = local.getState();
    expect(theme).toBe("july4");
    expect(comfort).toMatchObject({ locomotion: "teleport", snapTurn: true, snapDegrees: 30, dominantHand: "right", uiScale: 1 });
    expect(seated).toBeNull();
    expect(xrActive).toBe(false);
    // The test runner's Node has no usable localStorage (the store shrugs that off), so one is supplied here.
    const stored = new Map<string, string>();
    vi.stubGlobal("localStorage", { setItem: (key: string, value: string) => stored.set(key, value) });
    local.set({ theme: "newyear" });
    local.setComfort({ locomotion: "smooth" });
    vi.unstubAllGlobals();
    const saved = JSON.parse(stored.get("mansion.settings")!);
    expect(saved).toMatchObject({ theme: "newyear", comfort: { locomotion: "smooth", snapTurn: true } });
  });
});
