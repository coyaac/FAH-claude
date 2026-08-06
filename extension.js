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
