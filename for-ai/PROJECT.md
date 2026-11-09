# Project contract

Updated 2026-11-09. This file owns the active checklist; do not create a competing task ledger.

## Active update: explicit control beacons

The headset opens without signaling. **Send control beacon** opens a status dialog with a temporary viewer name and pairing code. **Scan for beacons** lists live announcements and lets the controller choose one viewer and supply its code. The public room carries discovery. The derived private room carries one authenticated BRSP/1 controller. A reliable confirmation after fresh state and clock sync closes both dialogs and withdraws the announcement. Cancel, timeout, and explicit disconnect revoke pending or active sessions. Recoverable transport loss retries the same private session with a bounded backoff.

- [x] Wire the beacon dialogs, private handshake, and viewer-owned VR state through the existing player.
- [x] 40 Node and 25 Chromium checks passed, including public VDO discovery, cancellation, reconnect, playback, and simulated WebXR request and exit.
- [x] Published cdd3161 through Actions 42659279529 and Pages deployment 7660807315. The HTTPS entry and five focused browser checks passed.
- [ ] Qualify pairing and remote exit on the physical Quest. The viewer requires a local gesture for immersive entry.

## Active goal: physical Quest playback and recenter

The controller distinguishes a viewer that needs its local **VR** gesture from an armed viewer that needs more media buffered. **Recenter view** is visible in the viewer and controller, including the installed app. The glowing headset button is a shortcut for the same paired action. An explicit recenter command sets the immersive center from the current yaw and pitch, while retaining head roll. Browser pan and the immersive center persist separately across VR sessions. Connection controls remain available under **Video settings**.

- [x] Reproduce and distinguish the Start readiness outcomes.
- [x] Observe the paired desktop Start advance and decode video in a physical Quest immersive session, and Stop pause and reset it.
- [x] Confirm the updated Pages build and the controller on the public URL.
- [ ] Repeat Start, frame advancement, Stop, and recenter on the physical Quest using the published build. Resume when the authorized Quest is reachable.

## Previous release: Connect request and automatic viewer listener

2026-11-09. The Quest publishes and listens on entry. The controller's header Connect button starts the existing one-to-one handshake and can restart a stalled attempt. The controller keeps discovering and retrying after that action. Hide Connect once the pair has fresh state and clock sync. An explicit Disconnect stops the controller until another Connect. The viewer releases its slot when the controller leaves and restores signaling when a waiting listener's SDK retries are exhausted.

## Previous release: one automatic viewer and controller pair

2026-11-09. One Quest viewer owns the shared timeline. The viewer admits one external controller and releases the slot on disconnect or authentication timeout. Extra controllers wait and retry. A second Quest sees Viewer in use and can reopen the page when the viewer slot is free. The same public URL and existing BRSP/VDO handshake establish the pair automatically. The hosting Quest still uses VR to enter immersive playback.

- [x] Verify early controller entry, duplicate viewer rejection, and handoff after controller disconnect.
- [x] Verify playback and transport recovery on both sides.
- Release acceptance requires the matching Pages deployment and live HTTPS entry check.

## Previous release: automatic browser controller pairing

2026-11-09. Opening the shared URL on a phone or desktop starts joining the Quest viewer immediately. The controller shows playback controls on entry and enables them after the handshake and fresh clock/state synchronization. Controllers already waiting join when a viewer arrives. Reconnect after transport interruption using the existing retry path. Keep an explicit Disconnect action in the headset status dialog. Reloading after Disconnect starts a new attempt. Start remains a playback action and the Quest's VR button remains the immersive entry.

- [x] Verify entry and automatic joining, including opening a controller before the Quest viewer.
- [x] Verify Start, Pause, Stop and reconnection through the existing data-only shared room.
- Release acceptance requires the matching Pages deployment and a live HTTPS controller entry check. The workspace validation ledger records that evidence.

## Previous release: one public playback URL

2026-11-07. The user requests one URL and one session for desktop browsers, phones and Quest. Anyone who opens the public URL may connect and control playback. The root opens controller controls on desktop/phone and immersive viewing on Quest. The Quest holds one fixed VDO target ID. If the signaling service rejects a duplicate target, the additional Quest joins as a follower. A new host starts when its Quest opens or reloads the URL. Previous URL aliases still route to the same room, and invitation fragments are discarded. Supersedes private invitation creation, the role chooser and session expiration.

- [x] Reuse the existing ordered playback authority and data-only transport. Collapse controller activation into Connect, use VR for Quest activation and keep one stable share link.
- [x] Verified 38 Node checks, build, exact asset pins, 20 deterministic Chromium checks and five public VDO scenarios. The same URL handled desktop, phone and two Quest-mode browser contexts with one host and shared Start/Stop. Publication evidence is tracked by the commit's Pages deployment and the workspace validation ledger.

