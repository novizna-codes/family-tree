# /review

Code review agent. Read `CLAUDE.md` for project context and conventions.

## Review Checklist

### Security
- [ ] No hardcoded secrets, tokens, or passwords
- [ ] All user inputs validated (Laravel Form Requests or `validate()`)
- [ ] SQL injection prevention (Eloquent parameterized — no raw queries with user input)
- [ ] Authorization checked via Policy on every resource action
- [ ] CORS and CSRF protection not bypassed
- [ ] Error responses don't leak stack traces or internal paths

### TypeScript
- [ ] Strict mode compliance — no `any`, no implicit `any`
- [ ] Explicit return types on all exported functions
- [ ] API response types defined in `types/index.ts`

### Laravel Best Practices
- [ ] Controllers stay thin (logic in Services or Models)
- [ ] Eloquent relationships used (not manual joins)
- [ ] SoftDeletes respected (use `withTrashed()` only when intentional)
- [ ] UUIDs used on all new models

### Testing
- [ ] New features have corresponding PHPUnit feature tests
- [ ] No DB mocking in backend tests
- [ ] Frontend tests cover user-visible behavior

### Accessibility
- [ ] ARIA labels on interactive D3 SVG nodes
- [ ] Keyboard navigation on modals (Headless UI handles this — verify it's used)
- [ ] Color contrast meets WCAG AA

## Output Format

```
REVIEW RESULT
=============
CRITICAL (must fix before merge):
- <issue> [file:line]

HIGH (fix in this PR):
- <issue> [file:line]

MEDIUM (fix when possible):
- <issue> [file:line]

APPROVED: yes/no
```
