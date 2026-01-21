#!/bin/bash
# Jenkins & Ansible Setup Script for Stock POS Server
# Usage: ./setup-cicd.sh

set -e

echo "=== Stock POS Server - Jenkins & Ansible Setup ==="

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "\n${BLUE}Checking prerequisites...${NC}"

# Check Docker
if command -v docker &> /dev/null; then
    echo -e "${GREEN}✓ Docker installed${NC}"
else
    echo -e "${YELLOW}✗ Docker not found. Please install Docker.${NC}"
    exit 1
fi

# Check Ansible
if command -v ansible &> /dev/null; then
    echo -e "${GREEN}✓ Ansible installed${NC}"
else
    echo -e "${YELLOW}✗ Ansible not found. Installing...${NC}"
    pip install ansible
fi

# Check pnpm
if command -v pnpm &> /dev/null; then
    echo -e "${GREEN}✓ pnpm installed${NC}"
else
    echo -e "${YELLOW}✗ pnpm not found. Installing...${NC}"
    npm install -g pnpm@10.15.1
fi

# Create directory structure
echo -e "\n${BLUE}Creating Ansible directory structure...${NC}"
mkdir -p ansible/{inventory,playbooks,roles,group_vars}
mkdir -p ansible/roles/{docker-setup,app-deploy,database-migrate,health-check}/{tasks,templates}
echo -e "${GREEN}✓ Ansible directories created${NC}"

# Create example inventory files
echo -e "\n${BLUE}Creating Ansible inventory files...${NC}"
cat > ansible/inventory/dev << 'EOF'
# Development Inventory
[dev]
dev-server ansible_host=dev.example.com ansible_user=deploy ansible_ssh_private_key_file=~/.ssh/dev_key

[dev:vars]
app_env=development
docker_registry=registry.example.com
postgres_host=db-dev.example.com
EOF

cat > ansible/inventory/staging << 'EOF'
# Staging Inventory
[staging]
staging-server ansible_host=staging.example.com ansible_user=deploy ansible_ssh_private_key_file=~/.ssh/staging_key

[staging:vars]
app_env=staging
docker_registry=registry.example.com
postgres_host=db-staging.example.com
EOF

cat > ansible/inventory/prod << 'EOF'
# Production Inventory
[prod]
prod-server-1 ansible_host=prod1.example.com ansible_user=deploy ansible_ssh_private_key_file=~/.ssh/prod_key
prod-server-2 ansible_host=prod2.example.com ansible_user=deploy ansible_ssh_private_key_file=~/.ssh/prod_key

[prod:vars]
app_env=production
docker_registry=registry.example.com
postgres_host=db-prod.example.com
EOF

echo -e "${GREEN}✓ Inventory files created${NC}"

# Create example group_vars
echo -e "\n${BLUE}Creating Ansible group variables...${NC}"
mkdir -p ansible/group_vars

cat > ansible/group_vars/all.yml << 'EOF'
---
# Common variables for all environments
docker_network: stock-pos-network
docker_container_name: stock-pos-app
deploy_path: /opt/stock-pos-server
app_port: 3000
health_check_interval: 30
health_check_timeout: 10
health_check_retries: 3
EOF

echo -e "${GREEN}✓ Group variables created${NC}"

# Test Ansible connectivity
echo -e "\n${BLUE}Testing Ansible setup...${NC}"
if ansible-inventory --list > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Ansible configuration valid${NC}"
else
    echo -e "${YELLOW}⚠ Ansible configuration needs review${NC}"
fi

# Create .env files
echo -e "\n${BLUE}Creating environment files...${NC}"
for env in dev staging prod; do
    if [ ! -f ".env.${env}" ]; then
        cp .env.example .env.${env} 2>/dev/null || echo "NODE_ENV=${env}" > .env.${env}
        echo -e "${GREEN}✓ .env.${env} created${NC}"
    fi
done

# Create Jenkinsfile backups
echo -e "\n${BLUE}Verifying Jenkinsfile structure...${NC}"
for file in Jenkinsfile Jenkinsfile.build; do
    if [ -f "${file}" ]; then
        echo -e "${GREEN}✓ ${file} exists${NC}"
    else
        echo -e "${YELLOW}⚠ ${file} not found${NC}"
    fi
done

# Create credentials template
echo -e "\n${BLUE}Creating Jenkins credentials template...${NC}"
cat > jenkins-credentials.template.txt << 'EOF'
# Jenkins Credentials Setup

## 1. Docker Registry Credentials
ID: docker-registry-credentials
Type: Username with password
Username: <your-registry-user>
Password: <your-registry-token>

## 2. Docker Registry URL
ID: docker-registry-url
Type: Secret text
Secret: registry.example.com

## 3. GitHub Credentials (Optional)
ID: github-credentials
Type: Secret text / SSH key
Secret: <your-github-token-or-key>

## 4. Slack Webhook (Optional)
ID: slack-webhook-url
Type: Secret text
Secret: https://hooks.slack.com/services/...

## 5. Ansible SSH Key
ID: ansible-ssh-key
Type: SSH key with private key
Private key: <path-to-private-key>
EOF

echo -e "${GREEN}✓ Jenkins credentials template created${NC}"

# Create docker-compose override for Jenkins
echo -e "\n${BLUE}Creating Docker Compose configuration...${NC}"
if [ ! -f "docker-compose.override.yml" ]; then
    cat > docker-compose.override.yml << 'EOF'
# Override for local Jenkins integration (development only)
# This file is not committed to git

services:
  app:
    environment:
      JENKINS_BUILD: "true"
      JENKINS_JOB_NAME: "${JENKINS_JOB_NAME:-local}"
      JENKINS_BUILD_NUMBER: "${BUILD_NUMBER:-0}"
EOF
    echo -e "${GREEN}✓ docker-compose.override.yml created${NC}"
fi

# Summary
echo -e "\n${BLUE}=== Setup Complete ===${NC}"
echo -e "\n${GREEN}Next steps:${NC}"
echo "1. Edit Ansible inventory files with your server details:"
echo "   - ansible/inventory/dev"
echo "   - ansible/inventory/staging"
echo "   - ansible/inventory/prod"
echo ""
echo "2. Configure Ansible group variables:"
echo "   - ansible/group_vars/dev.yml"
echo "   - ansible/group_vars/staging.yml"
echo "   - ansible/group_vars/prod.yml"
echo ""
echo "3. Set up Jenkins credentials (see jenkins-credentials.template.txt)"
echo ""
echo "4. Create Jenkins jobs from Jenkinsfile and Jenkinsfile.build"
echo ""
echo "5. Test Ansible connectivity:"
echo "   ansible all -i ansible/inventory/dev -m ping"
echo ""
echo "6. Review documentation:"
echo "   - DEPLOYMENT.md"
echo "   - CICD_DEPLOYMENT_GUIDE.md"
echo "   - QUICKSTART_DEPLOYMENT.md"
echo ""
echo -e "${YELLOW}Documentation:${NC}"
echo "✓ DEPLOYMENT.md - Jenkinsfile reference"
echo "✓ CICD_DEPLOYMENT_GUIDE.md - Complete CI/CD guide"
echo "✓ QUICKSTART_DEPLOYMENT.md - Quick start guide"
echo "✓ .github/copilot-instructions.md - AI coding guidelines"
echo ""
echo -e "${GREEN}Setup complete! You're ready to deploy.${NC}"
