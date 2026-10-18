# MSVC check (v23)

One tiny C file per compiler warning or error the v23 pages mention, plus `facts.c`, which prints Windows/MSVC facts (type sizes, `RAND_MAX`, `%p` format, C17 features).

**Run once:** open the **x64 Developer Command Prompt**, `cd` into this folder, run `run.bat`. It writes `results.txt`. Each `.c` file starts with the code it is expected to produce (`expect: C4700`), or `none`.

Then `python tools/msvc-check/compare.py results.txt` (or send the file to Claude) to see which expectations held. Only verified codes go into the pages.
