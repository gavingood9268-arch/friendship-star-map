# Design QA

- source visual truth path: `public/assets/selected-reference.png`
- implementation screenshot path: `output/qa/05-assessment-mobile.png`
- viewport: mobile 390 × 844; desktop 1280 × 900
- state: two-person room joined, core assessment active
- full-view comparison evidence: `output/qa/comparison-assessment.png`
- focused region evidence:
  - `output/qa/03-room-ready-mobile.png`
  - `output/qa/07-side-question-answer-mobile.png`
  - `output/qa/08-results-mobile.png`

## Findings

No actionable P0, P1, or P2 findings remain.

- Fonts and typography: Chinese Song-style display typography and sans-serif UI hierarchy match the selected cosmic mock closely. Text remains legible at 390px and wraps without clipping.
- Spacing and layout rhythm: room, levels, assessment, side-question, waiting, and results states use consistent 20–24px mobile gutters. The assessment action was changed from sticky to in-flow so it no longer covers answer options.
- Colors and visual tokens: midnight navy, cyan, violet, warm star accent, translucent surfaces, and low-contrast dividers remain consistent across states.
- Image quality and asset fidelity: the project-local generated starfield is sharp at mobile and desktop sizes. The implementation intentionally reduces large planet imagery in the question state to make room for custom live questions, while retaining planet imagery in the room state.
- Copy and content: counterpart names are dynamically injected; generic “朋友/TA” wording is not used in assessment prompts. Current level, expected level, self-rating, received rating, decimal shared progress, and custom side questions are explicitly separated.
- Interaction and accessibility: keyboard focus is visible, reduced-motion is supported, answer choices have text labels, and color is not the only status cue.

## Functional evidence

- Production build completed successfully.
- Playwright used two isolated browser contexts to create and join a room.
- Both participants confirmed independently and received real-time progress updates.
- A custom side question was delivered live, answered, and acknowledged by the sender.
- Both participants completed all 12 core scenarios and automatically unlocked results.
- No console or page errors were recorded.
- Unauthenticated room-state access returns HTTP 403.

## Patches made

- Added real-time room creation, secure participant tokens, WebSocket updates, reconnect behavior, and 24-hour room expiry.
- Added WeChat-friendly mobile metadata, shareable room URLs, and clipboard fallback.
- Added three optional, non-scored live side questions per participant with answer/later/skip choices.
- Corrected answer storage to save behavioral scores rather than option indexes.
- Added one-decimal shared relationship progress while preserving integer current/expected tiers.
- Removed the overlapping sticky action from the assessment screen.

## Follow-up polish

- P3: A production launch should add a branded WeChat share card and a durable database; the current server stores rooms in memory.
- P3: Public deployment requires an HTTPS host that supports long-lived WebSocket connections.

final result: passed
