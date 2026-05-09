# Family Tree Builder — Codex CLI Agent Manifest

This file is the workspace agent manifest for Codex CLI (OpenAI convention).

## Project Summary

Family Tree Builder: Laravel 12 backend + React 19 frontend + D3.js visualization.
See `CLAUDE.md` for the full stack, file paths, and conventions.

## Environment Setup

```bash
docker-compose up -d
docker-compose exec backend php artisan migrate --seed
```

## Running Tests

```bash
# Backend (PHPUnit)
docker-compose exec backend php artisan test

# Frontend (Vitest)
docker-compose exec frontend npm run test

# Lint
docker-compose exec frontend npm run lint
```

## Agent Roles

| Agent | Trigger | Scope |
|-------|---------|-------|
| orchestrator | Entry point for any task | Routes to architect |
| architect | System design, cross-cutting | Spawns specialist agents |
| backend | Laravel/PHP/MySQL changes | backend/ directory |
| frontend | React/TS/D3 changes | frontend/src/ directory |
| family-tree-specialist | Tree viz, PDF, GEDCOM | Invoked by architect only |
| test | Writing/running tests | tests/ directories |
| review | Code review, security | Full repo read |
| devops | Docker, CI/CD | docker/, .github/ |

## Entry Points

- Start any task with: describe what you want to build or fix
- The orchestrator classifies the domain and delegates to the architect
- The architect spawns the appropriate specialist(s)
- `family-tree-specialist` handles: D3 layout, jsPDF, large-format (A0–A2), GEDCOM

## Key Constraints

- Never modify `.env` files
- Never stop/destroy Docker containers without explicit user permission
- All models use UUIDs
- Tests must hit a real database (no DB mocking)
- TreeSettings `paper_size` and `orientation` fields already exist — extend them, don't add new fields
