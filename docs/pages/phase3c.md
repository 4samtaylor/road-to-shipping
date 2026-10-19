# Phase 3.75 Organising Code (phase3c)

New in v23, so there is no v22 page map: the page was written straight into the v23 model (Overview, concept pages, then Trace, Build, Practice, Review).

## Current shape (v23)

Phase 3.75 Organising Code. File `content/07b-phase3c.html`, ladder `content/ladders/phase3c.json`, phase id `phase3c`. Comes after `phase3b`, before `phase4`.

Pages: Overview, 5 concepts, Build, Practice, Review.

Concepts (every one has a Learn it section with a King line; new in v23: `func-pointers`):

1. `enum` enum. King: §16.5
2. `func-pointers` Function pointers. King: §17.7
3. `headers` Header files and #pragma once. King: §15.1–15.3, §18.2
4. `linker` Linker errors (LNK2019). King: §15.4
5. `debugger` The debugger. Not in King

Notes:
- New phase id in v23 (R4), split from Phase 3.5. `enum`, `headers`, `linker`, `debugger` came from `phase3b` (ids unchanged; ticks migrate via `v23-phase3b-split`).
- Blocks: Pair with King (overview); "Practice this" on enum, func-pointers, headers (`p3-header-files` kept its id) and debugger; Build Spec (practice); starter player.h + player.c, Break it, Ship it, debugger setup and the multi-file build.bat with SOURCES (build); Mixed Review from 3.5 and 03 (review); Claude prompts (help). No Trace page.
- Double include is C2371 (verified); `enum` does not promise C4062 (off at /W4).
