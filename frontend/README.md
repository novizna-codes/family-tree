# Family Tree Frontend

A React-based frontend for the Family Tree Builder application.

## Configuration

The frontend is built as a production-ready Docker image that can be configured at runtime using environment variables.

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend API URL | `http://localhost:8000` |
| `VITE_APP_NAME` | Application name | `Family Tree Builder` |

### Usage with Docker

#### Using pre-built image:

```bash
docker run -p 3000:80 \
  -e VITE_API_URL=http://your-backend:8000 \
  -e VITE_APP_NAME="My Family Tree" \
  ghcr.io/novizna-public/familly-tree/frontend:latest
```

#### Using Docker Compose:

```yaml
services:
  frontend:
    image: ghcr.io/novizna-public/familly-tree/frontend:latest
    ports:
      - "3000:80"
    environment:
      - VITE_API_URL=http://your-backend:8000
      - VITE_APP_NAME=My Family Tree
```

#### Building locally:

```bash
# Build the image
docker build -t family-tree-frontend .

# Run with custom configuration
docker run -p 3000:80 \
  -e VITE_API_URL=http://localhost:8080 \
  family-tree-frontend
```

## Development

For development, use the development setup in the parent directory:

```bash
cd ..
docker-compose up frontend
```

This will run the frontend in production mode. For local development with hot reloading, run:

```bash
npm install
npm run dev
```

## Building

The Dockerfile creates a production-optimized build using:
- Multi-stage build to reduce image size
- Nginx for efficient static file serving
- Runtime configuration injection
- Security hardening with non-root user

## Runtime Configuration

The application supports runtime configuration by:
1. Environment variables are injected into `/usr/share/nginx/html/config.js` at container startup
2. The React app loads this configuration file before starting
3. No rebuild required when changing backend URLs or app names

## Technology Stack

This frontend is built with:
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **ESLint** for code quality
