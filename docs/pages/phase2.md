# Phase 2 page map

## Current shape (v23)

Phase 02 Values & Expressions. File `content/05-phase2.html`, ladder `content/ladders/phase2.json`, phase id `phase2`. Comes after `phase1`, before `phase2b`.

Pages: Overview, 6 concepts, Trace, Build, Practice, Review.

Concepts (every one has a Learn it section with a King line; new in v23: `operators`, `sizes`):

1. `types` Variables and types. King: §2.4–2.7, §7.1–7.3
2. `printf` Printing values with printf. King: §3.1
3. `scanf` Reading input with scanf. King: §2.5, §3.2, §7.2, §22.3
4. `math` Division, remainder and casts. King: §4.1, §7.4
5. `operators` Assignment, ++ and side effects. King: §4.2–4.5
6. `sizes` How big a number can be. King: §7.1–7.2, §7.4–7.6, §23.2

Notes:
- Split in R2 at King's chapter 4/5 boundary. `if`, `switch`, `loops` and `rand` moved to Phase 2.5 (`phase2b`); ticks move with `LAD_MIGRATIONS` entry `v23-phase2-split`.
- `math` renamed "Division, remainder and casts". New build: damage.c. The frame loop and guessing-game builds moved to 2.5.
- Starters that use scanf keep `#define _CRT_SECURE_NO_WARNINGS` as line 1 (D4 was not applied; see HANDOFF).

## v22 page map (record)

Written for v22. Concept numbers and phase names in this part are from before v23; use the list above for the current order.

Words: 4925 before, 2582 after (about -48%).

| Original block | Decision |
|---|---|
| Concepts First (data types) | Cut. Types, printf, math and sizeof are taught by rungs 1, 2 and 7. Unique bits moved to qa. |
| Explain Like I'm New (loops, if) | Cut. Rungs 4 and 5 teach it. Frame loop, for vs while and if ordering moved to qa. |
| Session Plan (A, B, C) | Cut. Warm-ups, break-it ideas and commit steps are covered by the concept qa, trace drills and the commit line in Build Spec. |
| Tasks: scanf, variables-types, conditionals, loops | Split onto concept:scanf, concept:types, concept:if, concept:loops ("Practice this"). |
| Tasks: frame-counter, guessing-game, commit-github | practice (they combine concepts). |
| Starter Code frame_loop.c | build. Added `#define _CRT_SECURE_NO_WARNINGS` as line 1 (random_number.c has no scanf). |
| Starter Code random_number.c | build. Seeding explainer cut (rand rung and qa teach it). |
| Stuck & Curious | help. Kept scanf skipping and endless-loop items. Cut "for vs while" and "what does & do" (loops and scanf rungs). The three "why" items moved to qa. |
| Claude Code Prompts | help, intro callouts shortened, prompts kept. |
| Predict the Output | trace. Dropped integer division drill (same as the math rung's code). Added the float-to-int truncation drill moved from Phase 1. 4 drills. |
| Quiz Yourself | review. Kept 3 of 5. Dropped srand, `while (input = 'q')` and the rand range question; Q3 is now a health-bar integer division question. |
| Checkpoint | review, last. |
| Build Spec | practice, first. Added the commit line. |
| Stretch Goal | build. "New tools" callout retitled "Tools from this phase", switch and do-while trimmed to one line each. |
| Mixed Review | review, unchanged. |
| Pair with King | overview, rewritten as one line per concept. Concept 8 points to ch 10. |

All data-ids kept once. The task `tasks-2` id was dropped from the container, as in other phases.

## Moved into ladder qa

- types: Which type for which game data? / Why does 0.1f + 0.2f not print exactly 0.3?
- if: Which test goes first in an else if chain?
- loops: What is the game loop? / Why have both for and while?
- math: Why does my health bar stay empty? / What is % good for?
- rand: What if I leave off the + 1? / Why does rand() % 100 favour small numbers slightly?

Em dashes removed from prose (code comments and pre blocks untouched).
