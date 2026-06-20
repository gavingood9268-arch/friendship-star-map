# Design QA

- Source visual truth: `public/assets/party-reference.png`
- Implementation screenshot: `output/qa/party-game-edge-390x844.png`
- Viewport: `390 × 844`
- Tested state: 5-player game, round 3 of 10, point question, 4 players answered, host selected a choice
- Full-view comparison evidence: `output/qa/party-comparison-final.png`
- Focused-region comparison: the full comparison is preserved at readable original resolution; title, scores, question board, player seats, reactions, chat, and primary action are all legible.

## Findings

- No actionable P0, P1, or P2 visual issues remain.
- P3: the implementation uses a web font rather than the reference's bespoke show-title lettering.
- P3: score labels are intentionally more compact than the reference's oversized numerals to preserve mobile readability and room for live interaction.

## Patches made during QA

- Added the show title and tightened the vertical rhythm to keep chat visible at 390 × 844.
- Replaced text-pill reactions with generated graphical reaction assets.
- Adjusted player, question, answer, reaction, and composer spacing against a same-viewport side-by-side comparison.
- Replaced experimental CSS `abs()` positioning with broadly supported `nth-child` rules.

final result: passed
