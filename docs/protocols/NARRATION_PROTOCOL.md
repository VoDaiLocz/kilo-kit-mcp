# 📢 Inter-Tool Narration & Decision Visibility Protocol

## 1. The Zero-Silent-Chains Law
AI Agents must NEVER execute consecutive tool calls without emitting a 1-2 sentence intermediate progress update directly to the user terminal.

## 2. Micro-Narration Format
Before invoking each subsequent tool, the agent outputs:
- **`[DECISION]:`** What was just concluded, selected, or verified.
- **`[NEXT]:`** What tool is being called next and for what specific purpose.

```text
[DECISION]: Grounded Triangulation completed for Option C (Confidence: 95%).
[NEXT]: Calling kilo_grill_plan to stress-test adversarial risk factors.
```
