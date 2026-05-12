# GitHub Actions CI/CD Setup Guide

## Overview

This document describes the CI/CD pipeline for PienoSmart, which automates building, containerizing, and deploying both frontend (Expo/React Native web) and backend (FastAPI Python) applications.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Code Push (dev/main)                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────▼────────────┐
                │  ci-build.yml Workflow  │
                └─────┬──────────┬────────┘
                      │          │
        ┌─────────────▼─┐   ┌────▼──────────────┐
        │  Build Backend │   │ Build Frontend   │
        │  (Parallel)    │   │ (Parallel)       │
        └────────┬──────┘   └────┬─────────────┘
                 │               │
        ┌────────▼────────┐ ┌────▼──────────────┐
        │ Docker Backend  │ │ Docker Frontend  │
        │ Push → ghcr.io  │ │ Push → ghcr.io   │
        └────────┬────────┘ └────┬─────────────┘
                 └────────┬──────┘
                          │
            ┌─────────────▼─────────────┐
            │  cd-deploy.yml Workflow   │
            │  (triggered by success)   │
            └─────┬──────────────┬──────┘
                  │              │
        dev branch│              │main branch
                  │              │
        ┌─────────▼────┐  ┌──────▼────────┐
        │ Deploy to    │  │ Deploy to     │
        │ Staging      │  │ Production    │
        │ (Portainer)  │  │ (Portainer)   │
        └──────────────┘  └───────────────┘
```

## Workflows

### 1. CI Build Workflow (`ci-build.yml`)

**Trigger**: Push to `dev` or `main` branches, or manual dispatch

**Steps**:
1. **Metadata Extraction** - Captures commit SHA, branch name, and determines environment
2. **Backend Build** (parallel):
   - Checkout code
   - Set up Python 3.13
   - Install dependencies from `pyproject.toml`
   - Run linting (pylint) and tests (pytest)
   - Validate Alembic migrations
### 3. **Database Build** (parallel):
   - Uses PostGIS service in GitHub Actions
   - Runs Alembic migrations to set up schema
   - Validates database connectivity and PostGIS extensions
   - Prepares database for backend testing
4. **Docker Backend**:
   - Build multi-stage Docker image (builder → runtime)
   - Tag with commit SHA, branch name, and `latest`
   - Push to `ghcr.io/mrgionsi/pieno-backend`
5. **Docker Frontend**:
   - Build multi-stage Docker image (builder → nginx runtime)
   - Tag with commit SHA, branch name, and `latest`
   - Push to `ghcr.io/mrgionsi/pieno-frontend`

**Output**: Docker images available in GitHub Container Registry

### 2. CD Deploy Workflow (`cd-deploy.yml`)

**Trigger**: When `ci-build.yml` completes successfully

**Steps**:
1. **Context Extraction** - Retrieves branch, commit, and environment from workflow run
2. **Staging Deployment** (if `dev` branch):
   - Sends JSON payload to Portainer webhook URL (`PORTAINER_WEBHOOK_STAGING`)
   - Includes image references and deployment metadata
3. **Production Deployment** (if `main` branch):
   - Requires GitHub environment approval
   - Sends JSON payload to Portainer webhook URL (`PORTAINER_WEBHOOK_PRODUCTION`)
   - Includes image references and deployment metadata

**Output**: Portainer webhook triggered with deployment instructions

## Setup Instructions

### Step 1: Configure GitHub Secrets

Navigate to **Settings → Secrets and variables → Actions** and add:

```yaml
PORTAINER_WEBHOOK_STAGING: <your-portainer-staging-webhook-url>
PORTAINER_WEBHOOK_PRODUCTION: <your-portainer-production-webhook-url>
```

**Format**: Full webhook URL including protocol (e.g., `https://portainer.example.com/api/webhooks/...`)

### Step 2: (Optional) Configure Production Environment Protection

For production safety, navigate to **Settings → Environments** and create:

1. **Environment**: `production`
2. **Deployment branches**: `main`
3. **Required reviewers**: Check to require approval before deployment

This ensures production deployments require manual approval.

### Step 3: Update Image Registry Namespace (Optional)

If using a different GitHub organization or username:

Edit both workflow files (`.github/workflows/ci-build.yml` and `.github/workflows/cd-deploy.yml`):

