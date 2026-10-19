# Phase 2.5 Decisions & Loops (phase2b)

New in v23, so there is no v22 page map: the page was written straight into the v23 model (Overview, concept pages, then Trace, Build, Practice, Review).

## Current shape (v23)

Phase 2.5 Decisions & Loops. File `content/05b-phase2b.html`, ladder `content/ladders/phase2b.json`, phase id `phase2b`. Comes after `phase2`, before `phase3`.

Pages: Overview, 6 concepts, Trace, Build, Practice, Review.

Concepts (every one has a Learn it section with a King line; new in v23: `conditions`, `loop-control`):

1. `conditions` Comparisons, &&, || and !. King: §5.1, §5.2
2. `if` Decisions with if / else. King: §5.2, §6.5
3. `switch` switch statements. King: §5.3
4. `loops` Loops: while and for. King: §6.1, §6.3, §8.2
5. `loop-control` do, break, continue and the endless loop. King: §6.2, §6.4–6.5, §7.3
6. `rand` Random numbers. King: §26.2, §8.2, §10.2

Notes:
- New phase id in v23 (R2), split from Phase 2. Concepts follow King's chapter 5 and 6 order; `switch` comes right after `if`.
- `if`, `switch`, `loops`, `rand` came from `phase2` (rung ids unchanged; ticks migrate via `v23-phase2-split`). Their old tasks and checkpoints keep their `p2-*` / `cp-p2-*` data-ids.
- Blocks: Pair with King (overview); "Practice this" on conditions, if, loops, loop-control; Build Spec and Tasks (practice: frame counter, guessing game, commit); starters frame_loop.c and random_number.c plus the guess.c v2 stretch (build); 2 trace drills; a one-question quiz and Mixed Review from Phase 02 (review); Stuck and Claude prompts (help).
- Nested loops are taught here in `loops` (D10), ahead of King's 2D-array section.
