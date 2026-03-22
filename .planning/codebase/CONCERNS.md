# Codebase Concerns

**Analysis Date:** 2026-03-22

## Security Issues

**Command Injection in focusWindow() via message parameter:**
- Risk: Untrusted message parameter from POST body is passed directly into shell commands on Linux without proper escaping
- Files: `src/extension.ts` (lines 59, 127-129, 147)
- Current mitigation: Only `.replace(/"/g, '\\"')` is applied on Linux notify-send command, but this is insufficient for shell injection
- Scenario: A malicious POST request with message like `"; rm -rf /; "` could execute arbitrary commands
- Recommendations:
  - Use `execFile()` or `child_process.spawn()` instead of `exec()` with proper argument arrays
  - Sanitize or reject message parameter containing shell metacharacters
  - Consider using a safer notification library that doesn't require shell escaping

**Command Injection via workspace path on Linux:**
- Risk: `vscode.workspace.workspaceFolders?.[0]?.uri.fsPath` is interpolated directly into shell command without quoting
- Files: `src/extension.ts` (lines 119-124)
- Current mitigation: None - paths with spaces or special characters will break
- Scenario: Workspace path containing backticks or `$()` could execute arbitrary code
- Recommendations: Always quote workspace paths in shell commands or use `execFile()` with array arguments

**HTTP Server Port Binding Without Authentication:**
- Risk: Local HTTP server on `127.0.0.1:19876` accepts POST requests without any authentication/validation
- Files: `src/extension.ts` (lines 40-68)
- Current mitigation: Only localhost binding, but any local process can send requests
- Scenario: Malicious local application could spam focus requests or inject messages
- Recommendations:
  - Implement shared secret/token validation in POST body
  - Validate message content length and format more strictly
  - Consider using Unix domain socket instead of HTTP port on Unix-like systems

**Unsafe Dynamic Command Construction on Windows:**
- Risk: PowerShell command string is built dynamically and injected into exec()
- Files: `src/extension.ts` (lines 104-116)
- Current mitigation: None - though hardcoded command, this pattern is fragile
- Scenario: If message parameter were added to PowerShell command, it would be vulnerable
- Recommendations: Use `execFile('powershell.exe', ['-NoProfile', '-Command', psScript])` instead

## Performance Bottlenecks

**Synchronous Child Process Execution:**
- Problem: `exec()` is called synchronously in the UI thread on every focus request, blocking VS Code
- Files: `src/extension.ts` (lines 93-140)
- Cause: No async/await or Promise handling; multiple exec() calls with empty callbacks
- Impact: On slow systems, 3-4 sequential exec() calls (Linux: code, notify-send, sound) could freeze UI for 100-200ms
- Improvement path:
  - Use `execFile()` with promises/async-await
  - Run system commands in parallel where possible (Promise.all for notify-send + sound)
  - Add timeout handling since callbacks are empty

**HTTP Server Event Handling Without Size Limit:**
- Problem: `req.on("data", (chunk) => (body += chunk))` accumulates data unbounded
- Files: `src/extension.ts` (lines 42-43)
- Cause: No `Content-Length` validation or stream limit
- Impact: Large POST bodies could accumulate in memory indefinitely
- Improvement path:
  - Check `Content-Length` header before accepting body
  - Implement max body size limit (e.g., 10KB)
  - Add timeout to request handling

**Repeated Configuration Access:**
- Problem: `vscode.workspace.getConfiguration("claudeFocus")` called multiple times per focus request
- Files: `src/extension.ts` (lines 45, 143)
- Cause: Configuration is fetched after body parsing instead of once at request start
- Impact: Minimal impact but inefficient for high-frequency requests
- Improvement path: Cache config object at function start

## Fragile Areas

**Platform-Specific Command Paths Hard-Coded:**
- Files: `src/extension.ts` (lines 93-141)
- Why fragile:
  - `wmctrl` availability not checked before use on Linux
  - AppleScript path assumption for macOS
  - PowerShell path assumption for Windows
  - These commands may fail silently with empty error callbacks
- Safe modification:
  - Wrap each exec() in try-catch or check for command availability
  - Verify `wmctrl -l` succeeds before using it
  - Log warnings when platform-specific tools fail
- Test coverage: No error logs or warnings on command failure

**Linux Window Manager Detection Not Implemented:**
- Files: `src/extension.ts` (lines 117-124), `README.md` (lines 248)
- Why fragile:
  - Wayland detection is documented as "may not be supported" for non-GNOME
  - No runtime detection of Wayland vs X11
  - Falls back to `wmctrl` which doesn't work on Wayland
- Safe modification:
  - Detect XDG_SESSION_TYPE environment variable at startup
  - Provide fallback paths for unsupported window managers
  - Document limitations clearly

