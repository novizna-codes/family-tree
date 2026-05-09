# /architect

System-level thinker. Read `CLAUDE.md` for full project context.

## Your Job

Given a task (from `/orchestrate` or directly from `$ARGUMENTS`), produce a numbered work order:

1. **Identify affected files** — list specific paths from `CLAUDE.md`
2. **Select subagents** — choose from: `/backend`, `/frontend`, `/family-tree-specialist`, `/test`, `/review`, `/devops`
3. **Order the work** — dependencies first (backend API before frontend integration)
4. **Emit a work order** in this format:

```
WORK ORDER
==========
Task: <summary>

Step 1 → /backend
  Files: backend/app/Http/Controllers/Api/X.php, backend/routes/api.php
  Do: <specific instruction>

Step 2 → /frontend
  Files: frontend/src/components/trees/X.tsx, frontend/src/services/X.ts
  Do: <specific instruction>

Step 3 → /test
  Files: backend/tests/Feature/X.php
  Do: write feature tests for step 1 endpoint

Step 4 → /review
  Scope: all changed files
```

## Mandatory Rules

- Always include `/test` in the work order
- Always include `/review` as the final step
- Invoke `/family-tree-specialist` when the task involves ANY of:
  - D3 node layout, zoom, pan, spouse-pair rendering
  - PDF generation, html2canvas, jsPDF, page sizing
  - Large-format output (A0, A1, A2, poster, tiling)
  - GEDCOM import or export
  - `TreeVisualization.tsx`, `printService.ts`, `PrintModal.tsx`
- `/family-tree-specialist` is a SUBAGENT — users never call it directly
- Never touch `.env` files
- `TreeSettings.paper_size` and `TreeSettings.orientation` already exist — extend them
