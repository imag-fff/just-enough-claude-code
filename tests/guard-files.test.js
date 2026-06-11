'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { run } = require('../.claude/hooks/guard-files');

/** Build a minimal PreToolUse payload for an Edit/Write call. */
function editInput(filePath, toolName = 'Edit') {
  return {
    session_id: 'test-session',
    hook_event_name: 'PreToolUse',
    tool_name: toolName,
    tool_input: { file_path: filePath },
  };
}

test('blocks secret-bearing files', () => {
  for (const file of [
    '/repo/.env',
    '/repo/.env.production',
    '/repo/config/.env.local',
    '/repo/server.pem',
    '/repo/certs/tls.key',
    '/home/user/.ssh/id_rsa',
    '/repo/secrets/api-token.txt',
    '/home/user/.aws/credentials',
  ]) {
    const result = run(editInput(file));
    assert.equal(result.exitCode, 2, `should block: ${file}`);
    assert.match(result.stderr, /guard-files/);
  }
});

test('allows template env files and ordinary source files', () => {
  for (const file of [
    '/repo/.env.example',
    '/repo/.env.sample',
    '/repo/src/index.ts',
    '/repo/docs/environment.md',
    '/repo/src/secret_santa.py',
  ]) {
    assert.equal(run(editInput(file)).exitCode, 0, `should allow: ${file}`);
  }
});

test('applies to Write and NotebookEdit, ignores other tools', () => {
  assert.equal(run(editInput('/repo/.env', 'Write')).exitCode, 2);
  assert.equal(
    run({ tool_name: 'NotebookEdit', tool_input: { notebook_path: '/repo/secrets/nb.ipynb' } })
      .exitCode,
    2
  );
  assert.equal(run({ tool_name: 'Bash', tool_input: { command: 'cat .env' } }).exitCode, 0);
});

test('handles windows-style separators and malformed payloads', () => {
  assert.equal(run(editInput('C:\\repo\\.env')).exitCode, 2);
  assert.equal(run(null).exitCode, 0);
  assert.equal(run(editInput('')).exitCode, 0);
});
