# CI/CD Quick Reference & Checklist

## ✅ Implementation Complete

### Files Created

- ✅ `.github/workflows/ci-build.yml` - Build & containerize workflow
- ✅ `.github/workflows/cd-deploy.yml` - Deployment webhook workflow
- ✅ `backend/Dockerfile` - Python 3.13 FastAPI container
- ✅ `frontend/Dockerfile` - Nginx + Expo web container
- ✅ `backend/.dockerignore` - Build optimization
- ✅ `frontend/.dockerignore` - Build optimization
- ✅ `frontend/package.json` - Updated with `npm run build` script
- ✅ `docs/CI-CD-SETUP.md` - Comprehensive setup guide

## 🚀 Next Steps (Required)

### 1. Add GitHub Secrets (Required)

Navigate to your repository:
**Settings → Secrets and variables → Actions**

Create two new secrets:

```
Secret Name: PORTAINER_WEBHOOK_STAGING
Value: <your-portainer-webhook-url-for-staging>

Secret Name: PORTAINER_WEBHOOK_PRODUCTION
Value: <your-portainer-webhook-url-for-production>
```

**How to get Portainer webhook URLs**:
1. Open Portainer UI
2. Navigate to **Stacks** section
3. For your staging stack: Click "Webhooks" → Copy webhook URL
4. For your production stack: Click "Webhooks" → Copy webhook URL
5. Paste into GitHub Secrets

### 2. Test on Dev Branch

```bash
git checkout dev
git push  # or merge a PR to dev

# Monitor workflow execution
# GitHub → Actions → "CI - Build & Push Docker Images"
```

Expected results:
- ✅ CI workflow runs (~3-5 minutes)
- ✅ Backend builds and tests pass
- ✅ Database setup and migrations complete
- ✅ Frontend builds successfully
- ✅ Docker images pushed to `ghcr.io/mrgionsi/pieno-backend`, `pieno-frontend`, and `pieno-database`
- ✅ CD workflow triggers automatically
- ✅ Portainer webhook called for staging deployment

### 3. Verify Images in Registry

```bash
# List available images
docker pull ghcr.io/mrgionsi/pieno-backend:dev
docker pull ghcr.io/mrgionsi/pieno-frontend:dev
docker pull ghcr.io/mrgionsi/pieno-database:dev

# Check image info
docker inspect ghcr.io/mrgionsi/pieno-backend:dev
docker inspect ghcr.io/mrgionsi/pieno-database:dev
```

### 4. Verify Portainer Deployment

1. Open Portainer UI
2. Navigate to **Stacks**
3. Check for updated services with new image digests
4. Verify services are healthy (status: running)

### 5. (Optional) Enable Production Approvals

For extra safety on production deployments:

1. Navigate to **Settings → Environments**
2. Create new environment: `production`
3. Deployment branches: Select `main`
4. Required reviewers: Check and add team members
5. Save

Now production deployments (main branch) require approval before execution.

## 📋 Workflow Triggers

| Event | Branch | Workflow | Auto-Deploy |
|-------|--------|----------|------------|
| Push/Merge | `dev` | `ci-build.yml` | ✅ Yes → Staging |
| Push/Merge | `main` | `ci-build.yml` | ✅ Yes → Production (if approved) |
| Manual | Any | `ci-build.yml` | ✅ Via workflow_dispatch |

## 🔍 Monitoring & Debugging

### View Workflow Logs

1. **GitHub**: Repository → Actions → Select workflow run
2. **Expand** any failed job to see detailed logs
3. **Common issues**:
   - `Error: failed to solve: python:3.13-slim` → Docker buildx issue, retry
   - `npm ERR! code ERESOLVE` → Dependency conflict in frontend, check package-lock.json
   - `Webhook failed with HTTP 404` → Portainer URL incorrect, verify secret

### Test Backend Locally

```bash
cd backend
pip install -e .
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# API: http://localhost:8000/api
# Docs: http://localhost:8000/docs
```

### Test Frontend Locally

```bash
cd frontend
npm install
npm run build
# Creates dist/ folder with static web app
```

### Test Docker Images Locally

