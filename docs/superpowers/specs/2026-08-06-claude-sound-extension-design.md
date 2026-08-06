# claude-sound — VS Code / Antigravity extension design

## Purpose

Play a custom audio file whenever Claude Code finishes responding to a
prompt, so the user gets an audible cue without watching the terminal. Must
work whether Claude Code runs inside Antigravity's integrated terminal, VS
Code's, or any other terminal.

## Non-goals

- No status bar icon, no webview, no settings UI beyond three commands.
- No parsing of terminal output. No background process.
- No support for detecting Antigravity's *native* agent panel (only the
  Claude Code CLI, invoked via `claude` in a terminal, is in scope).

## Architecture

Claude Code already exposes a `Stop` hook: a shell command it runs every
time it finishes responding, configured in `~/.claude/settings.json`. This
fires regardless of which terminal or IDE launched Claude Code, so no
terminal-output parsing or background watcher is needed.

The extension's only job is to manage that hook entry — it does not play
audio itself and does not need to run continuously. All playback happens via
the hook's shell command (PowerShell) at the moment Claude Code stops.

```
Enable command  → merge hooks.Stop entry into ~/.claude/settings.json
Disable command → remove that entry (identified by a fixed marker)
Choose Sound    → file picker → save path to claudeSound.audioFile config
                  → rewrite hook entry if currently enabled

Claude Code stops (any terminal) → Stop hook fires →
  powershell -c (New-Object Media.SoundPlayer '<path>').PlaySync()
```

"Enabled" has no separate state to desync — it's simply whether the marked
entry exists in `hooks.Stop`.

## Components

Three commands, no other UI:

1. **`Claude Sound: Enable`**
   Reads `~/.claude/settings.json` (creates `~/.claude/` and an empty
   settings object if missing), merges an entry into `hooks.Stop` containing
   a PowerShell one-liner that plays the configured audio file, tagged with
   a fixed marker string so it can be found and removed later without
   touching hooks the user added independently. Writes the file back.

2. **`Claude Sound: Disable`**
   Reads the settings file, removes only the entry matching the marker,
   writes back. No-op (with a message) if not present.

3. **`Claude Sound: Choose Sound File`**
   Native `showOpenDialog` filtered to audio files. Saves the chosen
   absolute path to the extension's `claudeSound.audioFile` VS Code setting.
   If the hook is currently enabled, rewrites its command to point at the
   new path (re-runs the same merge logic as Enable).

Default audio file: `fahhhhh.mp3`, bundled with the extension, used until
the user picks a different one.

## Error handling

- Malformed JSON in `~/.claude/settings.json`: show an error, do not write
  — never overwrite a file we can't safely parse.
- `~/.claude/` missing: create it.
- Audio file later moved or deleted: the PowerShell command fails silently
  at hook-run time; it does not affect Claude Code itself. Recovery is
  re-running `Choose Sound File`.

## Testing

One unit test around the pure JSON-merge function:
- Enable on an empty/missing settings file produces a valid `hooks.Stop`
  entry.
- Enable does not remove or alter pre-existing unrelated hook entries.
- Enable → Disable restores the file to its pre-Enable state (byte-for-byte
  on the parts outside the marked entry).

Everything else (actual audio playback, installing the built `.vsix` in
Antigravity) is verified manually — not practical to automate.

## Open question carried into implementation

Antigravity is assumed to support installing extensions via `.vsix` (as
other VS Code forks do), since it has no scoped marketplace of its own to
target. This should be confirmed by actually installing the built package
in Antigravity before considering the project done.
