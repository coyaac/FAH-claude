# Claude Sound Extension Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a VS Code / Antigravity extension that plays a bundled audio file whenever Claude Code finishes responding, by managing a Claude Code `Stop` hook — no terminal parsing, no background process.

**Architecture:** The extension has no runtime presence beyond three commands. `Enable` merges a marked entry into `~/.claude/settings.json`'s `hooks.Stop`; `Disable` removes it; `Choose Sound File` updates which audio file that entry points at. All hook-merge logic lives in a pure, `vscode`-free module (`hookManager.js`) so it can be unit tested with Node's built-in test runner — no test framework dependency.

**Tech Stack:** Plain JavaScript (no TypeScript/bundler — a 3-command extension doesn't need a build step), VS Code Extension API, Node built-ins (`fs`, `path`, `os`), `node:test` for unit tests.

## Global Constraints

- Target `engines.vscode`: `^1.74.0` (enables implicit command activation — no `activationEvents` boilerplate needed).
- No status bar UI, no webview, no settings UI beyond the three commands and one config value (`claudeSound.audioFile`) — per spec's non-goals.
- Settings file path: `path.join(os.homedir(), '.claude', 'settings.json')`.
- Default bundled audio: `media/fahhhhh.mp3`.
- Playback command: PowerShell (`(New-Object Media.SoundPlayer '<path>').PlaySync()`) — Windows-only, matches the user's platform.
- Managed hook entries must be identified by a fixed marker string (`claude-sound-hook`) embedded in the command, so Enable/Disable never touch hooks the user configured independently.
- Never overwrite `~/.claude/settings.json` if it fails to parse as JSON — surface an error instead.
- Repository: `https://github.com/coyaac/FAH-claude.git` (already pushed, `main` branch).

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `.gitignore`
- Create: `.vscodeignore`
- Create: `.vscode/launch.json`
- Create: `README.md`
- Create: `media/fahhhhh.mp3` (moved from repo root)
- Delete: `fahhhhh.mp3` (repo root copy, now duplicated under `media/`)

**Interfaces:**
- Produces: command IDs `claudeSound.enable`, `claudeSound.disable`, `claudeSound.chooseSoundFile` and config key `claudeSound.audioFile`, which Task 3's `extension.js` must register/read under those exact names. Produces the on-disk path `media/fahhhhh.mp3`, which Task 3 resolves via `context.asAbsolutePath(path.join('media', 'fahhhhh.mp3'))`.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "claude-sound",
  "displayName": "Claude Sound",
  "description": "Play an audio cue when Claude Code finishes responding.",
  "version": "0.0.1",
  "publisher": "coyaac",
  "repository": {
    "type": "git",
    "url": "https://github.com/coyaac/FAH-claude.git"
  },
  "engines": {
    "vscode": "^1.74.0"
  },
  "categories": ["Other"],
  "main": "./extension.js",
  "contributes": {
    "commands": [
      { "command": "claudeSound.enable", "title": "Claude Sound: Enable" },
      { "command": "claudeSound.disable", "title": "Claude Sound: Disable" },
      { "command": "claudeSound.chooseSoundFile", "title": "Claude Sound: Choose Sound File" }
    ],
    "configuration": {
      "title": "Claude Sound",
      "properties": {
        "claudeSound.audioFile": {
          "type": "string",
          "default": "",
          "description": "Absolute path to the audio file to play when Claude Code finishes. Empty uses the bundled default sound."
        }
      }
    }
  },
  "scripts": {
    "test": "node --test test/"
  }
}
```

- [ ] **Step 2: Create `.gitignore`**

```
*.vsix
```

- [ ] **Step 3: Create `.vscodeignore`** (keeps dev-only files out of the packaged `.vsix`)

```
.vscode/**
test/**
docs/**
.gitignore
.vscodeignore
*.vsix
**/.git/**
```

- [ ] **Step 4: Create `.vscode/launch.json`** (lets you press F5 to smoke-test the extension later)

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Run Extension",
      "type": "extensionHost",
      "request": "launch",
      "args": ["--extensionDevelopmentPath=${workspaceFolder}"]
    }
  ]
}
```

- [ ] **Step 5: Create `README.md`**

```markdown
# Claude Sound

Plays `media/fahhhhh.mp3` (or a sound you pick) whenever Claude Code
finishes responding, by managing a Claude Code `Stop` hook. Works no matter
which terminal launched `claude` — Antigravity, VS Code, or standalone.

## Commands

- **Claude Sound: Enable** — installs the hook.
- **Claude Sound: Disable** — removes it.
- **Claude Sound: Choose Sound File** — pick a different `.mp3`/`.wav`.
```

- [ ] **Step 6: Move the audio file into `media/`**

```bash
mkdir -p media
git mv fahhhhh.mp3 media/fahhhhh.mp3
```

- [ ] **Step 7: Commit**

```bash
git add package.json .gitignore .vscodeignore .vscode/launch.json README.md media/fahhhhh.mp3
git commit -m "Scaffold claude-sound extension project"
```

---

### Task 2: `hookManager.js` — pure hook-merge logic (TDD)

**Files:**
- Create: `hookManager.js`
- Test: `test/hookManager.test.js`

**Interfaces:**
- Consumes: nothing (pure module, no `vscode` dependency).
- Produces: `module.exports = { installHook(settings, audioPath), uninstallHook(settings), isEnabled(settings), buildCommand(audioPath), MARKER }`. Task 3 calls these exact names.

- [ ] **Step 1: Write the failing tests**

```javascript
// test/hookManager.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { installHook, uninstallHook, isEnabled, buildCommand, MARKER } = require('../hookManager');

test('installHook creates a Stop hook on empty settings', () => {
  const result = installHook({}, 'C:/sounds/done.mp3');
  assert.equal(result.hooks.Stop.length, 1);
  assert.equal(result.hooks.Stop[0].hooks.length, 1);
  assert.equal(result.hooks.Stop[0].hooks[0].type, 'command');
  assert.ok(result.hooks.Stop[0].hooks[0].command.includes(MARKER));
  assert.ok(result.hooks.Stop[0].hooks[0].command.includes('done.mp3'));
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
  assert.ok(twice.hooks.Stop[0].hooks[0].command.includes('b.mp3'));
  assert.ok(!twice.hooks.Stop[0].hooks[0].command.includes('a.mp3'));
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
  assert.ok(command.includes("it''s"));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test test/`
Expected: FAIL — `Cannot find module '../hookManager'`

- [ ] **Step 3: Implement `hookManager.js`**

```javascript
// hookManager.js
const MARKER = 'claude-sound-hook';

function escapeForPowerShell(str) {
  return str.replace(/'/g, "''");
}

function buildCommand(audioPath) {
  const escaped = escapeForPowerShell(audioPath);
  return `powershell -NoProfile -Command "(New-Object Media.SoundPlayer '${escaped}').PlaySync()" # ${MARKER}`;
}

function isManagedCommand(command) {
  return typeof command === 'string' && command.includes(MARKER);
}

function installHook(settings, audioPath) {
  const result = JSON.parse(JSON.stringify(settings || {}));
  if (!result.hooks || typeof result.hooks !== 'object') result.hooks = {};
  if (!Array.isArray(result.hooks.Stop)) result.hooks.Stop = [];

  const command = buildCommand(audioPath);
  let replaced = false;
  for (const group of result.hooks.Stop) {
    if (!Array.isArray(group.hooks)) continue;
    for (const h of group.hooks) {
      if (h && h.type === 'command' && isManagedCommand(h.command)) {
        h.command = command;
        replaced = true;
      }
    }
  }
  if (!replaced) {
    result.hooks.Stop.push({ hooks: [{ type: 'command', command }] });
  }
  return result;
}

function uninstallHook(settings) {
  const result = JSON.parse(JSON.stringify(settings || {}));
  if (result.hooks && Array.isArray(result.hooks.Stop)) {
    result.hooks.Stop = result.hooks.Stop
      .map((group) => {
        if (!Array.isArray(group.hooks)) return group;
        return { ...group, hooks: group.hooks.filter((h) => !(h && h.type === 'command' && isManagedCommand(h.command))) };
      })
      .filter((group) => !Array.isArray(group.hooks) || group.hooks.length > 0);
  }
  return result;
}

function isEnabled(settings) {
  if (!settings || !settings.hooks || !Array.isArray(settings.hooks.Stop)) return false;
  return settings.hooks.Stop.some(
    (group) => Array.isArray(group.hooks) && group.hooks.some((h) => h && h.type === 'command' && isManagedCommand(h.command))
  );
}

module.exports = { installHook, uninstallHook, isEnabled, buildCommand, MARKER };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --test test/`
Expected: PASS — 6 tests, 0 failures

- [ ] **Step 5: Commit**

```bash
git add hookManager.js test/hookManager.test.js
git commit -m "Add hookManager: pure Stop-hook merge logic with tests"
```

---

### Task 3: `extension.js` — command wiring

**Files:**
- Create: `extension.js`

**Interfaces:**
- Consumes: `hookManager.js`'s `installHook(settings, audioPath)`, `uninstallHook(settings)`, `isEnabled(settings)` (Task 2); command IDs and config key from `package.json` (Task 1); `media/fahhhhh.mp3` (Task 1).
- Produces: `module.exports = { activate(context), deactivate() }`, the extension entry point VS Code loads via `package.json`'s `"main"`.

- [ ] **Step 1: Implement `extension.js`**

```javascript
// extension.js
const vscode = require('vscode');
const fs = require('fs');
const os = require('os');
const path = require('path');
const hookManager = require('./hookManager');

function getSettingsPath() {
  return path.join(os.homedir(), '.claude', 'settings.json');
}

function getAudioPath(context) {
  const configured = vscode.workspace.getConfiguration('claudeSound').get('audioFile');
  if (configured && String(configured).trim().length > 0) return configured;
  return context.asAbsolutePath(path.join('media', 'fahhhhh.mp3'));
}

function readSettings(settingsPath) {
  if (!fs.existsSync(settingsPath)) return {};
  const raw = fs.readFileSync(settingsPath, 'utf8').trim();
  if (raw.length === 0) return {};
  return JSON.parse(raw);
}

function writeSettings(settingsPath, obj) {
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  fs.writeFileSync(settingsPath, JSON.stringify(obj, null, 2) + '\n', 'utf8');
}

function tryReadSettingsOrShowError(settingsPath, actionVerb) {
  try {
    return { settings: readSettings(settingsPath) };
  } catch (err) {
    vscode.window.showErrorMessage(
      `Claude Sound: could not parse ${settingsPath} — fix the JSON before ${actionVerb}. (${err.message})`
    );
    return { error: err };
  }
}

async function enableCommand(context) {
  const settingsPath = getSettingsPath();
  const { settings, error } = tryReadSettingsOrShowError(settingsPath, 'enabling');
  if (error) return;

  const audioPath = getAudioPath(context);
  const updated = hookManager.installHook(settings, audioPath);
  writeSettings(settingsPath, updated);
  vscode.window.showInformationMessage(`Claude Sound enabled — will play ${audioPath} when Claude Code finishes.`);
}

async function disableCommand() {
  const settingsPath = getSettingsPath();
  const { settings, error } = tryReadSettingsOrShowError(settingsPath, 'disabling');
  if (error) return;

  if (!hookManager.isEnabled(settings)) {
    vscode.window.showInformationMessage('Claude Sound is not enabled.');
    return;
  }
  const updated = hookManager.uninstallHook(settings);
  writeSettings(settingsPath, updated);
  vscode.window.showInformationMessage('Claude Sound disabled.');
}

async function chooseSoundFileCommand(context) {
  const picked = await vscode.window.showOpenDialog({
    canSelectMany: false,
    filters: { Audio: ['mp3', 'wav'] },
    openLabel: 'Use as Claude Sound'
  });
  if (!picked || picked.length === 0) return;

  const audioPath = picked[0].fsPath;
  await vscode.workspace.getConfiguration('claudeSound').update('audioFile', audioPath, vscode.ConfigurationTarget.Global);
  vscode.window.showInformationMessage(`Claude Sound: using ${audioPath}`);

  const settingsPath = getSettingsPath();
  const { settings, error } = tryReadSettingsOrShowError(settingsPath, 'updating the sound');
  if (error || !hookManager.isEnabled(settings)) return;

  const updated = hookManager.installHook(settings, audioPath);
  writeSettings(settingsPath, updated);
}

function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeSound.enable', () => enableCommand(context)),
    vscode.commands.registerCommand('claudeSound.disable', disableCommand),
    vscode.commands.registerCommand('claudeSound.chooseSoundFile', () => chooseSoundFileCommand(context))
  );
}

function deactivate() {}

module.exports = { activate, deactivate };
```

- [ ] **Step 2: Manual smoke test in the Extension Development Host**

In VS Code (or Antigravity, if it supports F5 extension debugging — otherwise skip to Task 4's packaged install), open this folder and press F5. In the new window:
1. Run `Claude Sound: Enable` from the Command Palette.
2. Open `~/.claude/settings.json` and confirm a `hooks.Stop` entry containing `claude-sound-hook` and the path to `media/fahhhhh.mp3` exists.
3. Run `Claude Sound: Disable` and confirm that entry is gone.

Expected: both commands complete without errors and the file changes match.

- [ ] **Step 3: Commit**

```bash
git add extension.js
git commit -m "Wire up Enable/Disable/Choose Sound File commands"
```

---

### Task 4: Package and verify end-to-end (manual)

**Files:** none created — packaging and installation only.

**Interfaces:** Consumes the fully wired extension from Tasks 1–3. No further tasks depend on this one.

- [ ] **Step 1: Package the extension**

Run: `npx @vscode/vsce package`
Expected: produces `claude-sound-0.0.1.vsix` in the project root (git-ignored via Task 1's `.gitignore`).

- [ ] **Step 2: Install in VS Code**

Run: `code --install-extension claude-sound-0.0.1.vsix`
Expected: "Extension 'claude-sound' was successfully installed."

- [ ] **Step 3: Install in Antigravity**

Open Antigravity's Command Palette → "Extensions: Install from VSIX..." → select `claude-sound-0.0.1.vsix`.
Expected: extension installs and its 3 commands appear in the Command Palette. (This confirms the open question from the design spec — Antigravity does accept standard `.vsix` packages.)

- [ ] **Step 4: End-to-end verification in Antigravity**

1. Run `Claude Sound: Enable`.
2. Open Antigravity's integrated terminal, run `claude`, send it any prompt, wait for it to finish.
3. Confirm `media/fahhhhh.mp3` plays when Claude Code stops responding.
4. Run `Claude Sound: Disable`.
5. Send another prompt to `claude` and confirm no sound plays this time.

Expected: sound plays only while enabled; `~/.claude/settings.json` ends up exactly as it was before Step 1 (any hooks the user already had remain untouched).

- [ ] **Step 5: Commit any fixes found during manual testing**

```bash
git add -A
git commit -m "Fix issues found during end-to-end verification"
```

(Skip this step if no fixes were needed.)
