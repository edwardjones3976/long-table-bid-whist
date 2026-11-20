# Accessibility and Comfort Launch Gates — The Long Table (Codex decision D-07)

**Status:** Decided (owner, 2026-11-20) · **Sources verified:** 2026-11-20 against live official pages · **Re-verify by:** 2026-12-20 and before each milestone build

This record fixes which accessibility and comfort properties are **launch gates** —
the VR build does not ship without them — and which are **later enhancements**.
Each gate has a pass/fail criterion and a way to measure it, so the gate is a test
result, not an opinion.

Two facts frame the decision, both confirmed on Meta's current pages:

1. **Every Meta Horizon Store accessibility VRC is recommended, not required.**
   Meta's own checklist: "All accessibility VRCs are recommended, not required for
   Store submission. Your app will not be rejected for missing these items." The
   gates below are therefore The Long Table's **own** bar, set above the store's.
2. **What the store does require** is narrower and is also gated here: the declared
   play mode must be met (VRC.Quest.Tracking.1 — "Sitting: no action requires you to
   stand or reach down to the ground or pivot greater than 90 degrees left or
   right"), every declared input modality must support all content from launch
   (VRC.Quest.Tracking.2), hands↔controllers switching must be clean (VRC.Quest.Input.7),
   the system gesture is reserved (VRC.Quest.Input.8), orientation can be reset
   (VRC.Quest.Functional.9), and metadata must match the app (VRC.Content.2).

The audience (Codex ch. 1) is adults 30–70, many of them headset novices and
glasses wearers; older-adult evidence favours testing actual preferences over age
stereotypes, so every gate is also checked with participants from every age band.

---

## 1. Launch gates

`Android` = status in the shipped phone app (`CalibrationScreen`, `TablePreferences`).
`VR` = required state of the first Quest build. Every gate is **blocking**: a fail
stops the release.

### G1 — Fully playable without audio

| | |
| --- | --- |
| Criterion | A complete match (auction, kitty, 12 tricks, scoring, a void) can be played start to finish with device volume at zero and no headphones. Every engine caption (`latestCaption`, `seatCaptions`) and every meaningful sound (card snap, trick chime, turn prompt) has a visible equivalent. |
| Measure | Scripted play-through on device with audio muted; a tester who has not seen the build narrates what is happening from the captions alone. Zero moments where the next required action is unknowable. |
| Basis | VRC.Quest.Accessibility.1 ("playable in its entirety without the use of audio, or provide subtitle options … for in-application dialogue and/or sound effects"); Codex ch. 9 (captions are the source of truth). |
| Android | `SHIPPED` — captions on by default; procedural sounds are all mirrored by captions. |
| VR | Captions rendered from engine captions, never the reverse. |

### G2 — Captions meet Meta's caption spec

| | |
| --- | --- |
| Criterion | Caption text has **at least three sizes** (50/75/100/150/200 % of default); **≤ 32 characters per row, ≤ 2 rows**; a background box; **speaker attribution** (seat name) on every line; placed within the central **40° FOV**, defaulting ~1 m / half the far-field distance, **movable** by the player, never obstructed by table UI; new line after ≥ 1.5 s of silence; roll-up ≈ 0.5 s ease-out. |
| Measure | Inspect each caption surface at every size setting; wrap test with the longest engine caption (currently the Boston/outcome caption); obstruction test with a card in preview and the host sheet open. |
| Basis | Meta accessibility design guidance, "Hearing controls" and caption sections (updated 2026-04-06). |
| Android | partial — one size tied to card scale; speaker identity shipped via `seatCaptions`. |
| VR | Full spec above. |

### G3 — Seated, stationary play with no standing, floor reach, or >90° pivot

| | |
| --- | --- |
| Criterion | With Play Mode declared **Sitting**, every interaction (bid panel, suit tiles, kitty tray, hand fan, play zone, host sheet, pause/recenter) is reachable from a fixed seated position with the head turned ≤ 90° either way; nothing is ever below table height. Seated camera height defaults to the **system-reported player height**, with adjustment, and is never derived from headset-to-floor distance alone. |
| Measure | Seated tester in a non-swivel chair completes a match; a second tester in a wheelchair does the same. Protractor check of the widest UI element from the seat. |
| Basis | VRC.Quest.Tracking.1 (**required**: "Sitting- The app must be completely playable while seated in stationary furniture"); VRC.Quest.Accessibility.9 (all interactions from a fixed position); Meta locomotion comfort guidance (seated height from system player height; artificial turning because "not all chairs spin"). |
| Android | n/a |
| VR | Required; the table is designed seated-first (Codex §7.1). |

### G4 — One core action for everything, two-step by default

| | |
| --- | --- |
| Criterion | Bidding, naming trump, kitty discards and card play all use **Select → Preview → Commit**. Two-step commit is on by default; turning it off still shows a visible preview flash before commit. No interaction requires **two simultaneous button presses**, a **timed** response, or a **gesture other than pinch, palm grab or index touch** without an explicit alternative. |
| Measure | Code review of the interaction map; scripted session confirms every decision point exposes Preview and Commit; search for any timer-gated input (none allowed — AI pacing waits for the human). |
| Basis | Codex §7.2; Meta accessibility guidance ("Avoid interactions that require simultaneous button presses"; "No interactions require precise timing without alternatives"); Meta hands guidance (any gesture beyond pinch / palm grab / index touch must be taught, with alternatives). |
| Android | `SHIPPED` (`twoStepConfirm` default true). |
| VR | Same action on controller, hand and gaze paths. |

### G5 — Full input parity: two controllers, one controller (either hand), hands, gaze+confirm

| | |
| --- | --- |
| Criterion | Every declared input modality can **independently** complete a whole match from launch — no step ever forces a switch. A **single controller in either hand** is enough (`Handedness` moves the commit control to the dominant side). Hand tracking is never the only path; tracking loss **releases a held card to its origin** and the player can recover. Switching hands↔controllers mid-hand works without functional or rendering faults; the **system gesture triggers nothing** in-app. |
| Measure | Four full matches, one per modality, by different testers; a fifth with deliberate mid-trick switching; a sixth with hands held out of view during a carry. |
| Basis | VRC.Quest.Tracking.2 (**required**: "The user can play all content in every input modality from launch, without being forced to switch"); VRC.Quest.Input.7 and .8 (**required** for hand-tracking apps); VRC.Quest.Accessibility.4 (one hand / one controller); Meta hands guidance ("a pinch always releases on tracking loss"). |
| Android | `SHIPPED` (handedness, one-thumb play). |
| VR | All four paths at launch; voice bidding optional, never exclusive (Codex §7.3). |

### G6 — Hit targets sized for the least precise input

| | |
| --- | --- |
| Criterion | Every interactive element has a hit target of **≥ 48 dp** (Meta: 22 mm / 3° FOV at 0.42 m); **primary controls** (Commit, Pass, suit tiles, bid chips, play zone) **≥ 60 dp**; visual targets ≥ 32 dp; hit areas padded with invisible hitslop where the visual is smaller. Cards in the fan have a hit area at least the full card face. |
| Measure | Automated check of every XRI interactable's collider against the 48/60 dp equivalents at its designed distance; manual pass with hand tracking at arm's length. |
| Basis | Meta "Inputs and hit targets" (48 dp minimum; 60 × 60 dp for primary hand-tracked controls; design for the least precise input); Meta accessibility guidance (32 dp visual minimum, hitslop); Android 48 dp; WCAG 2.5.5 (AAA, 44 CSS px) exceeded by design. |
| Android | `SHIPPED` — Material 3 48 dp minimums; cards 64–84 dp wide. |
| VR | 48/60 dp at the designed viewing distance; checked by the automated gate. |

### G7 — Contrast and colour

| | |
| --- | --- |
| Criterion | Text ≥ **4.5:1** (large text ≥ 3:1); UI components and card-state indicators ≥ **3:1** against adjacent colours; no pure white/black surfaces (light ≤ #DADADA, dark ≥ #1A1A1A). **Suit is never conveyed by colour alone**: the four-colour badges carry the suit symbol; legal/illegal, selected/previewed and partner/opponent states each have a non-colour cue (dimming + lock icon + caption; lift + outline; seat label). Focus indicators ≥ 2 px and not colour-only. |
| Measure | Contrast computed with the WCAG formula ((L1+0.05)/(L2+0.05), unrounded) for every text/background and indicator pair in both themes; walkthrough with Horizon OS colour correction enabled and with greyscale capture. |
| Basis | VRC.Quest.Accessibility.2 and .6; Meta Color and Accessibility pages (WCAG 2.1 AA ratios, #DADADA/#1A1A1A limits, colour + pattern); WCAG 2.2 SC 1.4.3 and 1.4.11. |
| Android | `SHIPPED` (`highContrastSuits` default true; suit symbol on every badge). |
| VR | Same, plus the automated contrast check in CI. |

### G8 — Text and card scale

| | |
| --- | --- |
| Criterion | Three card scales (Standard / Large / Extra Large) plus a **private-hand magnifier**; all UI text in **scalable units** that follow the OS text-size setting, tested at the OS minimum and maximum; no text below 14 px-equivalent, body text ≥ 18 px-equivalent; **no italics**; filled icons. Important UI (dialogs, captions, the contract banner) uses angular scaling so its apparent size is constant with distance. |
| Measure | Screenshots at min and max OS text size; typographic audit of every style; card legibility read-test at each scale by participants with and without glasses. |
| Basis | VRC.Quest.Accessibility.2 and .5; Meta Typography ("no smaller than 14px … 18px or larger"; no italics), Fonts & Icons (filled icons), MR design guideline (angular scaling), Accessibility ("Use scalable units (sp)"). |
| Android | `SHIPPED` (`CardScale`, `fontScale`). |
| VR | Same three scales plus magnifier; text follows OS setting. |

### G9 — Reduced motion and stable horizon

| | |
| --- | --- |
| Criterion | A **Reduced motion** setting replaces dealing/book-collection slides with fades and removes camera or table motion entirely; the horizon is always stable; **no head-locked UI**; **no forced head turns** (all required information lives within the seated FOV or is announced by caption); AI pacing delay shortens under reduced motion. The app's self-assigned comfort rating is **Comfortable**, which the content must justify (fixed viewpoint, no artificial locomotion). |
| Measure | Motion audit of every animation with reduced motion on and off; confirm no camera translation or rotation is ever applied by the app; confirm the Comfortable rating against Meta's definition. |
| Basis | VRC.Quest.Functional.10 ("Nothing should be headlocked"); Meta comfort and MR guidance (avoid head-locked HUD; anchor to space); Meta App Policies 5.1 (developer assigns Comfortable / Moderate / Intense; "fixed camera" apps are generally Comfortable); VRC.Content.2 (metadata must match the app). |
| Android | `SHIPPED` (`reducedMotion`; AI delay 280 ms vs 780 ms). |
| VR | Required; the table has no locomotion by design. |

### G10 — Recenter and reset forward at any time

| | |
| --- | --- |
| Criterion | A **Recenter** control is one action away at all times (on the wrist/menu and on the host sheet) and re-seats the table in front of the player at the correct height; the system Meta-button hold also works; the app responds to positional as well as orientation tracking and never disables either. |
| Measure | Recenter from every phase, including mid-trick and with a card in preview (preview survives recenter); test after physically turning 90°. |
| Basis | VRC.Quest.Functional.9 (**required**: reset forward orientation in Local tracking space); VRC.Quest.Functional.5 (**required**: respond to positional tracking); Meta Comfort guidance (Meta-button recenter); Meta Head best practices (never disable or modify tracking). |
| Android | n/a |
| VR | Required. |

### G11 — First-run calibration before any menu, skippable, re-openable

| | |
| --- | --- |
| Criterion | On first launch the player chooses seated/standing height, handedness, card scale, captions, reduced motion and input path **before** reaching any menu; every step has a default and a Skip; the same calibration is re-openable from the table in one action and saves immediately. |
| Measure | First-run test with a headset novice: calibration completed or skipped without help; settings persist across a restart. |
| Basis | Meta locomotion comfort guidance ("Early in the experience, such as in a tutorial, let users choose seated vs. standing"); Meta accessibility guidance (preferences early); Codex §8. |
| Android | `SHIPPED` (Calibration screen; preferences in DataStore). |
| VR | Required. |

### G12 — Visible speaker identity and multi-sensory feedback

| | |
| --- | --- |
| Criterion | Every caption names its seat; every meaningful event (card committed, book won, bid placed, your turn) is signalled by **at least two** of visual / caption / haptic / audio; nothing is signalled by audio alone (G1) or by haptic alone. |
| Measure | Event matrix review: each engine `AuditEvent`/caption mapped to its cues; device test with haptics off and audio off separately. |
| Basis | VRC.Quest.Accessibility.3 ("a combination of visual, audio, and/or haptic feedback instead of relying on one form"); Codex ch. 9. |
| Android | `SHIPPED` (`seatCaptions`). |
| VR | Required. |

### G13 — Rest, pace and no penalty for breaks

| | |
| --- | --- |
| Criterion | The table never times a human out of a decision; a between-hand pause is always available; hands are never required above heart level or closer than 10 cm to the headset; a "take a break" prompt appears after 45 minutes of continuous play and can be dismissed. |
| Measure | Review of all timers (none may expire a human's turn); reach-envelope check of every interactable; break prompt observed at the threshold. |
| Basis | Meta hands best practices ("Avoid time-based or reflex-heavy events"; "DON'T promote gestures that are too close (< 10cm) to the HMD"; avoid hands above heart level; include rest periods); Codex §5 (host pause). |
| Android | `SHIPPED` (no human turn timers). |
| VR | Required. |

---

## 2. Later enhancements (not gates)

Valuable, planned, and explicitly **not** required for the first release:

- **Screen-reader support.** Unity's Accessibility module (6.3 LTS) supports Android TalkBack, iOS VoiceOver, Windows Narrator and macOS VoiceOver; no XR headset platform appears in its support table, and Horizon OS's screen reader is listed by Meta as experimental. The 2D Android app remains the screen-reader path; the VR build adds `AccessibilityNode` metadata when Unity documents a Quest target.
- **Private-hand read-aloud on demand** (self-voicing of the fan and table state).
- **Colour-vision palettes** beyond the four-colour badges (G7 already removes colour-only meaning).
- **Adjustable AI pacing** and **haptic intensity** sliders.
- **Table-side helper mode** for a sighted companion.
- **Remappable controller bindings** beyond handedness (Meta: "optional remapping of controls … for left and right hands").
- **System live captions** for future voice chat (Codex ch. 11) — the app must use standard audio APIs so Horizon OS live captions can work.
- **Teleport / snap-turn locomotion** is **not applicable**: the table has no locomotion. VRC.Quest.Accessibility.7 and .8 are satisfied vacuously and will be revisited only if room movement is ever added.

---

## 3. How the gates are checked

- **Automated in CI:** G6 (hit-target sizes), G7 (contrast pairs), G9 (no camera transform writes; comfort-rating field = Comfortable), G13 (no human-turn timers).
- **Scripted device sessions** before each milestone: G1, G2, G3, G4, G5, G8, G10, G11, G12 — each with a one-page script and a pass/fail sheet; at least one tester per age band 30s/40s/50s/60s/70s across the set, including headset novices, glasses wearers and at least one wheelchair user.
- **Store metadata:** Play Mode = Sitting (also usable standing), Supported Controllers = Touch controllers and Hands, Comfort Level = Comfortable — and VRC.Content.2 is read as a gate on the honesty of those three fields.
- A gate that fails is fixed, not waived. If a gate proves impossible on the pinned toolchain (`VR_TOOLCHAIN.md`), the Codex decision is reopened rather than the gate quietly dropped.

---

## 4. Sources (all accessed 2026-11-20; each re-opened by an independent verifier)

**Meta Horizon Store VRCs** (index updated 2026-08-19)
- https://developers.meta.com/vr/resources/publish-quest-req/ — legend: ✓ required, + recommended; all nine Accessibility VRCs are "+"; "The VRCs listed in these test plans are slightly out of date; don't use them as a source of truth."
- https://developers.meta.com/horizon/design/accessibility-checklist/ (2026-04-13) — "All accessibility VRCs are recommended, not required for Store submission. Your app will not be rejected for missing these items"
- https://developers.meta.com/vr/resources/vrc-quest-accessibility-1/ … -9/ (2024-07-31) — Accessibility.1 audio/subtitles; .2 legibility/contrast/larger UI; .3 multi-sensory feedback; .4 one hand/controller; .5 display settings; .6 colour blindness; .7 rotate without head/neck; .8 locomotion styles; .9 all interactions from a fixed position
- https://developers.meta.com/vr/resources/vrc-quest-tracking-1/ (2025-05-15) — **required**; "Sitting: no action requires you to stand or reach down to the ground or pivot greater than 90 degrees left or right"
- https://developers.meta.com/vr/resources/vrc-quest-tracking-2/ (2025-12-16) — **required**; every declared modality supports all content; "without being forced to switch to a different input modality midway"
- https://developers.meta.com/vr/resources/vrc-quest-input-7/ and -8/ (2024-07-31) — **required** for hand-tracking apps: clean hands↔controllers switching; system gesture reserved
- https://developers.meta.com/vr/resources/vrc-content-2/ (2024-07-31) — **required**: "App metadata must match the app's in-app content"
- https://developers.meta.com/vr/policy/app-policies/ (2026-03-10) — §5.1 comfort ratings Comfortable / Moderate / Intense, developer-assigned; fixed-camera apps generally Comfortable
- https://developers.meta.com/vr/resources/publish-app-metadata/ (2025-08-20) — Specs fields incl. Play Area, Supported Player Modes, Comfort Level; no accessibility-features field exists

**Meta design guidance**
- https://developers.meta.com/vr/design/accessibility/ (2026-04-06) — 48 dp = 22 mm = 3° FOV at 0.42 m; 32 dp visual minimum; hitslop; WCAG 2.1 AA ratios; scalable sp text; captions spec (3+ sizes 50–200 %, ≤32 chars × 2 rows, box, 1 m / half far-field, movable, 40° FOV, attribution, 1.5 s silence, 0.5 s roll-up); focus indicators ≥ 2 px; no simultaneous presses; single-controller remapping
- https://developers.meta.com/vr/design/styles_inputs_hit_targets/ (2026-04-19) — 48 dp minimum; **60 × 60 dp for primary controls** under hand tracking; design for the least precise input
- https://developers.meta.com/vr/design/styles_color/ (2026-04-19) — 4.5:1 / 3:1; light ≤ #DADADA, dark ≥ #1A1A1A
- https://developers.meta.com/vr/design/styles_typography/ (2026-04-19) — ≥ 14 px minimal, ≥ 18 px comfortable; no italics
- https://developers.meta.com/vr/design/fonts-icons/ (2026-03-02) — filled icons in immersive; type scale
- https://developers.meta.com/vr/design/mr-design-guideline/ (2025-10-07) — ~70 cm UI distance for hands + controllers; angular scaling; avoid head-locked HUD; half of users seated
- https://developers.meta.com/vr/design/comfort/ (2025-12-17) — Meta-button recenter; adjust to seated/standing
- https://developers.meta.com/vr/design/locomotion-comfort-usability/ (2025-12-17) — seated mode "should be supported unless fundamentally incompatible"; choose seated/standing early; seated height from system player height; "not all chairs spin"
- https://developers.meta.com/vr/design/hands-adapting-from-controllers/ (2026-11-16) — "a pinch always releases on tracking loss"; hands need larger targets; teach any gesture beyond pinch / palm grab / index touch
- https://developers.meta.com/vr/design/hands-best-practices/ (2026-09-14) — no gestures < 10 cm from HMD; no hands above heart level; rest periods; avoid time-based events
- https://developers.meta.com/vr/design/hands-limitations-mitigations/ (2026-09-14) — one-handed interactions; controller as fallback
- https://developers.meta.com/vr/design/head-best-practices/ (2026-03-13) — never disable or modify tracking

**Standards and platform baselines**
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html — SC 2.5.8 (AA) 24 × 24 CSS px; https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html — SC 2.5.5 (AAA) 44 × 44 CSS px, larger for frequent or irreversible controls
- https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html — SC 1.4.3, 4.5:1 / 3:1, unrounded; https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html — SC 1.4.11, 3:1
- https://www.w3.org/WAI/WCAG22/Understanding/reflow.html — games are an accepted two-dimensional-layout exception
- https://www.w3.org/TR/xaur/ (2021-08-25) — XR Accessibility User Requirements: informative Working Group Note, "work in progress", not normative
- https://developer.android.com/guide/topics/ui/accessibility/apps (2026-11-10) — 48 × 48 dp touch targets; 4.5:1 / 3:1 text contrast; content descriptions
- https://docs.unity.com/en-us/engine/6000.3/manual/accessibility/module-intro — Unity Accessibility module supports Android TalkBack, iOS VoiceOver, Windows Narrator, macOS VoiceOver; no XR platform listed
