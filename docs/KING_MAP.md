# King comparison map (v23, step 1)

Written 17 Oct 2026. Compares every phase and concept with K. N. King, *C Programming: A Modern Approach*, 2nd ed. (2008), and proposes how phases and concepts should flow before any content is rewritten. Nothing in the app has changed yet.

**How this was made:** one reviewer per phase read the ladder JSON, the phase HTML and `docs/pages/<phase>.md`, then listed King's matching sections, what King explains that we skip, and the questions a zero-experience reader would still have. This file merges those reports.

**Spot-check needed:** King section numbers below come from memory of the 2nd edition, not from the book. Sam, please check a handful against your copy (especially §7.x, §15.x, §22.x, §26.2, §27.1) before they go into the app.

---

## 1. The short version

1. **The early phases carry the biggest gaps.** Phase 2 squeezes King ch 3 to 7 into 8 concepts and skips ch 4 (expressions) almost entirely. Later phases then use things nobody taught.
2. **Used before taught.** These show up in code from Phase 4.5 onward but are never explained:

   | Used | Where it first appears | Taught? | King | Proposed home |
   |---|---|---|---|---|
   | `&&`, `\|\|`, `!` | 4.5 starter, 6 `aabb`, `update-render` | No | §5.1 | Phase 2 (new "Conditions") |
   | `?:` | 4.5 starter | No | §5.2 | Phase 2 `if` |
   | `+=`, `++` as expressions, precedence | everywhere | Barely | §4.1–4.3 | Phase 2 (new "Operators") |
   | `break` / `continue` / `do while` | 4.5 `sentinel`, Phase 2 stretch | No | §6.2, §6.4 | Phase 2 (new "Loop control") |
   | Comments `//` `/* */` | Phase 1 starter | No | §2.3 | Phase 1 `program` |
   | Variables at all | Phase 1 `%d` | No (Phase 2) | §2.4 | Phase 1 (new "Variables") |
   | `unsigned`, ranges, overflow, `sizeof` | Phase 2 `rand`, 5 `frame-time` | Barely | §7.1, §7.6 | Phase 2 (new "Number sizes") |
   | `static`, globals | 5, 6 starters | No | §10.1–10.2, §18.2 | Phase 3 `scope`, 3.5 `headers` |
   | Passing arrays to functions | 3 build spec | Q&A only | §9.3 | Phase 3 (new "Array arguments") |
   | `strcpy` / `strcat` / `snprintf` | 3 practice, 6 `textout` | No | §13.5, §22.8 | Phase 3 (new "Copying and joining strings") |
   | `char *`, `const char *` | 6 `next-state` | No | §13.1, §13.7 | Phase 3.5 (new "Pointers and arrays") |
   | Pointer arithmetic, array decay | 7 exercises | No | §12.1–12.3 | Phase 3.5 (new "Pointers and arrays") |
   | Arrays of structs | 6 starter | Q&A only | §16.3 | Phase 3.5 (new "Arrays of structs") |
   | Function pointers / callbacks | 5 `wc.lpfnWndProc` | No | §17.7 | Phase 3.5 (new "Function pointers") |
   | `typedef` of plain types (`DWORD`, `HWND`) | 4.5, 5 | No | §7.5 | Phase 3.5 `structs` |
   | Bit flags `\|` | 5 window styles, 6 | No | §20.1 | Phase 5 (new "Bit flags") |
   | `long long`, unions (`LARGE_INTEGER`) | 5 `frame-time` | No | §7.1, §16.4 | Phase 5 `frame-time` (short boxes) |
   | `malloc` / `free` | 7 `push-back` | No | §17.1, §17.4 | Phase 3.5 "you'll see this" note; full rung deferred |

3. **Order mostly holds.** Our order departs from King on purpose in three places (functions before arrays, strings before pointers, structs before pointers), and the reviewers agreed all three suit a game-first learner. The real ordering problems are inside phases (Phase 2 teaches `if` before the operators it uses; Phase 5 needs its link step on rung 1, not rung 5).
4. **Proposed growth:** about 14 new concepts across Phases 1 to 6, plus a new Phase 00 (9 concepts). Phase 2 doubles and should probably split in two (decision D1).
5. **A batch of small errors** turned up that can be fixed now, before the flow changes (section 6).

---

## 2. Decisions for Sam

