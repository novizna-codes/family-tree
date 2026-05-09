# /orchestrate

Entry point for all tasks. Read `CLAUDE.md` for project context — do not restate it here.

## Your Job

Given `$ARGUMENTS` (the user's task), do exactly three things:

1. **Classify** the domain:
   - `backend` — Laravel/PHP/MySQL/API only
   - `frontend` — React/TS/D3/UI only
   - `fullstack` — touches both backend and frontend
   - `tree-viz` — D3 layout, PDF export, large-format print, GEDCOM
   - `infra` — Docker, CI/CD, GitHub Actions

2. **Summarize** what needs to change in one sentence.

3. **Hand off** to `/architect` with this exact format:
   ```
   TASK: <one-sentence summary>
   DOMAIN: <domain>
   USER REQUEST: <original $ARGUMENTS verbatim>
   ```

## Rules

- Do not implement anything yourself
- Do not ask clarifying questions unless the task is completely ambiguous
- Keep your output under 150 tokens
- If domain is `tree-viz`, note that `/family-tree-specialist` must be invoked by the architect
