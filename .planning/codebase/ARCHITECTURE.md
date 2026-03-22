# Architecture

**Analysis Date:** 2026-03-22

## Pattern Overview

**Overall:** Client-Server with Event-Driven Integration

**Key Characteristics:**
- VS Code extension acts as a local HTTP server listening on localhost
- External Claude Code process initiates HTTP requests to trigger window focus events
- Decoupled communication via standard HTTP POST protocol
- Platform-aware native OS interactions (macOS/Windows/Linux)
- Configuration-driven behavior with runtime enable/disable capability

## Layers

**Presentation/UI Layer:**
- Purpose: Display notifications to user and provide interaction points
- Location: `src/extension.ts` (lines 144-152)
- Contains: VS Code notification API calls, user interaction handlers
- Depends on: VS Code workbench API, user configuration
- Used by: Focus window function to show alerts and terminal navigation

**Server/API Layer:**
- Purpose: Listen for and handle HTTP requests from Claude Code hooks
- Location: `src/extension.ts` (lines 39-79)
- Contains: HTTP server initialization, request routing, configuration validation
- Depends on: Node.js `http` module, VS Code configuration API
- Used by: Extension activation, configuration change listeners

**OS Integration Layer:**
- Purpose: Interact with native OS to raise VS Code window and play notifications
- Location: `src/extension.ts` (lines 88-141)
- Contains: Platform-specific shell command execution (macOS AppleScript, Windows PowerShell, Linux wmctrl/notify-send)
- Depends on: Node.js `child_process.exec`, platform detection
- Used by: Focus window function

**Extension Lifecycle Layer:**
- Purpose: Manage extension activation, configuration, and cleanup
- Location: `src/extension.ts` (lines 6-37, 156-158)
- Contains: VS Code activation hook, subscription management, configuration watchers
- Depends on: VS Code extension API
- Used by: VS Code runtime on startup and shutdown

## Data Flow

**Focus Request Flow:**

1. Claude Code process detects need for user attention (permission prompt, task completion)
2. Claude Code fires "Notification" hook, invoking hook script with JSON payload
3. Hook script (`hooks/claude-focus-hook.sh` or `hooks/claude-focus-hook.ps1`) reads JSON from stdin
4. Hook script extracts `message` and `notification_type` fields
5. Hook script sends HTTP POST to `http://127.0.0.1:{port}/focus` with extracted data
6. VS Code extension's HTTP server receives request at `/focus` endpoint
7. Extension checks if `claudeFocus.enabled` is true in configuration
8. If enabled, extension calls `focusWindow(message)` function
9. Focus window function:
   - Executes `workbench.action.focusActiveEditorGroup` command
   - Detects platform (macOS/Windows/Linux)
   - Executes platform-specific OS command to raise window
   - Shows user notification with "Go to Terminal" action button
10. User can click notification button to switch focus to terminal

**Configuration Change Flow:**

1. User modifies `claudeFocus.port` setting in VS Code
2. Configuration change event fires
3. Extension detects `claudeFocus.port` affectsConfiguration
4. Extension stops current server
5. Extension starts new server on updated port

**State Management:**
- `server` variable: Holds reference to active HTTP server instance
- Configuration state: Maintained by VS Code settings system, retrieved on demand
- No persistent application state maintained between sessions

## Key Abstractions

**HTTP Request Handler:**
- Purpose: Abstracts HTTP protocol handling for focus requests
- Location: `src/extension.ts` (lines 40-67)
- Pattern: Standard Node.js http.createServer callback with request routing
- Entry point: POST /focus endpoint
- Responsibilities: Parse request body, validate configuration, trigger focus logic

**Platform Abstraction Layer:**
- Purpose: Encapsulates platform-specific window raising logic
- Location: `src/extension.ts` (lines 94-141)
- Pattern: Platform detection followed by conditional command execution
- Platforms: macOS (AppleScript), Windows (PowerShell P/Invoke), Linux (wmctrl/notify-send)

**Configuration Management:**
- Purpose: Provides single source of truth for extension settings
- Location: `src/extension.ts` (retrieved via `vscode.workspace.getConfiguration("claudeFocus")`)
- Pattern: Lazy retrieval of configuration with sensible defaults
- Settings: `port` (number), `enabled` (boolean), `showNotification` (boolean)

## Entry Points

**VS Code Extension Activation:**
- Location: `src/extension.ts` (export function `activate`)
- Triggers: VS Code startup with activation event `onStartupFinished`
- Responsibilities:
  - Register "claude-focus.focusWindow" command
  - Start HTTP server on configured port
  - Set up configuration change watchers
  - Show activation confirmation message

**HTTP Focus Request Endpoint:**
- Location: `src/extension.ts` (http.createServer handler)
- Triggers: POST request to `http://127.0.0.1:{port}/focus`
- Responsibilities:
  - Route POST /focus requests
  - Parse JSON payload
  - Validate extension is enabled
  - Invoke focus window function

**Manual Focus Command:**
- Location: `src/extension.ts` (lines 11-14)
- Triggers: User runs "Claude Focus: Focus Window" command from VS Code command palette
- Responsibilities: Directly invoke focus window function without external HTTP request

**Extension Deactivation:**
- Location: `src/extension.ts` (export function `deactivate`)
- Triggers: VS Code shutdown or manual extension disable
- Responsibilities: Clean up HTTP server

## Error Handling

**Strategy:** Graceful degradation with user notifications for critical errors, silent failure for non-critical operations

**Patterns:**
- Port already in use (EADDRINUSE): Show warning message to user suggesting configuration change
- JSON parse errors in POST body: Silently ignore, use default message
- OS command execution errors: Silent execution with empty callback (errors not propagated)
- Server shutdown: Explicit cleanup with error event handler removal

## Cross-Cutting Concerns

**Logging:**
- No dedicated logging framework
- User-visible logging via `vscode.window.showInformationMessage()` and `showWarningMessage()`
- Activation messages show selected port for debugging
- External hook scripts log errors to /dev/null

**Validation:**
- Configuration-driven validation (enabled/disabled flag)
- Port availability checked at server startup
- No input validation on message content (allows any JSON body)

**Authentication:**
- Not applicable; localhost-only communication (127.0.0.1)
- No credentials or tokens exchanged
- Trust model: Only accessible from local machine

**Resource Management:**
- HTTP server lifecycle tied to extension lifecycle
- Subscription cleanup via `context.subscriptions.push()`
- Server cleanup on deactivation and port configuration changes
