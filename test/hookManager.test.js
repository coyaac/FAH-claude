// test/hookManager.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { installHook, uninstallHook, isEnabled, buildCommand, MARKER } = require('../hookManager');

function decodeScript(command) {
  const match = command.match(/-EncodedCommand (\S+)/);
  assert.ok(match, 'command should contain -EncodedCommand');
  return Buffer.from(match[1], 'base64').toString('utf16le');
}

test('installHook creates a Stop hook on empty settings', () => {
  const result = installHook({}, 'C:/sounds/done.mp3');
  assert.equal(result.hooks.Stop.length, 1);
  assert.equal(result.hooks.Stop[0].hooks.length, 1);
  assert.equal(result.hooks.Stop[0].hooks[0].type, 'command');
  assert.ok(result.hooks.Stop[0].hooks[0].command.includes(MARKER));
  assert.ok(decodeScript(result.hooks.Stop[0].hooks[0].command).includes('done.mp3'));
});

test('installHook preserves an unrelated existing Stop hook', () => {
  const before = {
    hooks: {
      Stop: [
        { hooks: [{ type: 'command', command: 'echo unrelated' }] }
      ]
    }
  };
  const result = installHook(before, 'C:/sounds/done.mp3');
  assert.equal(result.hooks.Stop.length, 2);
  assert.equal(result.hooks.Stop[0].hooks[0].command, 'echo unrelated');
});

test('installHook run twice replaces instead of duplicating', () => {
  const once = installHook({}, 'C:/sounds/a.mp3');
  const twice = installHook(once, 'C:/sounds/b.mp3');
  assert.equal(twice.hooks.Stop.length, 1);
  assert.equal(twice.hooks.Stop[0].hooks.length, 1);
  const decoded = decodeScript(twice.hooks.Stop[0].hooks[0].command);
  assert.ok(decoded.includes('b.mp3'));
  assert.ok(!decoded.includes('a.mp3'));
});

test('isEnabled reflects presence of the managed hook', () => {
  assert.equal(isEnabled({}), false);
  const installed = installHook({}, 'C:/sounds/done.mp3');
  assert.equal(isEnabled(installed), true);
});

test('uninstallHook removes only the managed entry, round-trips unrelated hooks', () => {
  const before = {
    hooks: {
      Stop: [
        { hooks: [{ type: 'command', command: 'echo unrelated' }] }
      ]
    }
  };
  const installed = installHook(before, 'C:/sounds/done.mp3');
  const uninstalled = uninstallHook(installed);
  assert.deepEqual(uninstalled, before);
});

test('buildCommand escapes single quotes in the audio path', () => {
  const command = buildCommand("C:/it's/done.mp3");
  assert.ok(command.includes('-EncodedCommand'));
  assert.ok(decodeScript(command).includes("it''s"));
});

test('a user command that only mentions the marker is not managed', () => {
  const before = { hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo claude-sound-hook is neat' }] }] } };
  assert.equal(isEnabled(before), false);
  assert.deepEqual(uninstallHook(before), before);
});
