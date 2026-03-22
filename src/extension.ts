import * as vscode from "vscode";
import * as http from "http";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

let server: http.Server | undefined;

const HOOK_MARKER = "claude-focus-hook";

function getClaudeSettingsPath(): string {
  return path.join(os.homedir(), ".claude", "settings.json");
}

function readClaudeSettings(): Record<string, unknown> {
  const settingsPath = getClaudeSettingsPath();
  try {
    const content = fs.readFileSync(settingsPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return {};
  }
}

function writeClaudeSettings(settings: Record<string, unknown>): void {
  const settingsPath = getClaudeSettingsPath();
  const dir = path.dirname(settingsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + "\n");
}

function getHookCommand(port: number): string {
  if (process.platform === "win32") {
    return `powershell -NoProfile -Command "$body = [Console]::In.ReadToEnd(); try { Invoke-RestMethod -Uri 'http://127.0.0.1:${port}/focus' -Method POST -ContentType 'application/json' -Body $body -TimeoutSec 2 | Out-Null } catch {}"`;
  }
  return `curl -s -X POST http://127.0.0.1:${port}/focus -H 'Content-Type: application/json' -d @- --connect-timeout 1 --max-time 2 > /dev/null 2>&1 || true`;
}

function isHookInstalled(settings: Record<string, unknown>): boolean {
  const hooks = settings.hooks as Record<string, unknown[]> | undefined;
  if (!hooks || !hooks.Notification) {
    return false;
  }
  const notifications = hooks.Notification as Array<{
    matcher?: string;
    hooks?: Array<{ type?: string; command?: string }>;
  }>;
  return notifications.some((entry) =>
    entry.hooks?.some(
      (h) =>
        h.command?.includes("127.0.0.1") &&
        h.command?.includes("/focus")
    )
  );
}

function installHook(port: number): boolean {
  const settings = readClaudeSettings();

  if (isHookInstalled(settings)) {
    return false; // already installed
  }

  if (!settings.hooks) {
    settings.hooks = {};
  }
  const hooks = settings.hooks as Record<string, unknown[]>;
  if (!hooks.Notification) {
    hooks.Notification = [];
  }

  const notifications = hooks.Notification as unknown[];
  notifications.push({
    matcher: "",
    hooks: [
      {
        type: "command",
        command: getHookCommand(port),
      },
    ],
  });

  writeClaudeSettings(settings);
  return true;
}

function removeHook(): boolean {
  const settings = readClaudeSettings();
  const hooks = settings.hooks as Record<string, unknown[]> | undefined;
  if (!hooks || !hooks.Notification) {
    return false;
  }

  const notifications = hooks.Notification as Array<{
    matcher?: string;
    hooks?: Array<{ type?: string; command?: string }>;
  }>;

  const filtered = notifications.filter(
    (entry) =>
      !entry.hooks?.some(
        (h) =>
          h.command?.includes("127.0.0.1") &&
          h.command?.includes("/focus")
      )
  );

  if (filtered.length === notifications.length) {
    return false; // nothing to remove
  }

  if (filtered.length === 0) {
    delete hooks.Notification;
  } else {
    hooks.Notification = filtered;
  }

  // Clean up empty hooks object
  if (Object.keys(hooks).length === 0) {
    delete settings.hooks;
  }

  writeClaudeSettings(settings);
  return true;
}

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("claudeFocus");
  const port = config.get<number>("port", 19876);

  // Register commands
  context.subscriptions.push(
    vscode.commands.registerCommand("claude-focus.focusWindow", () =>
      focusWindow()
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("claude-focus.setupHook", async () => {
      const currentPort = vscode.workspace
        .getConfiguration("claudeFocus")
        .get<number>("port", 19876);
      if (installHook(currentPort)) {
        vscode.window.showInformationMessage(
          "Claude Focus: Hook installed in ~/.claude/settings.json"
        );
      } else {
        vscode.window.showInformationMessage(
          "Claude Focus: Hook is already installed."
        );
      }
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("claude-focus.removeHook", async () => {
      if (removeHook()) {
        vscode.window.showInformationMessage(
          "Claude Focus: Hook removed from ~/.claude/settings.json"
        );
      } else {
        vscode.window.showInformationMessage(
          "Claude Focus: No hook found to remove."
        );
      }
    })
  );

  // Start HTTP server
  startServer(port);

  // Restart server if config changes
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("claudeFocus.port")) {
        const newPort = vscode.workspace
          .getConfiguration("claudeFocus")
          .get<number>("port", 19876);
        stopServer();
        startServer(newPort);
      }
    })
  );

  context.subscriptions.push({ dispose: stopServer });

  // Auto-setup: check if hook is installed, prompt if not
  const settings = readClaudeSettings();
  if (!isHookInstalled(settings)) {
    vscode.window
      .showInformationMessage(
        "Claude Focus: Set up the Claude Code hook to auto-focus VS Code?",
        "Install Hook",
        "Not Now"
      )
      .then((choice) => {
        if (choice === "Install Hook") {
          const currentPort = vscode.workspace
            .getConfiguration("claudeFocus")
            .get<number>("port", 19876);
          if (installHook(currentPort)) {
            vscode.window.showInformationMessage(
              "Claude Focus: Hook installed! Claude Code will now auto-focus VS Code."
            );
          }
        }
      });
  } else {
    vscode.window.showInformationMessage(
      `Claude Focus active on port ${port}`
    );
  }
}

