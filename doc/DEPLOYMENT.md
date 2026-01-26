# Jenkinsfile CI/CD Pipeline Configuration

## Overview

This Jenkinsfile automates the build, test, and deployment process for the Stock POS Server application.

## Prerequisites

### Jenkins Setup

1. Install required Jenkins plugins:
   - Docker Pipeline
   - Ansible plugin
   - Pipeline: Stage View
   - Email Extension Plugin

2. Configure Jenkins Credentials:

   ```
   - docker-registry-url: Docker registry URL
   - docker-registry-credentials: Docker registry username/password
   - ansible-ssh-key: SSH private key for Ansible
   - slack-webhook: Slack webhook for notifications (optional)
   ```

3. Configure Jenkins system:
   - Set up Docker daemon
   - Install Ansible
   - Install pnpm and Node.js

### Node.js and pnpm

```bash
# Install Node.js 20
nvm install 20
nvm use 20

# Install pnpm
npm install -g pnpm@10.15.1
```

## Pipeline Stages

### 1. Checkout

- Clones the repository from Git
- Captures commit message and author information

### 2. Validate

- Checks versions of Node.js, pnpm, and Docker
- Ensures all required tools are available

### 3. Install Dependencies

- Runs `pnpm install --frozen-lockfile`
- Uses exact versions from pnpm-lock.yaml

### 4. Code Quality

- **Linting**: `pnpm lint` (ESLint)
- **Format Check**: `pnpm format:check` (Prettier)
- Optional based on `RUN_TESTS` parameter

### 5. Build

- Generates Prisma Client: `pnpm db:generate`
- Compiles TypeScript: `pnpm build`

### 6. Build Docker Image

- Builds image with production target stage
- Tags with version number and latest

### 7. Push Docker Image

- Authenticates with Docker registry
- Pushes image to registry
- Cleans up credentials

### 8. Deploy

- Executes Ansible playbooks based on environment
- Available environments:
  - **dev**: Development environment
  - **staging**: Staging environment with optional migrations
  - **prod**: Production deployment (requires main branch + approval)

### 9. Health Check

- Verifies API health endpoint
- Checks database connectivity
- Validates Docker container status

## Running the Pipeline

### Via Jenkins UI

1. Click "Build with Parameters"
2. Select Environment (dev/staging/prod)
3. Choose options:
   - Run Tests: true/false
   - Run Migrations: true/false (prod/staging only)
4. Click "Build"

### Via Jenkins CLI

```bash
# Deploy to dev
java -jar jenkins-cli.jar -s http://jenkins-url build stock-pos-server \
  -p ENVIRONMENT=dev \
  -p RUN_TESTS=true

# Deploy to prod with migrations
java -jar jenkins-cli.jar -s http://jenkins-url build stock-pos-server \
  -p ENVIRONMENT=prod \
  -p RUN_MIGRATIONS=true
```

## Ansible Integration

### Playbooks

- **deploy.yml**: Main deployment playbook
- **healthcheck.yml**: Post-deployment validation
- **rollback.yml**: Emergency rollback procedure

### Inventory Files

- **ansible/inventory/dev**: Development hosts
- **ansible/inventory/staging**: Staging hosts
- **ansible/inventory/prod**: Production hosts

### Key Ansible Variables

```
- app_version: Build version from Jenkins
- environment: Target environment
- docker_image: Full image path with tag
- run_migrations: Execute database migrations
```

## Environment Variables

### Jenkins Credentials (Required)

- `REGISTRY`: Docker registry URL
- `REGISTRY_CREDENTIALS`: Docker registry credentials

### Build Parameters

- `ENVIRONMENT`: Target deployment environment
- `RUN_TESTS`: Execute linting and format checks
- `RUN_MIGRATIONS`: Run database migrations

## Error Handling

### Code Quality Failures

- Pipeline fails if ESLint errors exceed threshold
- Prettier format violations block deployment

### Build Failures

- TypeScript compilation errors stop pipeline
- Docker build failures prevent image push

### Deployment Failures

- Ansible errors stop deployment
- Failed health checks trigger rollback process

### Production Safety

- Production deployments require:
  - Manual approval step
  - main branch only
  - Successful preceding stages

## Monitoring & Notifications

### Post-Build Actions

- Logs are preserved in Jenkins
- ESLint results displayed in UI
- Container health status reported

### Recommended Notifications

- Email alerts on failure
- Slack notifications (with webhook)
- GitHub status checks (with token)

## Troubleshooting

### Docker Image Build Failures

```bash
# Check Docker build logs
docker build --target production -t test:latest .

# Verify Dockerfile multi-stage targets
docker inspect test:latest
```

### Ansible Connectivity Issues

```bash
# Test Ansible inventory
ansible-inventory -i ansible/inventory/dev --list

# Test connectivity to hosts
ansible dev -i ansible/inventory/dev -m ping
```

### Deployment Rollback

```bash
# Trigger rollback via Jenkins
java -jar jenkins-cli.jar -s http://jenkins-url build stock-pos-server-rollback \
  -p ENVIRONMENT=prod \
  -p ROLLBACK_VERSION=previous-version
```

## Best Practices

1. **Use Git tags for releases**

   ```bash
   git tag -a v1.0.0 -m "Release v1.0.0"
   git push origin v1.0.0
   ```

2. **Test in dev first**
   - Always deploy to dev before staging
   - Validate functionality in dev environment

3. **Review changes before production**
   - Check migrations before running
   - Review environment variables

4. **Monitor after deployment**
   - Check application logs
   - Verify metrics and alerts
   - Monitor resource usage

5. **Maintain rollback readiness**
   - Keep previous versions available
   - Document manual rollback steps
   - Test rollback procedure regularly
