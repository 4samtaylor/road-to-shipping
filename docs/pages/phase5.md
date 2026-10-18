# Phase 5 page map (Win32 Window)

Words (visible text): 2253 -> 1311 (-42%). Starter code unchanged.

| Original block | Decision |
|---|---|
| Explain Like I'm New (console to window, Phase 2 loop comparison, wall of types) | Cut. Three unique points moved to ladder qa (see below). |
| Tasks: p5-win32-window | concept:winmain-hwnd ("Practice this"; keeps `id="tasks-5"`) |
| Tasks: p5-message-loop | concept:message-loop |
| Tasks: p5-gdi-rectangle, p5-keyboard-input | concept:gdi-invalidate |
| Tasks: p5-frame-timer | concept:frame-time |
| Tasks: p5-sdl2-migration (optional) | build (own small block, Optional badge) |
| Starter Code | build (code untouched) |
| Stuck & Curious | help, trimmed to two symptoms (linker, flicker). The types item moved to qa; the three "Curious" items were already concept qa (Not Responding, GetMessage vs PeekMessage, WinMain), so cut. |
| Claude Code Prompts | help, two callouts merged and shortened; the four prompts and the "surgical edit" mindset are kept; the third callout folded into one sentence. |
| Build Spec | practice (intro shortened) |
| Mixed Review | review (intro shortened) |
| Checkpoint | review, last |

No Pair with King block existed, so no overview page content.

## Moved into ladder qa
- winmain-hwnd: "I don't know half these type names... Is that okay?" (wall of types, the 20% point)
- wndproc: "Why does Windows call me, instead of me calling it?" (console vs windowed inversion)
- message-loop: "How does this compare to my Phase 2 and 4.5 loops?" (frame_loop.c table, scanf vs _kbhit)
