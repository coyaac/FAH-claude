// hookManager.js
const MARKER = 'claude-sound-hook';

function escapeForPowerShell(str) {
  return str.replace(/'/g, "''");
}

function buildCommand(audioPath) {
  const escaped = escapeForPowerShell(audioPath);
  const script = [
    'Add-Type -AssemblyName PresentationCore;',
    '$p = New-Object System.Windows.Media.MediaPlayer;',
    `$p.Open([Uri]'${escaped}');`,
    'for ($i=0; $i -lt 50 -and -not $p.NaturalDuration.HasTimeSpan; $i++) { Start-Sleep -Milliseconds 100 };',
    '$p.Play();',
    'if ($p.NaturalDuration.HasTimeSpan) { Start-Sleep -Milliseconds ([int]$p.NaturalDuration.TimeSpan.TotalMilliseconds + 300) } else { Start-Sleep -Milliseconds 3000 };',
    '$p.Stop(); $p.Close();'
  ].join(' ');
  return `powershell -NoProfile -Command "${script}" # ${MARKER}`;
}

function isManagedCommand(command) {
  return typeof command === 'string' && command.trim().endsWith(`# ${MARKER}`);
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
