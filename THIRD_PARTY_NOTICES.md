# Third-party software

VDO.Ninja SDK **1.5.5** is distributed unmodified in `public/vendor/vdoninja/1.5.5/`, including readable source, MPL-2.0 license and upstream notice. Source: https://github.com/steveseguin/ninjasdk/tree/v1.5.5. `scripts/verify-assets.mjs` pins exact SHA-256 bytes.

BRSP/1 core and VDO adapter originate from the installed `browser-remote-sync-protocol` reference package, upstream https://github.com/GeorgeFejer91/browser-remote-sync-protocol. Its MIT license is retained in `src/remote/LICENSE`; SHA-256 pins identify exact source bytes. The core is unmodified. The adapter has a local startup-race fix: attach connecting channels immediately through the documented SDK `getChannel()` API and buffer at most eight early reliable messages until both lanes open. The adapter also supports listing and advertising beacons with its control channels disabled, and bounds the discovery list. It also supports application-directed target selection for the approval handshake. Regression tests cover these changes. The upstream adapter hash was `79ca3077c05d4eb1a1a07fd9d652a60f93901d9d6a85aa2659ef6ed798a6c003`.

Three.js **0.187.0**, QRCode **1.5.4** and Pretext **1.0.0** are MIT-licensed; versions and transitive dependencies are locked in `package-lock.json`. See each upstream package for source and license: https://github.com/mrdoob/three.js, https://github.com/soldair/node-qrcode, https://github.com/chenglou/pretext. Their license files are also included under `public/licenses/` in the site.

Jona is a separately authorized film asset. Publication authorization and exact bytes are documented in `public/media-provenance.json`; software licenses do not grant reuse rights in the film.
