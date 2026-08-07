# Claude Sound

Reproduce un archivo de audio cada vez que [Claude Code](https://claude.com/claude-code)
termina de responder, instalando un hook `Stop` de Claude Code. Funciona sin
importar qué terminal haya lanzado `claude` — Antigravity, VS Code, o
standalone — porque el hook vive en la configuración propia de Claude Code,
no en el editor.

**Requisitos:** Windows (el hook reproduce audio vía PowerShell/WPF), Claude
Code instalado, y VS Code o Antigravity como editor.

## Instalación

1. Conseguí `claude-sound-0.0.2.vsix` (alguien te pasa el archivo, o lo
   compilás vos mismo — ver [Compilarlo vos mismo](#compilarlo-vos-mismo)
   más abajo).
2. En VS Code o Antigravity: `Ctrl+Shift+P` → **"Extensions: Install from
   VSIX..."** → elegí el archivo.
3. `Ctrl+Shift+P` → **"Claude Sound: Enable"**.

Listo — abrí una terminal, corré `claude`, mandale un prompt, y vas a
escuchar un sonido cuando termine.

## Comandos

Abrí todos estos con `Ctrl+Shift+P`:

- **Claude Sound: Enable** — instala el hook. Muestra un mensaje de
  confirmación al terminar.
- **Claude Sound: Disable** — lo elimina.
- **Claude Sound: Choose Sound File** — elegí tu propio `.mp3`/`.wav` en
  lugar del sonido incluido. Si el hook ya está habilitado, empieza a usar
  el nuevo archivo inmediatamente.

## Actualizar / reinstalar

El extension host **no** reemplaza los archivos si reinstalás exactamente
la misma versión — no hace nada silenciosamente. Si estás recompilando
desde el código fuente y probando cambios, subí el `version` en
`package.json` antes de reempaquetar, o desinstalá la extensión primero.

El hook también apunta al directorio de instalación de esta extensión, que
está fijado por versión. Después de actualizar a una versión más nueva,
volvé a correr **Claude Sound: Enable** para redirigir el hook a la nueva
ruta de instalación. Antes de desinstalar la extensión por completo, corré
**Claude Sound: Disable** primero — de lo contrario el hook queda
abandonado en `~/.claude/settings.json` y va a empezar a fallar en cada
respuesta de Claude Code, sin ninguna interfaz para sacarlo (tendrías que
editar ese archivo a mano).

## Solución de problemas

**No suena nada:**
- Confirmá que el hook esté realmente instalado: abrí
  `~/.claude/settings.json` y buscá una entrada `hooks.Stop` que contenga
  `claude-sound-hook`.
- Confirmá que el volumen/dispositivo de salida de tu sistema funcione (
  probá con cualquier otro sonido).
- Si acabás de instalar una actualización, volvé a correr **Enable** — ver
  "Actualizar" más arriba.

**Aparece un error de PowerShell/parseo después de que Claude Code
termina:** normalmente esto significa que el hook que se disparó es viejo
(una versión anterior y rota). Corré **Disable** y después **Enable** de
nuevo para reinstalar uno nuevo, y asegurate de estar usando el último
`.vsix` (ver "Actualizar" más arriba — reinstalar la misma versión no
tiene efecto).

## Compartir esto con alguien más

El archivo `.vsix` es todo lo distribuible — simplemente enviáselo (email,
USB, chat, lo que sea) junto con este README. Lo instalan de la misma
manera: **"Extensions: Install from VSIX..."**, y después corren
**Enable**. Sin paso de compilación, sin cuenta, sin marketplace
necesario.

## Compilarlo vos mismo

No hay compilador ni bundler de por medio — es JavaScript plano. Desde la
raíz del proyecto:

```bash
npx @vscode/vsce package
```

Esto genera `claude-sound-<version>.vsix` en el directorio actual. Corré
la suite de tests primero si estás modificando `hookManager.js`:

```bash
npm test
```
