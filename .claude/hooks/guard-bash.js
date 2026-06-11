#!/usr/bin/env node
'use strict';

// PreToolUse hook (matcher: Bash).
// Blocks a short, curated list of catastrophic shell commands before they run.
//
// This is a seatbelt, not a sandbox: it catches the obvious disasters an
// agent might produce under a bad prompt, while everything else stays
// governed by Claude Code's own permission system. Keeping the list short is
// deliberate — every rule here must be something that is (a) clearly
// destructive and (b) almost never what the user wants.

const { EXIT_ALLOW, EXIT_BLOCK, main } = require('./lib');

// Each rule: a regex tested against the full command string, plus a reason
// that is fed back to the model so it can explain itself or change course.
const RULES = [
  {
    pattern: /\brm\s+(?:-[a-zA-Z]*\s+)*-[a-zA-Z]*[rR][a-zA-Z]*\s+(?:-[a-zA-Z]*\s+)*["']?(?:\/|~)["']?(?:\s|$|\*)/,
    reason: 'Recursive delete targeting the filesystem root or the home directory.',
  },
  {
    pattern: /\bgit\s+push\b(?=[^\n;|&]*\s(?:--force|-f)(?![\w-]))(?=[^\n;|&]*\b(?:main|master)\b)/,
    reason:
      'Force-push to main/master. Use --force-with-lease on a feature branch, or ask the user first.',
  },
  {
    pattern: /\bcurl\b[^|;\n]*\|\s*(?:sudo\s+)?(?:ba|z|da)?sh\b/,
    reason: 'Piping a remote script from curl straight into a shell.',
  },
  {
    pattern: /\bchmod\s+(?:-[a-zA-Z]+\s+)*777\b/,
    reason: 'chmod 777 makes files world-writable; use a narrower mode.',
  },
  {
    pattern: /\bgit\s+checkout\s+\.\s*$|\bgit\s+restore\s+\.\s*$/,
    reason:
      'This discards ALL uncommitted changes in the working tree. Restore specific paths instead.',
  },
];

/**
 * @param {object|null} input - parsed PreToolUse payload
 * @returns {{exitCode: number, stderr?: string}}
 */
function run(input) {
  if (!input || input.tool_name !== 'Bash') {
    return { exitCode: EXIT_ALLOW };
  }
  const command = String((input.tool_input && input.tool_input.command) || '');

  for (const rule of RULES) {
    if (rule.pattern.test(command)) {
      return {
        exitCode: EXIT_BLOCK,
        stderr:
          `Blocked by guard-bash hook: ${rule.reason}\n` +
          `Command: ${command}\n` +
          'If this is genuinely intended, ask the user to run it themselves or to adjust .claude/hooks/guard-bash.js.',
      };
    }
  }
  return { exitCode: EXIT_ALLOW };
}

if (require.main === module) {
  main(run);
}

module.exports = { run, RULES };
