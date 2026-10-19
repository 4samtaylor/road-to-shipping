# phase4b (4.5 ASCII Runner): page map

## Current shape (v23)

Phase 4.5 ASCII Runner: a real game, no window. File `content/09-phase4b.html`, ladder `content/ladders/phase4b.json`, phase id `phase4b`. Comes after `phase4`, before `phase5`.

Pages: Overview, 10 concepts, Build, Practice, Review.

Concepts (every one has a Learn it section with a King line; new in v23: `ifdef`):

1. `kbhit-getch` Input without waiting: _kbhit and _getch. King: ch 22 Q&A
2. `sleep` Frame timing with Sleep. King: §14.3–14.4, §20.3
3. `redraw-r` Redrawing in place: \r and fflush. King: §22.2
4. `frame-buffer` The frame buffer. King: §23.6
5. `game-loop` The game loop: input, update, render, wait. King: §5.1
6. `sentinel` Sentinel values: -1 for an empty slot. King: §8.1, §6.4
7. `state-machine` State machines: enum and switch. King: §5.3, §16.5
8. `const-ptr` const pointers: const Runner* r. King: §11.4, §18.3–18.4
9. `ifdef` Preprocessor switches: #ifdef, #if 0 and /D. King: §14.4, §15.2, §15.4
10. `lnk2005` Multiple files and LNK2005. King: §15.1–15.4, §18.2

Notes:
- R5. `ifdef` sets up Phase 5's UNICODE A/W split and `_CRT_SECURE_NO_WARNINGS`; `lnk2005` recaps `extern` and `static` from 3.75.
- Pair with King rows are now by concept name.

## v22 page map (record)

Written for v22. Concept numbers and phase names in this part are from before v23; use the list above for the current order.

Words in HTML file: 4140 -> 2431 (prose only; code blocks are most of what remains).

Pages: Overview, 9 concepts, Practice, Build, Review. No Trace page (no Predict the Output block).

| Original block | Decision | Why |
|---|---|---|
| Explain Like I'm New (4 callouts) | cut | Each callout is taught by rungs 1, 2, 3, 4; leftovers moved to qa |
| Tasks p4b-realtime-loop | concept:kbhit-getch | "Practice this" |
| Tasks p4b-render-lane | concept:frame-buffer | "Practice this" |
| Tasks p4b-obstacles-collide | concept:sentinel | "Practice this" |
| Tasks p4b-state-restart | concept:state-machine | "Practice this" |
| Tasks p4b-multifile | concept:lnk2005 | "Practice this" |
| Tasks p4b-commit-github | build | Ship it step after the split |
| Starter Code ascii_runner.c | build | Dropped the /WX header note (already in sleep qa) |
| Stuck & Curious | help (1 item kept) + qa | Flicker, buffering, LNK2005, Sleep items duplicated rung qa and were cut; laggy-input kept in help |
| Claude Code Prompts | help | Closing callout shortened |
| Quiz Yourself (4) | cut | Each question is a rung check or qa; the while(_kbhit) drain moved to qa |
| Checkpoint | review | Last |
| Split (runner.h/main.c/build.bat) | build | Intro trimmed; const note is rung 8 |
| Build Spec | practice | Combines concepts |
| Stretch Goal | build | Optional |
| Mixed Review | review | Earlier-phase retrieval, unique |
| Pair with King | overview | Rewritten per concept |

## Moved into ladder qa
- kbhit-getch: why while(_kbhit) not if; why the underscore; why not a separate thread; why a game with no window first
- sleep: is Sleep good enough for a real game
- frame-buffer: why one printf per frame