| # | Question | Recommendation |
|---|---|---|
| D1 | Split Phase 2 into **2 Values & Expressions** and **2.5 Decisions & Loops** (about 6 concepts each)? | Yes. Twelve concepts on one phase is the heaviest in the course, and the halves each end in a build (frame counter, guessing game). Costs a small progress migration (ticks on `if`, `loops`, `switch`, `rand` move to the new phase id). |
| D2 | Add a **Variables** concept to Phase 1, or start Phase 2 with it? | Phase 1, after Escapes, so `%d` has a purpose. Phase 2 `types` then goes deeper instead of starting from zero. |
| D3 | Phase 3.5 grows to about 13 concepts. Split into **3.5 Structs & Pointers** and **3.75 Files & Headers**, or keep one long phase? | Keep one phase for now, but move `debugger` to the front of Phase 3.5's Build page so it's used while learning pointers. Revisit after the Phase 2 pilot. |
| D4 | MSVC "unsafe function" warnings (C4996: `scanf`, `strcpy`, `fopen`). Keep `#define _CRT_SECURE_NO_WARNINGS`, or teach the `_s` versions? | Put `/D_CRT_SECURE_NO_WARNINGS` in build.bat and teach the portable safe habits instead (`fgets` + `sscanf`, `snprintf`, checking return values). One box per phase explains what `_s` functions are and why we don't use them (MSVC-only, tricky signatures). |
| D5 | 32-bit or 64-bit builds? Setup uses `vcvars32.bat` (x86), but some pages show 64-bit behaviour. | Switch to `vcvars64.bat` (x64). It's the default for new Windows software, and Win32 API code is identical. Update the linker-error examples, which currently show 32-bit names like `_WindowProc@16`. |
| D6 | Add `/std:c17 /nologo` to build.bat? | Yes. `cl` otherwise compiles an older C dialect, and `/nologo` hides the banner beginners ask about. Consider `/utf-8` in Phase 4.5 when block characters appear. |
| D7 | Phase 00 label. Setup is "00" today. | Rename Setup to **Start** (no number) and make the new phase **00 How Computers Work**, in a new "Foundations" group before Phases. |
| D8 | Where does the depth go on each concept page? | A **"Learn it"** section between "Why you need it" and the code walkthrough, open by default, 300 to 700 words, plain language, with a "King: §x.y" line at the end. Q&A keeps the curiosity questions. |

---

## 3. Proposed flow

**Legend:** **NEW** = new rung (new id), **+** = depth added to an existing rung, **→** = moved. Existing rung ids never change; `goals` numbers and play specs get re-keyed wherever order changes.

### Phase 00 How Computers Work (new)
See section 5.

### Phase 01 Hello World
1. `program` + comments, directive vs statement, what a function is, `int main(void)`, case-sensitivity, `return 0` (and that C99 lets you omit it)
2. `compile` + the terminal, folders and `cd`/`dir`/`cd ..`, preprocess → compile → link as a short picture (links back to Phase 00), what `.obj`/`.pdb` are, hidden file extensions
3. `escapes` + several `%d`s matched by order, a small table of `%d %f %c %s` with widths (full treatment in Phase 2)
4. **NEW `variables`** declare, assign, initialise, print a value (King §2.4)
5. `errors` + a short list of the errors beginners actually hit (C2065, C2143, C2001, C4013), warnings vs `/WX`
6. `buildbat` + what a flag is, `/W4` levels, `/std:c17 /nologo` (D6), a run step; **fix the check** so it uses a warning Phase 1 can produce
7. `git` + `git pull`, `git log`, a three-line `.gitignore` so the practice task doesn't commit the `.exe`

### Phase 02 Values & Expressions (if D1 is yes)
1. `types` + identifiers and keywords, initialisation vs garbage, `#define` and `const` for named numbers (King §2.6), `bool` via `<stdbool.h>` (keyword only in C23)
2. **NEW `sizes`** integer ranges, overflow, `unsigned`, `short`/`long`/`long long`, `float` vs `double` precision, `sizeof` and `<limits.h>`, a pointer to `<stdint.h>` for later (King §7.1–7.2, §7.6, §27.1)
3. `printf` + width, `-`, `0`, precision, `%s %u %x %lld %zu`, printing an expression
4. `scanf` + how it scans (whitespace, stops at a mismatch, leftovers), its return value (moved out of the stretch box), `getchar`, a note on `scanf_s` (D4)
5. **NEW `operators`** arithmetic operators, precedence and associativity, assignment as an expression, `+= -= *=`, `++`/`--` prefix vs postfix, one "don't do `i = i++`" warning (King §4.1–4.5)
6. `math` → renamed "Division, conversion and casting" + usual arithmetic conversions, narrowing on assignment, `<math.h>` basics (`sqrt`, `fabs`, `floor`) for later distance and rounding

