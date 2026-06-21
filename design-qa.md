# Design QA

- Source visual truth: `public/assets/party-reference.png`
- Implementation screenshot: `output/qa/party-game-edge-390x844.png`
- Viewport: `390 × 844`
- Tested state: 5-player game, round 3 of 11 after one live custom question, randomized categorized point question, 4 players answered, host selected a choice; host uses a newly uploaded custom avatar
- Full-view comparison evidence: `output/qa/party-comparison-v3.png`
- Focused-region evidence: `output/qa/party-lobby-edge-390x844.png` verifies online presence, custom-question input, sharing, disabled start, and leave controls. A separate crop was not needed because both screenshots preserve readable original mobile resolution.

## Findings

- No actionable P0, P1, or P2 visual issues remain.
- Typography: hierarchy, wrapping, weights, and Chinese fallback are stable; P3 remains because the implementation uses a web font rather than the reference's bespoke show-title lettering.
- Spacing and layout: all primary game controls remain visible at 390 × 844; the lobby intentionally scrolls vertically when host tools are present.
- Colors and tokens: neon violet, cyan, pink, lime, and yellow states map consistently to the source; active, online, offline, and disabled states remain distinguishable.
- Image quality: generated avatars and reaction stickers remain sharp at their rendered sizes with no visible masking halos.
- Copy and content: room, readiness, custom-question, answer, chat, and result text are coherent in standalone use.
- Custom-avatar control: the waiting-room upload flow successfully center-crops and compresses a local image, closes the picker after upload, and updates the same player in real time without changing their identity.
- P3: score labels remain intentionally more compact than the source's oversized numerals to preserve mobile room for live interaction.

## Patches made during QA

- Added live online/offline presence while preserving the source's five-player score strip.
- Added host custom-question controls in the lobby and a compact in-game “加题” control.
- Added reversible ready state, offline-player removal, explicit leave action, and room-owner transfer.
- Added invalid-session recovery so stale room links return to the join screen instead of rendering blank.
- Expanded the built-in bank to 60 unique prompts across six categories and exposed the current category above the question.
- Added custom avatar upload, server-backed image delivery, preset fallback, and an in-room “换头像” entry point.
- Re-ran the same-viewport comparison in Microsoft Edge; no console or page errors were observed.

final result: passed
