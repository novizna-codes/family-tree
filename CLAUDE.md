# Claude Project Context and Rules

## Project Overview
Family Tree Builder - A web application for creating, managing, and printing family trees with multi-generational relationships, user authentication, and internationalization support.

## File Loading Order for Context
When working on this project, read files in this order to understand the codebase:

### 1. Planning Documentation (Read First)
- `docs/planning/complete-project-specification.md` - Full project requirements
- `docs/planning/database-schema-with-users.md` - Database design
- `docs/planning/api-endpoints-design.md` - API specification
- `docs/planning/frontend-architecture.md` - React component structure

### 2. Configuration Files
- `composer.json` - PHP dependencies
- `package.json` - Node.js dependencies
- `.env.example` - Environment variables
- `config/app.php` - Laravel configuration

### 3. Database Structure
- `database/migrations/` - All migration files in chronological order
- `database/seeders/` - Database seeders
- `app/Models/` - Eloquent models

### 4. Backend Code
- `routes/api.php` - API routes
- `app/Http/Controllers/` - Controllers
- `app/Http/Requests/` - Form requests
- `app/Services/` - Business logic services

### 5. Frontend Code
- `resources/js/app.tsx` - Main React entry point
- `resources/js/components/` - React components
- `resources/js/store/` - State management
- `resources/js/services/` - API services

## Development Rules

### Code Style
- Follow Laravel conventions for PHP code
- Use TypeScript for all React components
- Use Tailwind CSS for styling
- No comments unless explicitly requested
- Follow existing patterns in the codebase

### Database
- All tables must have user_id foreign key for data isolation
- Use UUID for primary keys on user-facing tables
- Soft deletes for people and relationships
- Proper foreign key constraints

### API Design
- RESTful API endpoints
- Consistent JSON response format
- Proper HTTP status codes
- Request validation using Form Requests

### Frontend
- React functional components with TypeScript
- Zustand for state management
- React Query for API calls
- Responsive design with mobile-first approach

### Testing
- Write tests for all API endpoints
- Frontend unit tests for complex logic
- Integration tests for user flows

### Security
- User authentication required for all family tree operations
- Data isolation between users
- Input validation and sanitization
- CSRF protection

## Current Development Phase
Phase 1: Foundation + Authentication
- Setting up Laravel backend with user auth
- Creating database schema
- Basic React frontend setup

## Key Features to Implement
1. User registration/login system
2. Family tree CRUD operations
3. Person management with relationships
4. SVG-based tree visualization
5. Print/PDF export functionality
6. English/Urdu internationalization
7. Local storage with IndexedDB caching

## Important Notes
- This is a privacy-focused application
- Support for both English and Urdu (RTL)
- Print-ready layouts for various paper sizes
- Offline functionality with local caching
- No external dependencies for fonts/assets

## Testing Strategy
- Unit tests for models and services
- Feature tests for API endpoints
- Frontend component testing
- E2E tests for critical user flows
- Manual testing with actual users (father/uncle)

## Deployment Considerations
- Static asset optimization
- Database optimization for family tree queries
- Caching strategy for tree visualizations
- Mobile responsiveness testing

Remember to always check the todo list and update it as you complete tasks.