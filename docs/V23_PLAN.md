# v23 implementation plan: cleaning up the phases against King

> **Status (Oct 2026): implemented.** Releases R0–R7 are done: Phase 00, the Phase 2 and 3.5 splits (`phase2b`, `phase3c`), all 24 new rungs and Learn it on every concept. Changed during build: D4 keeps `_CRT_SECURE_NO_WARNINGS` as a `#define` in the source files (Phase 4.5 teaches why it goes before the includes), and FLAGS leave out `/nologo` because Phase 1 uses cl's banners to show each build step. `/RTC1` not added; `scanf` not split. Section 6's MSVC facts were checked on Sam's PC with `tools/msvc-check` (58 cases); where a page and this plan disagree, `tools/msvc-check/expected.json` wins.

Written 18 Oct 2026. Builds on `docs/KING_MAP.md` (written 17 Oct, from memory) and replaces its flow proposal where they disagree. This version comes from a chapter-by-chapter read of King's *C Programming: A Modern Approach* (2nd ed.) against every concept page.

**About the source.** Sam supplied the book text for reference. It lives only in a scratch folder in the working session, and nothing from it is committed. Every explanation in the app is written in our own words, with a section reference ("King §4.2") at the end so Sam can read King's version alongside. No King sentences, example programs or exercises are copied into the app.

---

## 1. What the read found

1. **Our order mostly matches King's.** The three places we depart on purpose (functions before arrays, strings before pointers, structs before pointers) all held up against the text. King's struct chapter barely uses pointers, and he only introduces `->` in his linked-list section, so structs-first is safe. The real ordering problems are *inside* phases.
2. **The biggest gap is King's chapter 4 (expressions).** Assignment as a value, side effects, compound assignment, `++`/`--`, precedence, and undefined vs implementation-defined behaviour have no page anywhere, yet every loop from Phase 2 on depends on them.
3. **Pages already rely on untaught things.**
   - The Phase 2 build uses `do…while`, `&&` and an empty loop body.
   - Phase 4.5 uses `||`, `?:` and `for (;;)` with `break`.
   - The Phase 5 and 6 starters use `static` and bit flags.
   - The Phase 1 starter has `//` comments that nothing explains.
4. **King's beginner Q&A sections are the best source for "questions left open".** Each concept below lists the ones worth answering.
5. **MSVC changes some of King's advice.** Under our `/W4 /WX` build, several things King calls legal or harmless fail to compile:
   - shadowing an outer name (C4456–C4459)
   - an uninitialised variable (C4700)
   - printf format mismatches (C4473/4474/4477)
   - `scanf`/`strcpy`/`fopen` (C4996)

   The pages must say so, or King's examples will confuse Sam.
6. **24 new rungs** (15 across Phases 1–6, plus 9 for the new Phase 00) and **about 34,000 new words** of "Learn it" text across 81 pages. That is too much for one release, so it ships in eight batches (section 4).

---

## 2. Decisions

D1–D8 from KING_MAP stand, with these changes from the real text:

| # | Decision | Change from KING_MAP |
|---|---|---|
| D1 | Split Phase 2 into **02 Values & Expressions** and **2.5 Decisions & Loops** | Confirmed. The split falls exactly at King's chapter 4/5 boundary. |
| D2 | Phase 1 gets a **Variables** concept | Confirmed. King introduces `%d` specifically to print a variable. Phase 1 also gets a short **Comments and layout** concept. |
| D3 | Phase 3.5 | **Changed: split it.** With the new concepts it would be 12 long pages. It becomes **3.5 Structs & Pointers** (7) and **3.75 Organising Code** (5). |
| D4 | MSVC "unsafe" warnings | Unchanged: `/D_CRT_SECURE_NO_WARNINGS` moves into build.bat in the same release that removes the source `#define`s; teach `snprintf` and `fgets`+`sscanf`. |
| D5, D6 | x64 builds, `/std:c17 /nologo` | Unchanged. Needs one test build on Sam's PC first (R1). |
| D7 | Phase 00 How Computers Work | Unchanged. |
| D8 | "Learn it" section on every concept page | Unchanged: between "Why you need it" and the walkthrough. 250–700 words, ending with a "King §x.y" line. |
| D9 (new) | Where `static` and `extern` are taught | `static` locals and globals in **Phase 3** (`static-global`); file-level `static` and `extern` in **3.75** (`headers`); 4.5 `lnk2005` only recaps. |
| D10 (new) | Nested loops | Taught in 2.5 `loops` (small grid example), although King saves them for his 2D-array section. Sam needs them for ASCII drawing before Phase 3. |

