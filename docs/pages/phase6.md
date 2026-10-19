# phase6 page map

## Current shape (v23)

Phase 06 Build the Prototype Together. File `content/11-phase6.html`, ladder `content/ladders/phase6.json`, phase id `phase6`. Comes after `phase5`, before `phase7`.

Pages: Overview, 6 concepts, Build, Practice, Review.

Concepts (every one has a Learn it section with a King line; new in v23: `game-files`):

1. `update-render` Update vs render. King: §19.1–19.2
2. `delta-time` Delta time: speed times dt. King: §7.2, §7.4
3. `next-state` A state machine with next_state. King: §16.5
4. `aabb` AABB collision. King: §5.1, §18.6
5. `textout` Text on screen: TextOut. King: §22.8, §7.6, §14.4
6. `game-files` Splitting the game into files. King: §15.3, §18.2, §18.6, §19.5

Notes:
- R5. Starter matches the rungs: MENU/PLAYING/PAUSED/GAME_OVER, a Box with `static inline aabb_overlap`, game.h; textout uses a `static` score.
- A Pair with King block was added (overview).

## v22 page map (record)

Written for v22. Concept numbers and phase names in this part are from before v23; use the list above for the current order.

Words (pagecheck): 2335 -> 1473 (-37%).

| Original block | Decision |
|---|---|
| Explain Like I'm New (loop, state machine, AABB, one-frame trace) | Cut. Covered by concepts 1, 3, 4. Frame walkthrough moved to update-render qa |
| Tasks: p6-game-loop | concept:update-render ("Practice this") |
| Tasks: p6-state-machine | concept:next-state |
| Tasks: p6-aabb-collision | concept:aabb |
| Tasks: p6-connect-player, p6-code-review | practice |
| Starter Code (game_state.h) | build |
| Claude Code Prompts | help |
| Checkpoint | review (last) |
| Stuck & Curious | help (3 stuck items kept) |
| Build Spec | practice |
| Stretch Goal | build |
| Mixed Review | review; Q2 (x += 5 on 144 Hz) dropped as it repeats the delta-time rung; Q1 kept |

## Moved into ladder qa
- update-render: "What does one whole frame look like?"
- aabb: "Why test boxes instead of the real shapes?"
- Curious "update vs render" and "enum vs int" dropped: already in those rungs' qa.