### Phase 2.5 Decisions & Loops
1. **NEW `conditions`** comparisons give 1 or 0, `&&`, `||`, `!`, short-circuit, truthiness, why `0 < x < 10` is wrong (King §5.1)
2. `if` + nested if and dangling else, `?:`, the stray `if (x);` bug, blocks
3. `loops` + nested loops (grid drawing), off-by-one, `for (int i…)` scope, counting down
4. **NEW `loop-control`** `break`, `continue`, `do while`, `while (1)` + `break` as the game-loop shape, the null statement bug (King §6.2, §6.4–6.5)
5. `switch` → after loops + integer/char only, constant labels, braces for variables in a case, `break` inside a switch inside a loop
6. `rand` + `RAND_MAX` (32767 on MSVC), what a seed is, a float in [0, 1)

### Phase 03 Functions, Arrays & Strings
1. `define` → first (arrays need it) + what the preprocessor does, parentheses pitfall in the body, `const int` can't size an array in MSVC C, `enum { MAX = 5 }`
2. `functions` + argument vs parameter, control jumping in and back out, forgetting `return`, `exit()`
3. `prototypes` + names optional in prototypes, what happens when prototype and definition disagree
4. `scope` + scope vs lifetime, uninitialised locals, blocks and shadowing, `static` locals (a call counter), one real example of a global causing a bug (King §10.1–10.4)
5. `arrays` + partial initialisers, `= {0}`, omitted size, garbage in uninitialised arrays, VLA wording fixed
6. **NEW `array-args`** passing an array plus its length, why `sizeof` lies inside the function, the function changes the caller's array (King §9.3; the "why" is finished in 3.5 `pointer-arrays`)
7. `strings` + literal vs variable, `char s[] = "…"` sizing, `{'a','b'}` has no terminator
8. **NEW `string-copy`** `strlen`, `strcpy`, `strcat`, truncation and overflow, `snprintf` as the safe copy-and-join tool (King §13.5, §22.8)
9. `fgets` + streams sidebar (`stdin`, `stdout`, `stderr`), `fgets` returning NULL, reading a number from a line with `sscanf`/`strtol`, discarding the rest of a long line
10. `strcmp` + what "less than" means for text, `strncmp`, `<ctype.h>` (`toupper`, `isdigit`)
11. `grid` + bounds checks on both indices, char grids aren't strings, filling with `memset`
12. `files` + mode table (`r w a`, `+`, `b`), text vs binary on Windows, checking `fscanf`'s return, what the `&` in `&best` is (preview of pointers)

Recursion: optional Q&A only, not needed for the game.