**Still Sam's call:** D3 (the 3.5 split) and the two optional concepts (`static-global` in Phase 3, `game-files` in Phase 6). The plan assumes yes to all three.

---

## 3. The new flow

**Key:** **NEW** = new rung, **→** = moved, **(+S/M/L)** = size of the Learn-it text to add (S ≤300 words, M 300–600, L 600+). Rung ids never change, so ticked concepts stay ticked. Section numbers are verified against the text.

### Phase 00 How Computers Work (NEW phase)
Bits and bytes · Binary and hex · Memory as numbered boxes · The CPU's loop · Registers and the stack · Source to machine code · The OS, processes and files · Input and output · Why C looks the way it does. (King has little on hardware; this phase uses general sources.) Details are in KING_MAP section 5.

### Phase 01 Hello World (8 rungs, 2 new)
1. `program` (+M) **King §2.1–2.2.**
   - Directive / function / statement as the three building blocks, and why directives take no `;` (`#include <stdio.h>;` is MSVC C4067).
   - What "calling" means, and the term "string literal".
   - printf never adds a newline.
   - `main` must be spelled exactly; C is case-sensitive.
   - `return 0` both ends the program and reports success.
   - C99 lets main end without `return`; C23 makes `()` mean no parameters.
2. `compile` (+S) **§2.1.**
   - Preprocess → compile → link, mapped onto what `cl` prints.
   - `cl /P` to see the pasted-in header.
   - The exe is named after the first `.c`, and `/Fe:` renames it.
   - Why we use the command line rather than the IDE.
3. **NEW `comments`** "Comments and layout" (M) **§2.3, §2.8.**
   - `//` and `/* */`, and that `/* */` doesn't nest.
   - The unclosed `/*` that silently swallows code (C1071).
   - Tokens: spaces are free between them but not inside one, and a string can't break across lines (C2001).
   - Indentation shows structure; Ctrl+/ toggles a comment in VS Code.
4. `escapes` (+M) **§3.1.**
   - The terms "format string" and "conversion specification", and why it's called a conversion.
   - Values fill the slots in order.
   - `\a` and `\b`, and that tab width is up to the terminal.
   - `\` is handled by the compiler, `%` by printf at run time.
   - MSVC turns King's "silent garbage" into C4473/C4474/C4477, and an unknown escape gives C4129.
5. **NEW `variables`** "Variables: storing a number" (M–L) **§2.4, §2.7.** int only:
   - declare, then assign, then initialise
   - `=` stores, it doesn't compare
   - `int a, b = 0;` sets only `b`
   - garbage before assignment (C4700 under `/WX`)
   - printing several values, and printing an expression
   - naming rules and keywords
6. `errors` (+S) **ch 1 Q&A, §2.3, §2.8.**
   - Error vs warning as King defines them, and why C leaves so much to you.
   - A table of the errors this phase actually produces: C2143, C2001, C2017, C4013→LNK2019, C1071, C4700, C2065.
7. `buildbat` (+S) **ch 1–2 Q&A on warning levels.**
   - Map King's "highest warning level" advice onto `/W4`, and explain why not `/Wall`.
   - `/std:c17` is how you "stick to the standard".
   - `%ERRORLEVEL%` is main's return value.
8. `git` (no King) Add `pull` and `log`, plus a three-line `.gitignore`.

**Goals re-key:** `goals` maps checkpoints to rung positions, so every insert renumbers it.

### Phase 02 Values & Expressions (6 rungs, 2 new)
1. `types` (+M) **§2.4–2.7, §7.1–7.3 (short).**
   - Fix the "only accepts that kind" line in `why`.
   - Declare before use (C2065); garbage locals (C4700).
   - One initialiser per name.
   - `#define` for magic numbers, with brackets around expressions; `#define HALF (1/2)` is 0.
   - char is a small number; `bool` gets one line here and its full story in 2.5.
2. `printf` (+M) **§3.1.**
   - Format string anatomy; printing expressions.
   - Width (`%5d`, `-` to left-align), precision (`%.2f`), and `%03d` for timers.
   - `%e` and `%g`; MSVC's format checks.
   - Length modifiers wait for `sizes`.
