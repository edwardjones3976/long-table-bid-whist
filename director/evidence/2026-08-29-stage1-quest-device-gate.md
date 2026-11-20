<!-- [[OpenAI Director | GPT-5.6 | 2026-08-29 | LT-S1-QUEST-ACCEPT-001 | BEGIN]] -->
# Stage 1 physical Quest gate — `LT-S1-QUEST-ACCEPT-001`

## Status and fail-closed boundary

- Status: `AWAITING_PHYSICAL_QUEST`
- Evidence captured UTC: `2026-08-30T03:04:37.039Z`
- Evidence captured device-host local: `2026-08-29T20:04:37.050-07:00`
- Device-host timezone: `America/Los_Angeles` (`Pacific Standard Time`)
- Latest device inventory result: `[]`
- Current product label: **Quest-ready WebXR candidate**

This packet is a prepared evidence ledger, not a device result. Empty fields,
operator recollection without an uncut recording, indirect browser proof, or a
run against a different SHA fail closed. Do not mark PR #1 ready, merge, or tag
`quest-browser-alpha-0.1` until every required physical and owner gate below is
filled with authoritative evidence and accepted.

## Frozen candidate and deployment identity

- Repository: `edwardjones3976/long-table-bid-whist`
- Candidate branch: `milestone/accepted-webxr-prototype`
- Candidate SHA: `ddb8244763a2e6e68499adc53ff0be96e5a2cccb`
- Parent SHA: `bb94bbd65c1c551b02b0e99937037a5c14161548`
- Candidate tree: `6e36c258d30d1730147a4663333fa83cce978c8e`
- Candidate author time: `2026-08-29T19:16:05-07:00`
- Candidate commit time: `2026-08-29T19:42:58-07:00`
- Draft PR: `https://github.com/edwardjones3976/long-table-bid-whist/pull/1`
- Exact-head PR CI: `https://github.com/edwardjones3976/long-table-bid-whist/actions/runs/33289116759`
- Exact-head push/build/deploy: `https://github.com/edwardjones3976/long-table-bid-whist/actions/runs/33289115418`
- Live artifact: `https://edwardjones3976.github.io/long-table-bid-whist/`
- GitHub Pages environment: custom branch policy enabled; sole permitted branch
  is `milestone/accepted-webxr-prototype`
- Uploaded Pages artifact ZIP SHA-256:
  `46815a147d5a965d9dbb8c6d6652141c2205ec3dcde4cd40e3eb91f1c7f56fbd`
- Exact live `index.html` SHA-256:
  `194f5be99209c5bf5a95ef00d38bbc0673538f61ba9febbe903b27d279c376ec`
- Exact live JavaScript SHA-256:
  `a6d06cd37c91461ce08e5f6fefe73e10382c502d08271c523b5335213a1c4142`
- Exact live CSS SHA-256:
  `64a64f55b676e6b1ae736155b76fcc6d207282ae36059bc14def137aa03c7fe3`
- Served fixed metadata: full candidate SHA verified
- Served visible identity: `Build ddb8244` verified in Chrome
- Automated verification: 11 files and 99 tests passed; production build passed
- Independent exact-SHA review: `ACCEPT`

Any source, lockfile, tree, SHA, deployment, or live-file hash change invalidates
this packet and requires a new candidate-bound revision before device testing.

## Human operator and device prerequisites

The human Quest operator owns physical setup, uncut recordings, calibration
observations, and comfort judgment. No AI provider may substitute for those
facts.

- [ ] Physical Meta Quest 3 available
- [ ] Developer Mode enabled
- [ ] Data-capable USB connection established
- [ ] USB debugging authorized inside the headset
- [ ] Device remains awake for capture
- [ ] Guardian/boundary and seated play area are safe
- [ ] Operator understands that no music may play during acceptance capture
- [ ] Operator consents to the device/session recording

Do not record participant voice unless separately and explicitly authorized.
The product does not ingest, upload, cache, record, stream, or rebroadcast host
music; acceptance runs remain music-free.

## Required version and time evidence

Capture before Run A and repeat after Run B if anything updates or restarts.

| Field | Required evidence | Captured value |
| --- | --- | --- |
| Capture UTC | Full RFC 3339 UTC | `PENDING` |
| Device local time | Full local time and UTC offset | `PENDING` |
| Device timezone | IANA or displayed zone | `PENDING` |
| Quest model | Must be physical Quest 3 | `PENDING` |
| Quest OS/build | Exact displayed/system value | `PENDING` |
| Quest Browser/app | Exact version | `PENDING` |
| `metavr` tool | Exact version | `1.3.2.2.2` |
| WebXR mode | Immersive session acquired | `PENDING` |
| Left controller profile | Exact reported profile/handedness | `PENDING` |
| Right controller profile | Exact reported profile/handedness | `PENDING` |
| Candidate SHA | Must equal frozen SHA above | `PENDING` |
| Live file hashes | Must equal all three hashes above | `PENDING` |

