# Phase 3.5 page map (phase3b)

## Current shape (v23)

Phase 3.5 Structs & Pointers. File `content/07-phase3b.html`, ladder `content/ladders/phase3b.json`, phase id `phase3b`. Comes after `phase3`, before `phase3c`.

Pages: Overview, 7 concepts, Trace, Build, Practice, Review.

Concepts (every one has a Learn it section with a King line; new in v23: `struct-arrays`, `pointer-arrays`):

1. `structs` Structs and the dot operator. King: §16.1–16.2
2. `struct-arrays` Arrays of structs. King: §16.3
3. `struct-copy` Structs are copied. King: §16.1–16.2
4. `pointers` Pointers: & and *. King: §11.1–11.3
5. `by-pointer` Passing by pointer and ->. King: §11.4–11.5, §17.5
6. `pointer-arrays` Pointers and arrays. King: §12.1–12.3, §13.1–13.2
7. `null` NULL. King: §17.1, §17.4, §11.2

Notes:
- Split in R4: `enum`, `headers`, `linker` and `debugger` moved to Phase 3.75 (`phase3c`); ticks move with `LAD_MIGRATIONS` entry `v23-phase3b-split`. The rows about them in the table below now live in 3.75.
- Builds are single-file now (player_demo.c, the guess.c refactor); player.h/player.c, the debugger setup and the multi-file build.bat moved to 3.75.
- The page no longer relies on breakpoints, player.h or enum.

## v22 page map (record)

Written for v22. Concept numbers and phase names in this part are from before v23; use the list above for the current order.

Words: 5506 before, 2430 after (-56%). Pages: Overview, 9 concepts, Practice, Trace, Build, Review.

| Original block | Decision |
|---|---|
| Explain Like I'm New: Structs | cut; array-of-structs idea into structs qa, copy note already in struct-copy |
| Explain Like I'm New: Pointers | cut; arrow vs dot rule into by-pointer qa |
| Session Plan (G, H, I) | cut; "Break it" experiments kept as a build block (missing-file one uses player.c); commit commands became the "Ship it" build block; multi-file build.bat line added under the starter code |
| Tasks: p3-player-struct | concept:structs ("Practice this") |
| Tasks: p3-pointers | concept:pointers |
| Tasks: p3-header-files | concept:headers |
| Tasks: p3-refactor-guessing-game | practice |
| Starter Code player.h/.c | build (unchanged) |
| Tooling: Debugger why/PDB intro and key table | cut; keys and Watch into debugger qa (without Shift+F11) |
| Tooling: Debugger setup steps and launch.json | build, badge "Setup", launch.json shown once |
| Tooling: Debugger payoff exercise | concept:debugger ("Practice this"); points at the Break it photocopy experiment and needs main.c from the Build Spec |
| Tooling: Debugger stuck items | cut; already in debugger qa, path cause appended |
| Stuck & Curious | cut; every item already in a rung qa; GDScript item moved to pointers qa |
| Claude Code Prompts | help, trimmed (dropped the duplicate heal prompt, merged interface-first callout) |
| Predict the Output | trace; drills 1 and 2 cut (duplicate struct-copy check), 3 and 4 kept |
| Quiz Yourself | cut as a block; Q1, 2, 4, 5 dropped (covered by concept checks, headers qa and checkpoint); Q3 (& and *) folded into Mixed Review |
| Checkpoint | review (last) |
| Build Spec | practice |
| Stretch Goal | build (p3b-stretch-enemies kept) |
| Mixed Review | review, now three questions |
| Pair with King | overview, one line per concept (NULL: ch 17 §17.1 only; arrays of structures noted) |

## Moved into ladder qa
- structs: How do arrays and structs fit together?
- struct-copy: Does b = a behave the same in GDScript?
- pointers: GDScript has no pointers, why does C make me deal with them?
- by-pointer: When do I use the arrow and when the dot?
- debugger: other keys and the Watch panel; breakpoints still hollow after rebuilding (program path)

## Other ladder edit
- linker walk line 3: mentions `_player_heal` on 32-bit builds vs `player_heal` on x64.

All em dashes outside code removed from the HTML.