### Phase 3.5 Pointers & Structs
1. `structs` + initialisers, designated initialisers, `= {0}`, the `struct Tag` form, nested structs, `typedef` for plain types (`DWORD`, `HWND` preview) (King §7.5, §16.1–16.2)
2. **NEW `struct-arrays`** `Enemy enemies[MAX]`, looping over them, a struct inside a struct (King §16.3)
3. `struct-copy` + returning a struct, `==` doesn't work on structs, padding (why `sizeof` is bigger)
4. `pointers` + memory as numbered bytes (links back to Phase 00), why pointers have types, `%p`, `p = q` vs `*p = *q`, uninitialised pointers, the `int* a, b;` trap (King §11.1–11.3)
5. `by-pointer` + output parameters, swap, why `scanf` needs `&`, never return `&local`, a forward note on `const` (taught in 4.5)
6. **NEW `pointer-arrays`** `p + 1`, `a[i]` is `*(a + i)`, array parameters are pointers, `const char *` and string literals, walking an array with a pointer (King §12.1–12.3, §13.1)
7. `null` + `if (p)` idiom, NULL is only one bad value (garbage and dangling pointers can't be checked), soften "always crashes"
8. **NEW `func-pointers`** a function's address, calling through a pointer, callbacks, the shape Phase 5's `WindowProc` uses (King §17.7)
9. `enum` + explicit values, a `_COUNT` last entry, `/W4` warning for unhandled cases
10. `headers` + `#include` pastes text, include guards (so other people's code reads), what never goes in a header, `extern` and `static` at file level (King §15.1–15.3, §18.2)
11. `linker` + the three stages recap, library LNK2019 (preview of Phase 5), LNK2005 preview
12. `debugger` + Call Stack, Locals, reading a NULL crash, why fields show `0xCCCCCCCC`
13. A short "things you'll see in other people's code" box (not a rung): `malloc`/`free`, unions, `goto`. Full `malloc` rung deferred until the game needs a growable list.

### Phase 04 Git & Your Partner
1. `clone-pull` + what a repo is, `.git`, `origin`, working tree / staging / repository picture
2. `gitignore` → second (a committed `.exe` is the first problem a pair hits) + what each build file is, `git check-ignore -v`
3. `commit-messages` + `git diff` and `git diff --staged`, HEAD, `user.name`/`user.email`, add `merge:` to the type list
4. `branches` + a branch is a label on a commit, what happens to unsaved edits when you switch
5. `pull-requests` + **what a merge is** (fast-forward vs merge commit), reading a diff, the three merge buttons
6. `merge-conflicts` + `pull` is `fetch` + `merge`, `git status` during a conflict, VS Code's accept buttons

King doesn't cover Git; depth comes from Pro Git ch 1–3.

### Phase 4.5 ASCII Runner
Order unchanged. Depth to add, with prerequisites now taught earlier:
- `kbhit-getch` + blocking vs non-blocking, characters are small numbers (back-link to Phase 2)
- `sleep` + `1000 / 33` is integer division, frames per second, modern timer resolution (`timeBeginPeriod`)
- `redraw-r` + what a buffer is, `stdout` buffering
- `frame-buffer` + `memset` explained, out-of-bounds writes don't crash politely
- `game-loop`, `sentinel` + `%` for "every N frames", what happens when every slot is full
- `state-machine` + `default`, explicit enum values
- `const-ptr` + reading declarations right to left, why big structs go by pointer
- `lnk2005` + translation units, declaration vs definition, `static` makes a name file-private

### Phase 05 Win32 Window
1. `winmain-hwnd` + what a handle is, event-driven programs, `CALLBACK`/`WINAPI`, the `h`/`lp`/`w` name prefixes, console vs GUI subsystem, a note on `A`/`W` (ANSI vs wide) functions
2. `link-libs` → second, so rung 1's code builds (+ what a `.lib` and a DLL are, finding the library on the Microsoft Learn page)
3. **NEW `bit-flags`** `|` to combine flags, `&` to test one, why not `+`, `RGB()` as packed bytes (King §20.1)
4. `wndproc` + who calls it and when, `WM_CLOSE` → `WM_DESTROY`, `LOWORD`/`HIWORD`
5. `message-loop` + the modal-loop catch (dragging the title bar), `wsprintf` can't do floats
6. `gdi-invalidate` + top-left origin, y grows down, create / use / delete for GDI objects
7. `frame-time` + 64-bit integers, `LARGE_INTEGER` as a union (one box), why the first frame spikes
8. `double-buffer` + what `SelectObject` swaps and why you put the old one back

Fix: the starter uses `GetMessage`, but the practice asks for a frame limiter; switch the starter to `PeekMessage`.

### Phase 06 Prototype
1. `update-render` + input → update → render diagram, state in a struct not globals
2. `delta-time` + float precision drift, clamping `dt`, fixed timestep named (not taught)
3. `next-state` trimmed to what's new since 4.5 (end-of-frame switching, a name table)
4. `aabb` + precedence of `+`, `<`, `&&`, tunnelling, undoing the move on a hit
5. `textout` + buffer size, `TextOutA` vs `TextOutW`
6. **NEW `game-files` (optional)** splitting the game into `game.h`/`game.c`/`player.c`, `static inline` in a header, matching the starter

### Phase 07 Directing Claude Code
No new rungs. Add the "things Claude may show you" box (function pointers, `malloc`/`free`, `memmove`) and fix the naming mismatches in section 6.

---

## 4. Concept-by-concept detail

Columns: King sections · what King explains that our page skips · questions a beginner still has after our page. "King: none" means we look to Microsoft Learn or Pro Git instead.

### Phase 01 Hello World

| Concept | King | Missing vs King | Beginner still asks |
|---|---|---|---|
| Your first C program | §2.1–2.3, §2.7–2.8 | Comments, directives vs statements, what a function is, string literals, keywords, case-sensitivity, free layout | What does "calling" mean? What are the `()` after main? What's the `//` line in my starter? |
| Compiling with cl | §2.1 (compiling and linking) | The three stages are only in Q&A; what a library is | What is a terminal / path / current folder? Why not double-click the exe? What are the extra files? |
| Escapes and %d | §3.1, §2.4 | Conversion spec anatomy, several arguments, printing expressions, mismatched arguments | Two numbers, does order matter? What do I use for text and decimals? |
| Reading errors | none | Common error codes, linker errors as their own kind | What do I do with 20 errors? Can I ignore a warning? |
| build.bat | none (§15.4 loosely) | What a flag is, `/W` levels, `%ERRORLEVEL%` = main's return value | Can I double-click a .bat? What do `/Zi` and `/Od` actually do? |
| Git | none | `pull`, `log`, status colours, rejected push | What does "staged" mean? How do I undo a mistake? |

### Phase 02 Input, Loops & Conditionals (current)

| Concept | King | Missing vs King | Beginner still asks |
|---|---|---|---|
| Variables and types | §2.4, §2.7, §7.1–7.3 | Declaration rules, initialisation vs garbage, identifiers, ranges and overflow, signed/unsigned, float vs double, constants | What does `int score;` hold? What happens at 2,147,483,647 + 1? |
| printf | §3.1, §7.1–7.2 | Width/flags/precision, `%s %u %x %lld`, escapes, printing expressions | How do I line up a score table? How do I print a string variable? |
| scanf | §3.2, §2.5, §7.3 | Return value, how scanning works, several values per call, `%lf`, `getchar`, printf/scanf mix-ups | What's a buffer? Why does typing `abc` spin forever? What's `scanf_s`? |
| if / else | §5.1–5.2 | `&&` `\|\|` `!` and short-circuit, precedence, nested if, `?:`, stray semicolon, Boolean history | How do I test "alive and not paused"? Why is `0 < x < 10` always true? |
| while and for | §6.1–6.4, §4.2–4.3 | `++` as an expression, compound assignment, `break`/`continue`, `do while`, nested loops, null statement | How do I leave a loop from the middle? How do I loop over a grid? |
| switch | §5.3 | Integer-only rule, constant labels, `break` in a loop, braces for variables | Can I switch on a string? What does `break` do inside a loop? |
| Integer maths and casting | §4.1–4.4, §7.4, §7.6 | Precedence, compound assignment, `++`, evaluation order, conversion rules, overflow, `<math.h>` | Is `2 + 3 * 4` 20 or 14? How do I round instead of chop? |
| Random numbers | §26.2 | `RAND_MAX`, `time_t`, a random float | What is a seed? What does `unsigned` mean? (Overview says skip it, rung uses it) |

### Phase 03 Functions, Arrays & Strings

| Concept | King | Missing vs King | Beginner still asks |
|---|---|---|---|
| Functions | §9.1, §9.4–9.5 | Call flow, argument vs parameter, argument conversion, missing `return`, `exit` | Can a function call another? What if I forget `return`? |
| void and prototypes | §9.1–9.3 | Names optional, prototype/definition mismatch | Do I need a prototype if the function is above main? |
| Scope | §10.1–10.4 | Lifetime vs scope, garbage locals, `static` locals, blocks, shadowing | Why can't I use `i` after the loop? How do I keep a value between calls? |
| #define | §2.6, §14.1, §14.3 | What the preprocessor does, `const int` can't size an array in MSVC C, `enum` constants | Is `#define` a variable? Why use `const` then? |
| Arrays | §8.1, §9.3 | Partial init, `= {0}`, omitted size, designated init, garbage, why `sizeof` fails in a function | What's in an array I didn't fill? Why does `sizeof` lie in my function? |
| Strings and '\0' | §13.1–13.3, §13.5 | Literal vs variable, auto-sizing, copying and joining, `ctype.h` | How do I copy or join two strings? Can I change a string in quotes? |
| fgets | §13.3, §22.5, §3.2 | Return value, streams, reading numbers from a line, leftovers | What is `stdin`? How do I read a number safely? |
| strcmp | §13.5–13.6 | What "less than" means, `strncmp`, `strcpy`/`strcat`, safe variants | Why not -1/0/1? How do I check "starts with"? |
| 2D arrays | §8.2, §9.3 | Why the column size is required, row-major memory, bounds, clearing | What if the player walks off the map? Why does the function need the column count? |
| Files | §22.1–22.3, §22.5 | Modes, text vs binary, `fscanf`'s return, `fread`/`fwrite`, buffering | What's the `&` in `&best`? How do I save a whole array? |

### Phase 3.5 Pointers & Structs

| Concept | King | Missing vs King | Beginner still asks |
|---|---|---|---|
| Structs and dot | §16.1–16.2 | Initialisers, designated init, `= {0}`, tags, nested, arrays of structs | How do I set every field in one line? What does `= {0}` do? |
| Structs are copied | §16.1–16.2, §9.3 | Returning a struct, no `==`, padding | Can a function hand back a whole struct? Can I compare structs with `==`? |
| Pointers & and * | §11.1–11.2 (11.3 skipped) | What memory is, pointer types, `%p`, pointer assignment, uninitialised pointers | Why do pointers need a type? What does `int* a, b;` declare? |
| Passing by pointer | §11.4, §16.2 (11.5 skipped) | `const` parameters, returning pointers, returning `&local`, output parameters, swap | How can a function return two values? Why can't I return `&local`? |
| NULL | §17.1, §11.5 | `if (p)`, other bad pointers can't be checked | What if `p` isn't NULL but already invalid? |
| enum | §16.5, §5.3 | Explicit values, `_COUNT`, enums are ints | Can a `GameState` hold an unlisted value? Do I need `default:`? |
| Headers and #pragma once | §14.2, §15.1–15.3 | How `#include` works, include guards, what not to put in a header, `extern` | Does `#include` copy text into my file? What if two files need one global? |
| Linker errors | §15.4, §2.1 | The full pipeline, rebuilding, library LNK2019 | What if the missing function is in a Windows library? |
| Debugger | none | Call Stack, Locals, reading a crash, `0xCCCCCCCC` | How do I see where it crashed? |

### Phase 04 Git & Your Partner (King: none for all)

| Concept | Missing depth (Pro Git ch 1–3) | Beginner still asks |
|---|---|---|
| Clone and pull | Repo and `.git`, `origin`, tracked files, three areas | What's `origin`? Why does status say "up to date" when GitHub has more? |
| Commit messages | `git diff --staged`, HEAD, name/email setup, imperative mood | How do I see what I'm about to commit? What is HEAD? |
| Branches | A branch is a label, unsaved edits when switching | Is a branch a copy of all my files? |
| Pull requests | What a merge is, reading a diff, merge button options | What do the three merge options mean? How does my partner play my branch? |
| Merge conflicts | How Git spots a conflict, `pull` = `fetch` + `merge`, rebase in two lines | Why is there a merge commit I didn't write? |
| .gitignore | What each build file is, glob syntax, binary files | What is a `.pdb`? How do I check a file is ignored? |

### Phase 4.5 ASCII Runner

| Concept | King | Missing depth | Untaught prerequisite (fixed by the new flow) |
|---|---|---|---|
| _kbhit / _getch | §6.3–6.4, §7.3 | Keyboard queue, blocking vs non-blocking, chars as numbers | `\|\|` in the try-it |
| Sleep | §14.3, §26.3 | Integer division in `1000/33`, FPS, timer resolution | `DWORD` typedef |
| \r and fflush | §3.1, §22.1–22.3 | Streams and buffering, width flags | `stdout` as a `FILE *` |
| Frame buffer | §8.1, §13.2, §23 | `memset`, out-of-bounds writes | — |
| Game loop | §5.1, §2.3 | Comparisons as values, state persisting across frames | `/* */` comments, comparison as value |
| Sentinel values | §8.1, §6.4 | `break` exits one loop, `%` for timing, full slots | `break` |
| State machines | §5.3, §16.5 | `default`, explicit values, why enum beats `#define` | — |
| const pointers | §11.4, §18.3 | Right-to-left reading, why pointers for big structs | `const` barely taught |
| LNK2005 | §15.1–15.4, §18.2 | Translation units, declaration vs definition, `static`, `extern` | `static` never taught |

### Phase 05 Win32 Window (mostly King: none; depth from Microsoft Learn)

| Concept | C pieces King covers | Missing depth | Untaught prerequisite |
|---|---|---|---|
| WinMain and HWND | §7.5, §11, §17.7 | Handles, event-driven model, `CALLBACK`, name prefixes, subsystem | Function pointers, plain `typedef`s, `{0}`, `(void)x` |
| WndProc | §5.3, §10.3 | Message numbers, `wp`/`lp`, return values, `WM_CLOSE` | Callbacks |
| Message loop | §6.1, §16.1 | Queue, `TranslateMessage`, modal loop | — |
| GDI and InvalidateRect | §7.4, §20.1 | Coordinates, device contexts, resource cleanup, `RGB` | Integer-to-handle casts |
| Linking libraries | §15.4 | `.lib` vs DLL, finding the library | — |
| Frame time | §7.1–7.2, §16.4 | Ticks, 64-bit ints, union, first-frame spike | `long long`, unions |
| Double buffering | §7.5 | Bitmaps, `SelectObject`, `SRCCOPY` | — |

### Phase 06 Prototype

| Concept | King | Missing depth | Untaught prerequisite |
|---|---|---|---|
| Update vs render | §5.1, §16.1 | Loop diagram, state in a struct | `\|\|`, `!`, `{0}` |
| Delta time | §7.1–7.2, §7.4 | Float precision drift, clamping, fixed step | — |
| next_state | §13.7, §16.5 | Arrays of string pointers, enum as index | `const char *` |
| AABB | §4.1, §5.1, §16.2 | Precedence, short-circuit, tunnelling, response | `&&` |
| TextOut | §22.8, §7.6, §20.1 | Buffer size, `A`/`W` text | Bitwise `\|`, `snprintf` |

### Phase 07 Directing Claude Code
King §9, §12.3, §17.1, §17.7, §19. No new rungs; the exercises show `memmove`, `malloc`, function-pointer typedefs. Those get a "things Claude may show you" box.

---

## 5. Phase 00 How Computers Work (new)

Each concept ends with a "this pays off in…" line, and later pages link back. Visual first: this is where See It Run pays off most.

| # | Concept (id) | Why it matters later | See It Run idea |
|---|---|---|---|
| 1 | Bits and bytes (`bits`) | Every type is a number of bytes (Phase 2 `sizes`) | Switches flipping, 8 make a byte |
| 2 | Binary and hex (`binary-hex`) | Hex in the debugger, `RGB`, bit flags (Phase 5) | A counter ticking in decimal, binary and hex side by side |
| 3 | Memory as numbered boxes (`memory`) | Variables, arrays, pointers (Phases 2, 3, 3.5) | Reuse the `p3b-mem` scene: boxes filling with values at addresses |
| 4 | The CPU's loop (`cpu`) | Why code runs line by line, why loops cost time | A tiny CPU fetching, decoding and running 4 instructions |
| 5 | Registers and the stack (`stack`) | Function calls, local variables vanishing (Phase 3 `scope`), the debugger's Call Stack | Frames pushed and popped as functions call each other |
| 6 | Source to machine code (`toolchain`) | `cl`, `.obj`, the linker (Phases 1, 3.5, 5) | `hello.c` → preprocess → compile → link → `hello.exe` |
| 7 | The OS, processes and files (`os`) | Why `fopen` can fail, why a window needs Windows (Phases 3, 5) | Two programs sharing the CPU, a file going to disk |
| 8 | Input and output (`io`) | The keyboard buffer, `stdout`, the screen (Phases 2, 4.5, 5) | Keypress → buffer → program → characters on screen |
| 9 | Why C looks the way it does (`why-c`) | Types and sizes, overflow, pointers, frame timing | Recap: each C feature mapped to the hardware idea it comes from |

Housekeeping when built: `content/NN-phase0.html` in the manifest (new "Foundations" group, D7), `content/ladders/phase0.json`, `content/play/phase0.json`, `js/play/scenes-phase0.js` with a script tag, glossary entries (bit, byte, hex, address, CPU, register, stack, process), and dashboard/rail numbering checked.

---

## 6. Errors to fix now (independent of the flow)

Small and safe; these can go in one PR before the rewrite.

**Code consistency**
- Use `int main(void)` everywhere. `int main()` appears in about 37 rung code samples across Phases 1, 2, 3, 3.5 and 6, while traces and quizzes use `(void)`.
- Phase 1 `buildbat` check depends on warning C4244 (float → int), which needs Phase 2 types. Use C4101 (unused variable) instead.
- Phase 1 practice uses `git add .` with no `.gitignore`, so it commits `.exe`/`.obj`/`.pdb`. Name the files or add a tiny `.gitignore`.
- Phase 2 Overview says "skip unsigned types", but `rand` uses `(unsigned)`.
- Phase 2 `types` try-it says "zero warnings means you chose well". Its own sample has unused variables that fail `/W4 /WX`. Reword to check the printed output.
- Phase 5 `gdi-invalidate` Q&A points to "Rung 7" for double buffering. Correct today, but it breaks once rungs move; refer to the concept by name.
- Phase 5 starter uses `GetMessage` while practice asks for a frame limiter (needs `PeekMessage`).
- Phase 5 link-libs examples show 32-bit names (`_WindowProc@16`); match whichever architecture D5 picks.
- Phase 5 prompt text says `g_x`/`g_y`; starter uses `g_rect_x`/`g_rect_y`. Phase 7 exercise 3 has the same mismatch.
- Phase 6 starter: `Player` used before it's defined; `aabb_overlap` takes eight floats while the rung teaches a `Box` of ints; four states vs the spec's three; `STATE_*` vs `MENU`/`PLAYING` names; `game_render(Game*)` isn't `const`.
- Phase 7 exercise 4 uses `STATE_PLAYING`, its reference prompt says `PLAYING`.
- Phase 4.5 `sentinel` Q&A promises "Phase 7 shows the bigger version"; Phase 7 doesn't.

**Wording that's wrong or misleading**
- Phase 1 `program`: "Without this line, C doesn't know what printf is". MSVC actually warns C4013 and `/WX` makes it fatal; say that.
- Phase 1 `errors`: "a warning still makes one [an exe]" is false under `/WX`.
- Phase 1 `buildbat`: `/Zi` makes a `.pdb` with debug info and `/Od` turns off optimisation; "prepare the .exe for the debugger" is too loose.
- Phase 2 `types`: "it only accepts that kind" contradicts the page's own lesson (C converts silently).
- Phase 2 `scanf`: forgetting `&` doesn't reach runtime under `/W4 /WX` (C4477 stops the build).
- Phase 3 `arrays`: VLAs are C99, MSVC never implemented them, C11 made them optional.
- Phase 3 `define`: "Both beat a bare 5" hides that `const int N` can't size an array in MSVC C.
- Phase 3 `files`: `_CRT_SECURE_NO_WARNINGS` silences warnings, it doesn't make the code safer; and `fscanf`'s result is never checked.
- Phase 3.5 `null`: following NULL is undefined behaviour, usually a crash on Windows, not guaranteed.
- Phase 3.5 `pointers`: GDScript has references, not pointers; say "similar to".
- Phase 3.5 overview pairs with King ch 11, 12, 16, but ch 12 and §16.3–16.4 aren't taught (fixed by the new rungs).
- Phase 4 `gitignore`: the `echo` encoding warning only applies to Windows PowerShell 5.1.
- Phase 4.5 `sleep` and Phase 5 `frame-time`: the 15.6 ms timer tick isn't reliable on Windows 10 2004+ and Windows 11 (per-process timer resolution).

---

## 7. Where King is dated (applies across phases)

| Topic | King (2008) | Now |
|---|---|---|
| `bool` | `_Bool` / `<stdbool.h>` | Still `<stdbool.h>` on MSVC; `bool` is a keyword in C23 |
| `NULL` | `NULL` | C23 adds `nullptr`; MSVC C support is incomplete, keep `NULL` |
| Fixed-width ints | Brief (`<stdint.h>`, ch 27) | Standard practice for game code (`int32_t`, `uint8_t`); introduce in Phase 2 `sizes` |
| `gets` | Warned against | Removed in C11; never mention except as history |
| Safe strings | `strncpy` | `snprintf` is the portable tool; MSVC also offers `_s` functions (D4) |
| `main()` | Shows both forms | `int main(void)`; empty `()` stopped meaning "unspecified" only in C23 |
| VLAs | C99 feature | Optional since C11, not in MSVC |
| `#pragma once` | Include guards only | `#pragma once` works everywhere we care about; show guards for reading other code |
| Compiler | Generic | `cl /std:c17` (D6); C23 support in MSVC is partial |
| Console text | ASCII | UTF-8 needs `/utf-8` and a UTF-8 console (Phase 4.5 block characters) |

---

## 8. Next steps after Sam's review

1. Sam answers D1 to D8 and marks anything in section 3 to change.
2. Fix section 6 in one small PR.
3. Pilot Phase 2 (both halves if D1 is yes) with the new rungs and "Learn it" sections: Sonnet drafts, Opus checks accuracy and beginner gaps, Haiku sweeps voice, click-through at 1300 and 390 px. Show Sam before rolling out.
4. Roll out Phases 1, 3, 3.5, then 4.5 to 6, then Phase 00.
5. Update `docs/pages/<phase>.md` and the Overview King lines per concept as each phase lands.