3. `scanf` (+L, may split) **§2.5, §3.2, §7.2.**
   - The input buffer: scanf skips whitespace, reads, then stops and leaves the rest.
   - Typing `23abc` reads 23 and leaves `abc` waiting; letters typed first store nothing and can cause an endless loop.
   - `"%d %d"` and `"%d/%d"`; never end a format with `\n`.
   - The return value, stated here and used in 2.5.
   - `%lf` for double; the `scanf_s` trap; Ctrl+Z ends input on Windows.
4. `math` → renamed **"Division, remainder and casts"** (+M) **§4.1, §7.4.**
   - Precedence and associativity, with a game formula.
   - `%` needs ints (`fmodf` for floats).
   - There is no power operator: `^` is XOR.
   - Dividing by zero (C2124, or a crash).
   - Negative division rules.
   - Implementation-defined vs undefined behaviour, defined once here for later pages.
   - Casting to dodge overflow.
5. **NEW `operators`** "Assignment, ++ and side effects" (L) **§4.2–4.5.**
   - `=` produces a value and chains.
   - Side effects; lvalues (C2106).
   - `+= -= *= /= %=`, and the silent `=+` typo.
   - Prefix vs postfix, and why they're the same on a line of their own.
   - Never read and change one variable in the same expression.
   - Statements that do nothing (C4552/C4555).
6. **NEW `sizes`** "How big a number can be" (L) **§7.1–7.2, §7.4–7.6, §23.2.**
   - signed and unsigned; short, long and long long
   - ranges and `<limits.h>`
   - signed overflow is undefined, unsigned wraps
   - suffixes and `%u %ld %lld %zu %x`
   - float (~6 digits) vs double (~15)
   - the promotion ladder and the signed/unsigned trap (C4018)
   - `sizeof` and `size_t`; `typedef` in one paragraph; a pointer to `<stdint.h>`
   - **Windows x64: `long` is 4 bytes**

### Phase 2.5 Decisions & Loops (6 rungs, 2 new; this is King's exact order)
1. **NEW `conditions`** "Comparisons, &&, || and !" (M–L) **§5.1, Booleans in §5.2.**
   - A comparison gives an int, 1 or 0, that can be stored.
   - Precedence; why `0 < x < 10` is wrong.
   - Inside and outside a range.
   - Short-circuit as a guard, and the side effect that never runs.
   - `&&` binds tighter than `||`.
   - `bool` and `<stdbool.h>`.
2. `if` (+M) **§5.2.**
   - Compound statements.
   - An else-if chain is nested ifs, so later tests can skip re-checking.
   - The dangling else.
   - The stray `if (x);` (C4390), moved here from King's §6.5.
   - `?:` for choosing a value.
   - `if (flag)` rather than `== true`.
3. `switch` → right after `if` (+S–M) **§5.3.**
   - A switch is a jump to a label, which is why it falls through.
   - What a case label may be; duplicates are errors.
   - Break on the last case; comment deliberate fall-through.
   - A misspelled `defualt:` compiles silently (C4102).
   - Braces when a case declares a variable.
4. `loops` (+M) **§6.1, §6.3, nested loops from §8.2 (D10).**
   - A trace table.
   - After the loop, the condition is false; the body may run zero times.
   - `for` written as its while equivalent.
   - Four counting patterns; three off-by-one errors.
   - An `i` declared in a for is gone after it.
   - A tiny nested-loop grid.
5. **NEW `loop-control`** "do, break, continue and the endless loop" (L) **§6.2, §6.4–6.5.**
   - `do…while` runs at least once.
   - `for (;;)` with `break`; break leaves only one level (switch inside a loop).
   - Flag, `return` or goto as ways out.
   - `continue`; the null statement.
   - `getchar` and flushing the rest of a line.
   - scanf's retry loop, now possible.
6. `rand` (+S) **§26.2 (first used in §8.2, seeded in §10.2).**
   - `RAND_MAX` is 32767 on MSVC.
   - No `srand` means seed 1, and a fixed seed is useful for debugging.
   - Count of values in a range is `hi - lo + 1`.
   - A random float in [0, 1) for drop chances.

**Migration:** `if`, `loops`, `switch` and `rand` move to the new phase id `phase2b`. Ticks are saved per phase (`ladState(pid)`), so a one-time copy moves those four ids from `phase2` to `phase2b` for existing users. Tasks and checkpoints (`data-id`s) that move need the same treatment.

