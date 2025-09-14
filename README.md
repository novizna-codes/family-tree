# 🌳 Family Tree Builder

A comprehensive web application for creating, managing, and visualizing family trees with multi-generational relationships, user authentication, and print capabilities.

## 🚀 Features

### ✅ **Implemented (85% Complete)**

#### 🔐 **User Authentication**
- Secure user registration and login
- Token-based authentication with Laravel Sanctum
- Persistent login sessions
- Protected routes and authorization

#### 🌲 **Family Tree Management**
- Create and manage multiple family trees
- Tree dashboard with overview
- Rich metadata (names, descriptions)
- User-specific data isolation

#### 👥 **Person Management**
- Add family members with detailed information
- Support for names, dates, places, occupations
- Life status tracking (living/deceased)
- Personal notes and documentation

#### 💑 **Relationship Management**
- Complete spouse/partner relationship system
- Support for marriage, partnership, divorce, separation
- Relationship details with dates, places, and notes
- Parent-child relationship tracking
- Sibling relationship management

#### 🎨 **Modern UI/UX**
- Responsive design with TailwindCSS
- Clean, intuitive interface
- Form validation and error handling
- Toast notifications for user feedback
- Scrollable modal interfaces

### 🔄 **In Progress (10%)**
- SVG-based family tree visualization
- Advanced tree navigation features

### 📋 **Planned Features (5%)**
- Interactive tree navigation (pan, zoom)
- Print and PDF export functionality
- English/Urdu internationalization
- Offline support with local caching

## 🛠️ Technology Stack

### **Backend**
- **Laravel 12** - PHP framework
- **Laravel Sanctum** - API authentication
- **SQLite/MySQL** - Database
- **RESTful API** - JSON responses

### **Frontend**
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **TailwindCSS** - Styling framework
- **Zustand** - State management
- **React Query** - Server state management
- **React Router** - Client-side routing
- **React Hook Form** - Form handling

### **Development Tools**
- **ESLint** - Code linting
- **TypeScript** - Static typing
- **npm** - Package management

## 📦 Installation

### Option 1: Docker Setup (Recommended)

The easiest way to get started is using Docker. This provides a consistent environment across all platforms.

#### Prerequisites
- **Docker** and **Docker Compose**
- **Git**

#### Quick Start
```bash
# Clone repository
git clone git@github.com:novizna-codes/family-tree.git
cd family-tree

# Run the automated setup script
./scripts/dev-setup.sh
```

This will:
- Build Docker containers for backend, frontend, and database
- Set up the database with migrations
- Start all services

#### Manual Docker Setup
```bash
# Clone repository
git clone git@github.com:novizna-codes/family-tree.git
cd family-tree

# Start services
docker-compose up -d --build

# Setup Laravel
docker-compose exec backend php artisan key:generate
docker-compose exec backend php artisan migrate
docker-compose exec backend php artisan db:seed
```

#### Access Applications
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8080/api
- **phpMyAdmin**: http://localhost:8081
- **Mailhog**: http://localhost:8025

### Option 2: Local Development Setup

For development without Docker:

#### Prerequisites
- **PHP 8.2+**
- **Composer**
- **Node.js 18+**
- **npm**
- **MySQL 8.0+**

### 1. Clone Repository
```bash
git clone <repository-url>
cd family-tree
```

### 2. Backend Setup
```bash
cd code/backend

# Install PHP dependencies
composer install

# Environment setup
cp .env.example .env
php artisan key:generate

# Database setup
php artisan migrate

# Start development server (if not using Valet)
php artisan serve --port=8010
```

### 3. Frontend Setup
```bash
cd code/frontend

# Install Node dependencies
npm install

# Start development server
npm run dev
```

### 4. Access Application
- **Frontend**: http://localhost:5173 (or port shown in terminal)
- **Backend API**: http://familytree.test/api (with Valet) or http://localhost:8010/api

### 5. Default Login Credentials
- **Email**: `test@example.com`
- **Password**: `password123`

## 🚀 Deployment

### Docker Production Deployment

The application is designed for easy deployment using Docker containers.

#### Prerequisites
- **Docker** and **Docker Compose**
- **Domain name** (for production)
- **SSL certificates** (recommended)

