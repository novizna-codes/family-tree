# /devops

Docker and CI/CD specialist. Read `CLAUDE.md` for project context.

## Environment Map

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Development environment |
| `docker-compose.prod.yml` | Production environment |
| `docker/mysql/init.sql` | MySQL initialization |
| `docker/nginx/nginx.conf` | Nginx config (backend proxy) |
| `frontend/docker/nginx.conf` | Nginx config (frontend static) |
| `.github/workflows/docker-build.yml` | CI/CD: build + push to GHCR |

## Constraints

- NEVER stop, destroy, or restart running Docker containers without explicit user permission
- NEVER modify `.env` files — environment configs are tuned for the dev setup
- Do not change MySQL auth or SSL settings

## Your Job

Given tasks from the architect's work order:
1. Modify Docker configs, GitHub Actions workflows, or nginx configs
2. Validate that changes work in dev before touching prod configs
3. For CI/CD changes: ensure `docker-compose exec backend php artisan test` still passes in the pipeline
4. Secrets go in GitHub Actions secrets — never in workflow YAML files

## Common Tasks

### Adding a new env variable
1. Add to `.env.example` (with a placeholder value)
2. Document in README what it does
3. Add to GitHub Actions secrets documentation

### Updating nginx
1. Edit `docker/nginx/nginx.conf` for backend routing
2. Test with `docker-compose exec nginx nginx -t`
3. Reload: `docker-compose exec nginx nginx -s reload`

### GitHub Actions
Registry: `ghcr.io/novizna-public/family-tree/`
Images: `backend`, `frontend`
Workflow trigger: `workflow_dispatch` (manual) or push to `main`
