'use strict';

// Integration test for the track-edits → session-summary pipeline, run
// against a temporary project directory.

const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const trackEdits = require('../.claude/hooks/track-edits');
const sessionSummary = require('../.claude/hooks/session-summary');

let projectRoot;

beforeEach(() => {
  projectRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'jecc-test-'));
  process.env.CLAUDE_PROJECT_DIR = projectRoot;
});

afterEach(() => {
  delete process.env.CLAUDE_PROJECT_DIR;
  fs.rmSync(projectRoot, { recursive: true, force: true });
});

function editPayload(filePath) {
  return {
    session_id: 'abc-123',
    hook_event_name: 'PostToolUse',
    tool_name: 'Edit',
    tool_input: { file_path: filePath },
  };
}

test('track-edits accumulates paths, session-summary logs and cleans up', () => {
  assert.equal(trackEdits.run(editPayload('/p/src/a.ts')).exitCode, 0);
  assert.equal(trackEdits.run(editPayload('/p/src/b.ts')).exitCode, 0);
  assert.equal(trackEdits.run(editPayload('/p/src/a.ts')).exitCode, 0); // duplicate

  const stateFile = path.join(projectRoot, '.claude', '.session', 'edited-files-abc-123.txt');
  assert.ok(fs.existsSync(stateFile), 'state file should exist after edits');

  const result = sessionSummary.run({ session_id: 'abc-123', hook_event_name: 'Stop' });
  assert.equal(result.exitCode, 0);

  const log = fs.readFileSync(path.join(projectRoot, '.claude', 'logs', 'sessions.log'), 'utf8');
  assert.match(log, /session abc-123: 2 file\(s\) edited/, 'duplicates should be folded');
  assert.match(log, /- \/p\/src\/a\.ts/);
  assert.match(log, /- \/p\/src\/b\.ts/);
  assert.ok(!fs.existsSync(stateFile), 'state file should be removed after summary');
});

test('session-summary is a no-op when nothing was edited', () => {
  const result = sessionSummary.run({ session_id: 'abc-123', hook_event_name: 'Stop' });
  assert.equal(result.exitCode, 0);
  assert.ok(!fs.existsSync(path.join(projectRoot, '.claude', 'logs', 'sessions.log')));
});

test('track-edits ignores tools that do not write files', () => {
  assert.equal(
    trackEdits.run({ session_id: 's', tool_name: 'Bash', tool_input: { command: 'ls' } }).exitCode,
    0
  );
  assert.ok(!fs.existsSync(path.join(projectRoot, '.claude', '.session', 'edited-files-s.txt')));
});

test('hostile session ids cannot escape the state directory', () => {
  const payload = editPayload('/p/x.ts');
  payload.session_id = '../../etc/passwd';
  assert.equal(trackEdits.run(payload).exitCode, 0);
  const files = fs.readdirSync(path.join(projectRoot, '.claude', '.session'));
  assert.equal(files.length, 1);
  assert.match(files[0], /^edited-files-[a-zA-Z0-9_-]+\.txt$/);
});
