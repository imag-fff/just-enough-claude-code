---
name: tdd
description: Test-driven development loop — write a failing test first, make it pass with minimal code, then refactor. Use when implementing a new feature or fixing a bug with a reproducible expected behavior.
---

# TDD workflow

Drive the implementation with tests, in strict red-green-refactor order.

## Loop

1. **Red** — Write ONE test that captures the next small slice of required
   behavior. Run it and confirm it fails for the expected reason (not a typo
   or import error). A test that passes immediately proves nothing — fix the
   test or pick a different slice.
2. **Green** — Write the minimum code that makes that test pass. Resist
   implementing ahead of the tests, even when the general solution is obvious.
3. **Refactor** — With the suite green, clean up duplication and naming in
   both the code and the tests. Run the suite again after refactoring.
4. Repeat until the feature's acceptance criteria are all covered by tests.

## Rules

- Follow the project's existing test conventions (runner, file layout,
  assertion style) — read an existing test file before writing the first one.
- Bug fix? The first test must reproduce the bug and fail on the current code.
- Keep each red-green cycle small: minutes, not hours. If a test stays red
  through several attempts, the slice is too big — back up and cut it smaller.
- Never weaken or delete an existing test to get to green; surface the
  conflict instead.

## When to stop

Report back when acceptance criteria are covered, with: the list of tests
added, the final suite result, and anything intentionally left untested.
