# Phase 1 page map

## Current shape (v23)

Phase 01 Hello World: Compile & Run. File `content/02-phase1.html`, ladder `content/ladders/phase1.json`, phase id `phase1`. Comes after `phase0`, before `phase2`.

Pages: Overview, 8 concepts, Trace, Build, Practice, Review.

Concepts (every one has a Learn it section with a King line; new in v23: `comments`, `variables`):

1. `program` Your first C program. King: §2.1–2.2, §2.7
2. `compile` Compiling and running with cl. King: §2.1
3. `comments` Comments and layout. King: §2.3, §2.8
4. `escapes` Escape sequences and %d. King: §3.1
5. `variables` Variables: storing a number. King: §2.4, §2.7
6. `errors` Reading compiler errors. King: Chapter 1 Q&A, §2.3, §2.8
7. `buildbat` build.bat and compiler flags. King: Chapter 1 and 2 Q&A
8. `git` Saving your work with Git. Not in King

Notes:
- Each new concept has a "Practice this" task (`p1-comments`, `p1-variables`).
- build.bat FLAGS are now `/std:c17 /W4 /WX /Zi /Od` (x64 via vcvars64).
- A short "Start here" overview block (appended last, `data-order="-1"`) points beginners to Phase 00.
- Pair with King rewritten with verified section numbers (R0).

## v22 page map (record)

Written for v22. Concept numbers and phase names in this part are from before v23; use the list above for the current order.

Words (HTML text): 3559 before, 1536 after (-57%).

| Original block | Decision |
|---|---|
| Concepts First | Cut. Compiler strictness, save-before-compile and Python-vs-C moved to ladder qa; cd/cl/dir and the workflow strip repeat concepts 1 and 2. |
| Tasks: p1-hello-world-printf, p1-starter-todos | `practice` (combine concepts 1 to 3; notes now point at the Build page). |
| Task: p1-compiler-error | `concept:errors` ("Practice this"). |
| Task: p1-commit-github | `practice`, after p1-starter-todos (it commits the Hello World written there). |
| Starter Code | `build`, comments trimmed to the TODOs and the compile commands. |
| Stuck & Curious (errors) | `help`, unchanged. |
| Stuck & Curious (curious "why" items) | Cut from help; moved to ladder qa. |
| Claude Code Prompts | `help`; two long callouts shortened to one sentence, prompts and the prompting pattern kept. |
| Git | Cut; the git concept covers the three commands. Commit-message format and the GitHub check moved to qa. |
| build.bat | `build` (badge "Setup"), steps 1 to 3 only; Step 2 script now matches the rung (FLAGS /W4 /WX /Zi /Od). Cut "what is a .bat", analogy, Phase 3.5 version, flag explainer and workflow strip (concept 5 teaches them); .gitignore note shortened. |
| Predict the Output | `trace`; drill 1 (\r) dropped (repeats concept 3 check); truncation drill dropped (floats are Phase 2, to be added to its trace); 2 drills remain. |
| Quiz Yourself | `review`; Q1 (\r), Q2 (truncation) and Q3 (\\ and %%) dropped as asked in concept check or trace; Q4 and Q5 kept. |
| Checkpoint | `review`, unchanged. |
| Pair with King | `overview`, rewritten per concept (concept 2 ch 2, concept 3 ch 2 and 3, concepts 4 to 6 not in King). |

## Moved into ladder qa
- program: what .h means; why the compiler is strict
- compile: why compile vs Python; what is inside the .exe
- escapes: is \r useful; prompt glued to output
- errors: C2017 unknown escape
- buildbat: /Od vs /O2; commit build.bat but not outputs
- git: commit message format; git add . and confirming on github.com
