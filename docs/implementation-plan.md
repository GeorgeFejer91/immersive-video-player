# Immersive video implementation plan

Goal: publish the viewer, phone controller and Jona MP4 on GitHub Pages.
Spec: `docs/design.md`. Execute inline under existing implementation/publication authorization.
Task state owner: `for-ai/PROJECT.md`.

1. `src/player.js`, `tests/player.test.js`: validate exact command schemas, scheduled timeline anchors, clock offset, revision and projection bounds. Watch focused tests fail, implement and run them.
2. `index.html`, `src/main.js`, `src/viewer.js`, `src/style.css`, `src/text-fit.js`: real BRSP/VDO channels, single-controller lifecycle, QR invite, clean WebXR rendering and accessible preview. One authoritative reducer. Exercise wrong-secret, state, takeover, stop, autoplay and stale paths.
3. `public/media/jona.mp4`, `scripts/verify-assets.mjs`, `tests/browser.spec.js`: full-length encode, pinned hashes, browser WebRTC acknowledgement and responsive layouts. Qualify public signaling separately from deterministic tests; record physical-device gaps.
4. `.github/workflows/pages.yml`, README and `for-ai/`: build/test/asset checks, publish reviewed files, verify remote commit, Actions deployment and live HTML/MP4 range requests. Do not claim physical Quest/phone or frame lock without matching evidence.

Review focus: autoplay activation lost across asynchronous Play; malformed/nested args; Stop during network start; controller replacement; timer suspension or buffering. Each gets a deterministic or browser/lifecycle check. Jona publication permission comes from the current user directive only.
