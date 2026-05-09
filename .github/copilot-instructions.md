# GitHub Copilot & VS Code Copilot — Workspace Instructions

## Project: Family Tree Builder

Laravel 12 backend + React 19 frontend + D3.js visualization + jsPDF export.

## Stack

- **Backend**: Laravel 12, PHP 8.2, Sanctum, Spatie Permissions, MySQL 8
- **Frontend**: React 19, TypeScript (strict), Zustand, TanStack Query v5, Tailwind CSS, Headless UI
- **Visualization**: D3.js (hierarchical tree layout, zoom/pan)
- **Export**: jsPDF + html2canvas (current), SVG serialization (large-format)
- **Infrastructure**: Docker, GitHub Actions, GHCR

## Key File Paths

```
backend/app/Http/Controllers/Api/    Laravel API controllers
backend/app/Models/                  Person, FamilyTree, Relationship, User
backend/routes/api.php               All API routes
backend/tests/Feature/               PHPUnit tests
frontend/src/components/trees/       Tree UI (TreeVisualization.tsx, PrintModal.tsx)
frontend/src/services/               API service layer (printService.ts, treeService.ts)
frontend/src/store/                  Zustand stores
frontend/src/types/index.ts          Shared TypeScript types
```

## Coding Conventions

### PHP / Laravel
- PSR-12 style, typed properties, readonly where applicable
- All models use UUIDs (never auto-increment)
- Policy-based authorization — every resource action has a Policy check
- Consistent JSON responses: `{ success, data, message }`
- No raw SQL with user input — always use Eloquent parameterized queries

### TypeScript / React
- Strict mode — no `any`, explicit return types on all exported functions
- All API response shapes must be typed in `types/index.ts`
- State updates are immutable (spread operators, not mutation)
- Service layer in `services/` handles all API calls — no fetch/axios in components
- D3 logic stays inside `TreeVisualization.tsx` only

### Testing
- Backend: PHPUnit feature tests hit real database (no DB mocking)
- Use `TestFamilySeeder` for fixture data
- Frontend: Vitest + React Testing Library, test user-visible behavior
- When you generate a new Laravel controller, suggest a test stub in `tests/Feature/`
- When you generate a new API response type, suggest the TypeScript interface for `types/index.ts`

## Phase 2 Roadmap (suggest completions that align with these)
- GEDCOM 5.5.1 / 7.0 import-export
- Media attachments on Person records
- Real-time collaboration
- Advanced search
- Large-format poster export (A0–A2 paper sizes, multi-page tiling)

## Agent Hierarchy (for context)

```
/orchestrate → /architect → specialists
```
The `family-tree-specialist` handles tree layout, PDF, and GEDCOM — the architect routes to it.

## Important Constraints

- Never modify `.env` files
- Never stop Docker containers without explicit user permission
- `TreeSettings.paper_size` and `orientation` fields exist on the model — extend these, don't add new DB columns for page sizing
