# Family Tree Builder - Code

This directory contains the source code for the Family Tree Builder application, organized into separate backend and frontend components.

## Directory Structure

```
code/
├── backend/          # Laravel API Backend
└── frontend/         # React TypeScript Frontend
```

## Quick Development Setup

### Prerequisites
- PHP 8.1+
- Node.js 18+
- MySQL 8.0+
- Composer
- Laravel Valet (recommended)

### 1. Backend Setup (Laravel API)
```bash
cd backend

# Install dependencies
composer install

# Environment configuration
cp .env.example .env
php artisan key:generate

# Configure database in .env, then run:
php artisan migrate
php artisan db:seed

# Link with Valet (recommended)
valet link familytree
# Backend available at: http://familytree.test

# OR start development server
php artisan serve --port=8010
# Backend available at: http://localhost:8010
```

### 2. Frontend Setup (React)
```bash
cd frontend

# Install dependencies
npm install

# Environment configuration
cp .env.example .env.local
# Update VITE_API_URL if needed

# Start development server
npm run dev
# Frontend available at: http://localhost:5173
```

## Backend (Laravel)

### Key Components
- **API Controllers**: `app/Http/Controllers/Api/`
- **Models**: `app/Models/`
- **Form Requests**: `app/Http/Requests/`
- **Database Migrations**: `database/migrations/`
- **API Routes**: `routes/api.php`

### Main Features
- User authentication with Laravel Sanctum
- Family tree management
- Person and relationship CRUD operations
- Data validation and authorization
- RESTful API design

### Development Commands
```bash
# Run migrations
php artisan migrate

# Clear caches
php artisan cache:clear

# List routes
php artisan route:list

# Run tests
php artisan test
```

## Frontend (React + TypeScript)

### Key Components
- **Pages**: `src/pages/`
- **Components**: `src/components/`
- **Services**: `src/services/`
- **State Management**: `src/store/`
- **Types**: `src/types/`

### Main Features
- React 18 with TypeScript
- Zustand for state management
- React Query for server state
- Tailwind CSS for styling
- Form validation with React Hook Form
- Responsive design

### Development Commands
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Type checking
npm run type-check
```

## Environment Configuration

### Backend (.env)
```env
APP_NAME="Family Tree Builder"
APP_URL=http://familytree.test
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=family_tree
DB_USERNAME=your_username
DB_PASSWORD=your_password
SANCTUM_STATEFUL_DOMAINS=localhost:5173,familytree.test
```

### Frontend (.env.local)
```env
VITE_API_URL=http://familytree.test/api
VITE_APP_NAME=Family Tree Builder
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/user` - Get current user

### Family Trees
- `GET /api/trees` - List user's trees
- `POST /api/trees` - Create new tree
- `GET /api/trees/{id}` - Get tree details
- `PUT /api/trees/{id}` - Update tree
- `DELETE /api/trees/{id}` - Delete tree

### People Management
- `GET /api/trees/{tree}/people` - List people in tree
- `POST /api/trees/{tree}/people` - Add person
- `GET /api/trees/{tree}/people/{person}` - Get person details
- `PUT /api/trees/{tree}/people/{person}` - Update person
- `DELETE /api/trees/{tree}/people/{person}` - Remove person

### Relationship Management
- `POST /api/trees/{tree}/people/{person}/add-spouse` - Add spouse/partner
- `POST /api/trees/{tree}/people/{person}/link-spouse` - Link existing person as spouse
- `DELETE /api/trees/{tree}/people/{person}/spouse/{spouse}` - Remove spouse relationship
- `POST /api/trees/{tree}/relationships` - Create parent-child relationship

## Development Workflow

1. **Start Backend**: Use Valet (`http://familytree.test`) or `php artisan serve`
2. **Start Frontend**: Run `npm run dev` in frontend directory
3. **Make Changes**: Edit files in respective directories
4. **Test Changes**: Use browser at `http://localhost:5173`
5. **API Testing**: Use tools like Postman or curl

## Database Schema

### Core Tables
- **users** - User accounts and preferences
- **family_trees** - Family tree metadata
- **people** - Individual family members with personal details
- **relationships** - Family relationships (parent-child, spouse, etc.)

### Key Features
- UUID primary keys for user-facing resources
- Complete data isolation between users
- Soft deletes for data integrity
- Foreign key constraints for referential integrity

## Security Considerations

- **Authentication**: Laravel Sanctum token-based authentication
- **Authorization**: Policy-based access control
- **Data Isolation**: User-specific data access only
- **Input Validation**: Frontend and backend validation
- **CORS**: Properly configured for development and production

## Troubleshooting

### Common Issues

**Backend not accessible**
- Verify Valet is running: `valet restart`
- Check domain linking: `valet links`
- Verify database connection in `.env`

**Frontend API errors**
- Check `VITE_API_URL` in `.env.local`
- Verify backend is running
- Check browser network tab for CORS issues

**Database errors**
- Ensure MySQL is running
- Verify database exists and credentials are correct
- Run migrations: `php artisan migrate`

## Contributing

1. Make changes in appropriate directory (backend or frontend)
2. Follow existing code conventions
3. Test changes thoroughly
4. Update documentation if needed
5. Submit pull request

For detailed setup instructions and project overview, see the main README.md in the project root.