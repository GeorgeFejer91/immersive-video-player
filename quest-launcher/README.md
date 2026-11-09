# Quest launcher

A small sideloadable app icon named **Immersive Video Player**. Opening it sends the published player URL to Meta Quest Browser through the [documented Horizon OS browser deep link](https://developers.meta.com/vr/documentation/spatial-sdk/ps-system-deep-linking/). Each launch opens the shared playback room. No Android WebView, native renderer, background service, boot receiver or app permissions are needed. It is an app launcher, not an Android home-screen AppWidget.

## Install on Quest 3

The website offers a PWA/browser shortcut; a dedicated APK is optional. Use the [direct APK download](https://georgefejer91.github.io/immersive-video-player/downloads/ImmersiveVideoPlayer-Quest.apk) if you prefer sideloading. With developer mode already enabled, connect the Quest by USB and accept its USB debugging prompt. Use Meta Quest Developer Hub or SideQuest to install `ImmersiveVideoPlayer-Quest.apk`, or run:

Published release: **1.0.0**, 12,768 bytes. SHA-256: `af07861c7de91b344496e166bde18bd010fa863f620963fc1851d1819a2a7843`.

Meta's current [device installation guide](https://developers.meta.com/vr/documentation/android-apps/enable-developer-mode/) covers developer mode, USB authorization and finding sideloaded apps. Its [Developer Hub deployment guide](https://developers.meta.com/vr/documentation/unity/ts-mqdh-deploy-build/) also documents dragging the APK into Device Manager → Apps.

```powershell
adb devices -l
adb -s <your-quest-serial> install -r <path-to-ImmersiveVideoPlayer-Quest.apk>
```

In the headset, find **Immersive Video Player** under **Library → Unknown Sources** and open it. Tap **VR** in Quest Browser to enable video and request immersive mode. On a phone or desktop, open [the same player URL](https://georgefejer91.github.io/immersive-video-player/) to join automatically. The viewer's **QR** button shares that URL. Use **Start**, **Pause**, or **Stop** from any connected controller.

Quest Browser requires a local gesture for media and immersive WebXR. The launcher opens the viewer, and **VR** supplies the browser gesture. Internet access is required for synchronization.

## Build on Windows

Requires JDK 17+, Android SDK platform 34 and build-tools 34.0.0. The SDK/JDK bundled with an existing Unity Android installation can be used; Unity does not need to run. No Gradle, AndroidX, NDK or native libraries.

```powershell
./quest-launcher/build.ps1 -AndroidSdk <SDK-folder> -JavaHome <JDK-folder>
```

Alternatively set `ANDROID_HOME` and `JAVA_HOME`. Output: `.for-ai-local/quest-launcher/ImmersiveVideoPlayer-Quest.apk`. The script checks each native command, signs and verifies the APK, checks alignment, dumps package metadata and prints SHA-256. A local development signing key is created once under `%LOCALAPPDATA%/ImmersiveVideoPlayer/quest-launcher.keystore` and reused for updates. Keep it private and backed up; it is not a store-release key. Build outputs and keys stay private. The one reviewed release APK is copied to `public/downloads/ImmersiveVideoPlayer-Quest.apk` and pinned in `scripts/verify-assets.mjs`; updates require signature/package verification, a deliberate hash-pin update and the browser download check before publication.

Package: `org.immersivevideoplayer.questlauncher`. Uninstall using the headset app menu or `adb -s <serial> uninstall org.immersivevideoplayer.questlauncher`. Physical install, launcher visibility, OS handoff and headset WebXR require a connected, attended Quest; desktop browser tests do not establish those results.
