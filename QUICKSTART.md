# ⚡ Quick Start

Get Kilo-Kit up and running across your AI coding assistants in under 60 seconds.

### Prerequisites
- **Node.js**: `>= 20.0.0`
- **OS**: macOS (Apple Silicon & Intel), Linux, Windows (PowerShell / WSL2)

---

## 1. Fast Setup (Recommended)

Install Kilo-Kit globally and automatically configure all installed AI clients (Cursor, Claude, Windsurf, Antigravity, Gemini):

```bash
npm install -g @vodailocz/kilo-kit-mcp
kilo-kit-init global
```

Verify your installation:
```bash
kilo-kit-doctor
```

---

## 2. Zero-Install Setup (NPX)

Prefer not to install globally? Add Kilo-Kit directly to your client MCP configuration:

### Cursor & Windsurf (`.cursor/mcp.json` or `~/.codeium/windsurf/mcp_config.json`)
```json
{
  "mcpServers": {
    "kilo-kit": {
      "command": "npx",
      "args": ["-y", "@vodailocz/kilo-kit-mcp"]
    }
  }
}
```

### Claude Desktop
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\\Claude\\claude_desktop_config.json`
- **Linux:** `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "kilo-kit": {
      "command": "npx",
      "args": ["-y", "@vodailocz/kilo-kit-mcp"]
    }
  }
}
```

### Claude Code CLI
```bash
claude mcp add kilo-kit npx -y @vodailocz/kilo-kit-mcp
```

### Antigravity & Gemini CLI (`~/.gemini/antigravity-cli/mcp_config.json`)
```json
{
  "mcpServers": {
    "kilo-kit": {
      "command": "npx",
      "args": ["-y", "@vodailocz/kilo-kit-mcp"]
    }
  }
}
```

---

## 3. Team Repository Rollout

Bootstrap the Kilo-Kit C4 Cognitive Protocol into any project repository (`CLAUDE.md`, `AGENTS.md`, `GEMINI.md`):

```bash
cd your-project
kilo-kit-init init --client all
git add CLAUDE.md AGENTS.md GEMINI.md
git commit -m "chore: configure Kilo-Kit C4 protocol"
```

*Or use the global git alias anywhere:*
```bash
git kilo-init
```