```yaml
env:
  REGISTRY: ghcr.io
  REGISTRY_NAMESPACE: <your-org-or-username>  # Change this
```

### Step 4: Frontend Build Script

The `npm run build` script was added to `frontend/package.json`:

```json
"build": "expo export -p web --output-dir=dist"
```

This exports the Expo web app as static files to the `dist/` directory.

## Docker Images

### Backend Image

**Dockerfile**: `backend/Dockerfile`

**Base Image**: `python:3.13-slim`

**Features**:
- Multi-stage build (builder → runtime) for smaller final image
- Pre-compiled wheels for faster deployments
- Health check (validates API endpoint)
- Uvicorn entrypoint: `uvicorn app.main:app --host 0.0.0.0 --port 8000`

**Environment Variables** (pass at runtime via Portainer):
- `DATABASE_URL`: PostgreSQL connection string (required)
- `API_HOST`: Default `0.0.0.0`
- `API_PORT`: Default `8000`
- `APP_ENV`: `local` | `development` | `staging` | `production`
- `CORS_ALLOWED_ORIGINS`: Comma-separated list

**Registry**: `ghcr.io/mrgionsi/pieno-backend:<tag>`

### Frontend Image

**Dockerfile**: `frontend/Dockerfile`

**Base Image**: `node:22-alpine` (build) → `nginx:alpine` (runtime)

**Features**:
- Multi-stage build (smaller final image ~50MB)
- Expo web static export served via nginx
- SPA routing configured (all routes → index.html)
- Gzip compression enabled
- Static asset caching (1 year for versioned files)
- Health check (validates nginx)

**Environment Variables**: None required at runtime (API URL configured in build or frontend code)

**Registry**: `ghcr.io/mrgionsi/pieno-frontend:<tag>`

### Database Image

**Dockerfile**: `database/Dockerfile`

**Base Image**: `postgis/postgis:18-3.6`

**Features**:
- PostGIS 3.6 extensions enabled for geospatial operations
- Database initialization scripts for schema setup
- Alembic migration support
- Health check (validates PostgreSQL connectivity)
- Optimized for both development and production

**Environment Variables** (configured in image):
- `POSTGRES_DB`: `pienosmart`
- `POSTGRES_USER`: `postgres`
- `POSTGRES_PASSWORD`: `postgres`

**Database Schema**:
- User management and profiles
- Vehicle information and fuel types
- Fuel station data with geospatial coordinates
- Trip records and consumption metrics
- Alert system for price notifications

**Registry**: `ghcr.io/mrgionsi/pieno-database:<tag>`

## Image Tagging Strategy

Images are tagged with three references for flexibility:

1. **Commit SHA** (7 chars): `pieno-backend:a1b2c3d`
   - Precise tracking of which commit is deployed
   - Enables reproducible deployments and rollbacks

2. **Branch Name**: `pieno-backend:dev` or `pieno-backend:main`
   - Quick reference to latest from each branch
   - Automatically updated on each push

3. **Latest**: `pieno-backend:latest`
   - Convenience tag for latest across all branches
   - Use with caution (can be ambiguous)

**Example**:
```bash
# Deploy specific commit
docker run ghcr.io/mrgionsi/pieno-backend:a1b2c3d

# Deploy latest from dev branch
docker run ghcr.io/mrgionsi/pieno-backend:dev

# Deploy latest overall
docker run ghcr.io/mrgionsi/pieno-backend:latest
```

## Portainer Integration

The CD workflow calls your Portainer webhook with a JSON payload:

```json
{
  "environment": "staging",
  "branch": "dev",
  "commit": "a1b2c3d",
  "backend_image": "ghcr.io/mrgionsi/pieno-backend:a1b2c3d",
  "frontend_image": "ghcr.io/mrgionsi/pieno-frontend:a1b2c3d",
  "timestamp": "2026-05-10T15:30:45Z"
}
```

**Configure Portainer Webhook**:
1. In Portainer, navigate to **Stacks**
2. For each stack (staging/production):
   - Create or edit the stack with Compose file
   - Note the webhook URL (Settings → Stack Webhooks)
   - Copy the URL to GitHub Secrets