## Active update: source-quality Jona and Quest VR entry

Serve the original 2880×2880, 60 fps film and audio streams at the existing MP4 route in the published build. Keep the checked-in preview for local builds, publish only the authorized film, and hash-check the fast-start remux before staging it into the Pages artifact. The shared Quest viewer keeps **VR** as one local gesture for media enable and the immersive request.

- [x] Original H.264 and AAC streams match the metadata-stripped fast-start remux byte for byte.
- [x] Verified the one-gesture route and native 2880×2880 decode in Chromium. A physical Quest Browser decoded 64 frames from an original-stream sample.
- [ ] Verify the published MP4 byte ranges and live deployment.
- [ ] A normal Browser tab still requires a gesture. True launch-icon entry requires an installed immersive WebXR PWA and signed Digital Asset Links at the HTTPS origin root. The present project site cannot publish that root file from its subpath. The account root Pages repository does not exist.

## Previous update: smartphone video warp

Add a smartphone settings icon opening a top overlay with a live 1° angle slider and warp presets, plus a local dewarped preview using the existing viewer shader. Settings adjust the phone alone before pairing and the viewer-owned projection after authentication. Preserve the native decoder, playback timeline, advanced viewer alignment, VDO/BRSP bytes, and media assets. Scope: player/viewer code, phone controls and layout, browser coverage, and film/projection documentation. Initial main: dc8e591, with prior PWA evidence edits in PROJECT and VERIFICATION.

- [x] Fit sampled straight edges across four bundled-film frames; rounded equidistant playback default 240°, preserving standard presets and fine viewer adjustment. Exact source lens remains unverified.
- [x] 39 Node checks, build/asset/context gates and all 31 production-browser checks pass with RUN_NETWORK=1. Custom 253°/254° values survive paired updates and viewer alignment; top popup passes enlarged text and simulated safe areas. Independent review passes after precision/inset fixes.
- [x] Published main/origin 3be5605: Actions 42337886513 and Pages/environment 7616470215 succeed. HTTPS settings/preset/slider, exact custom-angle remote updates, fallback, safe-area layout and PWA checks pass.

GitHub `main` includes the phone controller PWA, multi-device playback and recovery, Quest launch options, and Jona's 240° warp with live phone angle controls. The phone-warp release is `3be5605` and the prior controller release is recorded below. The new settings and paired angle checks passed on HTTPS. Across the live runs, 30 of 31 checks passed. The already-playing late/reconnected-phone case remains open under its existing 350 ms bound. Capture per-device buffer, readiness, and render timing during that case. Physical phones and Quest still require qualification.

## Previous update: controller PWA and shared playback

User requests an installable smartphone controller, multiple simultaneous controlling phones, synchronized local video on every connected device, and an install/Quest-shortcut option visible on entry that disappears once playback begins. Latest clarification prioritizes reliable phone control of Quest Browser rather than unlimited capacity: recover dropped connections, refresh state/clock on resume and keep another phone from locking out control. Only typed playback controls, clock samples and revisioned state cross the existing data-only VDO/BRSP connection. GitHub Pages hosts application/media assets; it is not a live state server. Keep generated invitations authenticated and private in memory. There is no arbitrary one-phone policy, but browser/network resources are finite and exact frame lock or support for literally every smartphone is not promised.

Plan/spec (single owner; execute inline and obtain a fresh whole-branch review):

- [x] `src/remote/target-group.js`: isolated per-peer BRSP connections over the unchanged VDO adapter, shared bounded reducer queue, broadcast state and per-peer auth/flood isolation. Four real-protocol tests prove 24 authenticated concurrent controllers, shared state, serialized commands, departure, bad-secret isolation, flood isolation, all-peer shutdown and recoverable teardown without terminal notifications.
- [x] `src/player-app.js` / session entry: group host, independent transport controls without stale-revision lockout, shared clock/anchor and explicit follower viewer link. Real public data-only WebRTC passed three phones plus follower, a fourth phone joining (five simultaneous remote peers), one leaving, phone and host connection recovery, shared seek/Stop and shutdown. A separate already-playing test passed late joining and forced phone reconnection without changing the host revision, with native video positions converging within 350 ms at a common sample time.
- [x] PWA assets and `src/install-app.js`: subpath-safe manifest/controller start URL, real local icons and a ten-file, content-versioned app-shell service worker. Real worker install/offline navigation/cache exclusions, byte-range media bypass, manifest/icon dimensions, native-prompt gesture callback, Quest/iOS instructions, accepted-install focus and real-playback dismissal pass. Quest instructions link to the automatic viewer before saving its Library shortcut. No secrets, arbitrary query URLs, MP4s/ranges or APKs are cached; no forced worker replacement during a session.
- [x] Phone seek, truthful readiness, reconnect/resume handling and measured install labels pass; existing Pretext layout/reflow/accessibility matrix and reduced-motion behavior pass. Actual enlarged-label screenshot inspected. Preserved source media, pinned protocol/SDK, local decoding and native activation/VR gestures. APK remains optional at its direct URL with exact reviewed hash.
- [x] Unit/build/asset/context, all 29 local browser checks, fresh review and all 29 unique HTTPS checks pass (two live fixture corrections verified by scoped reruns). Product 7652d16 and test/evidence follow-up dc8e591 are published; latest Actions 42314819181 attempt 2 and Pages/environment 7613625001 succeed. Live shell/worker rechecked after final deployment. Capacity evidence is 24 protocol peers and five simultaneous real remote peers; physical Quest/phone qualification remains explicitly unrun.

