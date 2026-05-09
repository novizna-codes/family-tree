# Family Tree Builder — Project Source of Truth

All agent prompts reference this file. Do not restate context; read it here.

## Stack

| Layer | Technology |
|-------|-----------|
| Backend | Laravel 12, PHP 8.2, Sanctum auth, Spatie Permissions |
| Database | MySQL 8.0, SoftDeletes on Person |
| Frontend | React 19, TypeScript (strict), Zustand, TanStack Query v5 |
| Styling | Tailwind CSS, Headless UI |
| Visualization | D3.js (hierarchical layout, zoom/pan) |
| Export | jsPDF + html2canvas, SVG export |
| i18n | i18next |
| Infrastructure | Docker (dev: docker-compose.yml, prod: docker-compose.prod.yml) |
| CI/CD | GitHub Actions (.github/workflows/docker-build.yml) |

## Key Paths

### Backend
```
backend/app/Http/Controllers/Api/      # API controllers
backend/app/Http/Controllers/Admin/    # Admin controllers
backend/app/Models/                    # Person, FamilyTree, Relationship, User, SystemSetting
backend/routes/api.php                 # All API routes
backend/database/migrations/           # DB migrations
backend/database/seeders/              # TestFamilySeeder, etc.
backend/tests/Feature/                 # PHPUnit feature tests
backend/app/Policies/                  # FamilyTreePolicy, PersonPolicy
```

### Frontend
```
frontend/src/components/trees/         # Tree UI components
frontend/src/components/trees/TreeVisualization.tsx   # D3 layout engine
frontend/src/components/trees/PrintModal.tsx          # Print dialog
frontend/src/components/auth/          # Route guards
frontend/src/components/admin/         # Admin views
frontend/src/services/printService.ts  # html2canvas → jsPDF pipeline
frontend/src/services/treeService.ts   # Tree API calls
frontend/src/services/familyTreeService.ts
frontend/src/store/authStore.ts        # Zustand auth state
frontend/src/store/familyTreeStore.ts  # Zustand tree state
frontend/src/types/index.ts            # Shared TypeScript types
```

## Data Model

- **User** → many **FamilyTree** (isolated per user)
- **FamilyTree** → many **Person** (belongsTo, UUIDs on all models)
- **Person** has `father_id`, `mother_id` (self-referential), SoftDeletes
- **Relationship** table: spouse links between Person records
- **TreeSettings**: `paper_size` (A1–A4), `orientation` — extend these for large-format, don't add new fields

## Auth
- Sanctum token auth
- Policy-based authorization: `FamilyTreePolicy`, `PersonPolicy`
- Enum classes for roles/permissions (Spatie)

## Dev Commands
```bash
docker-compose up -d                                    # Start all services
docker-compose exec backend php artisan test            # Run PHPUnit tests
docker-compose exec frontend npm run lint               # Lint frontend
docker-compose exec frontend npm run build              # Build frontend
docker-compose exec backend php artisan migrate         # Run migrations
docker-compose logs -f backend                          # Stream backend logs
```

## Phase 2 Roadmap (not yet implemented)
- GEDCOM 5.5.1 / 7.0 import-export (tag mapping to Person/Relationship)
- Media attachments (photos, documents) on Person
- Real-time collaboration (WebSockets or Livewire)
- Advanced search across tree members
- Large-format poster export (A0–A2, multi-page tiling)

## Coding Conventions
- PHP: PSR-12, typed properties, readonly where applicable
- TypeScript: strict mode, explicit return types, no `any`
- CSS: Tailwind utility-first, no custom CSS unless unavoidable
- Tests: PHPUnit for backend (feature tests hit real DB), Vitest + RTL for frontend
- Commits: conventional commits (`feat:`, `fix:`, `refactor:`, etc.)
- All models use UUIDs, not auto-increment IDs

## Agent Hierarchy
```
User → /orchestrate → /architect → specialist subagents
```
The architect decides which subagent(s) to invoke. The `family-tree-specialist`
is always invoked by the architect — never directly by users.
