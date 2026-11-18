# The Long Table — Bid Whist (Android)

An authentic, accessible four-seat **Bid Whist** Android application built with **Kotlin** and **Jetpack Compose (Material 3)**.

## Features

- **Deterministic Strict Table Rules Engine (`strict-table-v1.0.0`)**:
  - 54-card deck (52 standard cards + Big Joker and Little Joker), 12 cards per seat, and a 6-card Kitty.
  - Full auction (`4–7` books, `Uptown` / `Downtown` direction, `No-Trump` outranking suit bids at the same level, forced minimum dealer bid of 4).
  - Exact Downtown ranking (Ace high, 2 second strongest down to King), Joker behavior in Trump vs. No-Trump, Kitty 13th-book credit, and Boston (`+14`) / No-Trump (`2×`) scoring.
- **Concealed-Information Isolation & Role Separation**:
  - Authoritative rules engine projects strictly redacted `SeatView` (South) and `AiSeatObservation` (West, North, East) states.
  - Distinct **Seated Player** and **Seated Player + Table Host** modes with between-hand pause, AI tablemate presets, table-talk tone (`Quiet`, `Social`, `Lively`), and audited unanimous voids — without exposing concealed hands.
- **Bid School Interactive Trainer**:
  - 4 guided lessons covering tricks/books, Uptown vs. Downtown & Joker order, bidding & Kitty discards, and guided table play.
- **Accessibility & Comfort Calibration**:
  - One-handed commit button alignment (`Left-Handed` / `Right-Handed`), scalable cards (`Standard`, `Large`, `Extra Large`), Two-Step Card Commit (`Select → Preview → Commit`), 4-color high-contrast suit badges, live table captions (100% playable without audio), reduced motion, and procedural sound taps.
- **Rights & Asset Provenance Ledger**:
  - Transparent asset registry for bundled fonts, original illustrations, procedural PCM audio, and an external venue music policy.

## Build & Test

- Compile APK: `gradle assembleDebug`
- Run deterministic rules tests: `gradle :app:testDebugUnitTest`
