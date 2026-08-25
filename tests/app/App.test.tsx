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

function driveToSummary() {
  let guard = 0;
  while (!screen.queryByRole("button", { name: /next hand/i }) && guard++ < 120) {
    const pass = screen.queryByRole("button", { name: /^pass$/i });
    if (pass && !pass.hasAttribute("disabled")) {
      fireEvent.click(pass);
      continue;
    }

    const confirmNoTrump = screen.queryByRole("button", { name: /confirm no trump/i });
    if (confirmNoTrump) {
      fireEvent.click(confirmNoTrump);
      continue;
    }

    const trump = screen.queryByRole("button", { name: /^spades$/i });
    if (trump) {
      fireEvent.click(trump);
      continue;
    }

    const closeKitty = screen.queryByRole("button", { name: /close kitty/i });
    if (closeKitty && !closeKitty.hasAttribute("disabled")) {
      const hand = screen.getByRole("group", { name: /your hand/i });
      const cards = within(hand).getAllByRole("button");
      for (let i = 0; i < 6; i += 1) {
        fireEvent.click(cards[i]);
      }
      fireEvent.click(closeKitty);
      continue;
    }

    const playCard = screen.queryByRole("button", { name: /^play card$/i });
    if (playCard) {
      fireEvent.click(playCard);
      continue;
    }

    const hand = screen.queryByRole("group", { name: /your hand/i });
    if (hand) {
      const legal = within(hand)
        .getAllByRole("button")
        .find((button) => !button.hasAttribute("disabled"));
      if (legal) {
        fireEvent.click(legal);
        const confirm = screen.queryByRole("button", { name: /^play card$/i });
        if (confirm) fireEvent.click(confirm);
      }
    }
  }
}

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
    expect(screen.getByText(/STRICT_TABLE_V1 working draft/i)).toBeTruthy();
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

  it("uses preview and confirmation for a legal auction bid", () => {
    enterTable("AI Dealer");
    const bidButtons = screen.getAllByRole("button", { name: /^3 High$/i });
    expect(bidButtons.length).toBeGreaterThan(0);
    fireEvent.click(bidButtons[0]);
    expect(screen.getByText(/preview: 3 high/i)).toBeTruthy();
    clickButton(/cancel/i);
    expect(screen.queryByText(/preview: 3 high/i)).toBeNull();
    fireEvent.click(bidButtons[0]);
    clickButton(/confirm bid/i);
    expect(screen.queryByText(/preview: 3 high/i)).toBeNull();
  });

  it("does not render a selectable level-7 contract control", () => {
    enterTable("AI Dealer");
    const buttons = screen.getAllByRole("button");
    const levelSevenBids = buttons.filter((button) => /^7 /.test(button.textContent ?? ""));
    expect(levelSevenBids).toHaveLength(0);
    const noTrumpBids = buttons.filter((button) => /no trump/i.test(button.textContent ?? ""));
    expect(noTrumpBids).toHaveLength(0);
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
