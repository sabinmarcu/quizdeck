# Unreleased

### Documentation

* Reduce product vision to a general mission statement and simplify documentation navigation.

### Bug Fixes

* Keep development toolchain pins in `.prototools` rather than the published manifest; move Husky to manual `prepare` setup and remove `pinst` so consumer installs do not execute development hooks.
* Support plain HTTP on LAN hostnames and IP addresses by generating practice identities with `crypto.getRandomValues()` and hashing question sets with portable SHA-256, preserving existing saved progress.

### Features

* Use the proportional MonoLisa Text font throughout the web interface, with self-hosted variable regular and italic Latin subsets reused from the omnirepo website.
* Configure Vite's development server host allowlist with the Zod-parsed, comma-separated `VITE_ALLOWED_HOSTS` environment variable.
* Add a touch-friendly outlined question-set file picker button and drag-and-drop guidance in the footer on every web page.
* Show successful question-set loads as native top-right notifications that disappear after five seconds.
* Paginate web Learn results with a 25-question default, configurable page size, boundary navigation, and safe page clamping.
* Make learning question cards fill the content container, place wide-screen navigation arrows in the outer gutters, and use a touch-sized navigation row on narrower screens. Move secondary actions below the card and above the footer.
* Shuffle Practice answer choices consistently across both interfaces, saved-run resumes, and reports while retaining canonical answer identity and scoring.
* Add tall sticky learning-list pagination rails in the outer gutters, with touch-sized controls on narrower screens. Replace inline navigation buttons with a centered page-number input, right-align page status, and preserve filtering, page-size clamping, and detail-return context.

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
