#!/usr/bin/env node
'use strict';

// Merge this harness's settings.json into a target project's existing
// .claude/settings.json without clobbering anything the user already has.
//
// Merge policy (conservative on purpose):
//   - hooks:           append our matcher groups per event, but skip any
//                      group whose commands are all already registered.
//   - permissions.deny: set-union.
//   - everything else: target wins; keys only we have are added.
//
// Usage: node merge-settings.js <target-settings.json> <source-settings.json>

const fs = require('node:fs');

/** Commands registered in a list of matcher groups, used as identity for dedup. */
function commandsOf(groups) {
  const set = new Set();
  for (const group of groups || []) {
    for (const hook of group.hooks || []) {
      if (hook.command) set.add(hook.command);
    }
  }
  return set;
}

/**
 * Pure merge of two parsed settings objects. Returns a new object; neither
 * argument is mutated.
 */
function merge(target, source) {
  const result = JSON.parse(JSON.stringify(target || {}));

  // Top-level keys: only fill the ones the target does not define.
  for (const key of Object.keys(source || {})) {
    if (key === 'hooks' || key === 'permissions') continue;
    if (!(key in result)) result[key] = source[key];
  }

  // permissions.deny — union; allow/ask lists are left strictly alone.
  if (source.permissions && source.permissions.deny) {
    result.permissions = result.permissions || {};
    const existing = result.permissions.deny || [];
    result.permissions.deny = [...new Set([...existing, ...source.permissions.deny])];
  }

  // hooks — append matcher groups whose commands are not yet registered.
  if (source.hooks) {
    result.hooks = result.hooks || {};
    for (const [event, sourceGroups] of Object.entries(source.hooks)) {
      const targetGroups = result.hooks[event] || [];
      const known = commandsOf(targetGroups);
      for (const group of sourceGroups) {
        const cmds = [...commandsOf([group])];
        if (cmds.length > 0 && cmds.every((c) => known.has(c))) continue;
        targetGroups.push(group);
      }
      result.hooks[event] = targetGroups;
    }
  }

  return result;
}

function mainCli(argv) {
  const [targetPath, sourcePath] = argv;
  if (!targetPath || !sourcePath) {
    process.stderr.write('Usage: merge-settings.js <target-settings.json> <source-settings.json>\n');
    return 1;
  }
  const target = JSON.parse(fs.readFileSync(targetPath, 'utf8'));
  const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  fs.writeFileSync(targetPath, `${JSON.stringify(merge(target, source), null, 2)}\n`);
  return 0;
}

if (require.main === module) {
  process.exitCode = mainCli(process.argv.slice(2));
}

module.exports = { merge };
