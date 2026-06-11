'use strict';

// Shared utilities for all hooks in this harness.
//
// Design contract: every hook module exports a pure `run(input)` function that
// takes the parsed hook payload and returns `{ exitCode, stderr?, stdout? }`.
// This file owns all process I/O (stdin parsing, exit codes), so the `run`
// functions stay side-effect-light and unit-testable without spawning a
// process. The pattern is borrowed from everything-claude-code (ECC).

const fs = require('node:fs');
const path = require('node:path');

// Hook payloads are tiny; the cap only guards against a malformed producer.
const MAX_STDIN_BYTES = 1024 * 1024;

// Exit code semantics defined by Claude Code:
//   0 — allow / success (stdout is shown in transcript mode only)
//   2 — block the tool call; stderr is fed back to the model as the reason
const EXIT_ALLOW = 0;
const EXIT_BLOCK = 2;

/**
 * Read the entire hook payload from stdin and parse it as JSON.
 * Claude Code sends exactly one JSON object per hook invocation.
 * Returns null on empty or malformed input — hooks must treat null as
 * "nothing to do" and allow, never crash the session.
 */
function readStdinJson() {
  let raw;
  try {
    raw = fs.readFileSync(0, 'utf8').slice(0, MAX_STDIN_BYTES);
  } catch {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Resolve the project root for state and log files.
 * CLAUDE_PROJECT_DIR is set by Claude Code when invoking hooks; `input.cwd`
 * is the session working directory and serves as a fallback for tests.
 */
function projectDir(input) {
  return process.env.CLAUDE_PROJECT_DIR || (input && input.cwd) || process.cwd();
}

/**
 * Directory for ephemeral per-session state (e.g. the list of edited files).
 * Lives under .claude/.session/ and is git-ignored via .claude/.gitignore.
 */
function stateDir(input) {
  const dir = path.join(projectDir(input), '.claude', '.session');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Directory for persistent, append-only logs (e.g. session summaries).
 * Also git-ignored.
 */
function logsDir(input) {
  const dir = path.join(projectDir(input), '.claude', 'logs');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Session IDs come from an external process; restrict them to a safe charset
 * before using them in file names.
 */
function safeSessionId(input) {
  const id = (input && input.session_id) || 'unknown';
  return String(id).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 64) || 'unknown';
}

/**
 * Process entry point shared by every hook script: parse stdin, delegate to
 * the hook's pure `run` function, and translate the result into process I/O.
 *
 * A hook must never take the session down with it: any uncaught error is
 * swallowed and treated as "allow", because a broken guard is better than a
 * broken session.
 */
function main(run) {
  let result;
  try {
    result = run(readStdinJson()) || {};
  } catch {
    result = { exitCode: EXIT_ALLOW };
  }
  if (result.stderr) {
    process.stderr.write(`${result.stderr}\n`);
  }
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  process.exitCode = Number.isInteger(result.exitCode) ? result.exitCode : EXIT_ALLOW;
}

module.exports = {
  EXIT_ALLOW,
  EXIT_BLOCK,
  readStdinJson,
  projectDir,
  stateDir,
  logsDir,
  safeSessionId,
  main,
};
