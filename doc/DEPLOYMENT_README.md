# 🚀 Stock POS Server - Jenkins & Ansible Deployment

Complete CI/CD and deployment automation for Stock POS Server using Jenkins pipelines and Ansible orchestration.

## 📦 What's Included

### Jenkins Pipelines

- **Jenkinsfile** - Main deployment pipeline for dev/staging/prod
- **Jenkinsfile.build** - Build, test, and image push pipeline
- **Jenkinsfile.rollback** - Emergency rollback automation

### Ansible Infrastructure

- **Playbooks** - Deploy, healthcheck, and rollback automation
- **Roles** - Docker setup, app deployment, database migrations, health checks
- **Inventory** - Configuration for dev, staging, and production environments
- **Templates** - Environment files and Docker Compose configurations

### Documentation

- **DEPLOYMENT.md** - Detailed Jenkinsfile reference
- **CICD_DEPLOYMENT_GUIDE.md** - Complete CI/CD architecture and workflows
- **QUICKSTART_DEPLOYMENT.md** - 5-minute quick start guide
- **setup-cicd.sh** - Automated setup script

## 🎯 Key Features

### Automated Deployment Pipeline

```
Git Push → Jenkins Build → Docker Build → Registry Push → Ansible Deploy → Health Check
```

### Multi-Environment Support

- **Development** - Continuous deployment on every push
- **Staging** - Manual deployment with optional migrations
- **Production** - Manual approval required, main branch only

### Safety & Reliability

- ✅ Automated health checks post-deployment
- ✅ Database migration safety (optional, explicit)
- ✅ Emergency rollback capability
- ✅ Container backup on deployment
- ✅ Health endpoint validation

### Version Control

- Semantic versioning with Git tags
- Docker image tagging with build numbers
- Deployment history tracking
- Rollback to previous versions

## 📋 Quick Start

### 1. Run Setup Script

```bash
./setup-cicd.sh
```

This creates:

- Ansible directory structure
- Example inventory files
- Group variable templates
- Jenkins credentials template

### 2. Configure Environments

Edit inventory and variables for your infrastructure:

```bash
# Update server details
nano ansible/inventory/dev
nano ansible/inventory/staging
nano ansible/inventory/prod

# Update environment variables
nano ansible/group_vars/dev.yml
nano ansible/group_vars/staging.yml
nano ansible/group_vars/prod.yml
```

### 3. Set Up Jenkins

Create Jenkins credentials:

- `docker-registry-url`: Your Docker registry
- `docker-registry-credentials`: Registry username/password
- `github-credentials`: GitHub token (optional)
- `slack-webhook-url`: Slack notifications (optional)

### 4. Create Jenkins Jobs

**Build Job:**

- Name: `stock-pos-server-build`
- Script: `Jenkinsfile.build`
- Trigger: GitHub push / Poll SCM

**Deploy Job:**

- Name: `stock-pos-server-deploy`
- Script: `Jenkinsfile`
- Parameters: ENVIRONMENT, RUN_TESTS, RUN_MIGRATIONS

### 5. Deploy!

```bash
# Via Jenkins UI or CLI
java -jar jenkins-cli.jar build stock-pos-server-deploy \
  -p ENVIRONMENT=dev \
  -p RUN_TESTS=true
```

## 📊 Deployment Flow

### Build Pipeline (Jenkinsfile.build)

```
Checkout → Lint → Format Check → Build → Docker Build →
Security Scan → Push to Registry → Trigger Deploy
```

### Deploy Pipeline (Jenkinsfile)

```
Select Environment → Docker Pull → Ansible Deploy →
Database Migrate (optional) → Health Check → Notify
```

### Ansible Execution

```
docker-setup → app-deploy → database-migrate → health-check
```

## 🔧 Configuration

### Jenkins Credentials Template

```
Credentials to create in Jenkins:

1. Docker Registry URL
   ID: docker-registry-url
   Type: Secret text
   Value: registry.example.com

2. Docker Credentials
   ID: docker-registry-credentials
   Type: Username with password
   Username: <your-user>
   Password: <your-token>

3. Slack Webhook (optional)
   ID: slack-webhook-url
   Type: Secret text
   Value: https://hooks.slack.com/services/...
```

### Ansible Variables

**Development (.env):**

```
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/stock_pos
JWT_SECRET=dev-secret
```

**Production (use Ansible vault!):**

```
NODE_ENV=production
DATABASE_URL=postgresql://user:pass@db-prod:5432/stock_pos
JWT_SECRET={{ vault_jwt_secret }}
```

## 🚀 Common Deployments

### Deploy to Development

```bash
# Automatic on git push, or manual:
java -jar jenkins-cli.jar build stock-pos-server-deploy \
  -p ENVIRONMENT=dev -p RUN_TESTS=true
```

### Deploy to Staging

```bash
java -jar jenkins-cli.jar build stock-pos-server-deploy \
  -p ENVIRONMENT=staging -p RUN_MIGRATIONS=false
```

### Deploy to Production

```bash
# Requires approval in Jenkins UI
java -jar jenkins-cli.jar build stock-pos-server-deploy \
  -p ENVIRONMENT=prod -p RUN_MIGRATIONS=false -w
```

### Emergency Rollback

```bash
ansible-playbook -i ansible/inventory/prod \
  -e "rollback_to_version=v1.0.0" \
  ansible/playbooks/rollback.yml
```

## 🔍 Monitoring & Verification

