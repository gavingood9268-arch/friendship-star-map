# Prototype Instructions

Run the local server yourself and open the preview in the in-app browser. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

## Locked product decisions

- The product is a 3–8 player real-time party game named “默契大挑战”, not a friendship-rating tool.
- Use the selected neon Chinese variety-show visual reference at `public/assets/party-reference.png`.
- The game must work in WeChat without microphone, camera, or login; interaction is tap choices, text chat, and graphical quick reactions.
- Never reveal individual answers before the round reaches its reveal phase.
- Keep a visible shared answer count and compact player score strip throughout the game.
- The host may add up to five live custom “谁最可能” questions; when added during play, the next custom question appears immediately after the current round.
- Readiness is reversible. Waiting-room players have online/offline presence, may leave explicitly, and host ownership transfers when the host leaves.
- Preserve device-based session recovery so refresh or reopening a valid invite does not consume another seat.
- Results are playful and competitive: show scores, ranking, and light variety-show titles after all rounds.
