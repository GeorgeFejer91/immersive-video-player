# Decision log

## D-0011 — Shared phone warp and a fitted Jona preset

2026-11-07, Accepted. User requests smartphone video warping like the original Unity player, explicitly permits a custom angle, and specifies a settings icon opening an overlay with a dynamic slider. Supersedes D-0007's no-phone-WebGL and transport-only scope choices. Reuse the native decoder and existing ray-to-source shader for a capped-density phone preview; native video remains the WebGL failure/context-loss fallback. The phone's top-positioned native dialog provides a 180–360° angle slider in 1° steps, Jona 240°, fisheye 180/270/360, equirectangular 180/360 and Flat. Before pairing it changes only the local preview; authenticated phones request the existing player.view scope and the original viewer remains the authority. Full projection presets use a revision precondition. The validated lens-only action preserves concurrent alignment/mode/anchor changes; slider requests coalesce behind acknowledgments at no more than ten per second and retain the final value. Disconnect/preset/mode changes discard obsolete queued angles. Advanced viewer settings use the same 1° precision. Playback and the pinned BRSP/VDO/media bytes are unchanged.

The 240° default is a rounded playback fit within the existing equidistant shader model: five sampled straight edges across four frames give a pooled minimum near 239.5°, with sensitivity of about 236–243° to a five-pixel assumed-center shift in a 768 px analysis frame. This supersedes the previously uncalibrated 270° default. It is a content-based playback recommendation, not verified camera metadata or a physical-headset comfort result.

## D-0010 — Prefer the built-in Quest Library shortcut

2026-11-06, Accepted. User clarifies that the goal is a Quest menu icon opening the hosted player, without a dedicated installed APK. Meta officially documents Browser shortcuts in Library (https://www.meta.com/en-gb/help/quest/172903867975450/): the user adds the current website through the Browser menu. Use the existing ?launch=quest URL for automatic viewer pairing. This supersedes the assumption behind D-0008 that a custom APK is needed for that outcome; it does not itself remove the already published optional APK. Browser shortcuts and Store-packaged PWAs are separate paths. No native package or new implementation is needed merely to open the current page from Library.

## D-0009 — Website APK download

2026-11-06, Accepted. User explicitly requests implementing and publishing a website APK download. Supersedes the local-only APK part of D-0008; keys, other build outputs and device evidence remain private. Add one native download anchor in the existing root footer, with the locked Pretext measurement and readable reflow already in use. Publish only the previously verified signed 1.0.0 APK under public/downloads, preserve binary bytes in Git, and enforce its exact SHA-256 in the existing asset gate. Test an actual keyboard-triggered browser download and deployed bytes. Website download is separate from sideload installation and physical-device acceptance.

## D-0008 — Quest browser launcher

2026-11-06, Accepted. User requests an installable Quest 3 widget that opens the player ready for smartphone input. Implement a small Android launcher Activity using Meta's documented `systemux://browser` deep link and a fixed published HTTPS URL. A per-launch non-secret URL nonce requests fresh navigation. New `?launch=quest` selects viewer mode and starts pairing with an automatically opened QR; ordinary root/role entry remains explicitly activated. Phone authentication closes the QR but keeps VR accessible until locally enabled. In this launch mode the VR gesture starts media enablement and the WebXR request together, preserving browser activation. Headset permissions and activation cannot be delegated to the phone. No boot behavior, Android WebView, background service or Android home-screen AppWidget is claimed. Publish code with the existing browser source; keep APKs, keys and device evidence local. This allows the newly requested launcher source alongside the web app; historical native-player code remains outside the repository. Sources: [Meta system deep linking](https://developers.meta.com/vr/documentation/spatial-sdk/ps-system-deep-linking/) and [WebXR PWA activation boundaries](https://developers.meta.com/vr/documentation/web/pwa-webxr-gs/).

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

## D-0005 — Independently authenticated controllers and browser installation

2026-11-07, Accepted; supersedes the one-active-phone restriction in D-0002. Preserve one viewer-owned reducer, separate pinned BRSP connections per invited peer and a shared bounded command queue. Broadcast accepted state to all peers, isolate individual failures and retry interrupted connections with the same in-memory invitation. Explicit Disconnect and session expiry cancel recovery. Prioritize reliable smartphone-to-Quest control; no unlimited-capacity or physical-device guarantee follows from browser tests. The requested install route is a standard controller PWA plus Quest Browser's built-in Library shortcut. The optional APK remains directly available. Cache only a versioned static UI allow-list, never media, invitations, query URLs or credentials; activate updates naturally without replacing a playing session.
