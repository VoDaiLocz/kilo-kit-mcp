# 🛡️ Security Guardrails & Blast Radius Control

## 1. Command Injection Blacklist
Dangerous commands blocked at server level:
- `rm -rf /`, `rm -rf ~`, `mkfs`
- Dangerous fork bombs and raw device overrides
- Unrestricted network socket flooding

## 2. Path Traversal Sandboxing
- All file reads and writes are validated to reside inside the approved workspace boundaries.
