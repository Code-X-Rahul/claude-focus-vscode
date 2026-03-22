# Coding Conventions

**Analysis Date:** 2026-03-22

## Naming Patterns

**Files:**
- Extension source: `extension.ts` (single entry point module)
- Compiled output: `extension.js` in `out/` directory (generated from TypeScript)
- Hook scripts: Named descriptively with OS suffix (e.g., `claude-focus-hook.sh`, `claude-focus-hook.ps1`)

**Functions:**
- camelCase for all function names: `activate()`, `startServer()`, `stopServer()`, `focusWindow()`
- Prefix descriptive verbs: `start*()`, `stop*()`, `focus*()` clearly indicate action
- Private/utility functions use camelCase: `focusWindow()` is module-private despite no explicit visibility keyword

**Variables:**
- camelCase for all variables: `server`, `port`, `config`, `payload`, `body`, `chunk`
- Descriptive names: `focusCmd`, `newPort`, `reuseCmd`, `workspaceFolder`
- Type-specific prefixes for clarity: `err: NodeJS.ErrnoException`, `stdout: string` (type annotations preferred over prefixes)

**Types:**
- PascalCase for types/interfaces (as per TypeScript convention)
- Optional types explicitly marked: `http.Server | undefined`, `string | undefined`
- Generic payload types inlined: `{ message?: string; type?: string }`

**Constants:**
- hardcoded configuration values used directly: port `19876`, command names like `"claude-focus.focusWindow"`, configuration keys like `"claudeFocus.port"`
- No uppercase constant convention - values are treated as literals

## Code Style

**Formatting:**
- TypeScript source uses standard 2-space indentation
- No explicit formatter configured (no `.prettierrc`, `.editorconfig`, or Prettier config found)
- Lines preserved with natural breaking for readability (e.g., multi-line conditional chains)
- Template strings preferred for interpolation: `` `Claude Focus active on port ${port}` ``

**Linting:**
- No ESLint config found (no `.eslintrc`, `eslint.config.*`)
- Strict TypeScript compiler enforced via `tsconfig.json`: `"strict": true`
- TypeScript compilation is the only code quality gate

**TypeScript Compiler Settings:**
- `strict: true` - enables all strict type checks
- `target: ES2020` - modern ECMAScript output
- `module: commonjs` - Node.js compatible module system
- `sourceMap: true` - source maps generated for debugging
- All options in `tsconfig.json` at root level

## Import Organization

**Order:**
1. External library imports (`import * as vscode from "vscode"`)
2. Built-in Node.js modules (`import * as http from "http"`)
3. No local imports in current codebase (single file extension)

**Path Aliases:**
- Not used (no `paths` configured in `tsconfig.json`)
- All imports are absolute module names
- Namespace imports preferred: `import * as vscode from "vscode"` and `import * as http from "http"`

**Special case for dynamic requires:**
- `require("child_process")` used dynamically within function scope (line 93) for lazy loading: `const { exec } = require("child_process")`
- Justified for runtime platform detection to avoid loading unnecessary Node.js module at startup

## Error Handling

**Patterns:**

1. **Silent error callbacks:**
   ```typescript
   exec(command, () => {})  // Empty callback - errors ignored by design
   ```
   - Used for OS-level window raising commands (lines 100, 116, 124, 137-139)
   - Rationale: Best-effort window raising; failure doesn't block notification flow
   - Notification still displays even if OS window raise fails

2. **Named error parameter with type guard:**
   ```typescript
   server.on("error", (err: NodeJS.ErrnoException) => {
     if (err.code === "EADDRINUSE") {
       vscode.window.showWarningMessage(...)
     }
   })
   ```
   - Explicit type annotation for Node.js error objects
   - Check specific error code before showing user message

3. **Try-catch with empty catch:**
   ```typescript
   try {
     payload = JSON.parse(body);
   } catch {
     // empty body is fine
   }
   ```
   - JSON parsing wrapped with try-catch (line 53-57)
   - Comment explains intent: missing/empty body is acceptable for /focus endpoint
   - Graceful degradation: `payload` remains `{}` on parse failure

4. **Configuration with fallbacks:**
   ```typescript
   const port = config.get<number>("port", 19876);
   ```
   - Always provide default value as second argument
   - Prevents undefined/null for missing settings
   - Consistent default value `19876` used throughout

## Logging

**Framework:** `vscode.window` (VS Code notification API)

**Patterns:**
- `vscode.window.showInformationMessage()` - info level (lines 34, 146-152)
- `vscode.window.showWarningMessage()` - warning level (lines 72-74)
- No console.log() or debug logging found
- All user-facing messages use VS Code's built-in notification system

**When to log:**
- Extension activation: "Claude Focus active on port {port}"
- Configuration errors: port in use warnings
- User prompts: "Claude Code needs your attention!" with action button
- Interactive choice handling: "Go to Terminal" button callback

## Comments

**When to Comment:**
- Inline comments explain intent on complex platform-specific code (lines 89, 92, 97, 102, 117)
- Comments precede major sections: `// Focus the VS Code window via its built-in command`
- Comments explain non-obvious choices: `// empty body is fine` explains why empty JSON parse result is acceptable
- Comments describe fallback behavior: `// Restart server if config changes`, `// Raise the OS window to the front (platform-specific)`

**JSDoc/TSDoc:**
- Not used in this codebase (single file, straightforward functions)
- Function signatures are self-documenting with TypeScript types
- No complex function documentation needed for small extension

## Function Design

**Size:**
- Small, focused functions: `startServer()` 40 lines, `stopServer()` 5 lines, `focusWindow()` 54 lines
- Single responsibility: each function handles one concern
- No large utility functions

**Parameters:**
- Functions accept single optional parameter when appropriate: `focusWindow(message?: string)`
- Optional parameters use TypeScript `?` syntax
- Type annotations always present: no implicit `any`

**Return Values:**
- Most functions return `void` (commands, event handlers, server operations)
- Event callbacks (`on("data")`, `on("end")`) return `void` implicitly
- Functions modifying global state (`startServer`, `stopServer`, `focusWindow`) don't return values
- No explicit return statements for void functions except where required

## Module Design

**Exports:**
- Only two exports from `extension.ts`: `activate()` and `deactivate()`
- Both are required by VS Code Extension API contract
- All internal functions (`startServer`, `stopServer`, `focusWindow`) are private (no export keyword)

**Barrel Files:**
- Not applicable (single source file `src/extension.ts`)
- Out directory contains only compiled `extension.js` from single source

**Initialization Pattern:**
```typescript
export function activate(context: vscode.ExtensionContext) {
  // Setup happens here
  // Commands registered
  // Server started
  // Event listeners attached
}

export function deactivate() {
  // Cleanup happens here
  stopServer();
}
```
- Standard VS Code extension lifecycle
- `activate()` handles all startup logic
- `deactivate()` handles cleanup (called when extension disabled/uninstalled)

## Platform-Specific Code

**Organization:**
- Single `focusWindow()` function handles all platform logic via `process.platform` check (lines 96-141)
- Three branch conditions: `darwin` (macOS), `win32` (Windows), else (Linux)
- Each platform uses native utilities: AppleScript (macOS), PowerShell (Windows), wmctrl/notify-send (Linux)
- Consistent pattern: `exec()` command execution with optional callbacks

---

*Convention analysis: 2026-03-22*
