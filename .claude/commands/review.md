---
description: Run a focused code review of the current diff using the code-reviewer agent.
argument-hint: "[optional: base branch or commit range, e.g. main...HEAD]"
---

Review the current changes for real problems.

1. Determine the diff scope: use `$ARGUMENTS` as the range if given, otherwise
   the working tree diff against HEAD (plus staged changes).
2. Launch the `code-reviewer` agent on that scope.
3. Relay its findings to me grouped by severity (must-fix / should-fix /
   note), each with file:line and a concrete fix.
4. Do not apply any fixes yet — wait for me to choose which findings to act on.

If the diff is empty, say so and stop.
