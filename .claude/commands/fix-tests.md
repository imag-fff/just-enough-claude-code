---
description: Run the project's test suite and fix failures one by one until green.
argument-hint: "[optional: test file or pattern to scope the run]"
---

Get the test suite back to green.

1. Find the canonical test command (package.json scripts, Makefile, CI config,
   CLAUDE.md). Scope it to `$ARGUMENTS` if provided.
2. Run it and collect ALL failures before fixing anything.
3. For each failure, decide first: is the test wrong, or is the code wrong?
   Read the test's intent before touching either side.
4. Fix one failure at a time; re-run the affected test after each fix.
5. Finish with a full run and report: what failed, what the root cause was,
   and what you changed.

Hard rules:
- Never delete, skip, or weaken a test to make it pass. If a test seems
  genuinely obsolete, report it and let me decide.
- If a fix requires changing behavior that other code depends on, stop and
  explain the trade-off instead of choosing silently.
