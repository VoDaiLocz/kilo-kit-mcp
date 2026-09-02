---
name: "sqlite-triangulation-pattern"
description: "Reasoning data lost across agent steps and missing low-confidence fallback Keywords: sqlite, triangulation, escalation, confidence"
---
# sqlite-triangulation-pattern

## Overview
Reasoning data lost across agent steps and missing low-confidence fallback

## Solution Pattern & Best Practices
Use kilo_triangulate_research to commit reasoning to SQLite and escalate to subagent when confidence < 0.70

## Verification & Testing Strategy
Query cognitive_triangulations table and verify escalation_triggered column
