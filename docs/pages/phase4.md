# Phase 4 page map

## Current shape (v23)

Phase 04 Git & Working With Your Partner. File `content/08-phase4.html`, ladder `content/ladders/phase4.json`, phase id `phase4`. Comes after `phase3c`, before `phase4b`.

Pages: Overview, 6 concepts, Practice, Review.

Concepts (every one has a Learn it section with a King line; new in v23: none (`gitignore` moved to 2nd)):

1. `clone-pull` Clone and pull. Not in King (Pro Git)
2. `gitignore` .gitignore. Not in King (Pro Git)
3. `commit-messages` Writing good commit messages. Not in King (Pro Git)
4. `branches` Branches. Not in King (Pro Git)
5. `pull-requests` Pull requests. Not in King (Pro Git)
6. `merge-conflicts` Merge conflicts. Not in King (Pro Git)

Notes:
- R7: Learn-it written for all six rungs from Pro Git, since King has no Git; `pull-requests` now explains what a merge is.
- No Overview, Trace or Build blocks: the Overview page is generated from the ladder.

## v22 page map (record)

Written for v22. Concept numbers and phase names in this part are from before v23; use the list above for the current order.

Words: 570 -> ~270.

| Original block | Decision |
|---|---|
| Tasks: p4-shared-repo | concept:clone-pull (own "Practice this" block) |
| Tasks: p4-branching-strategy | concept:pull-requests (it says "merge via pull request") |
| Tasks: p4-merge-conflict | concept:merge-conflicts |
| Tasks: p4-gitignore | concept:gitignore |
| Tasks: p4-git-core-ops | practice, badge "Tasks" (spans commit, push, pull, branch, merge) |
| Starter Code (.gitignore list) | concept:gitignore (the rung's qa points to it; fits the 2-block limit) |
| Stuck & Curious | help; kept only "committed something I shouldn't have" |
| Stuck: merge conflict, commit message items | cut, duplicate rungs 5 and 2 |
| Curious items | moved to ladder qa (below) |
| Checkpoint | review |

## Moved into ladder qa
- commit-messages: "Why does Git make me git add before I commit?"
- commit-messages: "What actually is a commit?"
- gitignore: "Why keep .exe, .obj and .pdb out of the repo?"

Starter list now keeps `.vscode/launch.json` (`.vscode/*` plus `!.vscode/launch.json`). Em dashes removed from prose.