function startServer(port: number) {
  server = http.createServer((req, res) => {
    if (req.method === "POST" && req.url === "/focus") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        const config = vscode.workspace.getConfiguration("claudeFocus");
        if (!config.get<boolean>("enabled", true)) {
          res.writeHead(200);
          res.end(JSON.stringify({ status: "disabled" }));
          return;
        }

        let payload: { message?: string; type?: string } = {};
        try {
          payload = JSON.parse(body);
        } catch {
          // empty body is fine
        }

        focusWindow(payload.message);

        res.writeHead(200);
        res.end(JSON.stringify({ status: "focused" }));
      });
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
      vscode.window.showWarningMessage(
        `Claude Focus: Port ${port} is in use. Change it in settings.`
      );
    }
  });

  server.listen(port, "127.0.0.1");
}

function stopServer() {
  if (server) {
    server.close();
    server = undefined;
  }
}

function focusWindow(message?: string) {
  // Focus the VS Code window via its built-in command
  vscode.commands.executeCommand("workbench.action.focusActiveEditorGroup");

  // Raise the OS window to the front (platform-specific)
  const { exec } = require("child_process");
  const platform = process.platform;

  if (platform === "darwin") {
    // macOS: use AppleScript to activate VS Code
    exec(
      `osascript -e 'tell application "Visual Studio Code" to activate'`,
      () => {}
    );
  } else if (platform === "win32") {
    // Windows: use PowerShell to bring VS Code window to front
    const ps = `
      Add-Type -Name Win -Namespace Native -MemberDefinition '
        [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr hWnd);
        [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
      '
      $procs = Get-Process -Name "Code" -ErrorAction SilentlyContinue
      if ($procs) {
        $hwnd = $procs[0].MainWindowHandle
        [Native.Win]::ShowWindow($hwnd, 9)
        [Native.Win]::SetForegroundWindow($hwnd)
      }
    `.replace(/\n/g, " ");
    exec(`powershell -NoProfile -Command "${ps}"`, () => {});
  } else {
    // Linux: raise the existing VS Code window
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
    const reuseCmd = workspaceFolder
      ? `code --reuse-window "${workspaceFolder}"`
      : 'wmctrl -a "Visual Studio Code"';

    exec(reuseCmd, () => {});

    // Send a prominent system notification with sound
    const notifyMsg = message || "Claude Code needs your attention!";
    exec(
      `notify-send -u critical -a "VS Code" -i dialog-warning "Claude Focus" "${notifyMsg.replace(/"/g, '\\"')}" --action="focus=Open VS Code"`,
      (err: Error | null, stdout: string) => {
        if (stdout && stdout.trim() === "focus") {
          exec(reuseCmd, () => {});
        }
      }
    );
    // Play alert sound
    exec(
      'canberra-gtk-play -i dialog-warning -d "Claude Focus" 2>/dev/null || paplay /usr/share/sounds/freedesktop/stereo/bell.oga 2>/dev/null || echo -e "\\a"',
      () => {}
    );
  }

  const config = vscode.workspace.getConfiguration("claudeFocus");
  if (config.get<boolean>("showNotification", true)) {
    const msg = message || "Claude Code needs your attention!";
    vscode.window
      .showInformationMessage(msg, "Go to Terminal")
      .then((choice) => {
        if (choice === "Go to Terminal") {
          vscode.commands.executeCommand("workbench.action.terminal.focus");
        }
      });
  }
}

export function deactivate() {
  stopServer();
}
