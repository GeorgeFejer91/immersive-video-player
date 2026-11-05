# Decision log

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
