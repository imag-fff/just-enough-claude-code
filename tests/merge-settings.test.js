'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { merge } = require('../scripts/merge-settings');
const harnessSettings = require('../.claude/settings.json');

test('merging into empty settings yields the harness settings', () => {
  const result = merge({}, harnessSettings);
  assert.deepEqual(result.hooks, harnessSettings.hooks);
  assert.deepEqual(result.permissions.deny, harnessSettings.permissions.deny);
});

test('merge is idempotent — running twice adds nothing', () => {
  const once = merge({}, harnessSettings);
  const twice = merge(once, harnessSettings);
  assert.deepEqual(twice, once);
});

test('user hooks and settings are preserved', () => {
  const userSettings = {
    model: 'opus',
    permissions: { allow: ['Bash(npm test)'], deny: ['Read(./private/**)'] },
    hooks: {
      PreToolUse: [
        {
          matcher: 'Bash',
          hooks: [{ type: 'command', command: 'my-custom-hook.sh' }],
        },
      ],
    },
  };
  const result = merge(userSettings, harnessSettings);

  // User-defined values survive untouched.
  assert.equal(result.model, 'opus');
  assert.deepEqual(result.permissions.allow, ['Bash(npm test)']);
  assert.ok(result.permissions.deny.includes('Read(./private/**)'));
  assert.equal(result.hooks.PreToolUse[0].hooks[0].command, 'my-custom-hook.sh');

  // Harness values are appended.
  assert.ok(result.permissions.deny.includes('Read(./.env)'));
  const commands = result.hooks.PreToolUse.flatMap((g) => g.hooks.map((h) => h.command));
  assert.ok(commands.some((c) => c.includes('guard-bash.js')));
  assert.ok(result.hooks.Stop, 'Stop hooks should be added');
});

test('merge does not mutate its inputs', () => {
  const target = { hooks: { PreToolUse: [] } };
  const snapshot = JSON.stringify(target);
  merge(target, harnessSettings);
  assert.equal(JSON.stringify(target), snapshot);
});
