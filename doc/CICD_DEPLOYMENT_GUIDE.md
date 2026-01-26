# CI/CD & Deployment Guide

## Overview

This guide covers the CI/CD pipeline and deployment automation for the Stock POS Server using Jenkins and Ansible.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Git Repository                            │
│                    (main, develop)                           │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │  Jenkins Build Pipeline               │
        │  (Jenkinsfile.build)                  │
        ├────────────────────────────────────────┤
        │ ✓ Checkout Code                        │
        │ ✓ Lint & Format Check                  │
        │ ✓ Build TypeScript                     │
        │ ✓ Build Docker Image                   │
        │ ✓ Security Scan                        │
        │ ✓ Push to Registry                     │
        │ ✓ Trigger Deployment                   │
        └────────────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │  Jenkins Deploy Pipeline               │
        │  (Jenkinsfile)                         │
        ├────────────────────────────────────────┤
        │ ✓ Environment Selection                │
        │ ✓ Docker Pull                          │
        │ ✓ Ansible Deploy                       │
        │ ✓ Health Check                         │
        │ ✓ Notifications                        │
        └────────────────────────────────────────┘
                             │
            ┌────────────────┼────────────────┐
            ▼                ▼                ▼
        [DEV]           [STAGING]         [PROD]
      via Ansible Playbooks with Roles
```

## Jenkins Setup

### Prerequisites

1. **Jenkins Version**: 2.361.1 or later
2. **Plugins Required**:

   ```
   - Pipeline
   - Docker Pipeline
   - Ansible
   - Git
   - Email Extension
   - Slack Notification
   ```

3. **Tools Configuration**:
   - Node.js 20.x
   - Docker & Docker Compose
   - Ansible 2.14+
   - pnpm 10.15.1

### Jenkins Credentials Setup

Create the following credentials in Jenkins:

#### 1. Docker Registry Credentials

```
Kind: Username with password
ID: docker-registry-credentials
Username: <your-registry-user>
Password: <your-registry-token>
```

#### 2. Docker Registry URL

```
Kind: Secret text
ID: docker-registry-url
Secret: registry.example.com
```

#### 3. GitHub Credentials (Optional)

```
Kind: SSH key or Personal access token
ID: github-credentials
Secret: <your-github-token-or-key>
```

#### 4. SSH Key for Ansible

```
Kind: SSH key with private key
ID: ansible-ssh-key
Private key: <path-to-ansible-key>
```

#### 5. Slack Webhook (Optional)

```
Kind: Secret text
ID: slack-webhook-url
Secret: https://hooks.slack.com/services/...
```

### Jenkins Job Configuration

#### Job 1: Build Pipeline (Jenkinsfile.build)

```
Job Name: stock-pos-server-build
SCM: Git
Repository: <your-repo-url>
Script Path: Jenkinsfile.build
Trigger: GitHub push or Poll SCM
```

#### Job 2: Deploy Pipeline (Jenkinsfile)

```
Job Name: stock-pos-server-deploy
Parameterized build with:
  - ENVIRONMENT (choice: dev, staging, prod)
  - RUN_MIGRATIONS (boolean)
  - RUN_TESTS (boolean)
Script Path: Jenkinsfile
Trigger: Manual or from build job
```

#### Job 3: Rollback Pipeline

```
Job Name: stock-pos-server-rollback
Parameters:
  - ENVIRONMENT (choice)
  - ROLLBACK_VERSION (string)
Script Path: Jenkinsfile.rollback
```

## Ansible Deployment

### Directory Structure

```
ansible/
├── ansible.cfg              # Ansible configuration
├── inventory/
│   ├── dev                  # Dev environment hosts
│   ├── staging              # Staging environment hosts
│   └── prod                 # Prod environment hosts
├── playbooks/
│   ├── deploy.yml           # Main deployment playbook
│   ├── healthcheck.yml      # Health verification
│   └── rollback.yml         # Emergency rollback
└── roles/
    ├── common/              # Common variables
    ├── docker-setup/        # Docker installation & setup
    ├── app-deploy/          # Application deployment
    │   ├── tasks/
    │   └── templates/       # .env and docker-compose templates
    ├── database-migrate/    # Database migration execution
    └── health-check/        # Post-deployment health checks
