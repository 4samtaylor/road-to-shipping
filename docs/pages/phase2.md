# Phase 2 page map

Words: 4925 before, 2464 after (about -50%).

| Original block | Decision |
|---|---|
| Concepts First (data types) | Cut. Types, printf, math and sizeof are taught by rungs 1, 2 and 7. Unique bits moved to qa. |
| Explain Like I'm New (loops, if) | Cut. Rungs 4 and 5 teach it. Frame loop, for vs while and if ordering moved to qa. |
| Session Plan (A, B, C) | Cut. Warm-ups, break-it ideas and commit steps are covered by the concept qa, trace drills and the commit line in Build Spec. |
| Tasks: scanf, variables-types, conditionals, loops | Split onto concept:scanf, concept:types, concept:if, concept:loops ("Practice this"). |
| Tasks: frame-counter, guessing-game, commit-github | practice (they combine concepts). |
| Starter Code frame_loop.c | build, unchanged. |
| Starter Code random_number.c | build. Seeding explainer cut (rand rung and qa teach it). |
| Stuck & Curious | help. Kept scanf skipping and endless-loop items. Cut "for vs while" and "what does & do" (loops and scanf rungs). The three "why" items moved to qa. |
| Claude Code Prompts | help, intro callouts shortened, prompts kept. |
| Predict the Output | trace. Dropped drill 1 (integer division, same as the math rung's code). Kept 3 drills, renumbered. |
| Quiz Yourself | review. Kept 3 of 5. Dropped srand (rand qa) and `while (input = 'q')` (trace drill 3). |
| Checkpoint | review, last. |
| Build Spec | practice, first. Added the commit line. |
| Stretch Goal | build, unchanged. |
| Mixed Review | review, unchanged. |
| Pair with King | overview, rewritten as one line per concept. |

All data-ids kept once. The task `tasks-2` id was dropped from the container, as in other phases.

## Moved into ladder qa

- types: Which type for which game data? / Why does 0.1f + 0.2f not print exactly 0.3?
- if: Which test goes first in an else if chain?
- loops: What is the game loop? / Why have both for and while?
- math: Why does my health bar stay empty? / What is % good for?
- rand: What if I leave off the + 1? / Why does rand() % 100 favour small numbers slightly?
