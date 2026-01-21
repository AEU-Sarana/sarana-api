# Quick Start Guide - Jenkins & Ansible Deployment

## 📋 Prerequisites

- Jenkins 2.361.1+
- Ansible 2.14+
- Docker & Docker Compose
- Node.js 20.x
- pnpm 10.15.1+
- SSH access to deployment servers
- Git repository access

## 🚀 5-Minute Setup

### 1. Configure Jenkins Credentials

```bash
# In Jenkins UI: Manage Jenkins > Credentials > System > Global Credentials

# Docker Registry
Name: docker-registry-credentials
Type: Username with password
Username: <your-docker-user>
Password: <your-docker-token>

# Docker Registry URL
Name: docker-registry-url
Type: Secret text
Secret: registry.example.com

# GitHub (optional)
Name: github-credentials
Type: Secret text / SSH key
Secret: <your-token-or-key>
```

### 2. Create Jenkins Jobs

**Job 1: Build Pipeline**

```
Name: stock-pos-server-build
Type: Pipeline
Repository: <your-git-repo>
Script Path: Jenkinsfile.build
Trigger: GitHub webhook / Poll SCM
```

**Job 2: Deploy Pipeline**

```
Name: stock-pos-server-deploy
Type: Pipeline with parameters
Repository: <your-git-repo>
Script Path: Jenkinsfile
Parameters:
  - ENVIRONMENT (choice: dev, staging, prod)
  - RUN_MIGRATIONS (boolean, default: false)
  - RUN_TESTS (boolean, default: true)
Trigger: Manual / from build job
```

### 3. Prepare Ansible Inventory

```bash
# Copy example files
cp ansible/inventory/dev.example ansible/inventory/dev
cp ansible/group_vars/dev.yml.example ansible/group_vars/dev.yml
cp ansible/group_vars/staging.yml.example ansible/group_vars/staging.yml
cp ansible/group_vars/prod.yml.example ansible/group_vars/prod.yml

# Edit with your server details
nano ansible/inventory/dev
nano ansible/group_vars/dev.yml
```

### 4. Test Ansible Connectivity

```bash
# Test dev inventory
ansible all -i ansible/inventory/dev -m ping

# Test specific host
ansible dev -i ansible/inventory/dev -m ping

# Verify Ansible facts
ansible dev -i ansible/inventory/dev -m setup | head -20
```

### 5. Configure Environment Variables

```bash
# Create .env files from examples
cp .env.example .env.dev
cp .env.example .env.staging
cp .env.example .env.prod

# Edit with actual values
nano .env.dev
nano .env.staging
nano .env.prod
```

## 📦 First Deployment

### Deploy to Development

```bash
# Option 1: Via Jenkins UI
1. Go to Jenkins Dashboard
2. Click "New Item" > "Pipeline"
3. Configure as described above
4. Click "Build with Parameters"
5. Select ENVIRONMENT=dev, RUN_TESTS=true
6. Click "Build"

# Option 2: Via CLI
java -jar jenkins-cli.jar -s http://localhost:8080 \
  build stock-pos-server-deploy \
  -p ENVIRONMENT=dev \
  -p RUN_TESTS=true \
  -w

# Option 3: Manual Ansible
ansible-playbook -i ansible/inventory/dev \
  -e "app_version=1.0.0" \
  -e "docker_image=registry.example.com/stock-pos-server:latest" \
  -e "environment=dev" \
  ansible/playbooks/deploy.yml -v
```

### Verify Deployment

```bash
# Check container status
ansible dev -i ansible/inventory/dev -m docker_container_info \
  -a "name=stock-pos-app"

# Check logs
ansible dev -i ansible/inventory/dev -m shell \
  -a "docker logs -n 20 stock-pos-app"

# Test API health
curl http://dev.example.com:3000/health
```

## 🔐 Using Ansible Vault for Secrets

### Create Vault File

```bash
# Create encrypted vault file
ansible-vault create ansible/vault.yml

# Add your secrets
jwt_secret: "your-secret-here"
jwt_refresh_secret: "your-refresh-secret-here"
postgres_password: "your-db-password-here"
```

### Use Vault in Playbooks

```bash
# Run playbook with vault
ansible-playbook -i ansible/inventory/prod \
  --ask-vault-pass \
  ansible/playbooks/deploy.yml

# Or use vault password file
echo "your-vault-password" > .vault-pass
ansible-playbook -i ansible/inventory/prod \
  --vault-password-file .vault-pass \
  ansible/playbooks/deploy.yml
```

## 🔄 Common Workflows

### Build and Deploy to Dev

```bash
# Jenkins will do this automatically:
# 1. Checkout code
# 2. Lint & format check
# 3. Build TypeScript
# 4. Build Docker image
# 5. Push to registry
# 6. Deploy to dev
```

