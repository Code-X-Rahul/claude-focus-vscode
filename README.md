# Claude Focus — VS Code Extension

Automatically brings your VS Code window to the front whenever [Claude Code](https://claude.com/claude-code) needs your attention — like permission prompts, confirmations, or when it finishes a task.

Works on **macOS**, **Windows**, and **Linux**.

---

## Installation

1. Install **Claude Focus** from the [VS Code Marketplace](https://marketplace.visualstudio.com/items?itemName=evileye.claude-focus).
2. On first launch, you'll see a prompt: **"Set up the Claude Code hook?"** — click **Install Hook**.
3. That's it. Claude Code will now auto-focus your VS Code window.

> You can also run the setup manually anytime via Command Palette → `Claude Focus: Setup Claude Code Hook`.

---

## How It Works

```
Claude Code (terminal)
    │
    ├── Needs user permission / finished task
    │
    ├── Fires "Notification" hook
    │
    ├── Hook sends HTTP POST to localhost:19876
    │
    └── VS Code extension receives request
            ├── Raises VS Code window to front
            └── Shows notification with "Go to Terminal" button
```

Two pieces work together:

1. **VS Code Extension** — runs a lightweight local HTTP server inside VS Code that listens for focus requests.
2. **Claude Code Hook** — an inline command that Claude Code runs automatically when it needs your input. Installed automatically into `~/.claude/settings.json`.

---

## Linux — Install Window Manager Helper (Optional)

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

| Setting                        | Default | Description                                           |
| ------------------------------ | ------- | ----------------------------------------------------- |
| `claudeFocus.port`             | `19876` | Port the local HTTP server listens on                 |
| `claudeFocus.enabled`          | `true`  | Enable or disable window focusing                     |
| `claudeFocus.showNotification` | `true`  | Show a notification toast when Claude needs attention |

---

## Commands

Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`):

| Command                                 | Description                                   |
| --------------------------------------- | --------------------------------------------- |
| `Claude Focus: Focus Window`            | Manually trigger a window focus               |
| `Claude Focus: Setup Claude Code Hook`  | Install the hook into ~/.claude/settings.json |
| `Claude Focus: Remove Claude Code Hook` | Remove the hook from ~/.claude/settings.json  |

---

## Customizing the Hook

The hook is installed as an inline command in `~/.claude/settings.json`. By default it triggers on **all** Claude Code notifications. You can edit the `matcher` field to narrow it:

| Matcher               | Triggers when                                 |
| --------------------- | --------------------------------------------- |
| `""`                  | Any notification (default — recommended)      |
| `"permission_prompt"` | Claude asks for permission to run a tool      |
| `"idle_prompt"`       | Claude finishes work and waits for next input |

---

## Troubleshooting

### Extension says "Port in use"

Another process is using port `19876`. Change it in VS Code settings (`claudeFocus.port`), then run `Claude Focus: Setup Claude Code Hook` again to update the hook command.

### Window doesn't come to the front

- **macOS**: Should work out of the box. If not, check System Settings > Privacy & Security > Accessibility and ensure your terminal app has permission.
- **Windows**: Some antivirus software blocks `SetForegroundWindow`. Try running VS Code as administrator.
- **Linux X11**: Make sure `wmctrl` is installed (`wmctrl -l` should list windows).
- **Linux Wayland**: GNOME is supported via `gdbus`. Other compositors (KDE, Sway) may not be supported yet.

### Hook isn't firing

1. Check that `~/.claude/settings.json` is valid JSON (no trailing commas).
2. Test manually:
   ```bash
   curl -X POST http://127.0.0.1:19876/focus \
     -H "Content-Type: application/json" \
     -d '{"message": "Test: Claude needs your attention!"}'
   ```
3. Use Claude Code's `/hooks` command to verify hooks are registered.

---

## Uninstalling

1. Run Command Palette → `Claude Focus: Remove Claude Code Hook` to clean up the hook.
2. Uninstall the extension from VS Code.

---

## License

MIT
