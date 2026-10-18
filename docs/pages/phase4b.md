# phase4b (4.5 ASCII Runner): page map

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