Do not record a device serial number, account identifier, IP address, room
image, or unrelated log content in this packet.

## Run A — left-controller launch-to-score

Recording must be continuous from the live URL and visible build identity
through the scored summary.

- [ ] Open the exact live URL in Quest Browser
- [ ] Confirm visible build `ddb8244`
- [ ] Select **AI Dealer** and enter the table
- [ ] Enter immersive WebXR successfully
- [ ] Confirm seated table render and `local-floor` reference space
- [ ] Use the left controller for all required pointing and selection
- [ ] Recenter without moving the camera
- [ ] Exercise Height −/+, remaining inside bounds
- [ ] Exercise Distance −/+, remaining inside bounds
- [ ] Complete auction with preview/cancel/confirm behavior observable
- [ ] Complete the restricted-rules full hand through summary
- [ ] Legible card indices and non-color-only suit cues verified
- [ ] No concealed opponent/kitty/discard identity exposed
- [ ] No forced leaning or blocking reach defect
- [ ] No duplicate commit, accidental commit, or stuck preview
- [ ] No severe comfort event

| Run A artifact | Path or stable reference | SHA-256 | UTC start/end |
| --- | --- | --- | --- |
| Uncut recording | `PENDING` | `PENDING` | `PENDING` |
| Bounded device log | `PENDING` | `PENDING` | `PENDING` |
| Performance capture | `PENDING` | `PENDING` | `PENDING` |

Run A result: `PENDING`

## Run B — right-controller exit/re-entry-to-score

Recording must be continuous and prove clean exit/re-entry as well as a second
complete hand.

- [ ] Begin on the unchanged exact live candidate
- [ ] Confirm visible build `ddb8244`
- [ ] Enter immersive WebXR successfully
- [ ] Use the right controller for all required pointing and selection
- [ ] Create then cancel an uncommitted preview
- [ ] Exit XR; committed state is preserved and preview is cleared
- [ ] Re-enter XR cleanly without duplicate listeners or duplicate canvas
- [ ] Confirm calibration persists for the current browser page
- [ ] Recenter and adjust the table after re-entry
- [ ] Complete the restricted-rules full hand through summary
- [ ] Legible card indices and non-color-only suit cues verified
- [ ] No concealed opponent/kitty/discard identity exposed
- [ ] No forced leaning or blocking reach defect
- [ ] No duplicate commit, accidental commit, or stuck preview
- [ ] No severe comfort event

| Run B artifact | Path or stable reference | SHA-256 | UTC start/end |
| --- | --- | --- | --- |
| Uncut recording | `PENDING` | `PENDING` | `PENDING` |
| Bounded device log | `PENDING` | `PENDING` | `PENDING` |
| Performance capture | `PENDING` | `PENDING` | `PENDING` |

Run B result: `PENDING`

## Human comfort and usability judgment

The human operator must complete this section immediately after Run B.

| Question | Human response |
| --- | --- |
| Any nausea, dizziness, eye strain, headache, or disorientation? | `PENDING` |
| Any forced leaning, shoulder strain, or unreachable target? | `PENDING` |
| Were card indices readable through the full hand? | `PENDING` |
| Were suits distinguishable without color alone? | `PENDING` |
| Did recenter/height/distance controls behave predictably? | `PENDING` |
| Did exit/re-entry preserve the right state without confusion? | `PENDING` |
| Any P0/P1 comfort or interaction defect? | `PENDING` |
| Operator acceptance or kickback decision | `PENDING` |

Human operator name or chosen pseudonym: `PENDING`

Human judgment captured UTC: `PENDING`

## Completion reconciliation

- [ ] Run A passed with valid recording and hashes
- [ ] Run B passed with valid recording and hashes
- [ ] Left- and right-controller evidence both passed
- [ ] Exit/re-entry and calibration evidence passed
- [ ] Exact SHA, CI run, deployment, live hashes, device versions, and timestamps
  reconcile without contradiction
- [ ] No P0/P1 rules, privacy, lifecycle, legibility, reach, or comfort defect
- [ ] Human operator accepts
- [ ] Owner accepts the unchanged candidate
- [ ] Completion report posted to GitHub and the existing Slack thread
- [ ] PR #1 marked ready only after all preceding checks
- [ ] Normal reviewed merge preserves the accepted tree and is reconciled
- [ ] Annotated tag `quest-browser-alpha-0.1` created at the accepted merge result

Final Stage 1 verdict: `PENDING_PHYSICAL_QUEST`

<!-- [[OpenAI Director | GPT-5.6 | 2026-08-29 | LT-S1-QUEST-ACCEPT-001 | END]] -->
