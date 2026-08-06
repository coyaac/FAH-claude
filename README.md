# Claude Sound

Plays an audio file whenever [Claude Code](https://claude.com/claude-code)
finishes responding, by installing a Claude Code `Stop` hook. Works no
matter which terminal launched `claude` — Antigravity, VS Code, or
standalone — because the hook lives in Claude Code's own config, not in the
editor.

**Requirements:** Windows (the hook plays audio via PowerShell/WPF), Claude
Code installed, and VS Code or Antigravity as the editor.

## Installing

1. Get `claude-sound-0.0.2.vsix` (someone sends you the file, or you build
   it yourself — see [Building it yourself](#building-it-yourself) below).
2. In VS Code or Antigravity: `Ctrl+Shift+P` → **"Extensions: Install from
   VSIX..."** → pick the file.
3. `Ctrl+Shift+P` → **"Claude Sound: Enable"**.

That's it — open a terminal, run `claude`, send it a prompt, and you'll
hear a sound when it finishes.

## Commands

Open all of these with `Ctrl+Shift+P`:

- **Claude Sound: Enable** — installs the hook. Shows a confirmation
  message when done.
- **Claude Sound: Disable** — removes it.
- **Claude Sound: Choose Sound File** — pick your own `.mp3`/`.wav` instead
  of the bundled sound. If the hook is already enabled, it starts using the
  new file immediately.

## Updating / reinstalling

The extension host does **not** replace files if you reinstall the exact
same version — it silently no-ops. If you're rebuilding from source and
testing changes, bump the `version` in `package.json` before repackaging,
or uninstall the extension first.

The hook also points at this extension's install directory, which is
version-pinned. After updating to a newer version, re-run **Claude Sound:
Enable** to repoint the hook at the new install path. Before uninstalling
the extension entirely, run **Claude Sound: Disable** first — otherwise the
hook is left behind in `~/.claude/settings.json` and will start failing on
every Claude Code response, with no UI left to remove it (you'd have to
edit that file by hand).

## Troubleshooting

**No sound plays:**
- Confirm the hook is actually installed: open `~/.claude/settings.json`
  and look for a `hooks.Stop` entry containing `claude-sound-hook`.
- Confirm your system volume/output device works at all (test with any
  other sound).
- If you just installed an update, re-run **Enable** — see "Updating"
  above.

**A PowerShell/parse error appears after Claude Code stops:** this usually
means the hook that fired is stale (an older, broken version). Run
**Disable** then **Enable** again to reinstall a fresh one, and make sure
you're on the latest `.vsix` (see "Updating" above — same-version
reinstalls don't take effect).

## Sharing this with someone else

The `.vsix` file is the whole distributable — just send it to them
(email, USB, chat, whatever) along with this README. They install it the
same way: **"Extensions: Install from VSIX..."**, then run **Enable**. No
build step, no account, no marketplace needed.

## Building it yourself

No compiler or bundler involved — it's plain JavaScript. From the project
root:

```bash
npx @vscode/vsce package
```

This produces `claude-sound-<version>.vsix` in the current directory. Run
the test suite first if you're changing `hookManager.js`:

```bash
npm test
```