```

### Inventory Configuration

#### Development Inventory (ansible/inventory/dev)

```ini
[dev]
dev-server ansible_host=10.0.1.10 ansible_user=deploy

[dev:vars]
environment=development
postgres_host=localhost
redis_host=localhost
app_port=3000
```

#### Staging Inventory (ansible/inventory/staging)

```ini
[staging]
staging-server ansible_host=10.0.2.10 ansible_user=deploy

[staging:vars]
environment=staging
postgres_host=db-staging.internal
redis_host=redis-staging.internal
app_port=3000
```

#### Production Inventory (ansible/inventory/prod)

```ini
[prod]
prod-server-1 ansible_host=10.0.3.10 ansible_user=deploy
prod-server-2 ansible_host=10.0.3.11 ansible_user=deploy

[prod:vars]
environment=production
postgres_host=db-prod.internal
redis_host=redis-prod.internal
app_port=3000
```

### Key Playbooks

#### 1. Deploy Playbook (deploy.yml)

Executes in order:

1. **docker-setup**: Install Docker, pull image, setup network
2. **app-deploy**: Create containers with environment variables
3. **database-migrate**: Run migrations if enabled
4. **health-check**: Validate deployment

```bash
# Deploy to dev
ansible-playbook -i ansible/inventory/dev \
    -e "app_version=1.0.0" \
    -e "docker_image=registry.example.com/stock-pos-server:1.0.0" \
    ansible/playbooks/deploy.yml

# Deploy to staging with migrations
ansible-playbook -i ansible/inventory/staging \
    -e "app_version=1.0.0" \
    -e "run_migrations=true" \
    ansible/playbooks/deploy.yml

# Deploy to production
ansible-playbook -i ansible/inventory/prod \
    -e "app_version=1.0.0" \
    -e "environment=production" \
    ansible/playbooks/deploy.yml
```

#### 2. Health Check Playbook (healthcheck.yml)

```bash
ansible-playbook -i ansible/inventory/prod \
    ansible/playbooks/healthcheck.yml
```

#### 3. Rollback Playbook (rollback.yml)

```bash
ansible-playbook -i ansible/inventory/prod \
    -e "rollback_to_version=0.9.0" \
    ansible/playbooks/rollback.yml
```

### Ansible Roles

#### docker-setup Role

**Purpose**: Prepare Docker environment

- Install Docker & Docker Compose
- Authenticate with registry
- Create Docker network
- Pull application image

#### app-deploy Role

**Purpose**: Deploy application container

- Create .env file from template
- Stop old container & backup
- Start new container
- Configure health checks
- Wait for container health

#### database-migrate Role

**Purpose**: Run database migrations

- Only runs if `run_migrations=true`
- Executes `pnpm db:migrate:deploy`
- Verifies migration status
- Provides migration feedback

#### health-check Role

**Purpose**: Validate deployment

- Verify container is running
- Check API health endpoint
- Test database connectivity
- Display health summary

## Deployment Workflows

### Development Deployment

```bash
# Via Jenkins UI
1. Build stock-pos-server-build (main branch)
2. Wait for build to complete
3. Automatic deployment to dev triggered

# Via CLI
jenkins-cli build stock-pos-server-deploy \
    -p ENVIRONMENT=dev \
    -p RUN_TESTS=true
```

### Staging Deployment

```bash
# With migrations
jenkins-cli build stock-pos-server-deploy \
    -p ENVIRONMENT=staging \
    -p RUN_MIGRATIONS=true \
    -p RUN_TESTS=true

# Without migrations
jenkins-cli build stock-pos-server-deploy \
    -p ENVIRONMENT=staging \
    -p RUN_MIGRATIONS=false
```

### Production Deployment

```bash
# Requires manual approval in Jenkins UI
jenkins-cli build stock-pos-server-deploy \
    -p ENVIRONMENT=prod \
    -p RUN_MIGRATIONS=false  # Usually false for prod
```

**Safety Features**:

- Manual approval required
- Main branch only
- All previous stages must pass
- Healthcheck validation required

### Emergency Rollback

```bash
# Rollback production to previous version
ansible-playbook -i ansible/inventory/prod \
    -e "rollback_to_version=v1.0.0" \
    ansible/playbooks/rollback.yml

# Or via Jenkins
jenkins-cli build stock-pos-server-rollback \
    -p ENVIRONMENT=prod \
    -p ROLLBACK_VERSION=v1.0.0
