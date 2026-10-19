# Phase 5 page map (Win32 Window)

## Current shape (v23)

Phase 05 Open a Window. Move Something.. File `content/10-phase5.html`, ladder `content/ladders/phase5.json`, phase id `phase5`. Comes after `phase4b`, before `phase6`.

Pages: Overview, 8 concepts, Build, Practice, Review.

Concepts (every one has a Learn it section with a King line; new in v23: `bit-flags`; `link-libs` moved to 2nd):

1. `winmain-hwnd` WinMain and the window handle (HWND). King: §7.5, §19.3, §20.3, §14.3–14.4
2. `link-libs` Linking libraries (user32.lib, gdi32.lib). King: §15.4
3. `bit-flags` Combining flags with | and &. King: §20.1
4. `wndproc` The window procedure (WndProc) and messages. King: §17.7, §5.3
5. `message-loop` The message loop and PeekMessage. King: §22.8
6. `gdi-invalidate` Drawing with GDI and InvalidateRect. King: §14.3
7. `frame-time` Frame time (QueryPerformanceCounter). King: §16.4, §20.3, §7.2
8. `double-buffer` Double buffering. King: §18.2

Notes:
- R5. Message loop uses snprintf and a PeekMessage drain loop; the starter switched to PeekMessage; linker notes show x64 names (no `__imp__`/`@n`).
- A Pair with King block was added (overview), so the "no overview content" note below is out of date.

## v22 page map (record)

Written for v22. Concept numbers and phase names in this part are from before v23; use the list above for the current order.

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
