import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanCode, Entry } from "../../client/src/hud/Entry";
import { net } from "../../client/src/net/store";
import { Hud } from "../../client/src/hud/Hud";
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

  it("keeps only room-code characters, so a pasted code with a dash or lower case still works", () => {
    expect(cleanCode("abcd-2345")).toBe("ABCD2345");
    // 0, 1, I and O are left out of codes because they look alike.
    expect(cleanCode(" o0I1 wxyz 9 ")).toBe("WXYZ9");
    expect(cleanCode("ABCDEFGHJKLM")).toBe("ABCDEFGH");
    render(<Entry />);
    const field = screen.getByLabelText("Room code from a friend") as HTMLInputElement;
    fireEvent.change(field, { target: { value: "zz-zz zzzz" } });
    expect(field.value).toBe("ZZZZZZZZ");
  });

  it("makes joining the main button on an invite link, and hosting the main button otherwise", () => {
    render(<Entry />);
    expect(screen.queryByTestId("entry-invite")).toBeNull();
    expect(screen.getByRole("button", { name: "Create a room" }).className).toBe("primary");
    cleanup();
    history.replaceState(null, "", "/?room=wxyz2345");
    render(<Entry />);
    expect(screen.getByTestId("entry-invite").textContent).toContain("WXYZ2345");
    expect(screen.getByRole("button", { name: "Join with a code" }).className).toBe("primary");
    expect(screen.getByRole("button", { name: "Create a room" }).className).toBe("");
  });

  it("remembers the name from the last visit", () => {
    const saved = new Map([["mansion.name", "Bea"]]);
    vi.stubGlobal("localStorage", { getItem: (key: string) => saved.get(key) ?? null, setItem: (key: string, value: string) => saved.set(key, value) });
    render(<Entry />);
    const field = screen.getByLabelText("Your name") as HTMLInputElement;
    expect(field.value).toBe("Bea");
    // Entering saves the name typed now.
    const create = vi.spyOn(net, "createRoom").mockResolvedValue(undefined as never);
    fireEvent.change(field, { target: { value: "Cy" } });
    fireEvent.click(screen.getByRole("button", { name: "Create a room" }));
    expect(create).toHaveBeenCalledWith("Cy");
    expect(saved.get("mansion.name")).toBe("Cy");
    create.mockRestore();
    vi.unstubAllGlobals();
  });
});

describe("HUD", () => {
  it("keeps everything but one line in a Menu dialog that takes focus and closes with Esc", () => {
    render(<Hud tables />);
    const button = screen.getByTestId("hud-menu");
    const menu = screen.getByRole("dialog", { hidden: true });
    expect(screen.getByTestId("hud-table").getAttribute("aria-live")).toBe("polite");
    expect(menu.hidden).toBe(true);
    expect(button.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(button);
    expect(menu.hidden).toBe(false);
    expect(document.activeElement).toBe(menu);
    for (const id of ["invite", "enter-vr", "settings-toggle", "controls-toggle", "leave-room", "members", "table-picker"]) {
      expect(menu.contains(screen.getByTestId(id))).toBe(true);
    }
    // The text panel is opt-in.
    fireEvent.click(screen.getByTestId("settings-toggle"));
    expect((screen.getByLabelText("Text table panel") as HTMLInputElement).checked).toBe(false);

    fireEvent.keyDown(menu, { key: "Escape" });
    expect(menu.hidden).toBe(true);
    // Nothing keeps focus, so the next Space is a jump rather than a press of the Menu button.
    expect(document.activeElement).toBe(document.body);
  });

  it("opens the text panel when a table is picked from the menu's list", () => {
    render(<Hud tables />);
    fireEvent.click(screen.getByTestId("hud-menu"));
    expect(local.getState().comfort.textPanel).toBe(false);
    fireEvent.click(screen.getByTestId("table-spades-1"));
    expect(local.getState().comfort.textPanel).toBe(true);
    expect(local.getState().focusTable).toBe("spades-1");
    local.setComfort({ textPanel: false });
    local.set({ focusTable: null });
  });

  it("opens the menu on Settings when the hidden Settings button is pressed (the gamepad's Start button), and leaves the table list to the text panel", () => {
    render(<Hud tables={false} />);
    fireEvent.click(screen.getByTestId("settings-toggle"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByTestId("theme")).toBeTruthy();
    expect(screen.queryByTestId("table-picker")).toBeNull();
  });
});

describe("local settings", () => {
  it("starts with the comfortable defaults and persists changes", () => {
    const { theme, comfort, seated, xrActive } = local.getState();
    expect(theme).toBe("golden");
    // Walking is the normal way to move: "smooth" is the Walk and teleport mode.
    expect(comfort).toMatchObject({ locomotion: "smooth", jump: true, snapTurn: true, snapDegrees: 30, dominantHand: "right", uiScale: 1 });
    expect(seated).toBeNull();
    expect(xrActive).toBe(false);
    // The test runner's Node has no usable localStorage (the store shrugs that off), so one is supplied here.
    const stored = new Map<string, string>();
    vi.stubGlobal("localStorage", { setItem: (key: string, value: string) => stored.set(key, value) });
    local.set({ theme: "newyear" });
    local.setComfort({ locomotion: "teleport" });
    vi.unstubAllGlobals();
    const saved = JSON.parse(stored.get("mansion.settings")!);
    expect(saved).toMatchObject({ theme: "newyear", comfort: { locomotion: "teleport", snapTurn: true } });
  });
});
