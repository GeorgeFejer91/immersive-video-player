# Verification record

Updated 2026-11-06. Evidence is scoped to the named surface, not a universal product/hardware claim.

## Shared QR update — 2026-11-06

Local PASS: 31/31 Node tests, Vite production build and exact media/BRSP/VDO asset checks. 10/10 production-browser tests passed on Chromium: root QR visible without MP4/signaling, same invitation routes Quest-like UA to viewer and phone-like UA to compact controls, explicit overrides/manual desktop fallback, fragment stripping, same invitation retained over failed signaling, End clears role links, refreshed role links after new sessions, correct clipboard fallback, 320 px/enlarged-text reflow, local activation/Stop, and real public VDO playback/seek/projection/phone handoff. Phone Play button was within the first 844 px viewport.

The real-network test navigated both browser contexts from the identical launcher link and verified the viewer retained its fragment material. Observed direct route, 1 ms SDK RTT, one position comparison 0.035965 seconds. Same-machine simulated device hints are not physical Quest or iPhone evidence.

Visual QA inspected normal desktop and 320 px launcher screenshots under ignored `.for-ai-local/`. QR inline sizing was reset so it stays square and fits narrow screens; long action labels reflow through a zero-minimum Grid track. Native QR camera scanning is NOT RUN. The site opens URL invitations; native URL-scanner availability remains external, with a copied headset-link fallback. Device hints never authorize commands; WebXR capability is checked independently on entering VR. Sources: [Meta browser specs](https://developers.meta.com/vr/documentation/web/browser-specs/) and [WebXR overview](https://developers.meta.com/vr/documentation/web/webxr-overview/).

Publication of this update is pending exact GitHub Actions/Pages and live-site checks. The 2026-11-05 evidence below is historical and applies to that release.

## Commands

- `node scripts/verify-assets.mjs`: exact Jona/BRSP/VDO hashes, authorized media allow-list, fast-start and <100 MiB.
- `npm run check`: Node tests and production Vite build.
- `npm run test:browser`: Chromium production-build playback, labels, focus, invitation and Stop tests. Public VDO test is skipped unless RUN_NETWORK=1.
- Set RUN_NETWORK=1 for the real external signaling/WebRTC handshake, scheduled play, pause, seek, projection and phone-handoff check. Set TEST_URL to test a published site.
- `powershell -NoProfile -ExecutionPolicy Bypass -File for-ai/scripts/check-context.ps1 -ProjectRoot . -RequireRemote` after publication.
- `git status --short`, `git rev-parse HEAD`, `git ls-remote origin refs/heads/main` for exact synchronization.

## Observed local evidence

- PASS: 28/28 Node tests; production Vite build; hashes/fast-start/media allow-list; npm runtime audit (zero vulnerabilities).
- PASS: full MP4 decode with FFmpeg, no errors. ffprobe: 467.306 seconds, 1920x1920, 30 fps H.264/AAC, 75484266 bytes. Full film retained; source metadata stripped.
- PASS: 5/5 Playwright browser tests, Chrome for Testing 156.0.8078.4 on Windows. Public VDO test used separate same-machine browser contexts, actual hosted signaling and data-only WebRTC: mutual proof, confirmed Play/Pause, seek to 100 seconds, projection change, first-phone departure, second-phone pairing, viewer revocation.
- Measured route: direct; SDK RTT 1 ms. One preview-position comparison after scheduled start differed by 0.004855 seconds. This is one same-machine sample, not a physical-phone latency budget or frame-lock guarantee.
- Layout: 320x700, 390x844, 844x390, 1440x900, 1920x1080; 320 px with enlarged type, spacing overrides and long German button string. No measured page/label overflow. Actual Pretext measurement active; keyboard focus restored across clean-view toggle.
- Inert before explicit remote activation; no VDO socket until Start. Invitations removed from URL history, playback remains disabled before local arm; Stop while signaling waits clears QR/link.
- Source review resolved channel startup race (three new regression tests), replacement-session revision reset, sRGB video decode, repeated recenter accumulation and bfcache resume policy. SDK bytes remain unmodified; adapter patch explicitly documented.

## Publication

VERIFIED: public repository https://github.com/GeorgeFejer91/immersive-video-player, Pages https://georgefejer91.github.io/immersive-video-player/. Product commit 0ba034fdbf66ff396e73c4e0e07b15a930200506 matched origin/main and Pages deployment 7581683995. Actions run 42083862166 succeeded, including Linux build, asset pins, 28 Node tests and four deterministic browser tests (public-network test is opt-in in CI).

VERIFIED against the published HTTPS site: 5/5 browser tests, including public VDO handshake, scheduled Play/Pause, seek, projection, replacement phone and revocation. Same-machine browser contexts; direct route, SDK RTT 1 ms, one preview-position comparison 0.06629 seconds. This remains bounded desktop-browser evidence.

Live root returned HTTP 200 and expected viewer/controller content; MP4 range bytes=0-63 returned HTTP 206, video/mp4, bytes 0-63/75484266 and ftyp signature. Git object comparisons confirmed exact committed bytes match checked BRSP/adapter/SDK/media files. Documentation receipt follows the product commit; fresh Git/Actions reads identify the current main revision.

## Open qualification boundaries

Physical Quest, physical Android/iOS phones, real touch/head pose, controller comfort, mobile screen lock/network changes, long-running clock drift, forced TURN and cellular routes are NOT RUN. Headless browser widths are not physical-phone proof. WebXR rendering/recenter code has source/math review but no attended headset acceptance. Approximate start/drift correction is supported; exact frame synchronization is not claimed.