```bash
# Backend
docker build -t pieno-backend:test backend/
docker run -e DATABASE_URL="postgresql://user:pass@host/db" \
           -e APP_ENV=local \
           -p 8000:8000 pieno-backend:test

# Frontend
docker build -t pieno-frontend:test frontend/
docker run -p 80:80 pieno-frontend:test
# Open: http://localhost
```

## 📊 Image Tag Reference

All images receive three tags per push:

```
ghcr.io/mrgionsi/pieno-backend:a1b2c3d   (commit SHA)
ghcr.io/mrgionsi/pieno-backend:dev       (branch)
ghcr.io/mrgionsi/pieno-backend:latest    (latest)
```

**Use commit SHA for production** (most reproducible):
```bash
docker run ghcr.io/mrgionsi/pieno-backend:a1b2c3d
```

## 🔒 Security Checklist

- ✅ GitHub Token scoped to `packages: write` (automatic)
- ✅ Portainer webhook URLs stored as encrypted secrets
- ✅ Production deployments require approval (optional, recommended)
- ✅ No credentials in Dockerfiles or workflows
- ✅ Environment variables passed at runtime via Portainer

## 🆘 Troubleshooting Quick Links

| Problem | Solution |
|---------|----------|
| "No secrets found" | Add PORTAINER_WEBHOOK_STAGING/PRODUCTION in Settings → Secrets |
| Docker push fails | Check GitHub Token permissions: Settings → Actions → General |
| Build timeout | Increase timeout in workflow or check for large dependencies |
| Images not tagged | Check Docker Buildx is properly configured (auto in GitHub runners) |
| Webhook not triggered | Verify secret value exists and URL is accessible |
| Services stuck in pending | Check Portainer stack deployment logs |

## 📞 Common Commands

```bash
# Check workflow status
gh run list --workflow=ci-build.yml

# View latest workflow run
gh run view --log

# Manually trigger workflow
gh workflow run ci-build.yml --ref dev

# List images in registry
docker images | grep pieno

# Pull latest backend image
docker pull ghcr.io/mrgionsi/pieno-backend:latest

# Inspect image layers
docker history ghcr.io/mrgionsi/pieno-backend:dev
```

## 📝 Environment Variables Reference

### Backend (at runtime in Portainer)

```
DATABASE_URL=postgresql://user:pass@host:5432/db
API_HOST=0.0.0.0
API_PORT=8000
APP_ENV=staging
CORS_ALLOWED_ORIGINS=https://app.example.com,https://staging.example.com
```

### Frontend (at build time)

```
EXPO_PUBLIC_API_BASE_URL=https://api.example.com/api
```

## 🎯 Success Criteria

✅ All checks below = Production ready:

- [ ] Workflows created in `.github/workflows/`
- [ ] Docker images build successfully locally
- [ ] Portainer webhook secrets configured
- [ ] Test push to `dev` branch successful
- [ ] Images appear in GitHub Container Registry
- [ ] Staging deployment triggered in Portainer
- [ ] Services healthy in Portainer (status: running)
- [ ] Frontend web app loads at `http://<staging-url>`
- [ ] Backend API responds at `https://<staging-url>/api`
- [ ] Production environment approval configured (optional)

## 📚 Documentation

- **Full Setup Guide**: `docs/CI-CD-SETUP.md`
- **Backend README**: `backend/README.md`
- **Frontend README**: `frontend/README.md`
- **Architecture Decisions**: `docs/solution-architecture.md`

## 🔗 Related Files

```
.github/workflows/
├── ci-build.yml          # Build, test, and containerize
├── cd-deploy.yml         # Deploy to Portainer
└── backend-quality.yml   # PR quality checks (existing)

Dockerfiles:
├── backend/Dockerfile
└── frontend/Dockerfile

Config:
├── backend/.dockerignore
├── frontend/.dockerignore
└── frontend/package.json (updated)

Docs:
└── docs/CI-CD-SETUP.md   # Comprehensive guide
```

---

**Status**: ✅ Ready for configuration and testing

**Next Action**: Add GitHub Secrets for Portainer webhooks, then test with a push to `dev` branch
