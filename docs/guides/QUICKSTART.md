# ⚡ Kilo-Kit Quick Start Guide

## Installation
```bash
npm install -g @vodailoc/kilo-kit-mcp
kilo-kit-init global
```

## Running System Doctor
```bash
npm run doctor
```

## Starting in Claude Code, Antigravity, or Cursor
Add to your client MCP configuration:
```json
{
  "mcpServers": {
    "kilo-kit": {
      "command": "kilo-kit-mcp",
      "args": []
    }
  }
}
```