#### Production Setup
```bash
# Clone repository
git clone git@github.com:novizna-codes/family-tree.git
cd family-tree

# Create production environment file
cp .env.example .env.prod
# Edit .env.prod with your production settings

# Deploy
./scripts/prod-deploy.sh
```

#### Docker Images
Pre-built Docker images are available on Docker Hub:
- **Backend**: `novizna/family-tree-backend:latest`
- **Frontend**: `novizna/family-tree-frontend:latest`

#### GitHub Actions CI/CD
The project includes automated CI/CD pipeline that:
- Builds Docker images on push to main branch
- Runs security scans with Trivy
- Pushes images to Docker Hub
- Supports multi-architecture builds (AMD64, ARM64)

#### Manual Docker Build
```bash
# Build backend image
docker build -t novizna/family-tree-backend:latest ./code/backend

# Build frontend image
docker build -t novizna/family-tree-frontend:latest ./code/frontend

# Push to Docker Hub
docker push novizna/family-tree-backend:latest
docker push novizna/family-tree-frontend:latest
```

### Environment Variables for Production
```env
APP_NAME=Family Tree Builder
APP_ENV=production
APP_DEBUG=false
APP_URL=https://your-domain.com

DB_DATABASE=family_tree_prod
DB_USERNAME=your_db_user
DB_PASSWORD=your_secure_password

SANCTUM_STATEFUL_DOMAINS=your-domain.com

MAIL_MAILER=smtp
MAIL_HOST=your-smtp-host
MAIL_PORT=587
MAIL_USERNAME=your-email
MAIL_PASSWORD=your-email-password
```

## 📁 Project Structure

```
family-tree/
├── .github/
│   └── workflows/                 # GitHub Actions CI/CD
├── code/
│   ├── backend/                   # Laravel API Backend
│   │   ├── app/
│   │   │   ├── Http/
│   │   │   │   ├── Controllers/Api/   # API Controllers
│   │   │   │   └── Requests/          # Form Validation
│   │   │   ├── Models/                # Eloquent Models
│   │   │   └── Policies/              # Authorization Policies
│   │   ├── database/
│   │   │   ├── migrations/            # Database Schema
│   │   │   └── seeders/               # Data Seeders
│   │   ├── docker/                    # Docker configuration
│   │   ├── routes/api.php             # API Routes
│   │   ├── Dockerfile                 # Backend container
│   │   └── .env                       # Environment Configuration
│   └── frontend/                  # React Frontend
│       ├── src/
│       │   ├── components/            # Reusable UI Components
│       │   ├── pages/                 # Page Components
│       │   ├── services/              # API Services
│       │   ├── store/                 # Zustand State Stores
│       │   ├── types/                 # TypeScript Type Definitions
│       │   └── utils/                 # Utility Functions
│       ├── public/                    # Static Assets
│       ├── docker/                    # Docker configuration
│       ├── Dockerfile                 # Frontend container
│       └── .env.local                 # Environment Variables
├── docker/                        # Docker infrastructure
│   ├── mysql/                     # Database initialization
│   └── nginx/                     # Reverse proxy config
├── scripts/                       # Deployment scripts
│   ├── dev-setup.sh              # Development setup
│   └── prod-deploy.sh            # Production deployment
├── docs/                          # Project Documentation
│   └── planning/                  # Planning Documents
├── docker-compose.yml             # Development environment
├── docker-compose.prod.yml        # Production environment
├── PROJECT_STATUS.md              # Current Status Report
├── API_DOCUMENTATION.md           # API Reference
└── README.md                      # This file
```

## 🔌 API Endpoints

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
- `DELETE /api/trees/{tree}/relationships/{relationship}` - Remove relationship

For complete API documentation, see [API_DOCUMENTATION.md](API_DOCUMENTATION.md)

## 🗄️ Database Schema

### Core Tables
- **users** - User accounts with preferences
- **family_trees** - Family tree metadata
- **people** - Individual family members
- **relationships** - Parent-child and spouse relationships

### Key Features
- **UUID Primary Keys** - For user-facing resources
- **User Isolation** - All data scoped to specific users
- **Soft Deletes** - Preserve data integrity
- **Foreign Key Constraints** - Maintain referential integrity

## 🔒 Security