### Phase 03 Functions, Arrays & Strings (13 rungs, 3 new)
1. `functions` (+M) **§9.1, §9.4–9.5.**
   - Argument vs parameter; one call as four steps.
   - Each parameter needs its own type.
   - `print_menu;` without brackets does nothing (C4551).
   - Every `return` exits; a missing return gives C4715.
   - No nested functions; functions can't return arrays.
   - `exit(EXIT_FAILURE)` and how `%ERRORLEVEL%` sees it.
2. `prototypes` (+S) **§9.2, §9.3.**
   - A prototype converts arguments and checks the count; prototype and definition must match.
   - The standard file order (from §10.5).
   - C23's `()` vs MSVC: keep writing `(void)`.
3. `scope` (+M) **§10.1, §10.3–10.4, §18.5.**
   - Scope vs lifetime; parameters are local copies.
   - Fresh on every call; garbage if uninitialised.
   - Scope starts at the declaration.
   - **A name hiding an outer one is a build failure here (C4456–C4459).**
4. **NEW `static-global`** "Static locals and globals" (M) **§10.1–10.2, §18.2.**
   - A `static` call counter.
   - Globals: what they are, and King's shared-counter bug in our own words.
   - Why our starters use them sparingly.
5. `define` (+M) **§2.6, §14.1–14.3.**
   - What the preprocessor outputs; `cl /P`.
   - Errors land on the line that *uses* the macro.
   - Only whole tokens are replaced; macros ignore scope.
   - String macros (`SAVE_FILE`); name every number except 0 and 1.
   - `enum { MAX = 5 }` as an alternative.
6. `arrays` (+M) **§8.1–8.3.**
   - Elements behave like variables (`&scores[i]`).
   - Initialiser rules and `= {0}`; garbage when uninitialised.
   - A char as an index; `const` lookup tables.
   - Silent corruption from a wrong bound; a `memcpy` note.
7. **NEW `array-args`** "Passing arrays to functions" (M) **§9.3.**
   - `int a[]` plus a count.
   - The function changes the caller's array.
   - **`sizeof` inside gives 2 on x64, with no warning.**
   - A length inside `[]` is ignored; `const` parameters.
   - Count vs capacity, as in the high-score table.
8. `strings` (+M) **§13.1–13.4, pointer-free parts.**
   - The `NAME_MAX + 1` convention.
   - The silent exact-length trap; `char s[] = "Sam"` is 4 bytes.
   - `%-10s` columns.
   - Text in quotes is read-only; a char grid needs no `\0`.
9. `fgets` (+M) **§13.3, §22.1, §22.5, §22.8.**
   - The three streams; check for NULL.
   - Detecting a line that was too long, and throwing away the rest.
   - `fgets` + `sscanf` for numbers.
   - Why not `fflush(stdin)`; `gets` is gone.
10. **NEW `string-copy`** "Copying and joining strings" (M) **§13.5, §22.8.**
    - Why `=` fails.
    - `strcpy` has no size check; `strncpy` can leave no terminator; `strncat`'s maths.
    - `snprintf` as the safe tool, and its return value showing truncation.
    - Avoid MSVC's `_snprintf`.
11. `strcmp` (+S) **§13.5, §23.5–23.6.**
    - Dictionary order by character code ("Zed" sorts before "apple").
    - Only the sign of the result means anything.
    - `strncmp` and `toupper`.
12. `grid` (+M) **§8.2, §9.3, §13.7 (first part).**
    - `m[i, j]` is a trap; `= {0}`.
    - Why a 2D parameter needs the column count.
    - Inserting a name by shifting rows down with `strcpy`, as in the high-score build.
    - Bounds checks on both indexes.
13. `files` (+L) **§22.1–22.3.**
    - The mode table; Windows paths.
    - Buffering, and losing writes on a crash.
    - Errors to `stderr`.
    - **`while (!feof(f))` is the classic bug**; loop on fscanf's count instead.
    - CR LF in text mode; every fopen needs an fclose.
    - Binary files and `fwrite` are a Q&A only.

### Phase 3.5 Structs & Pointers (7 rungs, 2 new)
1. `structs` (+M) **§16.1–16.2.**
   - `= {0}` and in-order initialisers; designated initialisers.
   - Field names belong to the struct.
   - The `struct Tag` form and `typedef struct Player {…} Player`.
   - A missing `;` after `}`.
   - Nested `Vec2 pos`.
   - `typedef` for plain types (`DWORD` preview).
