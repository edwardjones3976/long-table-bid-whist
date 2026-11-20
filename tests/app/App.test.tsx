import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import App from "../../src/App";
import { newTable } from "../../src/game";

afterEach(() => {
  cleanup();
});

function clickButton(name: RegExp | string) {
  fireEvent.click(screen.getByRole("button", { name }));
}

function enterTable(mode: "AI Dealer" | "Human Host") {
  render(<App />);
  clickButton(new RegExp(mode, "i"));
  clickButton(/enter the table/i);
}

// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | BEGIN]]
/**
 * Drives the desktop surface with the shared preview / Confirm path only. There
 * is no surface-specific shortcut into the rules engine to take.
 */
function driveToSummary() {
  let guard = 0;
  while (!screen.queryByRole("button", { name: /next hand/i }) && guard++ < 300) {
    if (screen.queryByText(/select 6 cards to discard/i)) {
      const kittyHand = screen.getByRole("group", { name: /your hand/i });
      const cards = within(kittyHand).getAllByRole("button");
      for (let i = 0; i < 6; i += 1) fireEvent.click(cards[i]);
      const closeKitty = screen.getByRole("button", { name: /^confirm$/i });
      if (closeKitty.hasAttribute("disabled")) break;
      fireEvent.click(closeKitty);
      continue;
    }

    const confirm = screen.queryByRole("button", { name: /^confirm$/i });
    if (confirm && !confirm.hasAttribute("disabled")) {
      fireEvent.click(confirm);
      continue;
    }

    const declare = screen.queryByRole("group", { name: /declare trump/i });
    if (declare) {
      fireEvent.click(within(declare).getAllByRole("button")[0]);
      continue;
    }

    const bidGroup = screen.queryByRole("group", { name: /your bid/i });
    if (bidGroup) {
      const options = within(bidGroup)
        .getAllByRole("button")
        .filter((button) => !button.hasAttribute("disabled"));
      if (!options.length) break;
      // Highest legal contract, so South also exercises declaration and kitty.
      fireEvent.click(options[options.length - 1]);
      continue;
    }

    const hand = screen.queryByRole("group", { name: /your hand/i });
    if (hand) {
      const legal = within(hand)
        .getAllByRole("button")
        .find((button) => !button.hasAttribute("disabled"));
      if (!legal) break;
      fireEvent.click(legal);
      continue;
    }

    break;
  }
}
// [[Claude | Opus 5 | 2026-08-25 | LT-CLAUDE-S1-XR-002 | END]]

function openHostDrawer() {
  const trigger = screen.getByRole("button", { name: /^host$/i });
  if (trigger.getAttribute("aria-expanded") !== "true") {
    fireEvent.click(trigger);
  }
  return screen.getByLabelText(/host controls/i);
}

function closeHostDrawer() {
  const trigger = screen.getByRole("button", { name: /^host$/i });
  if (trigger.getAttribute("aria-expanded") === "true") {
    fireEvent.click(trigger);
  }
}

