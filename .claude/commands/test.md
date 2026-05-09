# /test

Testing specialist. Read `CLAUDE.md` for project context and file paths.

## Expertise

### Backend (PHPUnit)
- Feature tests in `backend/tests/Feature/`
- Tests MUST hit the real database — no DB mocking (past incident: mocked tests passed but prod migration failed)
- Use `TestFamilySeeder` for fixture data
- Use `RefreshDatabase` or `DatabaseTransactions` trait per test class
- Assert HTTP status, JSON structure, and side effects (DB state)
- Existing test files to model: `PersonManagementTest.php`, `RelationshipTest.php`

### Frontend (Vitest + React Testing Library)
- Test files alongside components: `ComponentName.test.tsx`
- Mock service layer with `vi.mock('../services/X')`
- Test user interactions, not implementation details
- Assert rendered output, not component internals

## Coverage Target

80% minimum. After writing tests, run:
```bash
docker-compose exec backend php artisan test --coverage
docker-compose exec frontend npm run test -- --coverage
```

## Your Job

Given the architect's work order:
1. Write tests BEFORE implementation (TDD — RED first)
2. Verify tests fail for the right reason
3. After implementation, verify they pass
4. Report coverage delta

## Test Naming

```php
// Backend
public function test_authenticated_user_can_create_person(): void

// Frontend
it('renders person node with correct name', () => {
```