### Check Deployment Status

```bash
# Container status
ansible prod -i ansible/inventory/prod -m docker_container_info \
  -a "name=stock-pos-app"

# Application logs
docker logs -f stock-pos-app

# Health check
curl http://localhost:3000/health

# Database status
docker exec stock-pos-app pnpm db:migrate:status
```

### View Jenkins Logs

```bash
# Build console output
curl -s "http://localhost:8080/job/stock-pos-server-build/lastBuild/consoleText"

# Watch live
java -jar jenkins-cli.jar console stock-pos-server-build 123 -f
```

## 🛡️ Security Best Practices

### Secrets Management

1. **Store in Ansible Vault**

   ```bash
   ansible-vault create ansible/vault.yml
   ```

2. **Use Jenkins Credentials**
   - Never commit secrets to git
   - Use Jenkins credential storage
   - Implement proper RBAC

3. **Production Safety**
   - Require manual approval for prod
   - Use separate credentials per environment
   - Rotate secrets regularly
   - Audit deployment logs

### Network Security

- Restrict SSH access to deployment servers
- Use VPN for remote deployments
- Implement network segmentation
- Monitor outbound connections

## 📚 Documentation Structure

| Document                            | Purpose                                           |
| ----------------------------------- | ------------------------------------------------- |
| **DEPLOYMENT.md**                   | Jenkinsfile reference and configuration           |
| **CICD_DEPLOYMENT_GUIDE.md**        | Complete architecture, workflows, troubleshooting |
| **QUICKSTART_DEPLOYMENT.md**        | 5-minute setup guide with examples                |
| **.github/copilot-instructions.md** | AI coding guidelines for this codebase            |

## 🔄 Directory Structure

```
stock-pos-server/
├── Jenkinsfile                    # Main deployment pipeline
├── Jenkinsfile.build              # Build and push pipeline
├── Jenkinsfile.rollback           # Rollback automation
├── ansible.cfg                    # Ansible configuration
├── setup-cicd.sh                  # Automated setup script
├── DEPLOYMENT.md                  # Jenkins reference
├── CICD_DEPLOYMENT_GUIDE.md       # Complete guide
├── QUICKSTART_DEPLOYMENT.md       # Quick start
└── ansible/
    ├── inventory/
    │   ├── dev                    # Dev hosts
    │   ├── staging                # Staging hosts
    │   └── prod                   # Prod hosts
    ├── playbooks/
    │   ├── deploy.yml             # Main deployment
    │   ├── healthcheck.yml        # Post-deploy check
    │   └── rollback.yml           # Emergency rollback
    ├── roles/
    │   ├── docker-setup/          # Docker installation
    │   ├── app-deploy/            # Application deployment
    │   │   └── templates/         # .env, docker-compose
    │   ├── database-migrate/      # DB migrations
    │   └── health-check/          # Post-deploy validation
    └── group_vars/
        ├── all.yml                # Common variables
        ├── dev.yml                # Dev variables
        ├── staging.yml            # Staging variables
        └── prod.yml               # Prod variables
```

## 🧪 Testing

### Test Ansible Connectivity

```bash
# Ping all hosts
ansible all -i ansible/inventory/dev -m ping

# Check facts
ansible dev -i ansible/inventory/dev -m setup

# List inventory
ansible-inventory -i ansible/inventory/dev --list
```

### Dry-Run Deployment

```bash
# Test without making changes
ansible-playbook -i ansible/inventory/dev \
  ansible/playbooks/deploy.yml --check -v
```

### Build and Test Locally

```bash
# Build Docker image
docker build --target production -t test:latest .

# Test with docker-compose
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Run health check
curl http://localhost:3000/health
```

## 🔧 Troubleshooting

### Ansible Can't Connect

```bash
# Check SSH key permissions
chmod 600 ~/.ssh/id_rsa
chmod 700 ~/.ssh

# Test SSH directly
ssh -i ~/.ssh/id_rsa deploy@dev.example.com

# Debug Ansible connection
ansible dev -i ansible/inventory/dev -m ping -vvv
```

### Docker Build Fails

```bash
# Check Dockerfile
docker build --target production .

# Check dependencies
pnpm install --frozen-lockfile
pnpm db:generate

# View build logs
docker build --target production --progress=plain .
```

### Deployment Hangs

```bash
# Check process
ps aux | grep docker
ps aux | grep ansible

# Kill hanging processes
pkill -f "docker|ansible"

# Review logs
ansible dev -i ansible/inventory/dev -m shell \
  -a "docker logs -n 50 stock-pos-app"
```

## 📖 For More Information

- **Full Jenkins Reference**: See [DEPLOYMENT.md](DEPLOYMENT.md)
- **Architecture & Workflows**: See [CICD_DEPLOYMENT_GUIDE.md](CICD_DEPLOYMENT_GUIDE.md)
- **5-Minute Setup**: See [QUICKSTART_DEPLOYMENT.md](QUICKSTART_DEPLOYMENT.md)
- **Codebase Guidelines**: See [.github/copilot-instructions.md](.github/copilot-instructions.md)

## 🤝 Contributing

When making changes to deployment:

1. Test in dev environment first
2. Review Ansible playbooks for idempotency
3. Document any infrastructure changes
4. Update inventory and variables
5. Test rollback procedures

## 📝 License

See LICENSE file in repository.

---

**Ready to deploy?** Run `./setup-cicd.sh` to get started! 🚀