### Deploy to Staging

```bash
# Manual deployment with migrations
ansible-playbook -i ansible/inventory/staging \
  -e "app_version=1.0.0" \
  -e "environment=staging" \
  -e "run_migrations=true" \
  -e "docker_image=registry.example.com/stock-pos-server:1.0.0" \
  ansible/playbooks/deploy.yml -v
```

### Deploy to Production

```bash
# Via Jenkins (requires approval)
# 1. Code merged to main
# 2. Build completes
# 3. Click "Deploy" on Jenkinsfile
# 4. Select ENVIRONMENT=prod
# 5. Approve production deployment
# 6. Deployment proceeds with health checks
```

### Health Check After Deployment

```bash
# Run health check playbook
ansible-playbook -i ansible/inventory/prod \
  ansible/playbooks/healthcheck.yml -v
```

### Emergency Rollback

```bash
# Rollback to previous version
ansible-playbook -i ansible/inventory/prod \
  -e "rollback_to_version=v1.0.0" \
  ansible/playbooks/rollback.yml -v

# Or via Jenkins job
java -jar jenkins-cli.jar -s http://localhost:8080 \
  build stock-pos-server-rollback \
  -p ENVIRONMENT=prod \
  -p ROLLBACK_VERSION=v1.0.0 \
  -w
```

## 📊 Monitoring Deployments

### View Jenkins Build Log

```bash
# Tail build log
curl -s "http://localhost:8080/job/stock-pos-server-build/lastBuild/consoleText"

# Watch deployment
java -jar jenkins-cli.jar -s http://localhost:8080 \
  console stock-pos-server-deploy 123 -f
```

### Check Ansible Execution

```bash
# View previous Ansible runs
ls -la /tmp/ansible_facts/

# Check deployment status
docker inspect --format='{{.State.Running}}' stock-pos-app

# View application logs
docker logs -f stock-pos-app
```

### Monitor Application

```bash
# Health endpoint
curl http://prod.example.com:3000/health

# Database status
ansible prod -i ansible/inventory/prod -m shell \
  -a "docker exec stock-pos-app pnpm db:migrate:status"

# Resource usage
ansible prod -i ansible/inventory/prod -m shell \
  -a "docker stats stock-pos-app --no-stream"
```

## 🛠️ Troubleshooting

### Ansible Can't Connect to Hosts

```bash
# Check SSH key
ssh-keygen -l -f ~/.ssh/deploy_key

# Test SSH connection
ssh -i ~/.ssh/deploy_key deploy@dev.example.com

# Fix permission issues
chmod 600 ~/.ssh/deploy_key
chmod 700 ~/.ssh
```

### Docker Image Not Found

```bash
# Check if image is built
docker images | grep stock-pos-server

# Push image to registry
docker login registry.example.com
docker push registry.example.com/stock-pos-server:latest

# Verify in registry
curl -H "Authorization: Bearer $TOKEN" \
  https://registry.example.com/v2/stock-pos-server/tags/list
```

### Database Migration Fails

```bash
# Check database connectivity
ansible prod -i ansible/inventory/prod -m shell \
  -a "docker exec stock-pos-app pnpm db:migrate:status"

# Check migrations pending
ansible prod -i ansible/inventory/prod -m shell \
  -a "ls src/database/prisma/migrations/"

# View database logs
docker logs postgres
```

### Health Check Fails

```bash
# Check container logs
docker logs -f stock-pos-app

# Check port binding
docker port stock-pos-app

# Verify network
docker network inspect stock-pos-network

# Test API manually
curl -v http://localhost:3000/health
```

## 📚 Next Steps

1. **Configure Notifications**
   - Set up Slack webhook in Jenkins
   - Configure email notifications
   - Add GitHub status checks

2. **Set Up Monitoring**
   - Add Prometheus for metrics
   - Set up Grafana dashboards
   - Configure AlertManager

3. **Implement Backup Strategy**
   - Daily database backups
   - Container image retention
   - Deployment history

4. **Document Runbooks**
   - Deployment procedures
   - Incident response
   - Rollback procedures
   - Scaling operations

## 🔗 Resources

- [Jenkinsfile Documentation](DEPLOYMENT.md)
- [Full CI/CD Guide](CICD_DEPLOYMENT_GUIDE.md)
- [Ansible Playbook Docs](https://docs.ansible.com/ansible/latest/user_guide/playbooks.html)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Stock POS Copilot Instructions](.github/copilot-instructions.md)

## 💡 Tips

- Always test in dev first
- Use version tags for production releases
- Monitor logs after each deployment
- Keep rollback versions available
- Document any custom configurations
- Review deployment logs for issues
