# Immersive Video Player

Watch **Jona** together from [the same player URL](https://georgefejer91.github.io/immersive-video-player/) on Quest, phone, and desktop.

Open the link in Quest Browser and tap **VR**. Open the same link on a phone or desktop to join automatically. Playback controls become available when the viewer connects and synchronizes. The pair shares **Start**, **Pause**, **Stop**, and the playback position. Stop resets the video on both devices. The Quest's **QR** button shares the same public link.

The shared room pairs one Quest viewer with one phone or desktop controller. An extra controller waits until the slot is free. If another Quest already hosts, close that viewer before reopening the page on the Quest that should host next. The controller reconnects after network interruptions. After choosing Disconnect, reload the page to join again.

The headset icon shows connection status and opens connection controls. Tap **Video settings** on the controller to select a warp preset or adjust **Angle** from 180° to 360° in 1° steps. **Jona 240°** restores the fitted default. The paired controller adjusts the shared projection. Drag the preview to look around. The controller preview is silent.

## How it works

The fixed public room and target ID let every browser discover the same host. The controller slot is available to the first browser that pairs through the public URL. The rendezvous value shipped with the site is public. The BRSP/1 exchange binds peers to the protocol and scopes, and the hosting Quest orders all playback and projection commands. The pinned VDO.Ninja SDK 1.5.5 carries controls, state, and clock samples over data-only WebRTC. Each device decodes the video locally.

Both devices fetch and decode the same bundled MP4. The phone dewarps it using the viewer's projection shader and falls back to native video without WebGL; it can still adjust the paired viewer. The phone estimates viewer clock offset, receives a playback anchor 500 ms ahead and corrects preview drift. This is approximate synchronization. State older than two seconds disables remote phone commands.

The 240° setting fits straight edges in several Jona scenes. The exact camera lens is unverified. The viewer's **View** panel offers fine lens and alignment adjustment. WebXR sets the headset FOV; the FOV slider affects screens outside VR. [Calibration, verification and limits](for-ai/VERIFICATION.md).

Internet is required for VDO signaling and ICE, even on the same Wi-Fi. Direct peers can learn network addresses; TURN can relay encrypted traffic. Observed route and RTT remain available as body data attributes for diagnostics. No offline-LAN or service availability guarantee. [VDO SDK](https://sdk.vdo.ninja/docs/api-reference.html), [BRSP](https://github.com/GeorgeFejer91/browser-remote-sync-protocol).

## Install the controller and Quest shortcut

**Install app** appears on entry and disappears when playback begins. On iPhone or iPad, use Safari → Share → Add to Home Screen. On Quest, open the player in Quest Browser and use its menu → **Add this page to your library**. The installed shortcut opens the shared player URL. The service worker caches the app interface. Video and live synchronization require an internet connection.

## Optional APK launcher

[Download the optional APK](https://georgefejer91.github.io/immersive-video-player/downloads/ImmersiveVideoPlayer-Quest.apk), then sideload it using Meta Quest Developer Hub, SideQuest, or ADB. The [installation guide](quest-launcher/README.md) covers setup and rebuilding. The installed icon opens the same shared playback in Quest Browser. Tap **VR** on the headset to enable immersive playback.

## Run and publish

Requires Node 22.12+. CI uses Node 24. The Pages workflow downloads the source-quality Jona release asset, verifies its SHA-256, and places it at the same media URL. For a local build with that asset, set the JONA_SOURCE_MEDIA environment variable to the MP4 path before building.

```sh
npm ci
npm run dev
node scripts/verify-assets.mjs
npm run check
npx playwright install chromium
npm run test:browser
```

Optional public-network integration test:

```powershell
$env:RUN_NETWORK='1'
npm run test:browser
```

Pages uses **GitHub Actions** as source. Pushes to main verify asset hashes, run Node/browser checks, build and publish dist. Relative paths support the repository subpath. Set TEST_URL to a published site's complete root URL to exercise it with the browser suite.

## Film and licenses

Jona is the complete 7:47 film, encoded at 1920x1920, 30 fps H.264/AAC, approximately 72 MiB, tracked directly so Pages serves actual MP4 bytes. The large original and other footage are excluded. The owner requested this film's publication; no downstream reuse license is granted. [Exact provenance](public/media-provenance.json).

[Third-party notices](THIRD_PARTY_NOTICES.md) retain transport and library licenses. Project context lives in [for-ai](for-ai/README.md).
