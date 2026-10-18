# Phase 3 page map

Words (visible text): 6392 before, 3650 after (-43%).

| Original block | Decision | Why |
|---|---|---|
| Explain Like I'm New: Functions | cut | Concept pages 1 and 2 teach it. Unique points moved to qa (return vs return 0, defining is not running). |
| Explain Like I'm New: Arrays and strings | cut | Concepts 5 and 6 teach it. Unique points moved to qa (MSVC warnings, games use arrays, '\0' vs '0'). |
| Concepts First: #define | cut | Concept 4 teaches it. Brackets-around-operators and capitals moved to qa. |
| Session Plan (D, E, F) | cut | Warm-ups repeat the concept checks. "Break it" ideas kept in the Build Spec block. |
| Tasks | split | p3-functions to concept:functions; p3-define-constants to concept:define; p3b-declare-iterate and p3b-max-min to concept:arrays; p3b-fgets-name to concept:fgets; p3b-string-functions to concept:strcmp; p3b-high-score-table and p3b-commit-github to practice. |
| Starter Code (arrays.c) | build | Kept the code. Dropped the "Why fgets" island (concept fgets covers it). Kept the high-score shape note. |
| Stuck & Curious | help | Four error-symptom items kept. '\0' vs '0' and the curious "why" items moved to qa or dropped as duplicates. |
| Claude Code Prompts | help | Unchanged. |
| Predict the Output | trace | All four drills kept; answers shortened. |
| Quiz Yourself | review | 5 to 2 questions. Dropped scores[5], strcmp bare-if and missing-terminator (asked in concept qa/checks). |
| Checkpoint | review | Unchanged, last on the page. |
| Build Spec | practice | Added a short "break it on purpose" callout from the Session Plan. |
| Stretch Goal | build | Unchanged (task p3-stretch-scores-file, code, requirements, pitfalls). |
| Mixed Review | review | Unchanged. |
| Pair with King | overview | Rewritten as one line per concept. |

## Moved into ladder qa

- functions: "Is return 0 in main the same as return in my function?"; "Does defining a function run it?"
- prototypes: "Why does C need prototypes at all?" (one-pass compile history)
- define: "What goes wrong with #define WIDTH 80 + 2?"; "Why are #define names in capitals?"
- arrays: "Will the compiler warn me about scores[5]?"; "Where do games use arrays?"; "Why can't I copy an array with a = b;?"
- strings: "Is '\0' the same as the character '0'?"
