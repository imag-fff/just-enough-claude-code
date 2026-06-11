# CLAUDE.md

This repo IS a Claude Code harness — the `.claude/` directory here is both the
shipped product and this repo's own live configuration (we dogfood it).

## Commands

- Test (all): `npm test`
- Test (one file): `node --test tests/guard-bash.test.js`
- Lint installer: `shellcheck install.sh`
- Smoke-test installer: `./install.sh "$(mktemp -d)"`

## Layout

- `.claude/hooks/` — hook scripts. Contract: export `run(input) → {exitCode, stderr?, stdout?}`, call `lib.main(run)` under `require.main === module`. Process I/O lives ONLY in `lib.js`.
- `.claude/settings.json` — hook registration. Must stay in sync with the files in `hooks/`; `tests/manifest.test.js` enforces both directions.
- `tests/` — `node --test`, zero dependencies. Every behavior change needs a test.
- `docs/design.md` + `docs/design.ja.md` — design rationale, kept in sync.

## Conventions

- Code comments: English only.
- User-facing docs: English (`*.md`) and Japanese (`*.ja.md`) — when you change one, change the other in the same commit.
- No npm dependencies, runtime or dev. Node ≥ 18 stdlib only.
- Hooks must fail open: every error path returns `{exitCode: 0}`. Never let a hook crash a session.
- Keep it small: a new component must justify itself against the "readable in 30 minutes" budget (see docs/design.md).

## Warnings

- Editing `.claude/settings.json` or hooks affects YOUR current session in this repo too — the harness is live here.
- `install.sh` must stay bash 3.2 compatible (macOS default bash) and shellcheck-clean.