**Webhook Handler Options**:
- **Redeploy**: Configure Portainer webhook to redeploy the stack
- **Custom Script**: Write a script that updates service images and redeploys
- **Example webhook format**:
  ```
  https://portainer.example.com/api/webhooks/9fb62acb-5c0a-42dd-9c1a-e43ef19e831a
  ```

## Deployment Environments

| Branch | Environment  | Deployment      | Approval Required |
|--------|--------------|-----------------|-------------------|
| `dev`  | Staging      | Auto            | No                |
| `main` | Production   | Auto            | Yes (optional)    |

Configure GitHub Environments for production approval:
- **Settings → Environments → production**
- Enable "Required reviewers"
- Add team members who must approve

## Testing & Quality

## Testing & Quality

**Note**: Tests and quality checks run on both PR creation and on push to `dev`/`main` branches:

- Backend tests: `pytest tests/` (runs on PR)
- Backend linting: `pylint app/` (runs on PR)
- Existing workflow: `.github/workflows/backend-quality.yml`

The CI build workflow validates on every push but allows some checks to proceed with warnings.

## Local Testing

### Build Backend Image Locally

```bash
cd backend
docker build -t pieno-backend:test .
docker run -e DATABASE_URL="postgresql://user:pass@localhost:5432/pieno" \
           -p 8000:8000 pieno-backend:test
```

Test API: `curl http://localhost:8000/api/`

### Build Frontend Image Locally

```bash
cd frontend
docker build -t pieno-frontend:test .
docker run -p 80:80 pieno-frontend:test
```

Test web app: Open `http://localhost` in browser

## Troubleshooting

### Workflow Fails at Build Stage

1. **Backend build fails**: Check `backend/pyproject.toml` - ensure all dependencies are valid
2. **Frontend build fails**: Check `npm ci` step - ensure `package-lock.json` is up-to-date
3. **View logs**: GitHub Actions → Workflow run → Job logs

### Docker Image Not Pushing

1. Check `GITHUB_TOKEN` permissions: Repo → Settings → Actions → General → Permissions
2. Ensure `packages: write` is enabled in workflow
3. Verify workflow has permission to push to `ghcr.io`

### Portainer Webhook Not Triggering

1. Verify secret is set: **Settings → Secrets → PORTAINER_WEBHOOK_STAGING/PRODUCTION**
2. Check webhook URL is valid and accessible
3. Review workflow logs for HTTP response codes
4. Test webhook manually:
   ```bash
   curl -X POST "$WEBHOOK_URL" \
     -H "Content-Type: application/json" \
     -d '{"test": "payload"}'
   ```

## Best Practices

1. **Use Commit SHA Tags**: Always reference images by commit SHA for traceability
2. **Keep Secrets Secure**: Never hardcode credentials in workflows or Dockerfiles
3. **Test Locally First**: Run `docker build` and `docker run` before pushing
4. **Review Before Production**: Enable GitHub environment approvals for main branch
5. **Monitor Deployments**: Check Portainer UI after deployment to verify services are healthy
6. **Database Migrations**: Handle separately from image deployment (not automatic in CI)

## Next Steps

1. ✅ Workflows created in `.github/workflows/`
2. ✅ Dockerfiles created for backend and frontend
3. ⏳ **TODO**: Configure GitHub Secrets with Portainer webhook URLs
4. ⏳ **TODO**: Test workflows on dev branch first
5. ⏳ **TODO**: Set up Portainer webhook handlers to redeploy stacks
6. ⏳ **TODO**: (Optional) Enable production environment approvals

## File Summary

| File | Purpose |
|------|---------|
| `.github/workflows/ci-build.yml` | Build, test, and containerize applications |
| `.github/workflows/cd-deploy.yml` | Trigger Portainer deployments post-merge |
| `backend/Dockerfile` | Python 3.13 FastAPI runtime container |
| `frontend/Dockerfile` | Node build + nginx runtime for Expo web app |
| `backend/.dockerignore` | Exclude unnecessary files from backend image |
| `frontend/.dockerignore` | Exclude unnecessary files from frontend image |
| `frontend/package.json` | Updated with `build` script for Expo export |
| `docs/CI-CD-SETUP.md` | This documentation |

## Support

For questions or issues:
- Review GitHub Actions logs: Repository → Actions → Workflow run
- Check Portainer logs: Portainer UI → Stacks → Stack details
- Consult backend/frontend READMEs for build-specific issues
