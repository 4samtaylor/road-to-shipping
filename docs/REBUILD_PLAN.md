# Road to Shipping: rebuild plan

Written 17 October 2026, after the Phase 2 concept-ladder pilot (v19). This is the blueprint for rebuilding every phase. Status is tracked at the bottom.

## Goals

1. Every phase teaches one concept at a time (the concept ladder), not a long Learn page.
2. Each phase becomes a short sequence of pages you move through in order, so there is one thing on screen at a time.
3. Content gets trimmed as it moves: anything a concept page now covers is cut from the old blocks.
4. The library (cheat sheet panel) is organised by phase and concept, with a filter.
5. Concept code gets a play button that shows the code running as a tiny game.

## 1. Pages inside a phase (pagination)

A phase becomes a numbered run of pages, each its own URL (`#/phase2/3`), with Back / Next at the bottom and the page list at the top.

| Page | What's on it | Comes from |
|---|---|---|
| Overview | Goals ("By the end of this phase"), the concept table of contents, time estimate, King reading for the phase, Start button | Checkpoint text, ladder, Pair with King |
| Concept 1…N | One rung: why, walkthrough, check, try-it, Q&A, next | `content/ladders/<phase>.json` |
| Trace | Predict the Output drills that aren't already a concept check | Predict the Output |
| Practice | Tasks and the Build Spec | Tasks, Build Spec |
| Build | Starter code, Stretch Goal | Starter Code, Stretch Goal, build.bat (P1), Tooling (P3.5) |
| Review | Quiz (trimmed), Mixed Review, Checkpoint | Quiz Yourself, Mixed Review, Checkpoint |

The help drawer stays as is (Stuck & Curious, Claude Code Prompts). Progress keys (`data-id`s, rung ids) don't change, so nothing anyone has ticked is lost.

## 2. Keep / move / cut rules (all phases)

| Block | Decision | Why |
|---|---|---|
| Concepts First | **Cut** once its phase has a ladder. Anything not covered moves into a concept's walkthrough or Q&A first. | Concept pages replace it |
| Explain Like I'm New | **Cut** the same way. Each analogy becomes that concept's mental-model line. | One model per concept, not a page of them |
| Session Plan | **Cut.** Its review questions become concept checks or Q&A; its timings become page time estimates. | The pages are the plan |
| Predict the Output | **Keep** as the Trace page. Drop any drill that duplicates a concept check. | Whole-program tracing is a different skill from one-concept checks |
| Quiz Yourself | **Keep, trimmed** to questions not already asked on a concept page. Moves to Review. | Mixed retrieval at the end |
| Tasks, Build Spec, Starter Code, Stretch Goal | **Keep** (Practice and Build pages). | This is the actual work |
| Stuck & Curious | **Keep** in the help drawer. "Why does C…" items move to concept Q&A. | Drawer is for being stuck, Q&A is for curiosity |
| Claude Code Prompts | **Keep** in the help drawer. | Unchanged |
| Pair with King | **Move** to the Overview page, split per concept ("King §4.1 for concept 2"). | Reading lines up with the concept it supports |
| Mixed Review | **Keep** on Review. | Spaced practice |
| Tooling / build.bat / Git blocks | **Become concept pages** where they teach a concept (debugger in 3.5, build.bat and Git in 1). The step-by-step setup parts stay on Build. | They're concepts, not reference |

Cuts happen in the same release as pagination, after Sam has used the ladders for a week. Until then the old blocks stay folded under "Full notes for this phase".

## 3. Concepts per phase

Skills are `glossary.json` ids; passing a concept's check moves them to Practiced.

| Phase | Concepts (rungs) | Status |
|---|---|---|
| 01 Hello World | Your first C program · Compiling and running with cl · Escape sequences and %d · Reading compiler errors · build.bat and compiler flags · Saving your work with Git | **Written (v20)** |
| 02 Input, Loops & Conditionals | Variables and types · printf · scanf · if / else · while and for · switch · Integer maths and casting · Random numbers | **Live (v19)** |
| 03 Functions, Arrays & Strings | Functions · void and prototypes · Scope · #define · Arrays · Strings and '\0' · fgets · strcmp · 2D arrays · Files | **Written (v20)** |
| 3.5 Pointers & Structs | Structs and the dot · Structs are copied · Pointers: & and * · Passing by pointer and -> · NULL · enum · Header files and #pragma once · Linker errors · The debugger | Next |
| 04 Git & Your Partner | Clone and pull · Commit messages · Branches · Pull requests · Merge conflicts · .gitignore | Next |
| 4.5 ASCII Runner | Input without waiting (_kbhit) · Frame timing with Sleep · Redrawing in place (\r, fflush) · The frame buffer · The game loop · Sentinel values · State machines · const pointers · Multiple files and LNK2005 | Next |
| 05 Win32 Window | WinMain and HWND · The window procedure · The message loop and PeekMessage · Drawing and InvalidateRect · Linking libraries · Frame time · Double buffering | Later |
| 06 Prototype | update vs render · Delta time · State machine with next_state · AABB collision · Text on screen | Later |
| 07 Directing Claude Code | Name the signature · Read every line · Ask for explanations · Push back on complexity · You own the architecture (checks are "which prompt is better?") | Later |

Godot Bridge and the Session pages stay as reference pages (Session notes become in-app entries if Sam picks that option).

Verification rule: every C program in a ladder is compiled and run, and its check answer matches the real output. Windows-only code (Phases 4.5 and 5) is checked by careful review and, where possible, a MinGW cross-compile.

## 4. Library by phase and concept

The right-hand panel becomes the whole library, grouped **Phase → Concept → terms** (terms map to concepts through each rung's `skills`; terms not on any rung sit under "More").

Filter (remembered per device):

- **Focus** (default): every phase listed, only the phase you're viewing open, its current concept highlighted.
- **This phase**: only the phase you're viewing.
- **All**: every phase open.
- **Pick a phase**: a dropdown.

Plus a search box, and phase and concept headings that collapse on click. Skill dots work as they do today.

## 5. Play button: see the code run

Each concept's program gets a ▶ button that opens a small canvas "game view" showing what the code does, in step with the walkthrough. Examples:

- Variables: four labelled boxes fill; 2.9 hits the int box and the .9 falls off.
- Loops: a runner laps a track while a counter ticks down lives.
- switch: a menu cursor jumps to the matching case and falls through when a break is missing.
- Arrays: a row of numbered lockers, with the loop index walking along them.
- Pointers (3.5): an arrow from a variable to the box it points at.

Built in the app (Claude's Motion artifact type isn't available on this account), one shared scene engine plus a short spec per concept. Prototype one concept first for Sam to review, then roll out.

## 6. Build order

| Release | Contents |
|---|---|
| v20 | Concept table of contents (no slider) · Phase 1 and 3 ladders · this plan |
| v21 | Phase 3.5, 4 and 4.5 ladders |
| v22 | Phase 5, 6 and 7 ladders |
| v23 | Pages inside phases + the cuts above (after Sam's week with the ladders) |
| v24 | Library by phase and concept, with the filter |
| v25 | Play-button visuals: one prototype, then all concepts |