2. **NEW `struct-arrays`** "Arrays of structs" (M) **§16.3.**
   - A fixed array plus a used count.
   - Search returns an index or -1; insert refuses when full.
   - `arr[i].field` and nested-brace initialisers.
   - A `const` table of enemy stats.
3. `struct-copy` (+M) **§16.1–16.2.**
   - Returning a struct.
   - An array inside a struct is copied too.
   - No `==` (C2088), because of padding.
   - The `Enemy e = enemies[i]; e.x += 1;` bug.
   - `FILE*` as a struct you only hold by pointer.
4. `pointers` (+M) **§11.1–11.3.**
   - Memory as numbered bytes; why pointers have a type.
   - An uninitialised pointer (C4700).
   - `q = p` vs `*q = *p`.
   - The `int* a, b;` trap.
   - `%p` on x64 prints 16 hex digits; fix the 32-bit example.
5. `by-pointer` (+L) **§11.4–11.5, §17.5.**
   - Write `(*p).health` first, then `->`.
   - MSVC C2231 tells you to use `->`.
   - Output parameters.
   - A missing `&` is caught (C4047).
   - `const Player*` for read-only access.
   - Never return `&local` (C4172).
6. **NEW `pointer-arrays`** "Pointers and arrays" (L) **§12.1–12.3.**
   - The three kinds of pointer arithmetic, scaled by type.
   - One past the end is legal to point at, not to read.
   - `a[i]` is `*(a+i)`; you can't assign to an array name.
   - Array parameters are pointers, which closes Phase 3's "why".
   - A pointer is not an array.
   - `sizeof(array)` vs `sizeof(pointer)`.
   - `const char *` for string literals.
7. `null` (+M) **§17.1, §17.4, §11.2.**
   - `Enemy* find_enemy(…)` returns NULL when nothing matches.
   - `if (p)` / `if (!p)`.
   - NULL is the only bad pointer you can test for (garbage, dangling and out-of-bounds pointers look valid).
   - NULL needs a header; NULL is not `'\0'`.
   - An access violation is the *good* outcome.

### Phase 3.75 Organising Code (5 rungs, 1 new)
1. `enum` (+M) **§16.5.**
   - Why not `#define`: no grouping, tedious, invisible to the debugger.
   - An enum can still hold 7.
   - `STATE_COUNT` and an enum as an array index with designated names.
   - A trailing comma is legal.
   - Enum constants can size arrays; a `const int` can't (C2057).
   - **Don't promise the unhandled-case warning:** C4062 is off by default even at `/W4`.
2. **NEW `func-pointers`** "Function pointers" (M) **§17.7.**
   - Functions have addresses; a name without `()` is a pointer to it.
   - Call through a pointer.
   - Store them in variables, arrays and struct fields.
   - A table of update functions indexed by game state.
   - A typedef for the shape (`WNDPROC` preview); `qsort` mentioned in one line.
3. `headers` (+M) **§15.1–15.3, §18.2, D9.**
   - "Paste the text" as the model behind every header behaviour.
   - `#ifndef` guards beside `#pragma once`.
   - File-private helpers are `static`.
   - Declaration vs definition, with `extern` in the header.
   - Never `#include` a `.c`; relative paths only.
4. `linker` (+S) **§15.4.**
   - Headers are for the compiler, not the linker.
   - A `static` function can't be seen from other files.
   - A missing library (preview of Phase 5); LNK2005 preview.
   - Changing a header means rebuilding every file that includes it; `/D`.
5. `debugger` (+S, no King)
   - Call Stack and Locals.
   - Reading a NULL crash.
   - Enum names show in Watch; `#define` values don't.
   - `0xCC` fill under `/RTC1`, if build.bat adds it.

### Phase 04 Git & Your Partner (no King; changes from KING_MAP section 3)
`clone-pull` · `gitignore` → 2nd · `commit-messages` · `branches` · `pull-requests` (+ what a merge is) · `merge-conflicts`.

### Phase 4.5 ASCII Runner (10 rungs, 1 new)
1. `kbhit-getch` (+S)
   - Why scanf waits for Enter.
   - conio is the Windows "OS-specific library" King mentions.
   - The int return value, for the same reason as getchar.
   - A break inside the drain loop only leaves that loop.
