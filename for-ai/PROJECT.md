# Project contract

Updated 2026-11-06. This file owns the active checklist; do not create a competing task ledger.

## Active update: website APK download

The user explicitly authorizes publishing the signed Quest launcher APK and a visible website download control on 2026-11-06. Add Download Quest APK to the existing launcher footer, using the current Pretext measurement and stretch/reflow behavior. Serve the exact reviewed APK at `public/downloads/ImmersiveVideoPlayer-Quest.apk`, pin its SHA-256 in the existing asset gate and verify an actual browser download after deployment. This is a narrow exception to the earlier local-only APK policy; signing keys, other native outputs and device evidence stay private. Preserve all playback, pairing and projection behavior.

- [x] Add the visible footer download and the single allowed, SHA-pinned signed APK; signature verification passed.
- [x] Actual browser download matches 12,768 bytes and SHA-256. Keyboard access, Pretext, responsive matrix, enlarged text and localized-label reflow passed; all 22 browser checks passed with both real public VDO flows enabled.
- [ ] Pass asset/unit/browser/context gates, publish and verify the live download and deployment.

Scope: `index.html`, the one footer CSS rule, the signed public APK, asset verification, focused browser coverage, Git artifact exceptions, README/module installation docs and this control plane. Start on main 1e054e4, with only the prior task's local PROJECT.md/VERIFICATION.md evidence receipts present; preserve those facts. The existing public Quest-flow regression additionally waits for actual paused/ready/non-seeking viewer media after enablement, correcting a reproduced precondition race without changing runtime or playback assertions. No new native runtime behavior or device operations.

## Previous update: Quest launcher

Create a sideloadable Quest 3 app icon that opens the published player directly in Meta Quest Browser, automatically creates a fresh invitation, starts data-only pairing and displays the phone QR. Keep the normal web entry inert. A headset VR gesture enables local media and requests immersive mode; browser activation rules still apply. Use a minimal Android Activity for this OS handoff rather than introducing a second renderer or Tauri shell. This requested launcher is separate from the historical native player. APKs, signing keys and device evidence stay local; existing browser publication authorization covers the web entry update.

- [x] Implement launcher entry; 34 Node checks and 21 browser checks passed, including real VDO automatic pairing, gesture/error behavior, retry and revocation.
- [x] Build and verify a signed local APK (12,768 bytes), with rebuild source and installation instructions in `quest-launcher/README.md`.
- [x] Browser/asset/context gates passed. 1e054e4 passed Actions 42265238549 and Pages/environment deployment 7607001132; all 21 live HTTPS browser checks passed.
- [x] Deliver the signed local APK with installation instructions. No Quest is connected; physical install, OS handoff, QR scanning and headset WebXR remain explicitly unrun.

Scope: `src/session-entry.js`, `src/main.js`, `src/player-app.js`, corresponding tests, `quest-launcher/`, README and this control plane. Preserve BRSP/VDO bytes, viewer projection, phone authority, media bytes and normal routes. Initial Git state: clean main at 67af603; no connected ADB device. No pre-existing test failures observed yet.

## Previous update: smartphone video player

Phone shows the same bundled MP4 directly in a native video element, without video streaming or a phone WebGL renderer. Visible transport is Start/Pause/Stop; Stop resets both timelines to zero, Pause preserves position. Connection controls move into a native dialog opened by an SVG headset button and close after authenticated pairing. Green pulse requires a fresh authenticated viewer state, sampled clock and matching local preview; disconnected or unsynchronized states stay red with an accessible status name. Honor reduced motion. Keep the existing data-only VDO/BRSP authority, scheduled anchors and drift correction; expose only transport scope on the phone. Preserve minimal copy and existing headset/launcher behavior.

- [x] Implement phone player, Stop semantics and truthful headset status.
- [x] Verified: 33 Node/build/hash checks, 15 deterministic browser checks and the public data-only VDO control/handoff/error regression.
- [x] Published 408194e: Actions 42225070772 attempt 2 and Pages/environment deployment 7601285654 succeeded; all 16 checks passed on HTTPS. Evidence updated.
- [x] Follow-up QR routing assurance: six simulated phone/tablet browser hints entered controller connection controls directly on the live site, without a role chooser. Dedicated regression added; runtime unchanged.

## Previous update: minimal stretch accordion

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

Publish a live GitHub Pages immersive MP4 viewer. A headset browser sees only the locally rendered film in WebXR; an invited smartphone becomes the central playback controller. Use BRSP/1 mutual proof over VDO.Ninja data-only WebRTC, a common scheduled timeline and drift correction. Include full-length Jona as an ordinary repository asset.

The 2026-11-05 user instruction authorizes implementation, public GitHub push, Pages configuration and live publication. `jonah.mp4` is the requested Jona video. This supersedes the older native-only goal and creates a narrow publication exception for this film alone. The 2026-11-06 website-download request additionally authorizes the signed Quest launcher APK. Other footage, other native artifacts, private logs/screenshots, device identifiers and credentials remain excluded. No downstream film reuse license is granted; library licenses apply only to code.

## Architecture

- `src/player.js`: single viewer-owned reducer, exact allow-list and timeline anchors.
- `src/main.js`: launcher QR and device-mode bootstrap; `src/session-entry.js`: pure role decisions and fragment-only session links.
- `src/player-app.js`: activation, pairing, lifecycle, media, clock sampling, acknowledgements, 250 ms heartbeat and 2 second stale handling.
- `src/viewer.js`: Three.js WebXR/head pose and ray-to-source projection. Jona is mono circular fisheye.
- `src/remote/`: pinned BRSP core and locally patched VDO adapter; hashes in `scripts/verify-assets.mjs`.
- `src/text-fit.js`: actual pinned Pretext measurement, readable reflow and rendered checks.
- `public/media/jona.mp4`: full-length web encode below 100 MiB; provenance in `public/media-provenance.json`.
- Vite builds relative asset paths into `dist/`; Actions verifies/builds/deploys main. No backend, arbitrary remote URL, camera/mic, analytics, service worker or native bridge.
- `quest-launcher/`: a permission-free Android Activity hands a fixed HTTPS launch URL to the OS browser. Its explicit `?launch=quest` web entry creates pairing automatically. The reviewed signed APK ships under `public/downloads/` with an exact asset pin; keys, other native outputs and device evidence stay local. Historical native-player code remains excluded.

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

Website download is implemented and locally verified: signed APK under public/downloads, one footer anchor, asset pin, keyboard-triggered byte/hash check and readable responsive labels. 34 Node checks, build, asset/signature/context gates and all 22 browser checks with both public VDO flows passed. Source 6a42873 is pushed; Actions 42268832800 passed Linux checks, but both Pages deployment attempts failed generically. A documentation-only revision records release provenance and requests a fresh deployment. Confirm that deployment and the actual live download next. The prior task's local evidence receipts are preserved. Physical Quest installation and VR remain unrun; no device state was changed. Keep keys, other native outputs and historical native-player code private.
