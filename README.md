# Claude Sound

Plays `media/fahhhhh.mp3` (or a sound you pick) whenever Claude Code
finishes responding, by managing a Claude Code `Stop` hook. Works no matter
which terminal launched `claude` — Antigravity, VS Code, or standalone.

## Commands

- **Claude Sound: Enable** — installs the hook.
- **Claude Sound: Disable** — removes it.
- **Claude Sound: Choose Sound File** — pick a different `.mp3`/`.wav`.

## Updating / uninstalling

The installed hook points at this extension's install directory, which is version-pinned. After updating the extension, re-run **Claude Sound: Enable** to repoint the hook. Before uninstalling, run **Claude Sound: Disable** — otherwise the hook is left behind and will start failing.
