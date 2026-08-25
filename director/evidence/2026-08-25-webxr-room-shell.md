<!-- [[Codex | GPT-5.6 | 2026-08-25 | DIRECTOR | BEGIN]] -->
# WebXR seated-room shell evidence

## Exact candidate

- Branch: `main`
- Candidate: `e5ef2b4e627f45a8c38f9d757e8bb810cb25dc4c`
- Local production URL: `http://127.0.0.1:4174/`
- Runtime state at capture: Vite production preview running from `main`

## Implemented spatial path

`src/xr/session.ts` now provides a real WebXR entry boundary:

- checks `navigator.xr.isSessionSupported("immersive-vr")`;
- requests `immersive-vr` from a direct user action;
- requires `local-floor`;
- requests `bounded-floor`, `hand-tracking`, and `dom-overlay` as optional
  features so their absence does not falsely block the room shell;
- creates an XR-compatible WebGL layer;
- renders a floor, felt/wood long table, three stable open human-seat anchors,
  and an unmistakably robotic dealer head/body in AI Dealer mode;
- cleans up its canvas and returns to the live browser table when the XR
  session ends.

The human-seat geometry is intentionally empty. It is an anchor for each
participant's eventual Meta avatar, not a replacement character.

## Honest product boundary

The existing accessible browser table remains the gameplay surface. The XR
button and status call this a room preview and explicitly do not claim:

- Quest headset execution;
- controller selection or haptics;
- hand-input interaction;
- Meta Avatar SDK loading;
- comfort/performance certification;
- spatial multiplayer or hidden-information authority.

Desktop Chrome in this evidence environment does not expose immersive WebXR.
The live application therefore showed a disabled `Enter Quest VR` button and:

> Immersive WebXR is unavailable here. Use a compatible Quest browser for the
> spatial room preview.

This is the expected fail-closed desktop path, not device proof.

## Verification

- XR boundary tests: 4/4 passed.
- Rules-engine tests: 8/8 passed.
- Application tests: 14/14 passed.
- Full suite: 26/26 passed across three files.
- Production TypeScript/Vite build: passed; 34 modules transformed.
- Chrome accessibility snapshot on the exact running content verified:
  robot dealer, North/West/East open seats, no level-7 buttons, no No-Trump
  buttons, disabled Quest entry, and the explicit unsupported message.

The Chrome screenshot command timed out twice; no screenshot file is claimed.
The accessibility snapshot and automated evidence are retained as the available
desktop proof.

## Next device gate

Run this candidate in Meta Quest Browser over a secure origin, capture actual
`immersive-vr` session entry and frame rendering, then add controller and
hand-input hit testing. Meta Avatar SDK integration remains a separate native
or approved web-runtime adapter decision.

<!-- [[Codex | GPT-5.6 | 2026-08-25 | DIRECTOR | END]] -->
