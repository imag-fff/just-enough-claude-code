#!/usr/bin/env node
'use strict';

// PostToolUse hook (matcher: Edit|Write).
// Appends every edited file path to a per-session state file. The companion
// Stop hook (session-summary.js) turns that state into a session log entry.
//
// Observability hooks like this one must be invisible when healthy and
// harmless when broken: every failure path here resolves to "allow".

const fs = require('node:fs');
const path = require('node:path');
const { EXIT_ALLOW, main, stateDir, safeSessionId } = require('./lib');

/** State file holding one edited path per line for a given session. */
function sessionFile(input) {
  return path.join(stateDir(input), `edited-files-${safeSessionId(input)}.txt`);
}

/**
 * @param {object|null} input - parsed PostToolUse payload
 * @returns {{exitCode: number}}
 */
function run(input) {
  if (!input || !['Edit', 'Write', 'NotebookEdit'].includes(input.tool_name)) {
    return { exitCode: EXIT_ALLOW };
  }
  const filePath =
    (input.tool_input && (input.tool_input.file_path || input.tool_input.notebook_path)) || '';
  if (!filePath) {
    return { exitCode: EXIT_ALLOW };
  }
  try {
    fs.appendFileSync(sessionFile(input), `${filePath}\n`);
  } catch {
    // Never let bookkeeping break the session.
  }
  return { exitCode: EXIT_ALLOW };
}

if (require.main === module) {
  main(run);
}

module.exports = { run, sessionFile };
