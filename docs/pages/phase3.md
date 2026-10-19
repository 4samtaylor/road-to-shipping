# Phase 3 page map

## Current shape (v23)

Phase 03 Functions, Arrays & Strings. File `content/06-phase3.html`, ladder `content/ladders/phase3.json`, phase id `phase3`. Comes after `phase2b`, before `phase3b`.

Pages: Overview, 13 concepts, Trace, Build, Practice, Review.

Concepts (every one has a Learn it section with a King line; new in v23: `static-global`, `array-args`, `string-copy`):

1. `functions` Functions: parameters and return values. King: §9.1, §9.4–9.5
2. `prototypes` void and function prototypes. King: §9.2–9.3, §10.5
3. `scope` Scope: where a variable lives. King: §10.1, §10.3–10.4, §18.5
4. `static-global` Static locals and globals. King: §10.1–10.2, §18.2
5. `define` Named constants with #define. King: §2.6, §14.1–14.3
6. `arrays` Arrays: many values, one name. King: §8.1–8.2, §8.3
7. `array-args` Passing arrays to functions. King: §9.3
8. `strings` Strings and the '\0' at the end. King: §13.1–13.4, §13.2
9. `fgets` Reading a line of text with fgets. King: §13.3, §22.1, §22.5, §22.8
10. `string-copy` Copying and joining strings. King: §13.5, §22.8
11. `strcmp` Comparing strings with strcmp. King: §13.5, §23.5, §23.6
12. `grid` 2D arrays: grids. King: §8.2, §9.3, §13.7
13. `files` Saving and loading with files. King: §22.1–22.3

Notes:
- R3 rewrite. `static` locals and globals are taught here (D9); file-level `static` and `extern` wait for 3.75 `headers`.
- fgets checks for NULL; files reports errors on stderr and loops on fscanf's count, not `feof`.
- Pair with King has one row per concept.

## v22 page map (record)

Written for v22. Concept numbers and phase names in this part are from before v23; use the list above for the current order.

Words (visible text): 6392 before, 3650 after (-43%).

| Original block | Decision | Why |
|---|---|---|
| Explain Like I'm New: Functions | cut | Concept pages 1 and 2 teach it. Unique points moved to qa (return vs return 0, defining is not running). |
| Explain Like I'm New: Arrays and strings | cut | Concepts 5 and 6 teach it. Unique points moved to qa (MSVC warnings, games use arrays, '\0' vs '0'). |
| Concepts First: #define | cut | Concept 4 teaches it. Brackets-around-operators and capitals moved to qa. |
| Session Plan (D, E, F) | cut | Warm-ups repeat the concept checks. "Break it" ideas kept in the Build Spec block. |
| Tasks | split | p3-functions to concept:functions; p3b-declare-iterate and p3b-max-min to concept:arrays; p3b-fgets-name to concept:fgets; p3b-string-functions to concept:strcmp; p3b-high-score-table, p3-define-constants (needs arrays and strings, so it comes after the high-score build) and p3b-commit-github to practice. |
| Starter Code (arrays.c) | build | Kept the code. Dropped the "Why fgets" island (concept fgets covers it). Kept the high-score shape note. |
| Stuck & Curious | help | Four error-symptom items kept. '\0' vs '0' and the curious "why" items moved to qa or dropped as duplicates. |
| Claude Code Prompts | help | Unchanged. |
| Predict the Output | trace | All four drills kept; answers shortened. |
| Quiz Yourself | review | 5 to 2 questions. Dropped scores[5], strcmp bare-if and missing-terminator (asked in concept qa/checks). |
| Checkpoint | review | Unchanged, last on the page. |
| Build Spec | practice (first, data-order -1) | Function signatures added to the high_score.c line; Phase 07 reference removed. Added a short "break it on purpose" callout from the Session Plan. |
| Stretch Goal | build | Unchanged (task p3-stretch-scores-file, code, requirements, pitfalls). |
| Mixed Review | review | Unchanged. |
| Pair with King | overview | Rewritten as one line per concept. |

## Moved into ladder qa

- functions: "Is return 0 in main the same as return in my function?"; "Does defining a function run it?"
- prototypes: "Why does C need prototypes at all?" (one-pass compile history)
- define: "What goes wrong with #define WIDTH 80 + 2?"; "Why are #define names in capitals?"
- arrays: "Will the compiler warn me about scores[5]?"; "Where do games use arrays?"; "Why can't I copy an array with a = b;?"
- strings: "Is '\0' the same as the character '0'?"
- arrays: "Does passing an array to a function copy it?"

Review fixes: arrays C6201 answer corrected (plain /W4 often stays quiet); fgets task note no longer points at the starter code; King lines chapter-level (fgets ch 22, strcspn ch 23); em dashes removed from prose. Concept 4 (define) now has no attached practice block.
