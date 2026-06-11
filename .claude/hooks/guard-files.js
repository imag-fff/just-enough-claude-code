#!/usr/bin/env node
'use strict';

// PreToolUse hook (matcher: Edit|Write).
// Blocks edits to files that should never be touched by an agent: secrets,
// private keys, and anything under a secrets/ directory.
//
// Pair this with a `permissions.deny` list for Read access in settings.json —
// this hook stops writes, the permission rule stops the contents from being
// pulled into context in the first place.

const { EXIT_ALLOW, EXIT_BLOCK, main } = require('./lib');

// Tested against the file path with forward slashes. Order matters: the
// first match wins, and ALLOW exceptions are checked before BLOCK rules.
const ALLOW_PATTERNS = [
  // Example/template env files are documentation, not secrets.
  /(^|\/)\.env\.(example|sample|template|test)$/,
];

const BLOCK_PATTERNS = [
  { pattern: /(^|\/)\.env(\.[^/]+)?$/, reason: 'dotenv files hold secrets' },
  { pattern: /\.(pem|key|p12|pfx)$/, reason: 'private key material' },
  { pattern: /(^|\/)id_(rsa|ed25519|ecdsa)(\.pub)?$/, reason: 'SSH key' },
  { pattern: /(^|\/)secrets?\//, reason: 'files under a secrets/ directory' },
  { pattern: /(^|\/)\.(aws|ssh|gnupg)\//, reason: 'credential store directory' },
];

/**
 * @param {object|null} input - parsed PreToolUse payload
 * @returns {{exitCode: number, stderr?: string}}
 */
function run(input) {
  if (!input || !['Edit', 'Write', 'NotebookEdit'].includes(input.tool_name)) {
    return { exitCode: EXIT_ALLOW };
  }
  const filePath = String(
    (input.tool_input && (input.tool_input.file_path || input.tool_input.notebook_path)) || ''
  ).replace(/\\/g, '/');
  if (!filePath) {
    return { exitCode: EXIT_ALLOW };
  }

  if (ALLOW_PATTERNS.some((p) => p.test(filePath))) {
    return { exitCode: EXIT_ALLOW };
  }
  for (const rule of BLOCK_PATTERNS) {
    if (rule.pattern.test(filePath)) {
      return {
        exitCode: EXIT_BLOCK,
        stderr:
          `Blocked by guard-files hook: ${rule.reason} (${filePath}).\n` +
          'Ask the user to edit this file themselves. If the path is a false positive, adjust .claude/hooks/guard-files.js.',
      };
    }
  }
  return { exitCode: EXIT_ALLOW };
}

if (require.main === module) {
  main(run);
}

module.exports = { run, ALLOW_PATTERNS, BLOCK_PATTERNS };
