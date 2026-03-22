# Testing Patterns

**Analysis Date:** 2026-03-22

## Test Framework

**Runner:**
- No automated test framework configured
- No test runner dependencies found (no Jest, Vitest, Mocha, etc.)
- TypeScript compilation via `tsc` is the primary quality gate

**Assertion Library:**
- Not applicable (no test framework installed)

**Run Commands:**
```bash
npm run compile              # Compile TypeScript with type checking
npm run watch               # Watch mode - recompile on file changes
npm run package             # Package extension into .vsix
npm run vscode:prepublish   # Pre-publication build (runs compile)
```

**Manual Testing:**
The project relies entirely on manual testing via curl/PowerShell:
```bash
# macOS/Linux
curl -X POST http://127.0.0.1:19876/focus \
  -H "Content-Type: application/json" \
  -d '{"message": "Test: Claude needs your attention!"}'

# Windows PowerShell
Invoke-RestMethod -Uri "http://127.0.0.1:19876/focus" `
  -Method POST -ContentType "application/json" `
  -Body '{"message": "Test: Claude needs your attention!"}'
```
- Documented in README.md (lines 142-154)
- Manual verification step in installation instructions (Step 3: Verify It Works)

## Test File Organization

**Location:**
- No test files found in repository
- No `.test.ts`, `.spec.ts` files present
- No dedicated `tests/`, `__tests__/`, or `test/` directory

**Naming:**
- Not applicable - no test files

**Structure:**
- Not applicable - no test files

## Test Structure

**Suite Organization:**
- Not applicable - no automated tests

**Patterns:**
- Testing is entirely manual via extension host or curl/HTTP requests
- No setup/teardown patterns
- No assertion patterns (no test framework)

## Mocking

**Framework:**
- Not applicable - no test framework

**Patterns:**
- Not applicable - no test mocks

**What to Mock:**
- No guidance available (no testing infrastructure)

**What NOT to Mock:**
- No guidance available (no testing infrastructure)

## Fixtures and Factories

**Test Data:**
- Not applicable - no test fixtures or factories

**Location:**
- Not applicable - no test infrastructure

## Coverage

**Requirements:**
- No coverage requirements enforced
- No coverage thresholds configured
- No coverage tooling installed (no Istanbul, NYC, Vitest coverage)

**View Coverage:**
- Not available (no test framework configured)

## Test Types

**Unit Tests:**
- Not implemented
- Individual function testing would require extracting functions or using VS Code Extension test host
- Current extension is small enough (158 lines) that unit tests may not be critical

**Integration Tests:**
- Manual HTTP endpoint testing via curl/PowerShell
- Extension activation tested via VS Code Extension Development Host
- Server startup/shutdown tested by running `npm run watch` and launching F5 debug session (documented in README.md line 39)

**E2E Tests:**
- Not automated
- Manual end-to-end testing steps:
  1. Run extension in debug mode or install compiled .vsix
  2. Verify server starts with success message
  3. Test HTTP endpoint with curl
  4. Verify window focus and notification appears
  5. Test configuration changes trigger server restart
  6. Test platform-specific window raising (macOS AppleScript, Windows PowerShell, Linux wmctrl)

## Common Testing Scenarios

**HTTP Server Endpoint Testing:**

Manual test via curl (macOS/Linux):
```bash
curl -X POST http://127.0.0.1:19876/focus \
  -H "Content-Type: application/json" \
  -d '{"message": "Test: Claude needs your attention!"}'
```

Expected response:
```json
{"status": "focused"}
```

Error cases:
- Wrong URL → 404 response
- Wrong method (GET instead of POST) → 404 response
- Extension disabled via setting → `{"status": "disabled"}`
- Invalid JSON body → gracefully handled, `payload` remains `{}`

**Configuration Changes:**

Manual test:
1. Extension running on default port 19876
2. Change `claudeFocus.port` setting in VS Code
3. Verify `onDidChangeConfiguration` event triggers
4. Verify server restarts on new port
5. Curl endpoint on new port should work

**Extension Lifecycle:**

Testing via VS Code debug host:
1. F5 opens Extension Development Host
2. Activation event `onStartupFinished` triggers `activate()`
3. Server starts and listens on configured port
4. Verify message: "Claude Focus active on port 19876"
5. Manual focus command via Command Palette: "Claude Focus: Focus Window"
6. Close debug host → `deactivate()` called → server cleaned up

**Platform-Specific Window Raising:**

Manual verification for each platform:
- **macOS**: Run in debug host, test HTTP request, watch `osascript` execute
- **Windows**: Run in debug host, test HTTP request, watch PowerShell execute SetForegroundWindow
- **Linux**: Run in debug host, test HTTP request, watch `wmctrl` or notify-send execute

## Test-Related Configuration

**tsconfig.json:**
- Strict mode enabled: `"strict": true`
- Type checking enforced at compile time
- Only quality gate besides manual testing

**No Test Dependencies:**
- package.json contains only:
  - `@types/node` - runtime type definitions
  - `@types/vscode` - VS Code API type definitions
  - `typescript` - TypeScript compiler
- No devDependencies for testing frameworks

## Why No Automated Tests

**Size and Scope:**
- Single source file: `src/extension.ts` (158 lines)
- Minimal logic: server startup, HTTP handling, platform-specific shell execution
- VS Code API and system commands difficult to mock without significant test infrastructure

**Nature of Extension:**
- Platform-specific code (AppleScript, PowerShell, wmctrl) requires OS interaction
- VS Code Extension API requires running in Extension Development Host
- HTTP server requires network setup
- Automated tests would require:
  - Mock HTTP server
  - Mock VS Code API
  - Mock shell execution (exec)
  - VS Code Extension test suite (complex setup)

**Current Approach:**
- Manual testing via curl is documented and straightforward
- Extension host debug mode provides real environment testing
- Small codebase makes manual review effective
- Type safety from strict TypeScript reduces bugs

---

*Testing analysis: 2026-03-22*
