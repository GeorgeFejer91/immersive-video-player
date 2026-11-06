# Phone controlled immersive video

2026-11-05. User authorized implementation, GitHub push and live Pages publication.

Updated 2026-11-06: the root URL is a shared session launcher with an immediate QR. Its fragment-only invitation opens the viewer on Quest/immersive-capable browsers and compact controls on smartphones; uncertain devices choose a role, and explicit viewer/controller links always override detection. The root downloads no video and constructs no remote connection. The viewer keeps the supplied invitation across recoverable connection failures, rather than generating a different room. End/expiry clear keys and role links locally. A copied bearer can open a separate viewer; a fresh viewing pair should generate a new QR.

The viewer enables playback locally to satisfy autoplay policy and explicitly enables its remote. The phone enables preview and connects. The user enters VR with a headset gesture; only video appears in the immersive session. The viewer remains authoritative; one invited phone controls play/pause, seek, volume, projection, FOV and recenter. Phone departure frees the viewer for another invited phone. Native headset QR scanner availability is an external prerequisite; copying/opening the explicit headset URL is the fallback.

Reuse the BRSP/1 core and pinned VDO.Ninja 1.5.5 adapter. Only data crosses WebRTC: both devices fetch the same bundled MP4 over HTTPS. The phone estimates clock offset using bounded ping replies, then asks the viewer for a scheduled play anchor. Both schedule against the viewer clock and phone preview corrects drift. Autoplay, buffering and OS scheduling preclude frame lock. Readiness and stale/blocked playback remain visible.

Projection defaults to Kodak circular fisheye for the square Jona source, with adjustable lens angle, yaw/pitch, view FOV, equirectangular 180/360 and flat alternatives. A sphere shader maps viewing rays to the circular source independently for each eye (the source is mono).

Static Vite build with relative paths, Three.js WebXR, QR generation and actual Pretext measurement. No backend, camera/microphone capture, tracking, arbitrary remote URLs, native bridge or service worker. Bounded commands, 250 ms state heartbeat, 2 second stale threshold, 30 minute session expiry, acknowledgements and one active controller. Internet is required for VDO signaling/ICE; same Wi-Fi is optional.

Publish only this curated browser repository and the specifically authorized full-length Jona web encode. Retain library licenses and hashes. Older native work stays in the original workspace.