2. `sleep` (+M) **§14.3–14.4, §20.3.**
   - WIN32_LEAN_AND_MEAN is an empty macro that windows.h tests, which is why it comes before the include.
   - `/D` on the command line.
   - **A negative `DWORD` wait becomes huge, and `Sleep(-1)` waits forever.** This matters for Phase 5's frame limiter.
3. `redraw-r` (+S) **§22.2.**
   - The three buffering modes.
   - Standard C has no cursor control, so `\r` is the only portable trick.
   - Never `fflush(stdin)`.
4. `frame-buffer` (+S) **§23.6.**
   - memset counts bytes, not elements.
   - `memset(ints, 1, …)` doesn't fill with 1s.
   - memset never writes a `\0`.
5. `game-loop` (+S)
   - `#if 0` to switch off render while testing.
   - A comparison stored as a number.
6. `sentinel` (+S)
   - The break ends the search, not the frame loop.
   - `% N` for "every N frames".
7. `state-machine` (+S)
   - `default:` for values that should be impossible.
   - Enum values print as numbers.
8. `const-ptr` (+S) **§11.4, §18.3–18.4.**
   - Read declarations from the name outward.
   - `const` protects one access path, not the object.
   - `const` isn't "constant": it can't size an array or be a case label.
9. **NEW `ifdef`** "Preprocessor switches" (M) **§14.4, §15.2, §15.4.**
   - `#ifdef`, `#ifndef` and `#if 0`; guards in full; `/D`.
   - Sets up Phase 5's `UNICODE` A/W split and `_CRT_SECURE_NO_WARNINGS`.
10. `lnk2005` (+M) **§15, §18.2.**
    - Definition vs declaration vocabulary.
    - The `extern` fix.
    - **`static` in a header hides LNK2005 but gives every file its own copy.**
    - `#include "runner.c"`.

### Phase 05 Win32 Window (8 rungs, 1 new)
1. `winmain-hwnd` (+M once 3.5/3.75 exist) **§7.5, §19.3, §20.3, §14.3–14.4.**
   - Win32 type names are typedefs.
   - **A handle is a pointer to a struct you can't see inside** (King's incomplete types).
   - The name prefixes (h, lp, w/l).
   - `CALLBACK` is a macro.
   - `WindowProc` without `()` is its address.
   - `CreateWindowEx` is an A/W macro.
   - Globals and statics start at zero, locals don't.
2. `link-libs` → 2nd (+S) **§15.4.**
   - King's maths-library story as the parallel.
   - An import library vs a DLL.
   - A typo in a pragma gives MSVC C4068.
3. **NEW `bit-flags`** "Combining flags with | and &" (M) **§20.1.**
   - Shifts; set, clear and test bits.
   - `flags & X != 0` is wrong (precedence).
   - `&` vs `&&`.
   - WS_OVERLAPPEDWINDOW is six flags OR'd together, and `+` breaks on repeats.
4. `wndproc` (+M) **§17.7.**
   - WndProc is a callback, like qsort's compare function.
   - `WM_*` are `#define`s, so the debugger shows numbers.
   - Unpacking `lp` with a mask and shift; `GET_X_LPARAM`.
5. `message-loop` (+S) **§22.8.** Switch from wsprintf to `snprintf` and teach it here, at its first use.
6. `gdi-invalidate` (+M) **§14.3.**
   - `RGB` is a parameterised macro that packs bytes (BGR order).
   - Casting `COLOR_WINDOW + 1` to a handle.
   - y grows downward.
   - Braces after `case WM_PAINT:`.
7. `frame-time` (+M) **§16.4, §20.3, §7.2.**
   - `LARGE_INTEGER` is a union giving two views of the same bytes; little-endian order.
   - Subtract the tick counts as integers, then convert.
   - King's "meaningless" warning about reading a different union member is out of date.
8. `double-buffer` (+S) **§18.2.**
   - `HGDIOBJ` is `void *`.
   - Create the back buffer once, with a static local.

### Phase 06 Prototype (6 rungs, 1 new)
1. `update-render` (+S) **§19.1–19.2.** Cohesion: update is the only writer of game state.
2. `delta-time` (+S–M) **§7.2, §7.4.**
   - `1.0f / fps`.
   - Keep total time in double.
   - C4244/C4305 make the `f` suffix required under `/WX`.
   - A float printed with `%f` is promoted to double.
