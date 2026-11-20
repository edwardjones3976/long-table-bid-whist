import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CATALOG, FIELD_GROUPS, LOOK_VERSION, STARTING_LOOKS } from "../../shared/avatar";
import { Entry } from "../../client/src/hud/Entry";
import { Hud } from "../../client/src/hud/Hud";
import { LookEditor } from "../../client/src/hud/look/LookEditor";
import { net } from "../../client/src/net/store";
import { myLook } from "../../client/src/state/look";

const saved = STARTING_LOOKS[0];

beforeEach(() => {
  // jsdom has no WebGL: the preview shows a line of text, and its label still says the look in words.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  myLook.set(saved);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function open() {
  const onClose = vi.fn();
  render(<LookEditor onClose={onClose} />);
  return onClose;
}

const dialog = () => screen.getByRole("dialog", { name: "Your look" });
const preview = () => within(dialog()).getByRole("img").getAttribute("aria-label") ?? "";
const option = (name: string) => screen.getByRole("radio", { name });
const tab = (name: string) => screen.getByRole("tab", { name });
const news = () => screen.getByTestId("look-news").textContent;

describe("look editor", () => {
  it("opens from the entry screen as an optional step, and Escape goes back to the screen as it was", () => {
    render(<Entry />);
    fireEvent.change(screen.getByLabelText("Your name"), { target: { value: "Ana" } });
    const button = screen.getByRole("button", { name: "Your look" });
    fireEvent.click(button);
    expect(document.activeElement).toBe(dialog());
    fireEvent.keyDown(dialog(), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(button);
    expect((screen.getByLabelText("Your name") as HTMLInputElement).value).toBe("Ana");
  });

  it("opens from the Menu, and Escape leaves the Menu open", () => {
    render(<Hud tables={false} />);
    fireEvent.click(screen.getByTestId("hud-menu"));
    const button = screen.getByTestId("hud-look");
    fireEvent.click(button);
    fireEvent.keyDown(within(dialog()).getByRole("tab", { name: "Body" }), { key: "Escape" });
    expect(screen.queryByRole("dialog", { name: "Your look" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Menu" }).hidden).toBe(false);
    expect(document.activeElement).toBe(button);
  });

  it("changes the draft, not the saved look, and says what changed", () => {
    open();
    fireEvent.click(tab("Hair"));
    fireEvent.click(option("Box braids"));
    expect(option("Box braids").getAttribute("aria-checked")).toBe("true");
    expect(option("Low fade with a part").getAttribute("aria-checked")).toBe("false");
    expect(preview()).toContain("Box braids");
    expect(news()).toBe("Hair style: Box braids.");
    expect(myLook.get().hair).toBe(saved.hair);
  });

  it("shows an option on the preview while it is pointed at, before choosing it", () => {
    open();
    fireEvent.click(tab("Hair"));
    fireEvent.pointerEnter(option("Bald"));
    expect(preview()).toContain("Bald");
    expect(option("Bald").getAttribute("aria-checked")).toBe("false");
    fireEvent.pointerLeave(option("Bald"));
    expect(preview()).toContain("Low fade with a part");
  });

  it("shows the saved look while Before is held, by pointer or by Space", () => {
    open();
    fireEvent.click(tab("Hair"));
    fireEvent.click(option("Bald"));
    const before = screen.getByRole("button", { name: "Before" });
    fireEvent.pointerDown(before);
    expect(preview()).toMatch(/^Your saved look: .*Low fade with a part/);
    fireEvent.pointerUp(before);
    expect(preview()).toMatch(/^Your new look: .*Bald/);
    fireEvent.keyDown(before, { key: " " });
    expect(preview()).toContain("Low fade with a part");
    fireEvent.keyUp(before, { key: " " });
    expect(preview()).toContain("Bald");
  });

  it("turns the preview with two Turn buttons, so no drag is needed, and names each starting look's colours in words", () => {
    open();
    const turns = within(screen.getByRole("group", { name: "Turn" })).getAllByRole("button");
    expect(turns.map((button) => button.getAttribute("aria-label"))).toEqual(["Turn left", "Turn right"]);
    for (const button of turns) fireEvent.click(button);
    // Clicking them changes nothing but the view: the draft is untouched and the editor stays open.
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("button", { name: /^Starting look 1: skin Tone \d+ of 14.*hair, .* top:/ })).toBeTruthy();
  });

  it("switches Before on and off with a click that has no pointer (Enter, a screen reader, voice control)", () => {
    open();
    fireEvent.click(tab("Hair"));
    fireEvent.click(option("Bald"));
    const before = screen.getByRole("button", { name: "Before" });
    expect(before.getAttribute("aria-pressed")).toBe("false");
    fireEvent.click(before, { detail: 0 });
    expect(before.getAttribute("aria-pressed")).toBe("true");
    expect(preview()).toMatch(/^Your saved look: .*Low fade with a part/);
    fireEvent.click(before, { detail: 0 });
    expect(preview()).toMatch(/^Your new look: .*Bald/);
    // The click that ends a pointer hold changes nothing.
    fireEvent.pointerDown(before);
    fireEvent.pointerUp(before);
    fireEvent.click(before, { detail: 1 });
    expect(preview()).toMatch(/^Your new look: /);
  });

  it("names a colour swatch in its heading while it is pointed at, before it is chosen", () => {
    open();
    fireEvent.click(tab("Outfit"));
    const heading = () => screen.getByRole("radiogroup", { name: "Top colour" }).previousElementSibling?.textContent;
    const chosen = heading();
    const wine = within(screen.getByRole("radiogroup", { name: "Top colour" })).getByRole("radio", { name: "Wine" });
    fireEvent.pointerEnter(wine);
    expect(heading()).toBe("Top colour: Wine");
    fireEvent.pointerLeave(wine);
    expect(heading()).toBe(chosen);
    fireEvent.focus(wine);
    expect(heading()).toBe("Top colour: Wine");
  });

  it("says on screen why a choice did nothing, or does not show", () => {
    myLook.set({ ...saved, headwear: "hijab", accessories: [] });
    open();
    fireEvent.click(tab("Extras"));
    const box = (name: string) => screen.getByRole("checkbox", { name });
    fireEvent.click(box("Cap"));
    expect(news()).toBe("Cap does not fit over a hijab.");
    fireEvent.click(box("Hoop earrings"));
    expect(news()).toBe("Hoop earrings on. Hidden under the hijab.");
    expect(screen.getByTestId("look-news").className).not.toContain("sr-only");
  });

  it("keeps my table's status in sight while I edit at a table", () => {
    const summary = {
      id: "spades-1",
      game: "spades",
      status: "lobby",
      seats: [0, 1, 2, 3].map((seat) =>
        seat === 2
          ? { occupant: "human", memberId: "me", name: "Ann", ready: false, connected: true }
          : { occupant: "open", memberId: null, name: null, ready: false, connected: false },
      ),
      host: null,
      managerId: "me",
      options: {},
    };
    const room = { code: "ABCD2345", you: "me", members: [{ id: "me", name: "Ann", connected: true, tableId: "spades-1", look: saved }], tables: [summary] };
    vi.spyOn(net, "getState").mockReturnValue({ ...net.getState(), me: "me", room: room as never });
    open();
    expect(screen.getByTestId("look-table").textContent).toMatch(/^Spades.*: \S/);
  });

  it("steps back and forward with Undo and Redo, which stay focusable when there is nothing to step to", () => {
    open();
    const undo = screen.getByRole("button", { name: "Undo" }) as HTMLButtonElement;
    const redo = screen.getByRole("button", { name: "Redo" }) as HTMLButtonElement;
    const off = (button: HTMLButtonElement) => button.getAttribute("aria-disabled") === "true" && !button.disabled;
    expect(off(undo)).toBe(true);
    fireEvent.click(option("Slender"));
    fireEvent.click(option("Round"));
    fireEvent.click(undo);
    expect(option("Slender").getAttribute("aria-checked")).toBe("true");
    undo.focus();
    fireEvent.click(undo);
    expect(option("Broad").getAttribute("aria-checked")).toBe("true");
    expect(off(undo)).toBe(true);
    // Focus stays on it, inside the editor; pressing it again does nothing and says nothing.
    expect(document.activeElement).toBe(undo);
    const said = screen.getByTestId("look-news").firstChild;
    fireEvent.click(undo);
    expect(screen.getByTestId("look-news").firstChild).toBe(said);
    expect(option("Broad").getAttribute("aria-checked")).toBe("true");
    fireEvent.click(redo);
    fireEvent.click(redo);
    expect(option("Round").getAttribute("aria-checked")).toBe("true");
    expect(off(redo)).toBe(true);
    // A new choice after Undo drops what Redo held.
    fireEvent.click(undo);
    fireEvent.click(option("Medium"));
    expect(off(redo)).toBe(true);
  });

  it("says the same words again as a new line, so a screen reader reads each Undo", () => {
    open();
    fireEvent.click(option("Slender"));
    fireEvent.click(option("Round"));
    const undo = screen.getByRole("button", { name: "Undo" });
    fireEvent.click(undo);
    const first = screen.getByTestId("look-news").firstChild;
    fireEvent.click(undo);
    expect(news()).toBe("Undone.");
    expect(screen.getByTestId("look-news").firstChild).not.toBe(first);
  });

  it("starts from any of six starting looks, and shuffles the whole look or one tab", () => {
    open();
    const starts = within(screen.getByRole("region", { name: "Starting looks" })).getAllByRole("button");
    // Six looks and Shuffle, side by side.
    expect(starts).toHaveLength(7);
    fireEvent.click(screen.getByRole("button", { name: /^Starting look 4:/ }));
    expect(preview()).toContain("Silk press with laid edges");
    // Every draw at its last option: Shuffle this tab changes only the Hair tab's fields.
    const random = vi.spyOn(Math, "random").mockReturnValue(0.999);
    fireEvent.click(tab("Hair"));
    fireEvent.click(screen.getByRole("button", { name: "Shuffle this tab" }));
    expect(option("Bald").getAttribute("aria-checked")).toBe("true");
    fireEvent.click(tab("Body"));
    expect(STARTING_LOOKS[3].build).toBe("round");
    expect(option("Round").getAttribute("aria-checked")).toBe("true");
    // Every draw at its first option: Shuffle changes the whole look.
    random.mockReturnValue(0);
    fireEvent.click(screen.getByRole("button", { name: "Shuffle" }));
    expect(option("Slender").getAttribute("aria-checked")).toBe("true");
  });

  it("saves to this browser and leaves the room alone outside one", () => {
    const stored = new Map<string, string>();
    vi.stubGlobal("localStorage", { getItem: (key: string) => stored.get(key) ?? null, setItem: (key: string, value: string) => stored.set(key, value) });
    const setLook = vi.spyOn(net, "setLook");
    const onClose = open();
    fireEvent.click(tab("Hair"));
    fireEvent.click(option("Bald"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(myLook.get().hair).toBe("bald");
    expect(JSON.parse(stored.get("mansion.look")!)).toEqual({ v: LOOK_VERSION, look: myLook.get() });
    expect(setLook).not.toHaveBeenCalled();
  });

  it("sends the saved look to the room when in one", () => {
    vi.spyOn(net, "getState").mockReturnValue({ ...net.getState(), room: { code: "ABCD2345", members: [], tables: [] } as never });
    const setLook = vi.spyOn(net, "setLook").mockResolvedValue({ ok: true });
    open();
    fireEvent.click(tab("Shoes"));
    fireEvent.click(option("Boots"));
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(setLook).toHaveBeenCalledWith({ ...saved, shoes: "boots" });
  });

  it("throws the changes away on Cancel", () => {
    const onClose = open();
    fireEvent.click(tab("Hair"));
    fireEvent.click(option("Bald"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(myLook.get()).toEqual(saved);
    cleanup();
    open();
    fireEvent.click(tab("Hair"));
    expect(option("Low fade with a part").getAttribute("aria-checked")).toBe("true");
  });

  it("wears at most three accessories, says so when full, and swaps a second pair of glasses for the first", () => {
    open();
    fireEvent.click(tab("Extras"));
    const box = (name: string) => screen.getByRole("checkbox", { name });
    expect(saved.accessories).toEqual(["glasses-round", "watch"]);
    fireEvent.click(box("Necklace"));
    expect(box("Necklace").getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("group", { name: "Accessories" }).getAttribute("aria-describedby")).toBe("look-accessories-note");
    expect(document.getElementById("look-accessories-note")!.textContent).toMatch(/3 of 3 on/);
    expect(box("Bracelets").getAttribute("aria-disabled")).toBe("true");
    fireEvent.click(box("Bracelets"));
    expect(box("Bracelets").getAttribute("aria-checked")).toBe("false");
    expect(news()).toMatch(/most at once/);
    fireEvent.click(box("Square glasses"));
    expect(box("Square glasses").getAttribute("aria-checked")).toBe("true");
    expect(box("Round glasses").getAttribute("aria-checked")).toBe("false");
    expect(news()).toBe("Square glasses on. Round glasses taken off.");
    // Taking one off makes room again.
    fireEvent.click(box("Watch"));
    expect(box("Bracelets").getAttribute("aria-disabled")).toBeNull();
  });

  it("says before any press why a hat cannot go over the head covering worn", () => {
    open();
    fireEvent.click(tab("Hair"));
    fireEvent.click(option("Crown hat"));
    fireEvent.click(tab("Extras"));
    const note = document.getElementById("look-accessories-note")!;
    expect(note.textContent).toMatch(/Hats do not fit over a crown hat\./);
    for (const name of ["Cap", "Bucket hat", "Fedora"]) {
      const hat = screen.getByRole("checkbox", { name });
      expect(hat.getAttribute("aria-disabled")).toBe("true");
      expect(hat.getAttribute("aria-describedby")).toBe("look-accessories-note");
    }
    // Over a durag a hat fits, and the note says nothing of hats.
    fireEvent.click(tab("Hair"));
    fireEvent.click(option("Durag"));
    fireEvent.click(tab("Extras"));
    expect(document.getElementById("look-accessories-note")!.textContent).not.toMatch(/Hats/);
    expect(screen.getByRole("checkbox", { name: "Cap" }).getAttribute("aria-disabled")).toBeNull();
  });

  it("moves through the tabs and an option group with the keyboard, trying before choosing", () => {
    open();
    const body = tab("Body");
    body.focus();
    fireEvent.keyDown(body, { key: "ArrowRight" });
    expect(document.activeElement).toBe(tab("Face"));
    expect(tab("Face").getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(tab("Face"), { key: "End" });
    expect(tab("Extras").getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(tab("Extras"), { key: "ArrowRight" });
    expect(tab("Body").getAttribute("aria-selected")).toBe("true");
    // One stop per radio group: the chosen option.
    expect(option("Broad").tabIndex).toBe(0);
    expect(option("Round").tabIndex).toBe(-1);
    option("Broad").focus();
    fireEvent.keyDown(option("Broad"), { key: "ArrowRight" });
    expect(document.activeElement).toBe(option("Round"));
    expect(preview()).toContain("Round build");
    expect(option("Round").getAttribute("aria-checked")).toBe("false");
    fireEvent.keyDown(option("Round"), { key: "Home" });
    expect(document.activeElement).toBe(option("Slender"));
    fireEvent.click(option("Slender"));
    expect(option("Slender").getAttribute("aria-checked")).toBe("true");
  });

  it("keeps Tab inside the editor and the world's keys out of it", () => {
    open();
    const save = screen.getByRole("button", { name: "Save" });
    save.focus();
    fireEvent.keyDown(save, { key: "Tab" });
    const first = within(screen.getByRole("region", { name: "Starting looks" })).getAllByRole("button")[0];
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(save);
    const heard = vi.fn();
    window.addEventListener("keydown", heard);
    fireEvent.keyDown(save, { key: "w", code: "KeyW" });
    window.removeEventListener("keydown", heard);
    expect(heard).not.toHaveBeenCalled();
  });

  it("gives every option on every tab a name, one button per catalog option", () => {
    open();
    for (const [group, fields] of Object.entries(FIELD_GROUPS)) {
      fireEvent.click(tab(group[0].toUpperCase() + group.slice(1)));
      const options = [...screen.queryAllByRole("radio"), ...screen.queryAllByRole("checkbox")];
      expect(options).toHaveLength(fields.reduce((sum, field) => sum + CATALOG[field].length, 0));
      for (const button of options) expect(button.getAttribute("aria-label") ?? button.textContent?.replace("✓", "").trim()).toBeTruthy();
      expect(screen.getAllByRole("radio", { name: /\w/ }).length + screen.queryAllByRole("checkbox", { name: /\w/ }).length).toBe(options.length);
    }
    // Colour swatches are named by their colour, never shown by colour alone.
    fireEvent.click(tab("Shoes"));
    expect(option("Forest green").getAttribute("title")).toBe("Forest green");
  });
});