Ruling: the existing viewer remains the single session authority; additional phones/follower viewers authenticate independently against it. Commands are ordered by acceptance at that authority. No chat, media stream, new cloud account or new relay service is introduced. The previously requested automatic shortcut option remains part of this work. Branch: codex/multi-controller-pwa, starting at 25a3856 with only prior local control-plane receipts. Missing routed BRSP skill uses pinned source/tests and official SDK docs as the bounded fallback.

## Current direction: built-in Quest website shortcut

2026-11-06 user clarification: the desired result is an icon in the Quest menu that opens the hosted player, without a dedicated sideloaded APK. Meta's official release notes document Browser shortcuts in Library: open the website in Quest Browser, use its top-right menu and select Add this page to your library. The existing `?launch=quest` entry already starts viewer pairing when opened, so use that URL as the shortcut target. Prefer this built-in feature for the requested workflow; the separately built APK is optional and unnecessary for this behavior. Do not confuse browser shortcuts with Meta's separate Store PWA packaging path. No manifest, service worker or product changes were made for this clarification. Source: https://www.meta.com/en-gb/help/quest/172903867975450/ (Browser shortcuts in Library).

## Previous update: website APK download

The user explicitly authorizes publishing the signed Quest launcher APK and a visible website download control on 2026-11-06. Add Download Quest APK to the existing launcher footer, using the current Pretext measurement and stretch/reflow behavior. Serve the exact reviewed APK at `public/downloads/ImmersiveVideoPlayer-Quest.apk`, pin its SHA-256 in the existing asset gate and verify an actual browser download after deployment. This is a narrow exception to the earlier local-only APK policy; signing keys, other native outputs and device evidence stay private. Preserve all playback, pairing and projection behavior.

- [x] Add the visible footer download and the single allowed, SHA-pinned signed APK; signature verification passed.
- [x] Actual browser download matches 12,768 bytes and SHA-256. Keyboard access, Pretext, responsive matrix, enlarged text and localized-label reflow passed; all 22 browser checks passed with both real public VDO flows enabled.
- [x] Published main 25a3856 through successful Actions 42269913661 / Pages environment deployment 7607634722. Home and APK return 200; live download matches the signed hash/size and correct APK MIME type. All 22 live browser checks passed.

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
- `src/main.js`: device-mode bootstrap; `src/session-entry.js`: role selection and public rendezvous identifiers.
- `src/player-app.js`: activation, pairing, lifecycle, media, clock sampling, acknowledgements, 250 ms heartbeat and 2 second stale handling.
- `src/viewer.js`: shared Three.js ray-to-source projection; WebXR/head pose on viewer, capped-density frame-driven phone preview with native fallback. Jona is mono circular fisheye with a fitted 240° playback default.
- `src/remote/`: pinned BRSP core and locally patched VDO adapter; hashes in `scripts/verify-assets.mjs`.
- `src/text-fit.js`: actual pinned Pretext measurement, readable reflow and rendered checks.
- `public/media/jona.mp4`: full-length web encode below 100 MiB; provenance in `public/media-provenance.json`.
- Vite builds relative asset paths into `dist/`; Actions verifies/builds/deploys main. A generated service worker caches an explicit UI-only allow-list with per-scope versions and natural activation. No media, APKs, query URLs, invitations or secrets are cached; no backend, arbitrary remote URL, camera/mic, analytics or native bridge.
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

The controller PWA and multi-device release shipped at `7652d16`, followed by test fixture corrections in `dc8e591`. The current consolidated release and remaining qualification are recorded above. Physical qualification covers controller and Quest shortcut installation, starting playback, and recovering state after suspending and reopening the phone.
