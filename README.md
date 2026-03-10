# Claude Focus — VS Code Extension

Automatically brings your VS Code window to the front whenever [Claude Code](https://claude.com/claude-code) needs your attention — like permission prompts, confirmations, or when it finishes a task.

Works on **macOS**, **Windows**, and **Linux**.

---

## How It Works

```
Claude Code (terminal)
    │
    ├── Needs user permission / finished task
    │
    ├── Fires "Notification" hook
    │
    ├── Hook script sends HTTP POST to localhost:19876
    │
    └── VS Code extension receives request
            ├── Raises VS Code window to front
            └── Shows notification with "Go to Terminal" button
```

Two pieces work together:

1. **VS Code Extension** — runs a lightweight local HTTP server inside VS Code that listens for focus requests.
2. **Claude Code Hook** — a small script that Claude Code runs automatically when it needs your input. It pings the extension's server.

---

## Installation

### Step 1: Install the Extension

#### Option A: Run in Debug Mode (for development)

1. Open the `claude-focus-vscode` folder in VS Code.
2. Press `F5` to launch a new Extension Development Host window.
3. The extension activates automatically — you'll see a message: _"Claude Focus active on port 19876"_.

#### Option B: Package and Install (for daily use)

```bash
cd claude-focus-vscode

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Package into a .vsix file
npx @vscode/vsce package

# Install the extension
code --install-extension claude-focus-0.1.0.vsix
```

> **Note:** You need Node.js 18+ installed.

---

### Step 2: Configure Claude Code Hooks

Claude Code hooks tell Claude to run your script whenever it needs attention. Choose the instructions for your OS below.

#### macOS / Linux

1. Make the hook script executable (one-time):

   ```bash
   chmod +x /path/to/claude-focus-vscode/hooks/claude-focus-hook.sh
   ```

2. Open your Claude Code settings file:

   - **Global** (applies everywhere): `~/.claude/settings.json`
   - **Per-project**: `<project-root>/.claude/settings.json`

3. Add the following (create the file if it doesn't exist):

   ```json
   {
     "hooks": {
       "Notification": [
         {
           "matcher": "",
           "hooks": [
             {
               "type": "command",
               "command": "/full/path/to/claude-focus-vscode/hooks/claude-focus-hook.sh"
             }
           ]
         }
       ]
     }
   }
   ```

   > Replace `/full/path/to/` with the actual absolute path.

#### Windows

1. Open your Claude Code settings file:

   - **Global**: `%USERPROFILE%\.claude\settings.json`
   - **Per-project**: `<project-root>\.claude\settings.json`

2. Add the following:

   ```json
   {
     "hooks": {
       "Notification": [
         {
           "matcher": "",
           "hooks": [
             {
               "type": "command",
               "command": "powershell -NoProfile -File C:\\full\\path\\to\\claude-focus-vscode\\hooks\\claude-focus-hook.ps1"
             }
           ]
         }
       ]
     }
   }
   ```

   > Replace `C:\\full\\path\\to\\` with the actual path (use double backslashes in JSON).

---

### Step 3: Verify It Works

1. Open VS Code with the extension active.
2. Switch to a different window (browser, file manager, etc.).
3. Test manually from your terminal:

   ```bash
   curl -X POST http://127.0.0.1:19876/focus \
     -H "Content-Type: application/json" \
     -d '{"message": "Test: Claude needs your attention!"}'
   ```

   On Windows (PowerShell):

   ```powershell
   Invoke-RestMethod -Uri "http://127.0.0.1:19876/focus" `
     -Method POST -ContentType "application/json" `
     -Body '{"message": "Test: Claude needs your attention!"}'
   ```

4. VS Code should come to the front with a notification.

---

### Step 4: Linux — Install Window Manager Helper (Optional)

On Linux, the extension needs a helper tool to raise the OS window:

- **X11 (most distros)**:
  ```bash
  # Fedora
  sudo dnf install wmctrl

  # Ubuntu / Debian
  sudo apt install wmctrl
  ```

- **Wayland + GNOME**: No extra install needed — the extension uses `gdbus` (pre-installed on GNOME).

macOS and Windows need nothing extra.

---

## Extension Settings

Open VS Code settings (`Ctrl+,` / `Cmd+,`) and search for "Claude Focus":

| Setting                        | Default | Description                                              |
| ------------------------------ | ------- | -------------------------------------------------------- |
| `claudeFocus.port`             | `19876` | Port the local HTTP server listens on                    |
| `claudeFocus.enabled`          | `true`  | Enable or disable window focusing                        |
| `claudeFocus.showNotification` | `true`  | Show a notification toast when Claude needs attention     |

You can also change the port used by the hook script by setting the `CLAUDE_FOCUS_PORT` environment variable (it defaults to `19876`).

---

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command                      | Description                    |
| ---------------------------- | ------------------------------ |
| `Claude Focus: Focus Window` | Manually trigger a window focus |

---

## Customizing the Hook

By default, the hook triggers on **all** Claude Code notifications. You can narrow it down using the `matcher` field in your settings:

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "permission_prompt",
        "hooks": [
          {
            "type": "command",
            "command": "/path/to/claude-focus-hook.sh"
          }
        ]
      }
    ]
  }
}
```

Common matcher values:

| Matcher              | Triggers when                                  |
| -------------------- | ---------------------------------------------- |
| `""`                 | Any notification (default — recommended)       |
| `"permission_prompt"`| Claude asks for permission to run a tool        |
| `"idle_prompt"`      | Claude finishes work and waits for next input   |

You can add multiple entries to handle different notification types differently.

---

## Troubleshooting

### Extension says "Port in use"

Another process is using port `19876`. Change it in VS Code settings (`claudeFocus.port`) and set the same value in the hook script via the `CLAUDE_FOCUS_PORT` environment variable.

### Window doesn't come to the front

- **macOS**: Should work out of the box. If not, check System Settings > Privacy & Security > Accessibility and ensure your terminal app has permission.
- **Windows**: Some antivirus software blocks `SetForegroundWindow`. Try running VS Code as administrator.
- **Linux X11**: Make sure `wmctrl` is installed (`wmctrl -l` should list windows).
- **Linux Wayland**: GNOME is supported via `gdbus`. Other compositors (KDE, Sway) may not be supported yet.

### Hook isn't firing

1. Check that `~/.claude/settings.json` is valid JSON (no trailing commas).
2. Ensure the script path is absolute, not relative.
3. Test the hook script manually:
   ```bash
   echo '{"message":"test","notification_type":"permission_prompt"}' | /path/to/claude-focus-hook.sh
   ```
4. Use Claude Code's `/hooks` command to verify hooks are registered.

### Notification shows but window doesn't raise

The VS Code internal command fires but the OS-level window raise failed. This usually means:
- The required helper tool isn't installed (Linux).
- Your OS is blocking apps from stealing focus (common on Windows). The notification still appears inside VS Code.

---

## Project Structure

```
claude-focus-vscode/
├── src/
│   └── extension.ts       # VS Code extension source
├── hooks/
│   ├── claude-focus-hook.sh    # Hook script for macOS / Linux
│   └── claude-focus-hook.ps1   # Hook script for Windows
├── out/                        # Compiled JS (generated)
├── package.json
├── tsconfig.json
└── README.md
```

---

## Uninstalling

1. Remove the extension:
   ```bash
   code --uninstall-extension techpix.claude-focus
   ```
2. Remove the hook entry from your `~/.claude/settings.json`.

---

## License

MIT
