# Playstead design guidelines

## Character

Playstead should feel like a warm tabletop gathering rather than a competitive esports
dashboard. Use deep ink and moss surfaces, parchment text, coral for decisive actions, and
sky blue for live presence. Atlas Drop uses satellite imagery for geographic texture, with
the graphic country map retained as a legible offline and tile-failure fallback.

## Layout

- Desktop game screens use a wide map with a compact right rail for score and conversation.
- Mobile prioritizes the map, then collapses supporting panels into tabs or drawers.
- Keep the current prompt, round progress, score, and primary action visible without scrolling.
- Long chat and leaderboard content scrolls below fixed headers and composers.
- Reuse primitives from `packages/frontend/src/components/ui`.

## Interaction

- Server state is authoritative for scores, messages, and live table transitions.
- A map tap places a movable draft marker; a separate confirm action submits it.
- Never hide the current round deadline or whether a tap has been accepted.
- Every icon-only control needs an accessible label and native `title`.
- Keyboard navigation and visible focus states are required.
- Animations must respect `prefers-reduced-motion`.
- Feedback sounds stay brief and restrained, default to on, and always offer a persistent mute.
- Reveals may animate the camera, answer line, markers, and score, but must not delay the result.

## Copy

- Prefer short, conversational labels: “Drop pin”, “Create circle”, “Join table”.
- Explain errors in the player’s language; do not expose internal codes as the main message.
- “Global” means one Playstead installation, not federation across servers.