- **Authentication**: Laravel Sanctum token-based auth
- **Authorization**: Policy-based access control
- **Data Isolation**: Complete user data separation
- **Input Validation**: Frontend and backend validation
- **CORS Protection**: Properly configured cross-origin requests
- **SQL Injection Prevention**: Eloquent ORM with prepared statements

## 🧪 Testing

### Current Test Coverage
- **Backend**: API structure ready for testing
- **Frontend**: Component architecture for unit tests

### Planned Testing
- **Unit Tests**: Models, services, components
- **Integration Tests**: API endpoints, user flows
- **E2E Tests**: Complete user journeys
- **Performance Tests**: Large family tree handling

### Running Tests
```bash
# Backend tests (when implemented)
cd code/backend
php artisan test

# Frontend tests (when implemented)
cd code/frontend
npm test

# Docker tests
docker-compose exec backend php artisan test
docker-compose exec frontend npm test
```

## 📊 Development Commands

### Docker Commands
```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down

# Rebuild containers
docker-compose up -d --build

# Execute commands in containers
docker-compose exec backend php artisan migrate
docker-compose exec backend php artisan tinker
docker-compose exec frontend npm run build

# Database management
docker-compose exec backend php artisan migrate:fresh --seed
docker-compose exec db mysql -u family_tree_user -p family_tree
```

### Backend
```bash
# Generate application key
php artisan key:generate

# Run migrations
php artisan migrate

# Seed database
php artisan db:seed

# Clear caches
php artisan cache:clear
php artisan config:clear
php artisan route:clear

# List routes
php artisan route:list
```

### Frontend
```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint

# Type check
npm run type-check
```

### Running with Valet (Recommended)
```bash
# Link backend to domain (one-time setup)
cd code/backend
valet link familytree

# Backend available at: http://familytree.test
# Frontend runs at: http://localhost:5173

# Restart Valet if needed
valet restart
```

## 🚀 Deployment

### Production Setup
1. **Environment Configuration**
   - Update `.env` with production database credentials
   - Set `APP_ENV=production`
   - Configure mail settings for notifications

2. **Database Optimization**
   - Use MySQL/PostgreSQL for production
   - Set up proper indexing
   - Configure connection pooling

3. **Frontend Build**
   - Run `npm run build` to create production assets
   - Serve static files with nginx/Apache
   - Configure reverse proxy for API

4. **Security Considerations**
   - Enable HTTPS
   - Set secure session cookies
   - Configure CORS for production domain
   - Set up proper backup procedures

## 🤝 Contributing

### Development Workflow
1. **Fork the repository**
2. **Create feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit changes** (`git commit -m 'Add amazing feature'`)
4. **Push to branch** (`git push origin feature/amazing-feature`)
5. **Open Pull Request**

### Code Style
- **PHP**: Follow PSR-12 coding standards
- **TypeScript**: Use ESLint configuration
- **Commits**: Use conventional commit messages
- **Documentation**: Update docs for new features

## 📋 Roadmap

### Phase 3: Advanced Visualization (Next)
- [ ] SVG-based family tree rendering
- [ ] Interactive tree navigation
- [ ] Relationship visualization
- [ ] Print and PDF export

### Phase 4: Enhanced Features
- [ ] English/Urdu internationalization
- [ ] Offline support with IndexedDB
- [ ] Advanced search and filtering
- [ ] Import/export from GEDCOM files

### Phase 5: Collaboration
- [ ] Family tree sharing
- [ ] Collaborative editing
- [ ] Comment system
- [ ] Version history

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Development Team** - Initial work and ongoing development

## 🙏 Acknowledgments

- Laravel community for excellent documentation
- React community for modern frontend patterns
- TailwindCSS for beautiful, responsive design
- All open source contributors

## 📞 Support

For questions, issues, or feature requests:
- **Issues**: Use GitHub Issues for bug reports
- **Discussions**: Use GitHub Discussions for questions
- **Email**: Contact the development team

---

## 📈 Current Status: 85% Complete

**✅ Foundation Ready**: Authentication, database, API, and core UI completed  
**✅ Relationships Complete**: Full spouse/partner relationship management implemented  
**🔄 In Progress**: SVG-based family tree visualization  
**📋 Next Steps**: Interactive tree navigation and print functionality

**Last Updated**: September 14, 2025