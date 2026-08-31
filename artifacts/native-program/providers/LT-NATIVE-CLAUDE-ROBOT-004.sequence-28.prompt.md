# Sequence 28 Claude work order — public clean-room RobotDealer

Act only as the bounded source writer for `LT-NATIVE-CLAUDE-ROBOT-004`.
The immutable JSON packet supplied below is authoritative. Work only inside the
current synthetic sandbox. Do not use memory, prior conversations, browser,
network, MCP, subagents, Bash, external tools, unrelated paths, private data, or
any information not present in `PUBLIC_CONTRACT.json`, `PUBLIC_FIXTURES.json`,
`RESULT_SCHEMA.json`, and the immutable packet.

Before the first write, read all three authority files completely. Then create
exactly the eight files in the packet's `closed_output_inventory` below
`LongTableRobotDealer/**`. Do not create any ninth file and do not change Git or
the three authority files. Do not read or depend on `.git`; it is sanitized
generic Director metadata outside the source authority.

Implement the complete public contract and every fixture ruling. In particular:

- keep acceptance high-water private and raise-only while emitted state sequence
  always belongs to the exact emitted cue;
- use UE5.7 Blueprint-supported reflected storage exactly: `int64` for
  `PublicSequence`, `int32` for `FocusSeat` and `TeamIndex`, and `uint8` for both
  counts; validate the narrower frozen bounds before any mutation;
- accept each valid repeated pause as an immediate, slot-free Boolean pause
  emission; accept one resume, emit it, and drain ordinary queued cues once in
  FIFO order;
- reject the sixty-fifth queued ordinary cue without advancing high-water,
  changing last-accepted bytes, evicting, emitting, or otherwise mutating;
- expose no dealer-mode runtime input or concealed value; use only external test
  labels for AI-dealer/human-host equivalence and fixture-only upstream sentinel
  values for the concealment counterfactual;
- provide separate native and dynamic multicast delegates with exact cue/state
  correlation, using lambdas only on the native delegate;
- implement all fifteen exact automation test IDs, including every one of the
  twelve motion-map rows;
- use only original source and prose. Bundle no voice, jazz, blues, music,
  samples, images, models, textures, likenesses, archival media, URLs, or
  third-party assets;
- use no regex, blacklist, keyword, substring, redaction,
  serialize-then-delete, or concealed-object-then-delete privacy control.
- write all eight files as UTF-8 without BOM, LF-only with no CR bytes and
  exactly one final LF; put the exact frozen Claude provenance begin/end lines
  at the required boundaries of the seven taggable files, and put no marker or
  comment in the JSON descriptor;
- emit the exact closed eleven-property plugin descriptor from the fixtures,
  including `EnabledByDefault: true` and its one `Runtime`/`Default` module row,
  with no `Plugins` array or additional property.

The sandbox intentionally has no Unreal target project or compiler surface.
Do not claim builds or test execution you cannot perform. Complete the source
and focused tests, inspect them with the allowed read/glob tools, and report
unavailable execution honestly as `NOT_RUN`.

Finish with one schema-conforming result object only. Use the exact packet task,
assignment, idempotency key, authority digest, and correlation values. A
`SUCCEEDED` result means source-only delivery is complete; it does not claim
OpenAI acceptance, integration, Quest/device evidence, human acceptance, merge,
release, publication, purchase, or any external action.
