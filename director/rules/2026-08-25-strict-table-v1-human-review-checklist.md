<!-- [[Codex | GPT-5.6 | 2026-08-25 | DIRECTOR | BEGIN]] -->
# STRICT_TABLE_V1 — experienced-player review checklist

## Status

`STRICT_TABLE_V1` is a working label, not a frozen rules authority. The current
TypeScript behavior is quarantined evidence and contains at least two critical
rules/security defects: bid 7 is impossible under its 12-trick/`6 + level`
formula, and the AI projection exposes the deterministic deal seed.

An experienced-player rules council must answer every item below against one
dated manifest before the C# rules implementation receives completion credit.

## Council and vocabulary

- [ ] Name the reviewers, their regional/family table traditions, and the
  approval standard for V1.
- [ ] Select table vocabulary: High/Low, Uptown/Downtown, No, or another set.
- [ ] Confirm that the complete plain-language manifest sounds recognizable to
  experienced players, including announcements, books, and score display.

## Deck, deal, and kitty

- [ ] Exact deck: 52, 54 with both Jokers, or another declared composition.
- [ ] Card rank and Joker identity conventions.
- [ ] Deal packet/order, dealer position, auction opener, kitty formation, and
  misdeal ruling.
- [ ] Whether the six-card closed discard counts as a book.
- [ ] Whether Jokers or other cards have discard restrictions.
- [ ] Whether and when the discarded kitty may be revealed or audited.

## Auction and contracts

- [ ] Exact meaning of bids 3 through 7.
- [ ] Minimum legal opening bid.
- [ ] Number of auction opportunities per player and whether a passer may
  re-enter.
- [ ] Forced-dealer behavior after three passes.
- [ ] Equal-number precedence among High, Low, No-Trump High, and No-Trump Low.
- [ ] Whether No-Trump has both High and Low forms.
- [ ] Whether bid 7 is synonymous with Boston, depends on a kitty book, or uses
  another rule.
- [ ] Exact Boston definition, announcement, and score.

## Card order and trick play

- [ ] Ordinary rank order and Ace position in every contract.
- [ ] Big/Little Joker order in High, Low, No-Trump High, and No-Trump Low.
- [ ] Joker status in Low and No-Trump: trump, special rank, powerless, or
  removed.
- [ ] Effective suit and follow-suit rule when a Joker leads.
- [ ] Who makes the opening lead after the kitty closes.
- [ ] Revoke/renege prevention and ruling when discovered after later actions.

## Scoring and match end

- [ ] Score for making a bid, being set, overtricks, No-Trump, and Boston.
- [ ] Whether defenders gain points when a contract is set.
- [ ] Winning score, tie behavior, negative-score behavior, and match boundary.
- [ ] Dealer rotation and direction for subsequent hands.

## Pause, recovery, and substitution

- [ ] Exact conditions for pause, resume, unanimous void, redeal, and abandoned
  hand.
- [ ] Deterministic ruling for timeout, disconnect, leave, and reconnect during
  a committed hand.
- [ ] Between-hand AI substitution and restoration conditions.
- [ ] Host succession if the Human Host leaves.

## Product-authority invariants already adopted

The council may select house rules but may not weaken these product boundaries:

1. The authoritative game service owns shuffle/deal, legal bids/actions, turn,
   trick, score, recovery, and substitution transitions.
2. AI Dealer and Human Host never receive privileged concealed information.
3. AI seats receive only their own hand and legally public history; no seed or
   other deal-reconstruction input appears in the projection.
4. Consequential bids and card plays use preview/confirm unless a player
   explicitly enables an accessible one-click preference.
5. Human Host powers are social/session powers and never edit committed game
   outcomes.
6. A complete versioned manifest is shown, recorded, acknowledged, and bound to
   replay/conformance evidence for every hand.

<!-- [[Codex | GPT-5.6 | 2026-08-25 | DIRECTOR | END]] -->
