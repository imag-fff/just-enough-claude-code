#!/usr/bin/env node
'use strict';

// Stop hook.
// When the agent finishes a turn, fold the edited-files state collected by
// track-edits.js into an append-only log at .claude/logs/sessions.log, then
// clear the state so the next turn starts fresh.
//
// The log answers "what did the agent touch, and when?" after the fact —
// useful when reviewing a long autonomous session or debugging a regression
// that appeared "out of nowhere".

const fs = require('node:fs');
const path = require('node:path');
const { EXIT_ALLOW, main, logsDir, safeSessionId } = require('./lib');
const { sessionFile } = require('./track-edits');

/**
 * @param {object|null} input - parsed Stop payload
 * @returns {{exitCode: number}}
 */
function run(input) {
  if (!input) {
    return { exitCode: EXIT_ALLOW };
  }
  const stateFile = sessionFile(input);
  let edited = [];
  try {
    edited = fs
      .readFileSync(stateFile, 'utf8')
      .split('\n')
      .filter(Boolean);
  } catch {
    // No state file means no edits this turn — nothing to log.
    return { exitCode: EXIT_ALLOW };
  }

  const unique = [...new Set(edited)];
  if (unique.length > 0) {
    const lines = [
      `[${new Date().toISOString()}] session ${safeSessionId(input)}: ${unique.length} file(s) edited`,
      ...unique.map((f) => `  - ${f}`),
      '',
    ];
    try {
      fs.appendFileSync(path.join(logsDir(input), 'sessions.log'), lines.join('\n'));
    } catch {
      // Logging is best-effort.
    }
  }

  try {
    fs.unlinkSync(stateFile);
  } catch {
    // Already gone is fine.
  }
  return { exitCode: EXIT_ALLOW };
}

if (require.main === module) {
  main(run);
}

module.exports = { run };