3. `next-state` (+S) **§16.5.**
   - Designated name table `[PLAYING] = "PLAYING"`.
   - Make it `static const char *const`.
4. `aabb` (+S)
   - Short-circuit.
   - `static inline` for tiny helpers.
5. `textout` (+S) **§22.8, §7.6, §14.4.**
   - `sizeof buf` works only on an array.
   - The global `score` should be `static`.
   - TextOut becomes TextOutA.
6. **NEW `game-files`** "Splitting the game into files" (M) **§15.3, §18.2, §18.6, §19.5.**
   - One .c and .h per module; name prefixes.
   - A plain `inline` in a header gives LNK2019, so use `static inline`.

### Phase 07 Directing Claude Code (no new rungs)
- Add a "Things Claude may show you" box: memmove vs memcpy (§23.6), malloc and free (§17.1, §17.4), function-pointer typedefs (§17.7, §18.4).
- Fix `own-architecture`: it uses `bool` without `<stdbool.h>`.

---

## 4. Release plan

Each release is one PR. validate.py has to pass, and each release is clicked through at 1300 and 390 px on the live site. Releases R2 onwards are shown to Sam before merge.

| Release | Scope | Size | Depends on |
|---|---|---|---|
| **R0 Quick fixes** | Errors found today that don't need the new flow: the `types` `why` wording; the 64-bit `%p` example in `pointers`; `bool` without `<stdbool.h>` in Phase 7; the stale "skip" list in Phase 2's overview; the Phase 1 starter folder name (`game-dev-exercises` vs `p01`); a static name table in the Phase 6 note; every "Pair with King" block rewritten with verified sections. | ~1 day | — |
| **R1 Plumbing** | (a) A `learn` field in the ladder schema, rendered as "Learn it" (open by default) and checked by validate.py. (b) A progress migration helper that moves rung ids between phase ids. (c) `goals` renumbering by rung id instead of position, so future inserts don't break it. (d) The toolchain test: Sam builds one file with `/std:c17 /nologo` under vcvars64 and reports any warnings; then build.bat changes (D4–D6). | ~1 day + Sam's test | — |
| **R2 Pilot: Phases 1, 2, 2.5** | 4 new rungs in Phase 2/2.5, 2 in Phase 1; Learn-it on all 20 rungs; the phase split and migration; new play specs for new rungs; glossary terms (side effect, lvalue, short-circuit, overflow, undefined behaviour). | ~10k words | R1 |
| **R3 Phase 3** | 3 new rungs, Learn-it on 13 rungs, the D4 build.bat change (remove source `#define`s). | ~5.8k words | R2 reviewed |
| **R4 Phases 3.5 + 3.75** | The split (new phase id `phase3c`), 3 new rungs, Learn-it on 12 rungs, migration. | ~5.9k words | R3 |
| **R5 Phases 4.5, 5, 6** | `ifdef`, `bit-flags`, `game-files`; Learn-it on 24 rungs; starter fixes (Phase 5 PeekMessage + snprintf, Phase 6 names). | ~6.4k words | R4 |
| **R6 Phase 00** | The new phase (9 rungs + play scenes). | ~5k words | R2 (can run alongside R3–R5) |
| **R7 Wrap-up** | Phase 4 Git additions, the Phase 7 box, `docs/pages/*.md`, HANDOFF, KING_MAP marked superseded. | small | all |

**How each phase gets written:**
1. A drafting agent writes each rung's Learn-it from this plan, in our own words, with King open only as a reference.
2. A separate checking agent, which hasn't seen the drafting, checks three things:
   - accuracy against C17 and MSVC behaviour
   - that every question listed in section 3 is answered
   - that no sentence tracks King's wording
3. A voice pass applies the roadmap's writing rules.
4. Click-through at both widths.
5. Sam reviews before merge.

---

## 5. Writing standard for "Learn it"

- **Order:** the idea in one sentence, then how it works step by step, then the mistakes beginners make, then MSVC notes, then "King §x.y" (and "King's version is in §x.y if you want a second explanation").
- **Own examples:** game-flavoured (score, lives, enemies, lanes), never King's programs.
- **Length:** S ≤300, M 300–600, L 600–900 words. Over 900 means split the rung.
- **MSVC warning numbers are verified** by compiling a tiny file on Sam's PC before they go in. The list to verify is in section 6.
- **Forward and back links** go by concept name, never by number (numbers change when rungs move).
- **Modern notes:** C17 is the target. Mention C23 only where Sam will see it in other people's code (`bool` keyword, `nullptr`, `()` meaning no parameters).