```

## Environment Variables & Secrets

### Development (.env.dev)

```
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/stock_pos
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret
JWT_REFRESH_SECRET=dev-refresh-secret
```

### Staging (.env.staging)

```
NODE_ENV=staging
DATABASE_URL=postgresql://user:pass@db-staging:5432/stock_pos
REDIS_URL=redis://redis-staging:6379
JWT_SECRET=${VAULT_JWT_SECRET}
JWT_REFRESH_SECRET=${VAULT_JWT_REFRESH_SECRET}
```

### Production (.env.prod)

```
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db-prod:5432/stock_pos
REDIS_URL=redis://redis-prod:6379
JWT_SECRET=${VAULT_JWT_SECRET}
JWT_REFRESH_SECRET=${VAULT_JWT_REFRESH_SECRET}
ALLOWED_ORIGINS=https://app.example.com
```

**Security Best Practices**:

- Store secrets in Jenkins credentials or Ansible vault
- Never commit .env files to git
- Use separate secrets per environment
- Rotate secrets regularly
- Monitor secret access

## Monitoring & Alerting

### Health Checks

```bash
# Check API health
curl http://localhost:3000/health

# Check container status
docker ps -a

# View logs
docker logs -f stock-pos-app

# Check database
docker exec stock-pos-app pnpm db:migrate:status
```

### Notifications

#### Slack Notifications

```json
{
  "channel": "#deployments",
  "username": "Jenkins",
  "text": "Deployment to prod successful",
  "attachments": [
    {
      "color": "good",
      "fields": [
        { "title": "Version", "value": "1.0.0" },
        { "title": "Environment", "value": "production" },
        { "title": "Duration", "value": "5 minutes" }
      ]
    }
  ]
}
```

#### Email Notifications

Configure in Jenkins Email Extension plugin for:

- Build failures
- Deployment completions
- Health check failures

## Troubleshooting

### Build Failures

**Problem**: Docker build fails

```bash
# Solution: Check Dockerfile syntax
docker build --target production .

# Solution: Check dependencies
pnpm install --frozen-lockfile
pnpm db:generate
```

**Problem**: TypeScript compilation errors

```bash
# Solution: Check tsconfig
pnpm build

# Solution: Fix ESLint issues
pnpm lint:fix
```

### Deployment Failures

**Problem**: Ansible connectivity issues

```bash
# Test inventory
ansible all -i ansible/inventory/dev -m ping

# Check SSH keys
ssh -v -i ~/.ssh/deploy_key deploy@10.0.1.10
```

**Problem**: Docker image not found in registry

```bash
# Solution: Push image first
docker login registry.example.com
docker push registry.example.com/stock-pos-server:latest

# Solution: Check registry credentials
docker login -u user -p pass registry.example.com
```

**Problem**: Database migration fails

```bash
# Check database connectivity
docker exec stock-pos-app pnpm db:migrate:status

# Check migration files
ls src/database/prisma/migrations/

# Check database logs
docker logs postgres
```

### Health Check Failures

**Problem**: API not responding

```bash
# Check container logs
docker logs -f stock-pos-app

# Check port binding
docker port stock-pos-app

# Check network
docker network inspect stock-pos-network
```

**Problem**: Database not accessible

```bash
# Test database connection
docker exec stock-pos-app npm -i pg-connection-string
docker exec stock-pos-app psql $DATABASE_URL -c "SELECT 1"
```

## Maintenance Tasks

### Cleaning Up Old Images

```bash
# In Ansible playbook
- name: Clean up old images
  docker_image:
    state: absent
    name: "{{ docker_registry }}/stock-pos-server:{{ old_version }}"
```

### Database Backups

```bash
# Before production deployments
docker exec postgres pg_dump stock_pos > backup.sql

# Via Ansible
- name: Backup database
  shell: docker exec postgres pg_dump stock_pos > /backups/stock_pos_{{ ansible_date_time.iso8601 }}.sql
```

### Log Rotation

```bash
# Configure in docker-compose
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

## Reference

- [Jenkinsfile Documentation](DEPLOYMENT.md)
- [Ansible Playbook Documentation](https://docs.ansible.com/ansible/latest/user_guide/playbooks.html)
- [Docker Documentation](https://docs.docker.com/)
- [Prisma Database Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)