describe("App browser surface", () => {
  it("renders setup with both dealer and host choices", () => {
    render(<App />);
    expect(screen.getByRole("heading", { name: /the long table/i })).toBeTruthy();
    expect(screen.getByText(/RESTRICTED_TABLE_SLICE_0_1 working draft/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /ai dealer/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /human host/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /enter the table/i }).hasAttribute("disabled")).toBe(true);
  });

  it("explains authority boundaries for AI Dealer and Human Host", () => {
    render(<App />);
    clickButton(/ai dealer/i);
    expect(screen.getByText(/rules engine alone owns shuffle/i)).toBeTruthy();
    clickButton(/human host/i);
    expect(screen.getByText(/cannot inspect hands/i)).toBeTruthy();
  });

  it("uses one preview, Cancel, and Confirm path for a legal auction bid", () => {
    enterTable("AI Dealer");
    const bidButtons = screen.getAllByRole("button", { name: /^3 High$/i });
    expect(bidButtons.length).toBeGreaterThan(0);

    expect(screen.getByRole("button", { name: /^confirm$/i }).hasAttribute("disabled")).toBe(true);
    fireEvent.click(bidButtons[0]);
    expect(screen.getByText(/preview: 3 high/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /^confirm$/i }).hasAttribute("disabled")).toBe(false);

    clickButton(/^cancel$/i);
    expect(screen.queryByText(/preview: 3 high/i)).toBeNull();
    expect(screen.getByRole("button", { name: /^confirm$/i }).hasAttribute("disabled")).toBe(true);

    fireEvent.click(bidButtons[0]);
    clickButton(/^confirm$/i);
    expect(screen.queryByText(/preview: 3 high/i)).toBeNull();
  });

  it("shows the build identity on the setup screen and at the table", () => {
    render(<App />);
    expect(screen.getByText(/^Build [\w.-]+$/)).toBeTruthy();
    cleanup();

    enterTable("AI Dealer");
    const rail = screen.getByLabelText(/score and contract/i);
    expect(within(rail).getByText("Build")).toBeTruthy();
  });

  it("shows level 7 and No Trump as visibly disabled with the published notice", () => {
    enterTable("AI Dealer");
    const withheld = screen.getByRole("group", { name: /withheld contracts/i });
    const withheldButtons = within(withheld).getAllByRole("button");

    expect(withheldButtons.map((button) => button.textContent)).toEqual(["Level 7", "No Trump"]);
    withheldButtons.forEach((button) => {
      expect(button.hasAttribute("disabled")).toBe(true);
      expect(button.getAttribute("aria-describedby")).toBe("alpha-exclusion-notice");
    });
    expect(
      screen.getByText(
        /not included in alpha 0\.1; available after the published-rules stage\./i,
      ),
    ).toBeTruthy();
  });

  it("offers only levels 3 to 6 in High or Low as selectable contracts", () => {
    enterTable("AI Dealer");
    const bidGroup = screen.getByRole("group", { name: /your bid/i });
    const selectable = within(bidGroup)
      .getAllByRole("button")
      .filter((button) => !button.hasAttribute("disabled") && button.textContent !== "Pass");

    expect(selectable.length).toBeGreaterThan(0);
    selectable.forEach((button) => {
      expect(button.textContent ?? "").toMatch(/^[3-6] (High|Low)$/);
    });
  });

  it("exposes an honest WebXR entry state without claiming device proof", () => {
    enterTable("AI Dealer");
    const xrButton = screen.getByRole("button", { name: /webxr/i });
    expect(xrButton).toBeTruthy();
    expect(
      screen.getByText(/checking for immersive webxr support|immersive webxr is unavailable here/i),
    ).toBeTruthy();
    expect(screen.queryByText(/meta avatar.*ready/i)).toBeNull();
    expect(screen.getByText(/seated calibration: table \d+ cm high/i)).toBeTruthy();
  });

  it("names the table guide and keeps it visibly non-human", () => {
    enterTable("AI Dealer");
    expect(screen.getByLabelText(/AI Dealer — Table Guide robot/i)).toBeTruthy();
    expect(screen.getAllByText(/AI Dealer — Table Guide/).length).toBeGreaterThan(0);
  });

  it("keeps opponent card faces, concealed labels, and seed out of the DOM", () => {
    const concealed = newTable("long-table-001");
    const hiddenLabel = concealed.hands.north[0]?.label ?? "";
    expect(hiddenLabel.length).toBeGreaterThan(0);

    enterTable("AI Dealer");
    const html = document.body.innerHTML;
    expect(html).not.toContain("long-table-001");
    expect(html).not.toContain(hiddenLabel);
    expect(screen.getAllByText(/\d+ cards/i).length).toBeGreaterThan(0);
  });

  it("does not keep closed drawer controls in the document or focus order", () => {
    enterTable("Human Host");
    expect(screen.queryByLabelText(/host controls/i)).toBeNull();
    expect(screen.queryByLabelText(/accessibility controls/i)).toBeNull();

    openHostDrawer();
    expect(screen.getByLabelText(/host controls/i)).toBeTruthy();
    expect(screen.queryByLabelText(/accessibility controls/i)).toBeNull();

    closeHostDrawer();
    expect(screen.queryByLabelText(/host controls/i)).toBeNull();

    clickButton(/accessibility/i);
    expect(screen.getByLabelText(/accessibility controls/i)).toBeTruthy();
    expect(screen.queryByLabelText(/host controls/i)).toBeNull();
    clickButton(/accessibility/i);
    expect(screen.queryByLabelText(/accessibility controls/i)).toBeNull();
  });

  it("keeps the Human Host demo local and free of any network delivery", () => {
    enterTable("Human Host");
    const hostDrawer = openHostDrawer();
    expect(
      within(hostDrawer).getByText(/private invite simulation only . no network delivery/i),
    ).toBeTruthy();
    expect(
      within(hostDrawer).getByText(/block, leave, report, and constrained remove are simulated locally/i),
    ).toBeTruthy();
    expect(within(hostDrawer).getByText(/host cannot/i)).toBeTruthy();
  });

  it("ships no music path and keeps Music Off permanently pressed", () => {
    render(<App />);
    expect(screen.getByText(/no music path ships in this prototype/i)).toBeTruthy();
    cleanup();

    enterTable("Human Host");
    clickButton(/accessibility/i);
    const musicOff = screen.getByRole("button", { name: /music off/i });
    expect(musicOff.hasAttribute("disabled")).toBe(true);
    expect(musicOff.getAttribute("aria-pressed")).toBe("true");

    const hostDrawer = openHostDrawer();
    expect(
      within(hostDrawer).getByText(/no upload, cache,\s*stream, or recording controls are provided/i),
    ).toBeTruthy();
  });

  it("exposes host authority boundaries and accessibility controls", () => {
    enterTable("Human Host");
    const hostDrawer = openHostDrawer();
    expect(within(hostDrawer).getByText(/host cannot/i)).toBeTruthy();
    expect(within(hostDrawer).getByText(/invite:/i)).toBeTruthy();
    expect(within(hostDrawer).getByRole("button", { name: /mute/i })).toBeTruthy();
    expect(within(hostDrawer).getByRole("button", { name: /pause between hands/i })).toBeTruthy();
    expect(within(hostDrawer).getByRole("button", { name: /add ai/i })).toBeTruthy();

    clickButton(/accessibility/i);
    const a11yDrawer = screen.getByLabelText(/accessibility controls/i);
    expect(within(a11yDrawer).getByRole("button", { name: /high contrast/i })).toBeTruthy();
    expect(within(a11yDrawer).getByRole("button", { name: /reduced motion/i })).toBeTruthy();
    expect(within(a11yDrawer).getByRole("button", { name: /large cards/i })).toBeTruthy();
    expect(within(a11yDrawer).getByRole("button", { name: /captions/i })).toBeTruthy();
    expect(within(a11yDrawer).getByRole("button", { name: /effects off/i })).toBeTruthy();
    expect(within(a11yDrawer).getByRole("button", { name: /music off/i })).toBeTruthy();
    expect(within(a11yDrawer).getByRole("button", { name: /one-click play/i })).toBeTruthy();
  });

  it("disables pause between hands during auction with a visible explanation", () => {
    enterTable("Human Host");
    const hostDrawer = openHostDrawer();
    const pauseDuringAuction = within(hostDrawer).getByRole("button", { name: /pause between hands/i });
    expect(pauseDuringAuction.hasAttribute("disabled")).toBe(true);
    expect(pauseDuringAuction.getAttribute("aria-describedby")).toBe("pause-between-hands-hint");
    expect(within(hostDrawer).getByText(/becomes available only after the hand summary/i)).toBeTruthy();
    expect(screen.getByText(/your turn/i)).toBeTruthy();

    driveToSummary();
    const hostDrawerAtSummary = openHostDrawer();
    const pauseAtSummary = within(hostDrawerAtSummary).getByRole("button", { name: /pause between hands/i });
    expect(pauseAtSummary.hasAttribute("disabled")).toBe(false);
    fireEvent.click(pauseAtSummary);
    expect(screen.getByText(/table paused/i)).toBeTruthy();
    expect(within(hostDrawerAtSummary).getByRole("button", { name: /resume/i })).toBeTruthy();
  });

  it("blocks West locally with visible seat effect and local-only copy", () => {
    enterTable("Human Host");
    const hostDrawer = openHostDrawer();
    fireEvent.click(within(hostDrawer).getByRole("button", { name: /^block$/i }));
    expect(within(hostDrawer).getByText(/west marked as blocked in this local prototype/i)).toBeTruthy();
    expect(within(hostDrawer).getByText(/marker changes no game state/i)).toBeTruthy();
    expect(screen.getAllByText(/blocked locally/i).length).toBeGreaterThan(0);
    expect(screen.getByLabelText(/west open avatar anchor blocked locally/i)).toBeTruthy();
  });

  it("records report locally without external filing language", () => {
    enterTable("Human Host");
    const hostDrawer = openHostDrawer();
    fireEvent.click(within(hostDrawer).getByRole("button", { name: /^report$/i }));
    expect(within(hostDrawer).getByText(/report recorded locally only/i)).toBeTruthy();
    expect(within(hostDrawer).getByText(/was not filed or sent externally/i)).toBeTruthy();
  });

  it("requires leave confirmation during a hand and supports cancel", () => {
    enterTable("Human Host");
    const hostDrawer = openHostDrawer();
    fireEvent.click(within(hostDrawer).getByRole("button", { name: /^leave$/i }));
    expect(within(hostDrawer).getByRole("button", { name: /confirm leave/i })).toBeTruthy();
    fireEvent.click(within(hostDrawer).getByRole("button", { name: /cancel/i }));
    expect(screen.getByText(/your turn/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /enter the table/i })).toBeNull();

    fireEvent.click(within(hostDrawer).getByRole("button", { name: /^leave$/i }));
    fireEvent.click(within(hostDrawer).getByRole("button", { name: /confirm leave/i }));
    expect(screen.getByRole("button", { name: /enter the table/i })).toBeTruthy();
  });

  it("disables remove during auction and completes remove-to-AI visual handoff at summary", () => {
    enterTable("Human Host");
    const hostDrawer = openHostDrawer();
    const removeDuringAuction = within(hostDrawer).getByRole("button", { name: /remove player/i });
    expect(removeDuringAuction.hasAttribute("disabled")).toBe(true);

    driveToSummary();
    const scoreBefore = screen.getAllByText(/^North & South$/i)[0].closest(".team-line")?.textContent ?? "";
    const hostDrawerAtSummary = openHostDrawer();
    fireEvent.click(within(hostDrawerAtSummary).getByRole("button", { name: /remove player/i }));
    fireEvent.click(within(hostDrawerAtSummary).getByRole("button", { name: /confirm removal/i }));
    expect(within(hostDrawerAtSummary).getByText(/between-hand removal \(simulated\)/i)).toBeTruthy();
    expect(screen.getByLabelText(/west open avatar anchor marked for between-hand removal/i)).toBeTruthy();

    fireEvent.click(within(hostDrawerAtSummary).getByRole("button", { name: /add ai/i }));
    expect(within(hostDrawerAtSummary).getByText(/ai substitute ready for the next hand/i)).toBeTruthy();
    expect(screen.getByLabelText(/west open avatar anchor ai substitute ready for next hand/i)).toBeTruthy();
    expect(screen.getByText(/^AI substitute$/i)).toBeTruthy();

    const scoreAfter = screen.getAllByText(/^North & South$/i)[0].closest(".team-line")?.textContent ?? "";
    expect(scoreAfter).toBe(scoreBefore);
    fireEvent.click(screen.getByRole("button", { name: /next hand/i }));
    expect(screen.getByLabelText(/west open avatar anchor ai substitute ready for next hand/i)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /next hand/i })).toBeNull();
  });

  it("advances hand and dealer state on next hand", () => {
    enterTable("AI Dealer");
    const handLines = screen.getAllByText(/^Hand$/i);
    const handRow = handLines[0].closest(".team-line");
    const initialHandNumber = handRow?.textContent ?? "";

    driveToSummary();
    expect(screen.getByRole("button", { name: /next hand/i })).toBeTruthy();
    clickButton(/next hand/i);

    const nextHandRow = screen.getAllByText(/^Hand$/i)[0].closest(".team-line");
    expect(nextHandRow?.textContent).not.toEqual(initialHandNumber);
    expect(screen.queryByRole("button", { name: /next hand/i })).toBeNull();
    expect(screen.getByText(/auction/i)).toBeTruthy();
  });
});
