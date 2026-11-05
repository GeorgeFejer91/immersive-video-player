# Phone controlled immersive video

2026-11-05. User authorized implementation, GitHub push and live Pages publication.

The root URL opens Jona in a head-tracked WebXR view or a mouse/touch panorama on ordinary browsers. The viewer enables playback locally to satisfy browser autoplay policy, enables the phone remote, and shows a fragment-only QR invitation. After entering VR, only the video is visible. A phone opens the invitation, explicitly connects and enables its local preview. The viewer remains authoritative; one invited phone controls play/pause, seek, volume, projection, field of view and recenter. A phone can disconnect, freeing the viewer for another invited phone. Revoke creates fresh pairing material.

Reuse the BRSP/1 core and pinned VDO.Ninja 1.5.5 adapter. Only data crosses WebRTC: both devices fetch the same bundled MP4 over HTTPS. The phone estimates clock offset using bounded ping replies, then asks the viewer for a scheduled play anchor. Both schedule against the viewer clock and phone preview corrects drift. Autoplay, buffering and OS scheduling preclude frame lock. Readiness and stale/blocked playback remain visible.

Projection defaults to Kodak circular fisheye for the square Jona source, with adjustable lens angle, yaw/pitch, view FOV, equirectangular 180/360 and flat alternatives. A sphere shader maps viewing rays to the circular source independently for each eye (the source is mono).

Static Vite build with relative paths, Three.js WebXR, QR generation and actual Pretext measurement. No backend, camera/microphone capture, tracking, arbitrary remote URLs, native bridge or service worker. Bounded commands, 250 ms state heartbeat, 2 second stale threshold, 30 minute session expiry, acknowledgements and one active controller. Internet is required for VDO signaling/ICE; same Wi-Fi is optional.

Publish only this curated browser repository and the specifically authorized full-length Jona web encode. Retain library licenses and hashes. Older native work stays in the original workspace.
