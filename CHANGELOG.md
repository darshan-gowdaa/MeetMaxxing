# Changelog

## [1.1.0](https://github.com/darshan-gowdaa/MeetMaxxing/compare/v1.0.3...v1.1.0) (2026-11-18)

### ✨ New Features

* **Calendar:** Dedicated sub-tab, google meet join filter & auto-sync ([9fa1cb7](https://github.com/darshan-gowdaa/MeetMaxxing/commit/9fa1cb7068ce14ce12b21d0531ebcf8b3dfb9361))
* **Calendar:** M3E calendar automation sub-options, test event trigger & live schedule preview ([296b3bf](https://github.com/darshan-gowdaa/MeetMaxxing/commit/296b3bfd7ea1bc279ed139f2b977be185b3a6089))
* **Frontend:** Streamline settings icons and apply M3 Expressive integration badges ([ca8b654](https://github.com/darshan-gowdaa/MeetMaxxing/commit/ca8b654044e21227cb9edf35c54b1057de61637e))
* **Legal:** Add terms of service page ([3f956e1](https://github.com/darshan-gowdaa/MeetMaxxing/commit/3f956e1ad3b94932fcd6b43656a7b7df3445feb9))
* **Meetings:** Add AI title generation, stable action item ordering, colored PDF/MD icons, and overview tab reordering ([b82ff78](https://github.com/darshan-gowdaa/MeetMaxxing/commit/b82ff78048850c588bff03c3f13f86555a48922c))
* **Meetings:** Complete M3 Expressive redesign with segmented views, inline vectors, search transcript, and refined hierarchy ([dd4947e](https://github.com/darshan-gowdaa/MeetMaxxing/commit/dd4947ef1d1fbd3ef7a4d22b72aafb479de07196))
* **Settings:** Connect user preferences to AI agents and pipeline execution ([0b71d85](https://github.com/darshan-gowdaa/MeetMaxxing/commit/0b71d8591a70e7433979d04ae9508323256a5141))
* **Settings:** Persist all settings server-side, add M3Select dropdowns, google avatar reset, and official svgs ([de350cc](https://github.com/darshan-gowdaa/MeetMaxxing/commit/de350cc2f8d797ac0616bda3710be5a077dd95dc))
* **Settings:** Restructure settings IA with M3 Expressive thematic groupings and proper ordering ([f5ceb0a](https://github.com/darshan-gowdaa/MeetMaxxing/commit/f5ceb0aab605636f87c922e6b3a493390afdc072))
* **Settings:** Upgrade BYOK and settings hub ([d055960](https://github.com/darshan-gowdaa/MeetMaxxing/commit/d055960725b4b980355670e4ab06e6e5c7a71a18))
* **UI:** Add M3 switch icons, split button, settings persistence and zero emoji rule ([9edf269](https://github.com/darshan-gowdaa/MeetMaxxing/commit/9edf26976e66d71c1c8ed14b5a5b447e2c9a626d))
* **UI:** Apply M3 Expressive design to settings and meetings ([a0b8c39](https://github.com/darshan-gowdaa/MeetMaxxing/commit/a0b8c395cbd6a61abbfcc70164dcfd2c126ba89e))
* **UI:** Complete M3 mobile ergonomics, uniform settings headers, and shimmer skeletons ([c3de4b0](https://github.com/darshan-gowdaa/MeetMaxxing/commit/c3de4b0491609f394fa964db4b943ad2a380e0d4))
* **UI:** Implement M3 Segmented Button and Breadcrumb components ([cd2195b](https://github.com/darshan-gowdaa/MeetMaxxing/commit/cd2195b65c38ae034ca446af8245f348e26e6620))
* **UI:** Integrate official M3E loading and linear progress components ([f80d8cc](https://github.com/darshan-gowdaa/MeetMaxxing/commit/f80d8ccadc2182c28ea660938f92ea48d87f7135))

### 🐛 Bug Fixes

* **Backend:** Import settings in settings_service and apply ruff formatting ([1a7b779](https://github.com/darshan-gowdaa/MeetMaxxing/commit/1a7b77975448a6741904ee07cfb6cfc463367722))
* **Backend:** Token cache memory leak, Redis dedup window, LLM timeout tuning, guardrail improvements, QoL ([1ccbc1d](https://github.com/darshan-gowdaa/MeetMaxxing/commit/1ccbc1d2592ecea186e9f418b9c488d06dfbc04c))
* **Calendar:** Accept trailing slash callback routes and flow uris ([bc00dc6](https://github.com/darshan-gowdaa/MeetMaxxing/commit/bc00dc608d7dc285e12fd0833f0963f3cc63eb9e))
* **Calendar:** Direct rfc6749 token exchange eliminating scopechange exceptions ([2fa8bca](https://github.com/darshan-gowdaa/MeetMaxxing/commit/2fa8bca1dfdcdbd35225768a10fbb2b6d167ec02))
* **Calendar:** Disable pkce autogeneration for confidential client code exchange ([9389224](https://github.com/darshan-gowdaa/MeetMaxxing/commit/93892247317b025cfaf04b8b0ecec33ca1c22959))
* **Calendar:** Dynamic oauth redirect uri resolution & callback redirect ([87a213e](https://github.com/darshan-gowdaa/MeetMaxxing/commit/87a213e36e1c226beb6fc55513436053341a03a1))
* **Calendar:** Relax oauthlib scope checks & include openid userinfo scopes ([d65336e](https://github.com/darshan-gowdaa/MeetMaxxing/commit/d65336e89f53137d2ab306c12c4af47bb81d4d20))
* **CI:** Resolve frontend eslint errors, backend ruff formatting & integrate linting into root build ([6f93883](https://github.com/darshan-gowdaa/MeetMaxxing/commit/6f938837d4588f20e26ca15a6b5ef3a3eae81683))
* **CI:** Resolve ruff format errors, eliminate pytest warnings & bom artifacts ([0bb8524](https://github.com/darshan-gowdaa/MeetMaxxing/commit/0bb85249d210f5b8909e0f846786867b84cea0d3))
* **Extension & Backend - Sync:** WebSocket drops permanently after token expiry and meeting updates fail on meet code URLs ([a92b6d2](https://github.com/darshan-gowdaa/MeetMaxxing/commit/a92b6d2e0a81eba5880897141ad96823088c77b8))
* **Extension & Frontend - Auth:** Auth handshake times out on initial load and RAG context calls abort on expired tokens ([8d6bf49](https://github.com/darshan-gowdaa/MeetMaxxing/commit/8d6bf49503dab7a2d5d57b398d2b8855ee568272))
* **Extension:** Plug memory leaks, perf improvements, race condition fixes, and QoL ([f5333a2](https://github.com/darshan-gowdaa/MeetMaxxing/commit/f5333a22199c88be009730baf5cc0350661eb0d9))
* **Extension:** Realtime loading stalls, lobby permission fails on exit, and qdrant connection drops ([a0d4b66](https://github.com/darshan-gowdaa/MeetMaxxing/commit/a0d4b66df989d8fab9d12a617dcbbf196cd624d5))
* **Frontend:** 404 viewport bounds collapse and fail vertical and horizontal centering ([156cd49](https://github.com/darshan-gowdaa/MeetMaxxing/commit/156cd495c688a16f9c95b677eed604cbe6b71c72))
* **Settings:** Title suggestion endpoints 404 and profile hero displays layout shifts ([d6247fb](https://github.com/darshan-gowdaa/MeetMaxxing/commit/d6247fb138acf70013782bb37463677c699bc776))