**Hook Script Shell Parsing Fragility:**
- Files: `hooks/claude-focus-hook.sh` (lines 6-7)
- Why fragile:
  - Uses `grep -o` and `cut` to parse JSON instead of proper JSON parser
  - Will fail or parse incorrectly if JSON fields contain quotes or newlines
  - Example: message containing `\"` will break parsing
- Safe modification:
  - Use `jq` for JSON parsing: `echo "$INPUT" | jq -r '.message'`
  - Or use Python: `python3 -c "import json, sys; print(json.load(sys.stdin).get('message'))"`
  - Test with messages containing special characters

## Test Coverage Gaps

**No Automated Tests:**
- What's not tested: All core functionality is untested
  - HTTP server request handling
  - Platform-specific window focusing
  - Configuration change detection
  - Error handling for port conflicts
- Files: No test directory or test files present
- Risk:
  - Regressions in platform-specific code (macOS, Windows, Linux) go unnoticed
  - Command injection vulnerabilities not caught by tests
  - Configuration change hot-reload edge cases not verified
- Priority: High - this is a production VS Code extension with platform-specific code

**No Integration Tests for Hooks:**
- What's not tested: Hook scripts in actual Claude Code environment
- Files: `hooks/claude-focus-hook.sh`, `hooks/claude-focus-hook.ps1`
- Risk: Hook failures in production only discovered by users
- Priority: High - hook failures block Claude Code's workflow

**No Cross-Platform Testing:**
- What's not tested: Windows and macOS code paths verified only on Linux dev machine (based on recent commit history)
- Risk: Platform-specific bugs latent until extension used on actual platform
- Priority: High - extension claims to support all three platforms

## Known Bugs

**Empty Error Callbacks in exec() Calls:**
- Symptoms: When shell commands fail (wmctrl not installed, PowerShell unavailable), errors are silently ignored
- Files: `src/extension.ts` (lines 98, 116, 124, 128, 138)
- Trigger: Run extension on Linux without `wmctrl` installed; window won't raise but no error shown
- Workaround: Check system logs manually; extension shows no warning
- Impact: User won't know why window isn't raising to front

**Message Parameter Display Without Sanitization:**
- Symptoms: Notification message shows raw user input in VS Code UI
- Files: `src/extension.ts` (lines 145, 147)
- Trigger: Send focus request with HTML or emoji-heavy message
- Workaround: None - message displays as-is
- Impact: Unexpected characters could render poorly in VS Code notification

**Hook Script curl Timeout Insufficient for Slow Systems:**
- Symptoms: Hook script returns success even if focus request times out
- Files: `hooks/claude-focus-hook.sh` (line 14-16)
- Trigger: Run on system with slow network or high CPU; `--max-time 2` insufficient
- Workaround: User won't know focus failed to trigger
- Impact: Claude Code won't get feedback that focus request failed

## Scaling Limits

**HTTP Server Single-Threaded:**
- Current capacity: Node.js HTTP server handles ~1000s requests/sec per port
- Limit: Only one port number configurable; if user runs multiple VS Code instances, port conflict occurs
- Scaling path:
  - Support multiple VS Code instances via unique ports (e.g., auto-increment per instance)
  - Or use OS-level APIs instead of HTTP (e.g., D-Bus on Linux)
  - Document port allocation strategy for multi-instance setups

## Dependencies at Risk

**Minimal Dependency Set is Good:**
- Project has zero runtime dependencies, only dev tools (@types/*, typescript)
- Risk: None - no package manager vulnerabilities
- Maintenance burden: Low

## Missing Critical Features

**No Logging:**
- Problem: Cannot debug why focus requests succeed/fail in production
- Blocks: Troubleshooting user issues
- Workaround: Restart VS Code with verbose output
- Recommendation: Add logging to startServer() and focusWindow() with configurable verbosity

**No Request Rate Limiting:**
- Problem: Malicious or buggy hook could spam focus requests
- Blocks: Protecting user experience from noisy integrations
- Recommendation: Implement simple rate limiting (max 10 requests/second per source)

**No Validation of Message Field Type:**
- Problem: POST body message is assumed to be string but not type-checked
- Blocks: Robustness against malformed requests
- Current code: `payload.message` could be null, object, array, number
- Recommendation: Validate message is string and limit length to 500 chars

**Windows PowerShell Hardcoded - No Core Process Fallback:**
- Problem: If PowerShell unavailable, no fallback window raising method
- Blocks: Edge case Windows environments without PowerShell
- Recommendation: Fall back to `SetForegroundWindow` via native module or simpler approach

## Architecture Concerns

**Global Server State:**
- Files: `src/extension.ts` (line 4)
- Concern: Single `server` variable persists across config changes; stopServer()/startServer() dance could leave sockets in TIME_WAIT
- Fragile: If stopServer() doesn't fully cleanup, port rebind fails
- Recommendation: Store server reference in context.subscriptions instead of module global
