# Codebase Structure

**Analysis Date:** 2026-03-22

## Directory Layout

```
claude-focus-vscode/
├── src/                    # TypeScript source code
│   └── extension.ts        # Main extension implementation
├── hooks/                  # External hook scripts for Claude Code integration
│   ├── claude-focus-hook.sh     # macOS/Linux hook script
│   └── claude-focus-hook.ps1    # Windows hook script
├── out/                    # Compiled JavaScript output (generated)
├── .claude/                # Claude Code configuration directory
├── .git/                   # Git repository data
├── .planning/              # GSD planning artifacts
├── package.json            # Node.js project manifest
├── package-lock.json       # Dependency lock file
├── tsconfig.json           # TypeScript compiler configuration
├── .gitignore              # Git ignore rules
├── .vscodeignore           # Files to exclude from .vsix package
└── README.md               # Project documentation
```

## Directory Purposes

**src/**
- Purpose: TypeScript source code for the VS Code extension
- Contains: Single entry point implementing extension logic
- Key files: `extension.ts` (159 lines)

**hooks/**
- Purpose: External hook scripts invoked by Claude Code when notifications fire
- Contains: Platform-specific shell scripts (bash for Unix, PowerShell for Windows)
- Key files: `claude-focus-hook.sh`, `claude-focus-hook.ps1`

**out/**
- Purpose: Compiled JavaScript output from TypeScript compilation
- Contains: Generated JavaScript and source maps
- Generated: Yes (via `npm run compile`)
- Committed: No (in .gitignore)

**.claude/**
- Purpose: Claude Code configuration directory
- Contains: Claude Code settings and metadata
- Generated: Yes (by Claude Code)
- Committed: No

**.planning/**
- Purpose: GSD (Get Stuff Done) planning artifacts and analysis documents
- Contains: Codebase analysis documents (ARCHITECTURE.md, STRUCTURE.md, etc.)
- Generated: Yes (by GSD mapping tools)
- Committed: Yes (tracking design decisions)

## Key File Locations

**Entry Points:**
- `src/extension.ts`: Main extension code containing `activate` export function
  - Called by VS Code runtime on extension activation event `onStartupFinished`
  - Exports `deactivate` function for cleanup
- `out/extension.js`: Compiled JavaScript entry point specified in `package.json` "main" field

**Configuration:**
- `package.json`: Extension metadata, VS Code manifest, build scripts
- `tsconfig.json`: TypeScript compiler options (ES2020 target, strict mode, commonjs modules)
- `.vscodeignore`: Files excluded when packaging .vsix extension file

**Core Logic:**
- `src/extension.ts`: Entire extension implementation
  - Lines 1-4: Module imports and server reference
  - Lines 6-37: Extension activation and configuration watching
  - Lines 39-79: HTTP server implementation
  - Lines 81-86: Server cleanup
  - Lines 88-154: Focus window logic with platform detection
  - Lines 156-158: Deactivation hook

**Integration Scripts:**
- `hooks/claude-focus-hook.sh`: Bash script for macOS/Linux integration
  - Parses JSON from stdin
  - Sends HTTP POST to extension server
- `hooks/claude-focus-hook.ps1`: PowerShell script for Windows integration
  - Parses JSON from stdin
  - Sends HTTP POST to extension server

**Compiled Output:**
- `out/extension.js`: Compiled extension code

## Naming Conventions

**Files:**
- TypeScript source files: lowercase with hyphens (e.g., `extension.ts`)
- Shell scripts: lowercase with hyphens and appropriate extension (e.g., `claude-focus-hook.sh`)
- Generated output: matching source name in `out/` directory (e.g., `out/extension.js`)
- Configuration files: dot-prefix for system files (e.g., `.gitignore`, `.vscodeignore`, `tsconfig.json`)

**Directories:**
- Source code: lowercase plural (e.g., `src/`, `hooks/`)
- Generated/temporary: lowercase (e.g., `out/`, `.claude/`)
- System: dot-prefix (e.g., `.git/`, `.planning/`)

**Variables:**
- Extension-wide references: camelCase (e.g., `server`, `config`, `port`, `payload`)
- VS Code extension context: pascalCase from VS Code API (e.g., `ExtensionContext`, `ErrnoException`)
- Configuration keys: camelCase dot-notation (e.g., `claudeFocus.port`, `claudeFocus.enabled`)

**Functions:**
- Private module functions: camelCase (e.g., `startServer()`, `stopServer()`, `focusWindow()`)
- Public exports: camelCase (e.g., `activate()`, `deactivate()`)
- Callback functions: anonymous or descriptive names (e.g., error handler in server.on())

**Types:**
- VS Code API types: Use as-is (e.g., `vscode.ExtensionContext`, `http.Server`, `NodeJS.ErrnoException`)
- Inline type definitions: camelCase object literals (e.g., `payload: { message?: string; type?: string }`)

## Where to Add New Code

**New Feature (e.g., additional OS platform support):**
- Primary code: Add to `src/extension.ts` in `focusWindow()` function
- Platform detection: Extend platform check (lines 94-141)
- Tests: Add to test file if testing framework added

**New Command:**
- Implementation: Add new function in `src/extension.ts`
- Registration: Add `vscode.commands.registerCommand()` call in `activate()` function
- Package.json: Add command to `contributes.commands` array
- Example: Manual focus command implemented at lines 11-14

**New Configuration Setting:**
- Declaration: Add to `package.json` `contributes.configuration.properties`
- Retrieval: Use `vscode.workspace.getConfiguration("claudeFocus").get<TYPE>()`
- Usage: Example shown in `activate()` (lines 7-8, 23-25) and `startServer()` (lines 45-46)
- Change watching: Register watchers in `activate()` using `onDidChangeConfiguration()`

**New HTTP Endpoint:**
- Implementation: Add conditional branch to request handler in `startServer()` (lines 40-67)
- Method check: Extend `if (req.method === "POST" && req.url === "/focus")` condition
- Response handling: Return JSON response via `res.writeHead()` and `res.end()`

**Utility Functions:**
- Location: Add to `src/extension.ts` as private module-level functions
- Pattern: Follow existing function style (startServer, stopServer, focusWindow)
- No separate utilities directory; keep everything in single extension.ts file

**Hook Scripts:**
- macOS/Linux: Extend `hooks/claude-focus-hook.sh` for additional parsing or payload construction
- Windows: Extend `hooks/claude-focus-hook.ps1` for additional parsing or payload construction
- Both: Must maintain curl/Invoke-RestMethod calls to localhost:port/focus endpoint

## Special Directories

**out/:**
- Purpose: Compiled JavaScript output from TypeScript
- Generated: Yes (via `npm run compile` or `npm run watch`)
- Committed: No (.gitignore entries prevent commit)
- Build target: Specified in `tsconfig.json` "outDir"

**.planning/codebase/:**
- Purpose: GSD codebase analysis documents
- Generated: Yes (by `/gsd:map-codebase` command)
- Committed: Yes (tracking architectural decisions and patterns)
- Contents: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, INTEGRATIONS.md, CONCERNS.md

**.vsix packages:**
- Purpose: Packaged VS Code extension files for distribution
- Generated: Yes (via `npm run package`)
- Committed: Yes (specific versions committed as release artifacts)
- Pattern: `claude-focus-*.vsix` files in root directory
- Contents: Compiled extension code, metadata, icons (excludes hooks/ per .vscodeignore)
