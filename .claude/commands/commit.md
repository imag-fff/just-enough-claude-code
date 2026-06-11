---
description: Review staged/unstaged changes, group them logically, and create a well-formed commit. Never pushes.
argument-hint: "[optional scope or message hint]"
---

Create a commit from the current working tree changes.

1. Run `git status` and `git diff` to see everything that changed.
2. If the changes contain more than one unrelated concern, say so and propose
   splitting into multiple commits — then do the first one only, and list the rest.
3. Stage the relevant files explicitly (`git add <paths>`); never `git add -A`
   blindly — check for stray files (logs, editor artifacts, secrets) first.
4. Write the commit message:
   - Conventional Commits format: `type(scope): summary` (feat, fix, refactor,
     docs, test, chore).
   - Summary line ≤ 72 chars, imperative mood.
   - Body only when the "why" is not obvious from the diff.
   - Incorporate the user's hint if provided: $ARGUMENTS
5. Commit, then show `git log -1 --stat` as confirmation.

Do NOT push. Do NOT amend or rebase existing commits unless explicitly asked.
