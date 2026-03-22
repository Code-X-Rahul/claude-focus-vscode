import * as vscode from "vscode";
import * as http from "http";

let server: http.Server | undefined;

export function activate(context: vscode.ExtensionContext) {
  const config = vscode.workspace.getConfiguration("claudeFocus");
  const port = config.get<number>("port", 19876);

  // Manual focus command
  const focusCmd = vscode.commands.registerCommand(
    "claude-focus.focusWindow",
    () => focusWindow()
  );
  context.subscriptions.push(focusCmd);

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

  vscode.window.showInformationMessage(
    `Claude Focus active on port ${port}`
  );
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
    // Linux: try multiple approaches to raise the window
    const sessionType = process.env.XDG_SESSION_TYPE || "";

    if (sessionType === "wayland") {
      // Wayland + GNOME: use gdbus to activate the window
      exec(
        `gdbus call --session --dest org.gnome.Shell --object-path /org/gnome/Shell --method org.gnome.Shell.Eval "
          const start = Date.now();
          global.get_window_actors().forEach(function(w) {
            const title = w.meta_window.get_title() || '';
            if (title.includes('Visual Studio Code') || title.includes('VSCodium') || title.includes('Code - OSS')) {
              w.meta_window.activate(start / 1000);
            }
          });
        "`,
        (err: Error | null) => {
          if (err) {
            // Fallback: try wmctrl in case XWayland is available
            exec('wmctrl -a "Visual Studio Code"', () => {});
          }
        }
      );
    } else {
      // X11: use wmctrl
      exec('wmctrl -a "Visual Studio Code"', () => {});
    }

    // Always send a system notification as well
    const notifyMsg = message || "Claude Code needs your attention!";
    exec(
      `notify-send -u critical -a "VS Code" "Claude Focus" "${notifyMsg.replace(/"/g, '\\"')}"`,
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
