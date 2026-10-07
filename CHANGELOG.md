# [1.2.0](https://github.com/sabinmarcu/quizdeck/compare/v1.1.0...v1.2.0) (2026-10-07)


### Bug Fixes

* **vercel:** use the pinned Yarn release ([a313f20](https://github.com/sabinmarcu/quizdeck/commit/a313f20698f870eed752a15205f48c7d312db747))
* **web:** support plain HTTP on LAN hosts ([7e69feb](https://github.com/sabinmarcu/quizdeck/commit/7e69feb2469429efb667488baacc2f99557338c2))


### Features

* **practice:** shuffle answer choices consistently ([b8e60c2](https://github.com/sabinmarcu/quizdeck/commit/b8e60c29a40917e04c4271a9dfa0397da85623b6))
* **web:** add a learning resume shortcut ([d26faf5](https://github.com/sabinmarcu/quizdeck/commit/d26faf5c228f831540582493b72320971f5746cb))
* **web:** configure allowed hosts from the environment ([2b9a01c](https://github.com/sabinmarcu/quizdeck/commit/2b9a01c9673dec858bea2af53ec1b377954ef6ce))
* **web:** improve learning list pagination ([b6b2131](https://github.com/sabinmarcu/quizdeck/commit/b6b21318d561fa7048ad1146d7f4c6118a82130d))
* **web:** improve responsive question navigation ([1d76890](https://github.com/sabinmarcu/quizdeck/commit/1d768905102be6a546e07ece018881a290b39811))
* **web:** open learning without a storage notice ([81edc69](https://github.com/sabinmarcu/quizdeck/commit/81edc691dc4660ab1bd7866fbe4187191f49526e))
* **web:** refine learning card and navigation styling ([9622ccc](https://github.com/sabinmarcu/quizdeck/commit/9622ccc05ab0781a3d2ca2ee7b006da9a4e32373))
* **web:** refresh theme color palettes ([791d39b](https://github.com/sabinmarcu/quizdeck/commit/791d39b56d927d1139ebfeb4aeede1931a251974))
* **web:** upgrade theme APIs and manifests ([cb8b5a8](https://github.com/sabinmarcu/quizdeck/commit/cb8b5a878e15bce8798baf3b0bdff7385bf5e73e))
* **web:** use proportional MonoLisa Text typography ([90948fa](https://github.com/sabinmarcu/quizdeck/commit/90948faddebe7fdbb9ea9dcedfc56d8bf57c4e11))

# [1.1.0](https://github.com/sabinmarcu/quizdeck/compare/v1.0.1...v1.1.0) (2026-10-02)


### Bug Fixes

* **release:** isolate development setup from consumers ([ad0dd0d](https://github.com/sabinmarcu/quizdeck/commit/ad0dd0d65b42978be8ab7cb8a562208f2927cbaa))


### Features

* **web:** improve question-set loading and browsing ([8329321](https://github.com/sabinmarcu/quizdeck/commit/8329321beee0aff2d210d1cff5cc36fdb54c9a2a))

# Unreleased

### Documentation

* Reduce product vision to a general mission statement and simplify documentation navigation.

### Bug Fixes

* Keep development toolchain pins in `.prototools` rather than the published manifest; move Husky to manual `prepare` setup and remove `pinst` so consumer installs do not execute development hooks.
* Support plain HTTP on LAN hostnames and IP addresses by generating practice identities with `crypto.getRandomValues()` and hashing question sets with portable SHA-256, preserving existing saved progress.
* Run Vercel installs and builds with the committed Yarn 4.18.1 release, preserving the immutable lockfile and scoped stylesheet resolution without Corepack. Explicitly serve Vite's `dist/web` output.

### Features

* Use the proportional MonoLisa Text font throughout the web interface, with self-hosted variable regular and italic Latin subsets reused from the omnirepo website.
* Configure Vite's development server host allowlist with the Zod-parsed, comma-separated `VITE_ALLOWED_HOSTS` environment variable.
* Add a touch-friendly outlined question-set file picker button and drag-and-drop guidance in the footer on every web page.
* Show successful question-set loads as native top-right notifications that disappear after five seconds.
* Paginate web Learn results with a 25-question default, configurable page size, boundary navigation, and safe page clamping.
* Make learning question cards fill the content container, place wide-screen navigation arrows in the outer gutters, and use a touch-sized navigation row on narrower screens. Move secondary actions below the card and above the footer.
* Shuffle Practice answer choices consistently across both interfaces, saved-run resumes, and reports while retaining canonical answer identity and scoring.
* Add tall sticky learning-list pagination rails in the outer gutters, with touch-sized controls on narrower screens. Replace inline navigation buttons with a centered page-number input, right-align page status, and preserve filtering, page-size clamping, and detail-return context.
* Add a web learning-list shortcut to the first unanswered question without changing search, filters, or existing navigation behavior.
* Give saved web learning question cards pronounced correct/incorrect backgrounds and matching 2px borders, retaining neutral unanswered cards and readable light/dark-theme feedback.
* Match learning question navigation to list pagination with shared centered-arrow buttons, tall sticky gutter controls on wide layouts, and touch-sized rows on narrower screens.
* Migrate web theme setup to the new public theme/core APIs, deliver the owned stylesheet before first paint, and embed version-2 devtools manifests with editable sources and static breakpoints. Retain application typography and learning controls.
* Scope theme-core's stylesheet resolution to 1.1.0 and preapprove only the exact migration releases, removing obsolete theme compatibility extensions without disabling global package gates.
* Refresh the application theme's light/dark primary, success, error, and background palettes with authored OKLCH values while retaining the configured grid spacing.
* Open the web learning list directly after storage initializes, removing the persistence acknowledgement while retaining storage requests, retention details, and startup errors.

## [1.0.1](https://github.com/sabinmarcu/quizdeck/compare/v1.0.0...v1.0.1) (2026-10-02)


### Bug Fixes

* remove engines field, set devEngines:node to 24.x ([a8d2a9a](https://github.com/sabinmarcu/quizdeck/commit/a8d2a9a9f47cba0a63143d24f93d82b30a177372)

# 1.0.0 (2026-10-02)


### Bug Fixes

* harden CLI and web integration ([a59b536](https://github.com/sabinmarcu/quizdeck/commit/a59b536018c4b10fcdb7b2eddcfe20c04550b137))


### Features

* add persistent learning to both interfaces ([898fa69](https://github.com/sabinmarcu/quizdeck/commit/898fa69a9665353cfd8da3c51066cc6e031f1e09))
* add persistent practice to both interfaces ([873a70a](https://github.com/sabinmarcu/quizdeck/commit/873a70a756b8f23b2520db0c103ce269bd88cb5d))
* **distribution:** add standalone Quizdeck launchers ([b286cb3](https://github.com/sabinmarcu/quizdeck/commit/b286cb300f6724e0e0e93c64322f987bde558f13))
* establish persistent CLI and web application shells ([ac3b744](https://github.com/sabinmarcu/quizdeck/commit/ac3b7449cc415252241542aad60878d6432a4447))
* **quizdeck:** introduce demo-first study sets ([07b9fac](https://github.com/sabinmarcu/quizdeck/commit/07b9facd253295052d0db98d3627584598b146cf))
* **quizdeck:** load custom question sets ([602a713](https://github.com/sabinmarcu/quizdeck/commit/602a7131b1378156973fa9332f321b0ff18e2796))
* **release:** configure trusted npm publishing ([9109c3c](https://github.com/sabinmarcu/quizdeck/commit/9109c3c926f3fa1164d3a5e29645ba5c36bc21b3))
