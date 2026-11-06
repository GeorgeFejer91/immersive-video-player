# Decision log

## D-0007 — Native phone playback and semantic transport

2026-11-06, Accepted. User requests a phone video-player surface showing the same local asset, with Start/Pause/Stop and a pulsing green/red SVG headset status button. Supersedes D-0006's phone accordion surface; viewer accordions remain. Reuse the native video and existing command handlers, skip phone WebGL, move connection controls into a native dialog, request transport scope only. Stop resets to zero without disconnecting. Shorten the scheduled start lead to 500 ms, preserving clock samples, acknowledgements, state freshness and drift correction. Green requires fresh confirmed state and matching local preview, not merely an open socket; reduced motion disables pulse. Preserve the pinned data-only transport and ship no video stream.

## D-0006 — Minimal stretch controls

2026-11-06, Accepted. User directs the visible site to contain only the title Immersive Video Player, QR and functional controls, without Quest Browser instructions or explanatory copy. Supersedes D-0005's visible setup/fallback instruction expectation. Preserve shared routing and protocol behavior. Use native exclusive details for Connection/Playback/View, fixed header/footer, dimension-driven stretch tokens and actual Pretext measurement. Unfittable enlarged text falls back to readable document flow; QR utilities use a native dialog. Transport diagnostics remain machine-readable rather than UI prose.

## D-0005 — Shared device-aware session entry

2026-11-06, Accepted. Root generates one high-entropy fragment-only session QR without media/signaling. The opened invitation chooses viewer on Quest/immersive-capable browsers, phone control center on smartphones, or manual choice when uncertain. Explicit role links override hints; hints are UX only. Viewer and controller reuse the same invitation. Recoverable errors preserve pairing, while End/expiry clear local keys and manual role links. A copied bearer may open another viewer, so a different pair should create a new QR. No static site can install/control the native headset QR scanner or bypass VR/autoplay gestures; provide explicit headset URL fallback.

Record only durable choices whose rationale future agents would otherwise have
to rediscover. Source and tests remain the authority for implementation facts.

## D-0001 — Minimal control plane before product scaffolding

- Date: 2026-11-05
- Status: Accepted
- Context: The project needs a predictable AI entrypoint without choosing an
  application stack or inventing product structure prematurely.
- Decision: Use a short root `AGENTS.md` that routes to a lowercase `for-ai/`
  control plane. Keep product output outside that folder and add project files,
  skills, and protocols only for current requirements.
- Consequences: New agents get a reliable map and readiness gates. The first
  product task must still choose the smallest suitable output structure.
- Supersedes: None

## Record format

For later decisions, add one compact entry with:

- identifier and title;
- date and status (`Proposed`, `Accepted`, `Superseded`, or `Rejected`);
- context;
- decision;
- consequences;
- supersession link when applicable.

Do not rewrite accepted history to hide a changed direction. Add a superseding
decision and link both entries.

## D-0002 — Static viewer with phone authority requests

2026-11-05, Accepted. Current user instruction authorizes public browser implementation and publication, superseding the historical native-only release goal. Use one viewer-owned reducer and one active invited phone. The phone sends only typed commands; viewer state and acknowledgements determine success. Both fetch bundled MP4; VDO.Ninja carries no media. A future timeline anchor and bounded clock sampling avoid a backend, with an explicit approximate-sync limit.

## D-0003 — Jona-only footage exception

2026-11-05, Accepted. User explicitly requested Jona ship with this repository. The full-length web encode is public; no other footage, private artifacts or source-video directories may be added. Film rights are separate from software licenses. Preserve exact provenance and asset allow-list.

## D-0004 — Attach WebRTC lanes before waiting for open

2026-11-05, Accepted. Real VDO browsers delivered controller hello before target openChannel promises resolved; the inherited adapter dropped it. Attach via documented getChannel immediately, buffer at most eight early reliable messages, flush after both lanes peeropen, retain generation fencing. Keep pinned SDK unmodified and record local adapter hash. Three regression tests and real public signaling/control/handoff passed.
