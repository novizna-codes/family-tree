# Family Tree Builder

A comprehensive web application for creating and managing family genealogies with user authentication, privacy controls, and multiple export formats.

## 🌟 Features

- **User Management**: Secure registration, authentication, and profile management
- **Family Tree Creation**: Create multiple family trees with detailed person information
- **Relationship Management**: Support for various relationship types including adoptive/step relationships
- **Interactive Visualization**: Modern tree visualization with zoom and navigation
- **Privacy Controls**: Granular privacy settings for trees and individuals
- **Data Import/Export**: GEDCOM support and multiple export formats
- **Collaboration**: Share trees with family members with different permission levels
- **Responsive Design**: Mobile-friendly interface with modern UI

## 🏗️ Architecture

- **Backend**: Laravel 12 with PHP 8.2+
- **Frontend**: React 19 with TypeScript
- **Database**: MySQL 8.0
- **Authentication**: Laravel Sanctum
- **Styling**: Tailwind CSS with Headless UI
- **State Management**: Zustand + TanStack Query
- **Visualization**: D3.js for family tree rendering
- **Infrastructure**: Docker containerization

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Git

### Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/novizna-codes/family-tree.git
   cd family-tree
   ```

2. **Run the development setup script**:
   ```bash
   ./scripts/dev-setup.sh
   ```

3. **Access the application**:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8080
   - Database Admin: http://localhost:8081 (phpMyAdmin)
   - Mail Testing: http://localhost:8025 (MailHog)

### Manual Setup

If you prefer manual setup:

1. **Copy environment files**:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```

2. **Generate application key**:
   ```bash
   docker-compose exec backend php artisan key:generate
   ```

3. **Run migrations**:
   ```bash
   docker-compose exec backend php artisan migrate
   ```

4. **Seed the database** (optional):
   ```bash
   docker-compose exec backend php artisan db:seed
   ```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
APP_NAME="Family Tree Builder"
APP_ENV=local
APP_URL=http://localhost:8080

DB_CONNECTION=mysql
DB_HOST=db
DB_PORT=3306
DB_DATABASE=family_tree
DB_USERNAME=family_tree_user
DB_PASSWORD=family_tree_password

SANCTUM_STATEFUL_DOMAINS=localhost:3000,localhost:5173
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:8080
VITE_APP_NAME="Family Tree Builder"
```

## 📊 Database Schema

The application uses a comprehensive database schema designed for genealogy data:

- **users**: User authentication and profiles
- **family_trees**: Tree projects with privacy settings
- **people**: Detailed person records with genealogy fields
- **relationships**: Flexible relationship modeling
- **tree_shares**: Collaboration and sharing management

For detailed schema documentation, see [Database Schema](docs/planning/database-schema.md).

## 🔐 Security Features

- **User Data Isolation**: All data is isolated by user at the database level
- **Authentication**: Secure token-based authentication with Laravel Sanctum
- **CSRF Protection**: Built-in CSRF protection for all forms
- **Input Validation**: Comprehensive input validation and sanitization
- **Privacy Controls**: Granular privacy settings for trees and individuals
- **Living Person Protection**: Special privacy controls for living individuals

## 🐳 Docker Configuration

### Development
```bash
docker-compose up -d
```

### Production
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Available Services

- **backend**: Laravel API server
- **frontend**: React application
- **db**: MySQL database
- **redis**: Redis for caching and sessions
- **phpmyadmin**: Database administration
- **mailhog**: Email testing in development

## 🧪 Testing

### Backend Tests
```bash
docker-compose exec backend php artisan test
```

### Frontend Tests
```bash
docker-compose exec frontend npm test
```

### Code Quality
```bash
# PHP Code Style
docker-compose exec backend ./vendor/bin/pint

# TypeScript Linting
docker-compose exec frontend npm run lint
```

## 📦 Deployment

### GitHub Container Registry

The project includes automated Docker image building and publishing to GitHub Container Registry (GHCR).

1. **Manual Trigger**: Go to Actions tab → "Build and Push Docker Images to GHCR" → "Run workflow"
2. **Images are published to**:
   - `ghcr.io/novizna-public/family-tree/backend:latest`
   - `ghcr.io/novizna-public/family-tree/frontend:latest`

### Production Deployment

See [Production Deployment Guide](PRODUCTION_DEPLOYMENT.md) for detailed production setup instructions.

## 🛠️ Development

### Project Structure
```
family-tree/
├── backend/           # Laravel API
│   ├── app/
│   ├── config/
│   ├── database/
│   └── routes/
├── frontend/          # React application
│   ├── src/
│   ├── public/
│   └── docker/
├── docker/           # Docker configuration
├── scripts/          # Development scripts
└── docs/            # Documentation
```

### Key Commands

```bash
# Start development environment
docker-compose up -d

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Run artisan commands
docker-compose exec backend php artisan migrate
docker-compose exec backend php artisan make:model Person

# Install dependencies
docker-compose exec backend composer install
docker-compose exec frontend npm install

# Access containers
docker-compose exec backend bash
docker-compose exec frontend sh
```

## 📚 API Documentation

The backend provides a RESTful API with the following main endpoints:

- **Authentication**: `/api/auth/*`
- **Family Trees**: `/api/trees/*`
- **People**: `/api/trees/{tree}/people/*`
- **Relationships**: `/api/trees/{tree}/relationships/*`

For detailed API documentation, see [API Documentation](docs/planning/api-documentation.md).

## 🎨 Frontend Features

- **Modern React**: React 19 with TypeScript
- **State Management**: Zustand for local state, TanStack Query for server state
- **UI Components**: Tailwind CSS with Headless UI components
- **Tree Visualization**: Interactive D3.js family tree rendering
- **Responsive Design**: Mobile-first responsive design
- **Internationalization**: i18next for multi-language support

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines

- Follow PSR-12 coding standards for PHP
- Use TypeScript strict mode for frontend code
- Write tests for new features
- Update documentation as needed
- Follow conventional commit messages

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Laravel framework for the robust backend
- React ecosystem for the modern frontend
- D3.js for powerful data visualization
- Docker for containerization
- All contributors and testers

## 📞 Support

For support, please:
1. Search existing [issues](https://github.com/novizna-codes/family-tree/issues)
2. Create a new issue if needed

## 🗺️ Roadmap

### Phase 1 ✅
- [x] User authentication and management
- [x] Basic family tree creation and editing
- [x] Person and relationship management
- [x] Tree visualization
- [x] Docker infrastructure

### Phase 2 🚧
- [ ] GEDCOM import/export
- [ ] Advanced search and filtering
- [ ] Rich media support (photos, documents)
- [ ] Enhanced collaboration features

### Phase 3 📋
- [ ] Mobile applications
- [ ] DNA integration
- [ ] Historical records integration
- [ ] Advanced reporting and analytics

---

Built with ❤️ for families who want to preserve their heritage and stories.