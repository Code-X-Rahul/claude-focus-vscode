# External Integrations

**Analysis Date:** 2026-03-22

## APIs & External Services

**HTTP Communication:**
- Local HTTP Server (in-process)
  - What it's used for: Receives focus requests from Claude Code hook scripts
  - Protocol: HTTP POST to `/focus` endpoint
  - Port: 19876 (configurable via `claudeFocus.port` or `CLAUDE_FOCUS_PORT`)
  - Implementation: Node.js built-in `http` module

**Claude Code Hooks:**
- Integration point: Notification hook execution
  - Type: Command-based hook invocation
  - Payload format: JSON with `message` and `notification_type` fields
  - Execution: Triggered when Claude Code needs user input/confirmation

## Data Storage

**Databases:**
- None - stateless extension

**File Storage:**
- None - configuration stored in VS Code settings only

**Caching:**
- None - real-time request handling

## Authentication & Identity

**Auth Provider:**
- None required - local machine communication only
- Security: Port bound to 127.0.0.1 (localhost only)

## Monitoring & Observability

**Error Tracking:**
- None - errors logged to VS Code extension output channel via `showWarningMessage`

**Logs:**
- VS Code notification messages and system logs
- Error handling via `server.on("error")` event handler
- Hook scripts suppress stderr/stdout with `> /dev/null 2>&1`

## CI/CD & Deployment

**Hosting:**
- VS Code Marketplace (primary distribution via publisher "RahulRajput")
- VSIX package format (self-contained `.vsix` files)

**CI Pipeline:**
- None configured - manual packaging via `npm run package`
- Build command: `npm run compile` → TypeScript compilation
- Package command: `npx @vscode/vsce package` → VSIX generation

**Distribution:**
- VS Code Extension Marketplace
- Direct VSIX file installation: `code --install-extension claude-focus-*.vsix`

## Environment Configuration

**Required env vars:**
- `CLAUDE_FOCUS_PORT` (optional) - Override default port 19876 for hook scripts

**Secrets location:**
- No secrets required - extension operates on local machine only
- Configuration stored in user's VS Code settings (`~/.config/Code/settings.json` or platform equivalent)

## Webhooks & Callbacks

**Incoming:**
- POST `/focus` endpoint
  - Accepts JSON body with optional `message` and `type` fields
  - Returns JSON: `{ status: "focused" }` or `{ status: "disabled" }`
  - Error responses: 404 for non-matching routes

**Outgoing:**
- None - extension only receives requests

## Hook Integration Details

**Command Execution:**
- Location: `src/extension.ts` lines 93-141
- Executes platform-specific commands:
  - **macOS**: AppleScript via `osascript`
  - **Windows**: PowerShell Win32 API calls
  - **Linux**: `code --reuse-window`, `wmctrl`, `notify-send`, sound playback

**Hook Scripts Location:**
- `hooks/claude-focus-hook.sh` - macOS/Linux hook
  - Reads JSON from stdin
  - Makes HTTP POST to localhost port
  - Timeout: 2 seconds
- `hooks/claude-focus-hook.ps1` - Windows hook
  - PowerShell-based JSON parsing
  - HTTP POST via `Invoke-RestMethod`
  - Error-tolerant execution

**Hook Configuration:**
- Stored in Claude Code settings file: `~/.claude/settings.json` or `.claude/settings.json`
- Hooks system: "Notification" trigger
- Hook type: "command" with full path to script

---

*Integration audit: 2026-03-22*