---

## 6. MSVC facts to verify with one test build (R1)

Compile one file per line under `/W4 /WX /std:c17` (x64) and record the code each produces:

- **Phase 1:** C4067 (`#include <x>;`), C4129 (unknown escape), C4473/C4474/C4477 (printf count and type), C1071 (unclosed comment), C2001 (newline in string)
- **Phase 2:** C4700 (uninitialised), C2065 (undeclared), C2106 (assign to non-lvalue), C4552/C4555 (no-effect statement), C2124 (constant `/0`), C4018 (signed/unsigned), C4244/C4305 (narrowing)
- **Phase 2.5:** C4390 (`if (x);`), C4102 (misspelled `default`), C4706 (`=` in a condition), C4127 (whether `while (1)` still warns)
- **Phase 3:** C4551 (function without `()`), C4715 (missing return), C4456–C4459 (shadowing)
- **Phase 3.5:** C2088 (struct `==`), C2231 (`.` on a pointer), C4047 (indirection levels), C4172 (returning `&local`)
- **Phase 3.75:** C2057 (const int array size), C2371 (redefinition), C4062 (confirm it is off at `/W4`)
- **Phase 5:** C4068 (unknown pragma)
- **Facts to confirm:** `long` = 4 bytes on x64, `char` signed by default, `RAND_MAX` 32767, `%p` format, MSVC C support for `static inline` and designated initialisers under `/std:c17`

---

## 7. Corrections to KING_MAP.md

KING_MAP stays as the record of the first pass. These are its errors, found against the text:

- **Phase 1:** compile → link is in King's main text (§2.1), not only the Q&A. "Reading errors: King none" and "build.bat: none" are both wrong; ch 1 and ch 2 Q&A cover error vs warning and warning levels.
- **Phase 2:**
  - §2.6 is `#define` only; `const` is §18.3.
  - `bool` is taught in §5.2 (§21.5 is just the header reference).
  - `%lf` is §7.2.
  - getchar is §7.3 and belongs in the loops half.
  - scanf's return value is §22.3.
  - `sizes` goes after `printf` and `operators`, not second.
  - In 2.5, `switch` goes right after `if`.
  - Nested loops are §8.2, not chapter 6.
  - `rand` is first used in §8.2 and seeded in §10.2, as well as §26.2.
- **Phase 3:**
  - §13.6 is pointer idioms, not `strncmp` (that's §23.6).
  - "Static initialised once" is §18.2; garbage locals is a sub-heading of §18.5.
  - The real string-initialiser trap is the exact-length array, not `{'a','b'}`.
  - Add C4456–C4459 to the MSVC list.
- **Phase 3.5:**
  - Pointer assignment (§11.3) and returning pointers (§11.5) are not skipped; both are taught.
  - NULL is §17.1 + §17.4 + §11.2 (§11.5 has nothing on NULL).
  - Headers substance is §15.2 plus §18.2.
  - `func-pointers` goes after `enum` and `pointer-arrays`.
  - **The "/W4 warns on unhandled enum cases" claim is wrong** (C4062 is off by default).
- **Phases 4.5–6:**
  - `sleep` should cite §14.4 and §20.3, not §26.3.
  - Several "No King chapter" notes are wrong (§22.2, §23.6, §14.3–14.4 apply).
  - `double-buffer` should cite §18.2, not §7.5.
  - `snprintf` should be taught at Phase 5 `message-loop`, not first in Phase 6.

---

## 8. Effort

| Phase | Rungs touched | New rungs | New words (approx.) |
|---|---|---|---|
| 01 | 7 | 2 | 2,800 |
| 02 + 2.5 | 12 | 4 | 7,800 |
| 03 | 13 | 3 | 5,800 |
| 3.5 + 3.75 | 12 | 3 | 5,900 |
| 4.5 | 10 | 1 | 2,300 |
| 05 | 8 | 1 | 2,700 |
| 06 | 6 | 1 | 1,400 |
| 07 | 4 | 0 | 400 |
| 00 | 9 | 9 | 5,000 |
| **Total** | **81** | **24** | **~34,000** |

Plus 24 new See It Run specs and scenes, about 15 new glossary terms, and two progress migrations (Phase 2 split, Phase 3.5 split).
