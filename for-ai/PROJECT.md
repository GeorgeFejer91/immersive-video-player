# Project contract

Updated 2026-11-06. This file owns the active checklist; do not create a competing task ledger.

## Active update: minimal stretch accordion

Only `Immersive Video Player`, QR and functional controls. No UI marketing, explainers, context or Quest instructions. Apply Uncodixfy Pretext accordion stretch: fixed header/footer, width/height-driven spacing/type, measured labels, ordered accordion groups and no internal panel scrolling. Preserve shared routing and playback authority. Normal matrix: portrait >=320×560, landscape >=640×390, desktop >=800×480 CSS px. Below that or when enlarged text cannot fit, allow readable document flow rather than clipping/shrinking. Dialogs have their own scroll policy.

- [x] Minimal launcher/player markup and concise states, retaining functionality.
- [x] Pretext stretch geometry, keyboard/resize/accordion checks and remote regression; 31 Node and 15 browser checks pass, including public VDO.
- [x] Published: Actions 42217057959 and environment deployment 7599991616 succeeded for b627274; all 15 tests passed against the live HTTPS site. Evidence updated.

## Previous update: shared session entry

The main site displays a QR before playback setup. One session invitation routes Quest/immersive-capable browsers to viewing and smartphones to the compact control center. Unknown devices can select a role; explicit links always override detection. The headset must reuse the invitation rather than generate a different room. No signaling or media download on the launcher; Connect and playback/WebXR remain explicit. Browser device hints choose UX only, never authentication or grants. Current implementation/publication authorization continues for this requested live-site change.

- [x] Bounded role routing/shared invitation generation; three focused Node tests passed.
- [x] Launcher QR/manual role links/compact phone controls; 11 browser tests passed, including same-QR real VDO/WebRTC, delayed module readiness, retry, clipboard, reflow and explicit activation.
- [x] Docs/evidence updated; product 03e66fa passed Actions 42207757845, matched Pages deployment 7598612184 and passed all 11 live-site browser tests.

## Goal and authorization

Publish a live GitHub Pages immersive MP4 viewer. A headset browser sees only the locally rendered film in WebXR; an invited smartphone becomes the central playback/view controller. Use BRSP/1 mutual proof over VDO.Ninja data-only WebRTC, a common scheduled timeline and drift correction. Include full-length Jona as an ordinary repository asset.

The 2026-11-05 user instruction authorizes implementation, public GitHub push, Pages configuration and live publication. `jonah.mp4` is the requested Jona video. This supersedes the older native-only goal and creates a narrow publication exception for this film alone. Other footage, native artifacts, private logs/screenshots, device identifiers and credentials remain excluded. No downstream film reuse license is granted; library licenses apply only to code.

## Architecture

- `src/player.js`: single viewer-owned reducer, exact allow-list and timeline anchors.
- `src/main.js`: launcher QR and device-mode bootstrap; `src/session-entry.js`: pure role decisions and fragment-only session links.
- `src/player-app.js`: activation, pairing, lifecycle, media, clock sampling, acknowledgements, 250 ms heartbeat and 2 second stale handling.
- `src/viewer.js`: Three.js WebXR/head pose and ray-to-source projection. Jona is mono circular fisheye.
- `src/remote/`: pinned BRSP core and locally patched VDO adapter; hashes in `scripts/verify-assets.mjs`.
- `src/text-fit.js`: actual pinned Pretext measurement, readable reflow and rendered checks.
- `public/media/jona.mp4`: full-length web encode below 100 MiB; provenance in `public/media-provenance.json`.
- Vite builds relative asset paths into `dist/`; Actions verifies/builds/deploys main. No backend, arbitrary remote URL, camera/mic, analytics, service worker or native bridge.

## Previous release acceptance (2026-11-05)

- [x] Record directive and shared skill baseline; preserve native work as history.
- [x] Bounded timeline/projection/pairing schemas and meaningful reducer/protocol checks.
- [x] Full-length H.264/AAC Jona encode; exact bytes, fast-start, duration and full decode checked.
- [x] Viewer, phone QR pairing, WebXR renderer, acknowledged controls and clean VR surface.
- [x] Browser playback/layout/Stop and public VDO scheduled-play/control/handoff test; recorded in VERIFICATION.md.
- [x] Review final source/selection, push public repository, configure Pages and verify exact remote SHA/Actions (product 0ba034f, run 42083862166 passed).
- [x] Live Pages HTML/MP4 ranges and all five browser tests passed, including real public VDO control and handoff.

Physical Quest/iOS/Android comfort, suspension, relay/cellular routes and exact frame synchronization are separate qualification gates. Do not infer them from Chromium or deployment. Browser timers/decoders cannot promise frame lock.

## Handoff

The minimal stretch UI is complete and live. Runtime product fa6903e is included unchanged in b6272743c3f2a558928e24190f2f5bbc494920e5, which passed Actions 42217057959 and Pages/environment deployment 7599991616. All 15 browser tests passed against that published HTTPS site, including actual public VDO control/handoff. Local 31 Node tests, build and asset pins passed; Linux deterministic browser checks passed. This evidence receipt changes documentation only. Use fresh Git/Actions reads for current main; physical-device qualification remains separate. Keep the native project historical and outside this public browser repository.
