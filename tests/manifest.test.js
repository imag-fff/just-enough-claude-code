'use strict';

// Consistency checks between settings.json and the files actually shipped.
// Catches the classic failure mode of config-driven systems: a registration
// pointing at a script that was renamed or deleted.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const settings = require('../.claude/settings.json');

/** Collect every hook command string registered in settings.json. */
function allCommands() {
  return Object.values(settings.hooks).flatMap((groups) =>
    groups.flatMap((g) => g.hooks.map((h) => h.command))
  );
}

test('every registered hook script exists', () => {
  for (const command of allCommands()) {
    const match = command.match(/\$CLAUDE_PROJECT_DIR\/(\S+\.js)/);
    assert.ok(match, `hook command should reference a project-local script: ${command}`);
    const scriptPath = path.join(ROOT, match[1].replace(/"/g, ''));
    assert.ok(fs.existsSync(scriptPath), `missing hook script: ${scriptPath}`);
  }
});

test('every hook script is registered in settings.json', () => {
  const registered = allCommands().join('\n');
  const hookFiles = fs
    .readdirSync(path.join(ROOT, '.claude', 'hooks'))
    .filter((f) => f.endsWith('.js') && f !== 'lib.js');
  for (const file of hookFiles) {
    assert.ok(registered.includes(file), `unregistered hook script: ${file}`);
  }
});

test('every hook script exports a run() function and parses cleanly', () => {
  const hookDir = path.join(ROOT, '.claude', 'hooks');
  for (const file of fs.readdirSync(hookDir).filter((f) => f.endsWith('.js') && f !== 'lib.js')) {
    const mod = require(path.join(hookDir, file));
    assert.equal(typeof mod.run, 'function', `${file} must export run()`);
    // Every hook must tolerate a null payload without throwing.
    assert.equal(mod.run(null).exitCode, 0, `${file} must allow on null input`);
  }
});

test('agents, commands, and skills have well-formed frontmatter', () => {
  const checks = [
    { dir: path.join(ROOT, '.claude', 'agents'), required: ['name:', 'description:'] },
    { dir: path.join(ROOT, '.claude', 'commands'), required: ['description:'] },
  ];
  for (const { dir, required } of checks) {
    for (const file of fs.readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const text = fs.readFileSync(path.join(dir, file), 'utf8');
      assert.ok(text.startsWith('---\n'), `${file} must start with frontmatter`);
      for (const field of required) {
        assert.ok(text.includes(field), `${file} missing frontmatter field ${field}`);
      }
    }
  }
  const skillText = fs.readFileSync(path.join(ROOT, '.claude', 'skills', 'tdd', 'SKILL.md'), 'utf8');
  assert.ok(skillText.startsWith('---\n'));
  assert.ok(skillText.includes('name: tdd'));
});
