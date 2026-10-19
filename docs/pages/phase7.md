# Phase 7 page map

## Current shape (v23)

Phase 07 Directing Claude Code Properly. File `content/12-phase7.html`, ladder `content/ladders/phase7.json`, phase id `phase7`. Comes after `phase6`.

Pages: Overview, 5 concepts, Practice.

Concepts (every one has a Learn it section with a King line; new in v23: none):

1. `prompt-signature` Name the function signature in your prompt. King: §9.1–9.2
2. `read-every-line` Read every line before you run it. Not in King
3. `ask-explain` Ask for explanations of code you don’t understand. King: §23.6
4. `push-back` Push back when code is overcomplicated. King: §17.1, §17.4, §17.7
5. `own-architecture` Design the structs and prototypes first. King: §19.1–19.2

Notes:
- R7: Learn-it on all five rungs; a "Things Claude may show you" block (memmove, malloc and free, function-pointer typedefs); `own-architecture` includes `<stdbool.h>`.
- No See It Run (`content/play/phase7.json` is `{}`): the concepts are prompts, not programs.

## v22 page map (record)

Written for v22. Concept numbers and phase names in this part are from before v23; use the list above for the current order.

| Original block | Decision |
|---|---|
| Rules: read every line | concept:read-every-line (task kept, "Practice this") |
| Rules: name function signature | concept:prompt-signature |
| Rules: ask Claude to explain | concept:ask-explain |
| Rules: push back / simplify | concept:push-back |
| Rules: architecture decisions | concept:own-architecture |
| Prompt template: implement this specific thing | concept:prompt-signature |
| Prompt template: explain before I use it | concept:ask-explain |
| Prompt template: I'm stuck on a bug | concept:read-every-line |
| Prompt template: is my approach right? | concept:own-architecture |
| Exercises 1 to 4 (prompt-to-code) | practice; intro trimmed |
| Anti-pattern callout | cut; moved to prompt-signature qa |

Words before → after: 1570 → 1428 (pagecheck count). Phase is mostly unique tasks and exercises, so little repeated text existed.

## Moved into ladder qa
- prompt-signature: "What happens to the parts I leave out of a prompt?" (anti-pattern callout)
- push-back: "How do I stop Claude rewriting my whole file?" (Exercise 3 lesson)
