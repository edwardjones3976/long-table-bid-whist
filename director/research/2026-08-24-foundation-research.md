<!-- [[Codex | GPT-5.6 | 2026-08-24 | 22:04 UTC | BEGIN]] -->
# Foundation research — The Long Table

## Critique first

**Verdict:** The concept should proceed, but as a private-first social gathering
with a serious Bid Whist game inside it—not as a casino product, a generic card
simulator, or a nostalgia museum. The most defensible first experience is one
contemporary, lived-in table; one fully declared rules preset; one seated hand;
and an optional AI dealer or human event host with sharply different powers.

The evidence strengthens the core concept and rejects four tempting shortcuts:

1. **Culture is not a cosmetic theme.** Bid Whist has operated as a family,
   social, intergenerational, and class-crossing practice in Black communities.
   Table talk, teaching, return visits, and belonging are part of the product,
   not decorative flavor. [NPR](https://www.npr.org/2005/12/26/5069913/rise-and-fly-the-story-of-bid-whist),
   [Smithsonian](https://www.smithsonianmag.com/smithsonian-institution/bid-whist-and-hand-dancing-at-the-anacostia-community-museum-16159868/),
   [Wisconsin Life](https://wisconsinlife.org/story/bid-whist-ladies/), and
   [AfroLA](https://afrolanews.org/2023/05/with-a-rich-history-card-games-foster-community-and-kinship-in-black-communities/).
2. **There is no single universal house ruleset.** Published rules include
   material variations in minimum bids, jokers, no-trump behavior, deck size,
   and scoring. The game needs a complete, versioned Table Rules Manifest,
   acknowledged before play—not a handful of hidden toggles.
   [Pagat](https://www.pagat.com/auctionwhist/bidwhist.html).
3. **Hand tracking cannot be the only input.** Meta recommends one reusable
   core hand interaction, automation of secondary actions, diverse-user
   testing, and simple alternatives. Controllers, seated play, one-handed use,
   captions, and non-voice bidding must be equal paths.
   [Meta hand guidance](https://developers.meta.com/horizon/design/hands-best-practices/) and
   [Meta accessibility guidance](https://developers.meta.com/horizon/design/accessibility/).
4. **“Non-copyrighted” and “safe format” are not rights tests.** A composition,
   a particular sound recording, and the file that carries it are separate
   matters. Bundled and host-supplied audio must be **rights-clean**, with
   provenance for both composition and recording. The Music Modernization Act
   also protects many pre-1972 recordings, so “old jazz/blues” cannot be assumed
   free. [U.S. Copyright Office Circular 56](https://www.copyright.gov/circs/circ56.pdf) and
   [Music Modernization FAQ](https://www.copyright.gov/music-modernization/faq.html).

## Director conclusion

Proceed to committee discussion and then a non-code prototype specification.
Do not begin a broad VR build yet. The smallest responsible prototype proves:

- a deterministic, headless rules engine for one advisor-approved Strict Table
  preset;
- a seated tabletop interaction loop with controller parity;
- an authoritative concealed-information boundary;
- distinct AI dealer and human host roles;
- a full local hand with three AI seats before networking;
- a private four-player room only after the local hand is trusted; and
- an asset ledger that can block unapproved content from a build.

MR placement, public matchmaking, ranked play, multi-table tournaments,
spectator broadcasting, generative AI conversation, collectible economies, and
shared host-audio transmission are outside the first prototype.

## What similar products teach us

| Product/pattern | Useful precedent | Adopt | Do not copy |
| --- | --- | --- | --- |
| [Demeo](https://www.resolutiongames.com/demeo) | Recreates tabletop camaraderie; supports cross-platform social play, VR/MR, and hand tracking | Treat table presence and conversation as core value; preserve a future 2D accessibility path | Fantasy progression, long sessions, or visual density |
| [Cards & Tankards](https://www.meta.com/experiences/cards-tankards/3073319699437112/) | Combines a card game with a hangout and peer teaching; store labels it Comfortable | A visible learning table and friendly first-win flow | Collectible-card economy, booster loop, or public social exposure at launch |
| [Walkabout Mini Golf](https://www.mightycoconut.com/minigolf) | Solo, quick match, private rooms, cross-play, and a guest-pass social model | Private room codes, join-a-friend simplicity, and host-led gathering | Eight-person room scope or content-heavy course model |
| Community card nights | Teaching, competition, table talk, recurring attendance, and belonging coexist | “Bid School,” returning tables, respectful reactions, and host pacing | Scripted slang, caricature, compulsory trash talk, or a single regional voice |

The shared lesson is that successful social VR products sell a reliable reason
to meet again. The Long Table's retention loop should be people, partnerships,
reputation within private groups, and mastery—not grinding or randomized
rewards.

## Recommended product frame

### Audience and cultural process

- Define the primary audience as foundational Black American adults ages
  30–70 while keeping the interaction legible to invited family and friends.
- Use compensated co-design. The first formative panel should include people in
  their 30s, 40s, 50s, 60s, and 70; multiple regions/family traditions; multiple
  genders; experienced players and beginners; headset novices; glasses users;
  and people with mobility, dexterity, hearing, or vision considerations.
- Use a small rules council of experienced Bid Whist players separately from
  the usability panel. Rules authority and cultural art direction are different
  responsibilities.
- Start with one contemporary family/community room. Every photograph, voice,
  name, likeness, sign, pattern, oral history, and archival element needs
  documented source and permission.
- Let players choose table-talk intensity: quiet, social, or lively. Never
  equate Black authenticity with mandatory performance, trash talk, profanity,
  or a fixed accent.

The research supports co-design and user adaptation but does not prove that one
online sample represents the whole audience. Older-adult VR reviews emphasize
training, local support, adaptation, and testing of actual preferences rather
than designing from age stereotypes.
[Scoping review](https://pmc.ncbi.nlm.nih.gov/articles/PMC10068985/),
[systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC7156831/), and
[older-adult pilot](https://pmc.ncbi.nlm.nih.gov/articles/PMC6846546/).

### The table loop

1. Join a known table or start a solo practice table.
2. Review the complete Table Rules Manifest in plain language.
3. Choose seat, handedness, card scale, captions, reduced motion, and input.
4. Learn through a short observed example or enter play immediately.
5. Bid using cards/buttons as well as voice; confirm before commitment.
6. Select a card, see a clear preview and legal-play indication, then commit it
   to a large magnetic play zone.
7. Automate collection, book counting, and scoring while preserving satisfying
   restrained animation, spatial sound, and haptics.
8. Between hands, let the host pause, explain rules, reseat, substitute AI, or
   end the event. Never let a host alter the committed hand.

### AI dealer and human host

| Capability | Authoritative rules service | AI dealer | Human host |
| --- | ---: | ---: | ---: |
| Commit shuffle/deck and deal | Yes | No | No |
| Validate bid, follow-suit, book, and score | Yes | No | No |
| Announce turns, teach, pace, and animate deal | Supplies state | Yes | Optional presentation |
| Inspect opponents' concealed cards | Only isolated per-seat delivery | No | No |
| Lock the pre-match rules manifest | Enforces | No | Yes, before hand |
| Seat/reseat, invite, mute, remove, or add AI | Enforces permissions | No | Yes |
| Pause or void a committed hand unilaterally | No | No | No |
| Request a between-hand pause or audited unanimous void | Records | May suggest | Yes |
| Control room music and announcements | Enforces policy | No | Yes |

The AI dealer should be deterministic presentation and teaching logic, not an
LLM with privileged state. AI players receive only their own hand plus public
history. This keeps cheating analysis and replay testing tractable.

### Accessibility and comfort baseline

- Seated/stationary first; no artificial locomotion is needed at the table.
- One core action—select/preview/commit—used for bidding and card play.
- Hand tracking for fantasy; two-controller, one-controller, handedness,
  head-gaze/confirm, and non-voice paths for completion.
- Large scalable cards, high contrast, suit redundancy beyond color, readable
  table state, generous hit areas, and private-hand magnification.
- Captions for speech and meaningful sound, visible speaker identity, separate
  voice/music/effects volume, and playability without audio. Meta's current
  distribution criterion says an application should be playable without audio
  or subtitle dialogue and sound effects.
  [Meta VRC](https://developers.meta.com/horizon/resources/vrc-quest-accessibility-1/).
- Reduced-motion dealing, no forced head turns, stable horizon, comfortable
  reach, recentering, breaks, and MR/VR boundary-safe placement.
  [Meta health and safety](https://developers.meta.com/horizon/resources/mr-health-safety-guideline).
- A first-run calibration that is skippable and can be reopened; preferences
  are saved before the user must navigate complex menus.

### Simple, safe technical direction

Use a layered design so rules correctness is independent from headset UI:

```text
Versioned rules manifest
          |
Pure deterministic C# rules/state library
          |
Authoritative match service + per-seat concealed views
          |
Unity presentation adapter
          |
OpenXR + XR Interaction Toolkit + Meta Quest extensions
```

- **Engine candidate:** Unity LTS selected at the later toolchain gate against
  the current package compatibility matrix.
- **XR:** Unity OpenXR for portability, Meta OpenXR only for required Quest/MR
  extensions, and XR Interaction Toolkit for grab, ray, UI, haptics, stationary
  rigs, and device simulation.
  [Unity Meta OpenXR](https://docs.unity3d.com/Packages/com.unity.xr.meta-openxr@2.0/manual/index.html) and
  [XR Interaction Toolkit](https://docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.1/manual/index.html).
- **Rules:** Pure C# library with seeded shuffle, event log, state snapshots,
  property tests, replay, and no Unity dependencies.
- **Networking:** Do not select a vendor until the local hand is proven. The
  required architecture is authoritative state, per-seat redaction, reconnect,
  host succession, and replayable events—not peer trust.
- **Voice:** Defer provider choice. Private spatial voice still requires mute,
  block, remove, report, volume, captions/alternatives, consent, and retention
  decisions. Voice must never carry gameplay commands exclusively.
- **Audio:** Use the supported Meta XR Audio SDK, not the end-of-life Oculus
  Spatializer Plugin. [Meta Unity audio](https://developers.meta.com/horizon/documentation/unity/unity-audio/).
- **Accounts:** Invite-code private rooms first. No public discovery, direct
  messages, user profiles beyond essentials, or voice recording in the MVP.

### Entertainment without clutter

- Make dealing, card commitment, book collection, partner reactions, and the
  final Boston feel physical through restrained animation, sound, and haptics.
- Let atmosphere breathe: quiet room tone, distant neighborhood/weather cues,
  optional music, and conversation intelligibility take priority.
- Add “Bid School”: watch a book, practice a bid, play a guided hand, then play
  a normal hand. Experienced players can skip it completely.
- Celebrate private-group continuity with saved complete rules manifests,
  preferred partners, rematch, and event invitations—not daily chores.
- Use opt-in table reactions designed with the community; avoid premade lines
  that imitate how the audience is presumed to speak.

## Rights-clean content policy

### Bundled music

Preferred order:

1. Commission Black jazz/blues composers and musicians to create both the
   composition and recording, with a written assignment or license covering
   in-game use, trailers, streaming, recording, territory, term, edits, stems,
   credits, and sublicensing needed for platform distribution.
2. Use CC0 material only when the uploader had authority to dedicate both the
   composition and recording. CC0 is the strongest Creative Commons public
   domain dedication, but only the rightsholder can apply it.
   [Creative Commons](https://creativecommons.org/public-domain/cc0/).
3. Use verified public-domain composition **and** verified public-domain
   recording, retaining the institutional rights statement and a local evidence
   snapshot. Library collections are useful discovery sources, not blanket
   clearance for unrelated assets.
   [Library of Congress Free to Use and Reuse](https://www.loc.gov/free-to-use/).
4. Use licensed catalogs only after checking each track's specific license;
   even a “royalty free” catalog can contain per-recording restrictions.
   [Musopen](https://musopen.org/music/).

Every asset ledger record contains creator, source URL, acquisition date,
composition status, recording status, license/contract snapshot, permitted
uses, territory, term, attribution, file hash, reviewer, and build eligibility.

### Host-supplied music

The safest MVP is **external venue playback**: the host plays music in their
physical space, and the game does not transmit it. A later private-room feature
may accept only `.wav`, `.flac`, `.ogg`, or `.mp3` through a bounded decoder
path, but those formats are a security allowlist—not proof of copyright
permission.

If virtual room transmission is later approved, it is private-room-only,
off by default, rights-attested by the host, not retained in the game's catalog,
individually mutable, excluded from public/ranked rooms, and disabled whenever
the session is recorded, rebroadcast, or spectated. It still requires specialist
legal/platform review before implementation.

## Prototype acceptance and kill criteria

### Required evidence

- Deterministic tests cover deal, bid order, forced dealer bid, high/low,
  no-trump, joker behavior, kitty/discard, follow suit, books, scoring, game end,
  reconnect, unanimous void, and every supported manifest option.
- Property/fuzz tests produce no impossible card count, duplicate card,
  out-of-turn transition, concealed-state leak, or divergent replay.
- Experienced-player review confirms that the table state, language, pacing,
  and selected Strict Table rules are recognizable and correctly declared.
- Target-audience usability sessions include every age band and both headset
  novices and experienced users; test bid, play, mistake recovery, captions,
  one-handed use, and comfort rather than asking only whether participants
  “liked it.”
- A beginner can complete Bid School and then play a normal hand without a
  facilitator taking control.
- A host can run an event without ever gaining concealed-information or
  committed-deal authority.
- The build fails closed when an included asset lacks complete provenance.

### Stop or reshape if

- experienced players disagree that the declared manifest matches actual play;
- hand tracking remains unreliable and the controller path is not equally
  satisfying;
- older or novice participants need continuing staff intervention after the
  tutorial;
- private voice cannot meet mute/remove/report and privacy requirements;
- cultural advisors identify caricature, false history, or unlicensed material;
  or
- networking cannot prove per-seat hidden-information isolation and replay.

## Committee debate packet

The next committee discussion should produce one conclusion for each item:

1. Which experienced-player council approves the first Strict Table manifest?
2. Which contemporary room and emotional tone represent the first table?
3. Is the first playable build local-only with AI seats, as recommended?
4. Is Unity/OpenXR accepted as the provisional toolchain pending a compatibility
   spike?
5. Is external venue music accepted for MVP, with virtual host transmission
   deferred?
6. Which accessibility paths are launch gates rather than later enhancements?
7. What evidence advances the project from local hand to private multiplayer?

One independent position per eligible committee participant, one bounded
rebuttal round, then a Director synthesis and owner decision is sufficient.
Avoid an open-ended ideation phase.

## Research method and provider record

### Public query

> Research evidence and precedents for a culturally respectful, accessible,
> private-first VR/MR Bid Whist game for Black American adults ages 30–70,
> covering rules variation, comparable social tabletop products, older-adult
> usability, Meta Quest/OpenXR design, event hosting/moderation, and music/asset
> rights. Use public sources only; distinguish fact, inference, limitation, and
> recommendation.

### Firecrawl

- **Status:** Completed with bounded retries.
- **Method:** 10 searches; 24 selected pages; authoritative sources preferred;
  selected pages scraped rather than full-site crawled.
- **Observed usage:** 65 Firecrawl credits from returned search/scrape metadata.
  No dollar conversion was provided by the tool.
- **Agent attempt:** Job `01a035c6-b0f0-76df-9f57-11ac04e79721`
  failed authentication/tooling with zero credits, so the run changed to direct
  search and selected-page extraction.
- **Failures:** One temporary credential-validation 503; three per-minute rate
  limits later succeeded on bounded retry; the selected Vivox overview URL had
  become a page-not-found and is not used as evidence.
- **Private context:** No repository contents, credentials, unpublished code,
  or private user data were sent.

### Perplexity

- **Status:** `UNAVAILABLE`; no research result is claimed.
- **Reason:** No callable Perplexity API/approved connector or CLI was present;
  no API key was configured; the local Director health surface reported
  Perplexity disabled and paid runs disabled.
- **Chrome:** The signed-in Perplexity website was deliberately not used. The
  required `perplexity-research-workflow` prohibits personal-browser/ordinary
  Pro-session substitution for the API research lane.
- **Dispatch/cost/retry:** No query dispatched, no provider retry, no cost.
- **Gap:** This packet has Firecrawl collection and Director cross-checking but
  no independent Perplexity packet. Perplexity evidence can be appended later
  without reopening the product frame.

## Source matrix

| Source | Type | Confidence | Use and limitation |
| --- | --- | --- | --- |
| [Pagat Bid Whist](https://www.pagat.com/auctionwhist/bidwhist.html) | Specialist rules reference | Medium-high | Concrete rules and variations; not authority for every family table |
| [NPR, Rise and Fly](https://www.npr.org/2005/12/26/5069913/rise-and-fly-the-story-of-bid-whist) | Interview/cultural journalism, 2005 | Medium | Intergenerational bridge, strategy, table talk, history; interview claims need care |
| [Smithsonian/Anacostia](https://www.smithsonianmag.com/smithsonian-institution/bid-whist-and-hand-dancing-at-the-anacostia-community-museum-16159868/) | Museum-linked journalism, 2013 | Medium-high | D.C. house-party/community context; regional example, not universal |
| [Wisconsin Life](https://wisconsinlife.org/story/bid-whist-ladies/) | Public-media community story, 2011 | Medium | 25-year recurring women's group; one local group |
| [AfroLA](https://afrolanews.org/2023/05/with-a-rich-history-card-games-foster-community-and-kinship-in-black-communities/) | Community journalism, 2023 | Medium | Teaching, belonging, safe intergenerational card spaces; Spades-led article |
| [Demeo](https://www.resolutiongames.com/demeo) | First-party product page | High for features | Tabletop camaraderie, cross-platform, MR/hand tracking; marketing source |
| [Cards & Tankards](https://www.meta.com/experiences/cards-tankards/3073319699437112/) | Platform store listing | High for listed features | Social card/hangout, easy-to-learn positioning, Comfortable rating; no design postmortem |
| [Walkabout Mini Golf](https://www.mightycoconut.com/minigolf) | First-party product page | High for features | Solo/private room/cross-play/guest-pass pattern; different game genre |
| [Meta design hub](https://developers.meta.com/horizon/design/) | Official platform guidance | High | Current interaction/accessibility/MR routes; broad overview |
| [Meta accessibility](https://developers.meta.com/horizon/design/accessibility/) | Official design guidance, updated 2026 | High | Simple controls, early preferences, seated/one-handed paths, target size, captions |
| [Meta hand best practices](https://developers.meta.com/horizon/design/hands-best-practices/) | Official design guidance, updated 2026 | High | One core interaction, direct manipulation, diverse-user testing, feedback |
| [Meta health and safety](https://developers.meta.com/horizon/resources/mr-health-safety-guideline) | Official platform guidance, updated 2025 | High | Boundary/passthrough and physical-environment safety |
| [Meta Unity audio](https://developers.meta.com/horizon/documentation/unity/unity-audio/) | Official technical documentation | High | Meta XR Audio SDK replaces end-of-life Oculus Spatializer |
| [Meta accessibility VRC](https://developers.meta.com/horizon/resources/vrc-quest-accessibility-1/) | Official distribution criterion, 2024 | High | Play without audio or subtitle dialogue/effects |
| [Unity Meta OpenXR](https://docs.unity3d.com/Packages/com.unity.xr.meta-openxr@2.0/manual/index.html) | Official package documentation | High | Quest/AR Foundation/OpenXR extension architecture; version must be rechecked at G1 |
| [Unity XR Interaction Toolkit](https://docs.unity3d.com/Packages/com.unity.xr.interaction.toolkit@3.1/manual/index.html) | Official package documentation | High | Cross-platform input, grab/UI/haptics/stationary rig/simulator; version-bound |
| [Aged-care VR scoping review](https://pmc.ncbi.nlm.nih.gov/articles/PMC10068985/) | Peer-reviewed scoping review, 22 articles | Medium-high | Training, local champions, adaptation, technology/culture barriers; care-setting population |
| [Older-person VR usability systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC7156831/) | Peer-reviewed systematic review, 2020 | High | Mixed-method piloting and age-adapted acceptance; many clinical/non-immersive systems |
| [Older-adult VR usability pilot](https://pmc.ncbi.nlm.nih.gov/articles/PMC6846546/) | Small pilot, 10 adults ages 63–89 | Low-medium | Preferences and ethics before deployment; very small sample and older hardware |
| [Copyright Circular 56](https://www.copyright.gov/circs/circ56.pdf) | U.S. government legal guidance | High | Separates sound recording from recorded work and digital carrier; not legal advice for a specific asset |
| [Music Modernization FAQ](https://www.copyright.gov/music-modernization/faq.html) | U.S. government legal guidance | High | Federal protection for pre-1972 recordings and licensing context |
| [Creative Commons public-domain tools](https://creativecommons.org/public-domain/cc0/) | Official license/tool explanation | High | CC0 authority and limitations; asset-level provenance still required |
| [Library of Congress Free to Use](https://www.loc.gov/free-to-use/) | U.S. cultural institution collection | High for listed sets | Rights-free discovery examples; not a blanket rule for all LOC holdings or music |
| [Musopen music catalog](https://musopen.org/music/) | Catalog/provider page | Medium | Track-specific license icons show why “royalty free” still needs per-item review |

## Evidence gaps

- No Perplexity packet was available for independent corroboration.
- No source establishes one culturally correct Bid Whist table for all
  foundational Black American players; compensated community authority is
  required.
- Older-adult evidence is useful for interaction risks but is not specific to
  this audience, this game, or current Quest hardware.
- Comparable-product pages describe features, not internal costs, retention,
  moderation failure rates, or production postmortems.
- Engine, networking, voice, and package versions must be refreshed at the G1
  toolchain decision because documentation and compatibility can change.
- This is product research, not asset-specific legal clearance.
<!-- [[Codex | GPT-5.6 | 2026-08-24 | 22:04 UTC | END]] -->
