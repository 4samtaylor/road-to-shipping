# Phase 00 How Computers Work (phase0)

New in v23, so there is no v22 page map: the page was written straight into the v23 model (Overview, concept pages, then Trace, Build, Practice, Review).

## Current shape (v23)

Phase 00 How Computers Work. File `content/01b-phase0.html`, ladder `content/ladders/phase0.json`, phase id `phase0`. First phase, before `phase1`.

Pages: Overview, 9 concepts, Trace, Build, Practice, Review.

Concepts (every one has a Learn it section with a King line; new in v23: all nine (new phase, R6)):

1. `bits` Bits and bytes. King: §7.1
2. `binary-hex` Binary and hex. King: §7.1, §20.1
3. `memory` Memory as numbered boxes. King: §11.1
4. `cpu` The CPU's loop. Not in King (Microsoft Learn)
5. `stack` Registers and the stack. King: §10.1
6. `toolchain` Source to machine code. King: §2.1, §14.1, §15.4
7. `os` The OS, processes and files. Not in King (Microsoft Learn)
8. `io` Input and output. King: §22.1, §7.3
9. `why-c` Why C looks the way it does. King: §1.1, §1.2

Notes:
- New in v23 (R6). Sits in its own "Foundations" rail group, before Phase 01; Environment Setup now shows `>_` instead of 00.
- King has little on hardware, so several Learn-it sections point at Microsoft Learn instead of a King section.
- Each concept has a small "Practice this" task (`p0-*`); Build has two Windows tools, Practice a Claude explain task, Trace two drills, Review a three-question quiz and three checkpoints (`cp-p0-1..3`).
- See It Run: `content/play/phase0.json` and `js/play/scenes-phase0.js` were being added in R6; check they landed before relying on them.
