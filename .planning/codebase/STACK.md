# Technology Stack

**Analysis Date:** 2026-03-22

## Languages

**Primary:**
- TypeScript 5.9.3 - Extension source code and CLI interfaces
- Bash - macOS/Linux hook scripts for Claude Code integration
- PowerShell - Windows hook script for Claude Code integration

**Secondary:**
- JavaScript - Runtime for compiled TypeScript (ES2020 target)
- Shell script - System integration and process control

## Runtime

**Environment:**
- Node.js 14.17+ (supports up to 22.22.0)
- VS Code 1.85.0+ (VS Code extension runtime)

**Package Manager:**
- npm 10.9.4
- Lockfile: package-lock.json (present)

## Frameworks

**Core:**
- VS Code Extension API (@types/vscode 1.110.0) - Extension development framework
  - Built-in modules: `vscode` for window management, commands, configuration
  - Built-in modules: `http` (Node.js) for local server implementation

**Build/Dev:**
- TypeScript 5.9.3 - Source transpilation and type checking
- @vscode/vsce - VSIX packaging and distribution tool

## Key Dependencies

**Development Only:**
- @types/node 20.19.37 - Node.js type definitions
- @types/vscode 1.110.0 - VS Code API type definitions
- typescript 5.9.3 - TypeScript compiler

**Production (Built-in):**
- vscode - Core VS Code extension API (0-external dependencies)
- http - Node.js built-in HTTP server module (native)
- child_process - Node.js module for process execution (native)

## Configuration

**Environment:**
- Configuration stored in VS Code settings under `claudeFocus.*` namespace
- Environment variable support: `CLAUDE_FOCUS_PORT` (default: 19876) - overrides settings for hook scripts

**Key Configuration Options:**
- `claudeFocus.port` - Local HTTP server port (default: 19876)
- `claudeFocus.enabled` - Enable/disable automatic window focusing (default: true)
- `claudeFocus.showNotification` - Show VS Code notification on focus (default: true)

**Build:**
- `tsconfig.json` - TypeScript compiler configuration
  - Target: ES2020
  - Module: CommonJS
  - Output directory: `./out`
  - Source directory: `./src`
  - Strict mode: enabled
  - Source maps: enabled

## Platform Requirements

**Development:**
- Node.js 18+ recommended (as noted in README)
- npm 10.x compatible
- VS Code extension development environment

**Production:**
- macOS: AppleScript support (built-in)
- Windows: PowerShell 5.0+ with Win32 API access
- Linux: wmctrl or code CLI, notify-send, canberra-gtk-play or paplay

**Operating System Support:**
- macOS (AppleScript-based window activation)
- Windows (PowerShell Win32 API calls)
- Linux (wmctrl, X11/Wayland compatible with fallback)

---

*Stack analysis: 2026-03-22*
