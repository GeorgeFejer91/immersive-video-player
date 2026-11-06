# Quest launcher

A small sideloadable app icon named **Immersive Video Player**. Opening it sends the published player URL to Meta Quest Browser through the [documented Horizon OS browser deep link](https://developers.meta.com/vr/documentation/spatial-sdk/ps-system-deep-linking/). Each launch requests a fresh page and pairing QR. No Android WebView, native renderer, background service, boot receiver or app permissions are needed. It is an app launcher, not an Android home-screen AppWidget.

## Install on Quest 3

With developer mode already enabled, connect the Quest by USB and accept its USB debugging prompt. Use Meta Quest Developer Hub or SideQuest to install `ImmersiveVideoPlayer-Quest.apk`, or run:

Meta's current [device installation guide](https://developers.meta.com/vr/documentation/android-apps/enable-developer-mode/) covers developer mode, USB authorization and finding sideloaded apps. Its [Developer Hub deployment guide](https://developers.meta.com/vr/documentation/unity/ts-mqdh-deploy-build/) also documents dragging the APK into Device Manager → Apps.

```powershell
adb devices -l
adb -s <your-quest-serial> install -r <path-to-ImmersiveVideoPlayer-Quest.apk>
```

In the headset, find **Immersive Video Player** under **Library → Unknown Sources** and open it. Browser opens directly to the viewer, starts pairing and displays its QR. Scan the QR with your phone; on the phone select **Enable**, then **Connect**. Close the headset QR if it is still open and select **VR** once. That gesture enables video and requests immersive mode; accept any browser permission prompt. Use **Start**, **Pause** and **Stop** on your phone. The QR closes automatically when the phone authenticates. QR can be reopened from Connection.

The regular browser requires a local gesture for media and immersive WebXR. A launcher cannot transfer its click into an ordinary browser document. See [Meta's WebXR activation requirements](https://developers.meta.com/vr/documentation/web/pwa-webxr-gs/). Starting the phone before enabling the headset does not bypass that gate. Internet is required; pairing lasts 30 minutes. Relaunching creates a new invitation, so pair the phone again. Existing tabs/sessions can be closed using their **Disconnect** control.

## Build on Windows

Requires JDK 17+, Android SDK platform 34 and build-tools 34.0.0. The SDK/JDK bundled with an existing Unity Android installation can be used; Unity does not need to run. No Gradle, AndroidX, NDK or native libraries.

```powershell
./quest-launcher/build.ps1 -AndroidSdk <SDK-folder> -JavaHome <JDK-folder>
```

Alternatively set `ANDROID_HOME` and `JAVA_HOME`. Output: `.for-ai-local/quest-launcher/ImmersiveVideoPlayer-Quest.apk`. The script checks each native command, signs and verifies the APK, checks alignment, dumps package metadata and prints SHA-256. A local development signing key is created once under `%LOCALAPPDATA%/ImmersiveVideoPlayer/quest-launcher.keystore` and reused for updates. Keep it private and backed up; it is not a store-release key. APKs, build output and keys are excluded from Git and Pages.

Package: `org.immersivevideoplayer.questlauncher`. Uninstall using the headset app menu or `adb -s <serial> uninstall org.immersivevideoplayer.questlauncher`. Physical install, launcher visibility, OS handoff and headset WebXR require a connected, attended Quest; desktop browser tests do not establish those results.
