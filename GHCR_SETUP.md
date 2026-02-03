# GitHub Container Registry (GHCR) Setup Guide

## Overview
This guide shows how to push Docker images to GitHub Container Registry (GHCR) using Jenkins.

---

## Step 1: Create GitHub Personal Access Token (PAT)

### 1.1 Generate Token
1. Go to: https://github.com/settings/tokens
2. Click **Generate new token (classic)**
3. Token name: `GHCR Push Token - Jenkins`
4. Select scopes:
   - ✅ `write:packages` - Upload packages to GitHub Package Registry
   - ✅ `read:packages` - Download packages from GitHub Package Registry
   - ✅ `delete:packages` - Delete packages from GitHub Package Registry (optional)
   - ✅ `repo` - Full control of private repositories (if using private repo)
5. Click **Generate token**
6. **Copy the token** - you won't see it again!

---

## Step 2: Configure Jenkins Credentials

### 2.1 Add GitHub Username
1. Go to **Jenkins Dashboard → Manage Jenkins → Manage Credentials**
2. Click **(global)** → **Add Credentials**
3. Configure:
   - **Kind**: `Secret text`
   - **Secret**: Your GitHub username (e.g., `techey`)
   - **ID**: `github-username`
   - **Description**: `GitHub Username for GHCR`
4. Click **OK**

### 2.2 Add GitHub Token
1. Add another credential:
   - **Kind**: `Secret text`
   - **Secret**: Paste your GitHub PAT from Step 1
   - **ID**: `github-token`
   - **Description**: `GitHub Personal Access Token for GHCR`
2. Click **OK**

### 2.3 Add Ansible Vault Password
1. Add another credential:
   - **Kind**: `Secret text`
   - **Secret**: Your ansible-vault password (the password you use with `ansible-vault encrypt`)
   - **ID**: `ansible-vault-password`
   - **Description**: `Ansible Vault Password for Deployment`
2. Click **OK**

---

## Step 3: Update Ansible Vault

### 3.1 Edit vault.yml
```bash
# Decrypt and edit vault file
ansible-vault edit ansible/inventories/production/group_vars/vault.yml
```

### 3.2 Update GHCR credentials
```yaml
# ===== DOCKER REGISTRY CREDENTIALS =====
vault_docker_registry_url: "ghcr.io"
vault_docker_registry_username: "YOUR_GITHUB_USERNAME"  # Replace with your actual username
vault_docker_registry_password: "YOUR_GITHUB_PAT"      # Replace with your actual PAT
```

Save and exit (`:wq` in vim)

---

## Step 4: Workflow

### Build & Push Pipeline (Jenkinsfile.build)

```
┌─────────────────────────────────────────────────┐
│  1. GitHub Webhook Trigger (on push)           │
│     ↓                                           │
│  2. Jenkins: Checkout Code                     │
│     ↓                                           │
│  3. Install Dependencies (pnpm install)        │
│     ↓                                           │
│  4. Build Application (pnpm build)             │
│     ↓                                           │
│  5. Build Docker Image                         │
│     docker build -t ghcr.io/USER/APP:VERSION   │
│     ↓                                           │
│  6. Push to GHCR (main branch only)            │
│     docker push ghcr.io/USER/APP:VERSION       │
│     docker push ghcr.io/USER/APP:latest        │
│     ↓                                           │
│  7. Deploy with Ansible (main branch only)     │
│     - Decrypt vault.yml with stored password   │
│     - SSH to production server                 │
│     - Pull image from GHCR                     │
│     - Stop old containers                      │
│     - Start new containers                     │
└─────────────────────────────────────────────────┘
```

### Deploy Pipeline (Ansible)

```
┌─────────────────────────────────────────────────┐
│  1. Run: ansible-playbook deploy.yml           │
│     ↓                                           │
│  2. Login to GHCR on remote server             │
│     docker login ghcr.io -u USER -p PAT        │
│     ↓                                           │
│  3. Pull Latest Image                          │
│     docker pull ghcr.io/USER/APP:latest        │
│     ↓                                           │
│  4. Stop Old Containers                        │
│     docker-compose down                        │
│     ↓                                           │
│  5. Start New Containers                       │
│     docker-compose up -d                       │
└─────────────────────────────────────────────────┘
```

---

## Step 5: Test the Pipeline

### 5.1 Trigger Build
```bash
# Make a change and push to main branch
git add .
git commit -m "Test GHCR push"
git push origin main
```

### 5.2 Monitor Jenkins
1. Go to Jenkins job: `stock-pos-server` (Jenkinsfile.build)
2. Watch build progress
3. Check console output for "Push to GHCR" stage

### 5.3 Verify on GitHub
1. Go to your GitHub repository
2. Click **Packages** tab (right side)
3. You should see `stock-pos-server` package
4. Click on it to see versions

---

## Step 6: Make Package Public (Optional)

By default, GHCR packages are private.

### Make Public:
1. Go to package: https://github.com/users/YOUR_USERNAME/packages/container/stock-pos-server
2. Click **Package settings**
3. Scroll to **Danger Zone**
4. Click **Change visibility**
5. Select **Public**
6. Type package name to confirm

---

## Step 7: Pull Image from GHCR

### On Production Server:
```bash
# Login to GHCR
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_USERNAME --password-stdin

# Pull image
docker pull ghcr.io/YOUR_USERNAME/stock-pos-server:latest

# Or specific version
docker pull ghcr.io/YOUR_USERNAME/stock-pos-server:123-abc1234
```

### In docker-compose.yml:
```yaml
services:
  app:
    image: ghcr.io/YOUR_USERNAME/stock-pos-server:latest
    # ... rest of config
```

---

## Ansible Deployment with GHCR

### Update app-deploy role to pull from GHCR

The app-deploy role will automatically:
1. Login to GHCR using vault credentials
2. Pull latest image
3. Deploy containers

```bash
# Run deployment
ansible-playbook ansible/playbooks/deploy.yml \
  -i ansible/inventories/production/hosts.ini \
  --ask-vault-pass
```

---

## Troubleshooting

### Build Fails - "unauthorized: authentication required"
- Check GitHub token has `write:packages` scope
- Verify token is not expired (go to https://github.com/settings/tokens)
- Re-generate token if needed

### Image Push Fails - "denied: installation not allowed"
- Enable GitHub Actions if disabled
- Check organization/user has GHCR enabled
- Verify repository visibility matches package visibility

### Can't See Package on GitHub
- Check if push succeeded in Jenkins console
- May take a few seconds to appear
- Check: https://github.com/YOUR_USERNAME?tab=packages

### Pull Fails on Production Server
- Verify PAT has `read:packages` scope
- Check image name matches exactly: `ghcr.io/USERNAME/APP:TAG`
- Ensure logged in: `docker login ghcr.io`

---

## Image Naming Convention

```
ghcr.io/USERNAME/REPOSITORY:TAG

Examples:
- ghcr.io/techey/stock-pos-server:latest
- ghcr.io/techey/stock-pos-server:123-abc1234
- ghcr.io/techey/stock-pos-server:v1.0.0
```

---

## Environment Variables

### Jenkins (Jenkinsfile.build)
```groovy
environment {
    REGISTRY = 'ghcr.io'
    GITHUB_USERNAME = credentials('github-username')
    GITHUB_TOKEN = credentials('github-token')
    DOCKER_IMAGE = "${REGISTRY}/${GITHUB_USERNAME}/${APP_NAME}"
}
```

### Ansible (vault.yml)
```yaml
vault_docker_registry_url: "ghcr.io"
vault_docker_registry_username: "techey"
vault_docker_registry_password: "ghp_xxxxxxxxxxxx"
```

### Ansible (prod.yml)
```yaml
docker_registry: "{{ vault_docker_registry_url }}"
docker_image_full: "{{ docker_registry }}/{{ vault_docker_registry_username }}/{{ docker_image_name }}"
```

---

## Security Best Practices

1. ✅ Never commit PAT to git
2. ✅ Use ansible-vault for sensitive data
3. ✅ Rotate tokens regularly (every 90 days)
4. ✅ Use read-only tokens on production servers
5. ✅ Limit token scope to minimum required
6. ✅ Enable 2FA on GitHub account
7. ✅ Make packages private for internal use

---

## Useful Commands

```bash
# List images on GHCR
docker search ghcr.io/YOUR_USERNAME

# View package versions
# Go to: https://github.com/users/YOUR_USERNAME/packages/container/PACKAGE/versions

# Delete old versions (cleanup)
# Manual: GitHub UI → Package → Versions → Delete
# Or use GitHub API with automation

# Re-tag image
docker tag ghcr.io/USER/APP:latest ghcr.io/USER/APP:v1.0.0
docker push ghcr.io/USER/APP:v1.0.0

# Inspect image
docker image inspect ghcr.io/USER/APP:latest

# Check image size
docker images | grep stock-pos-server
```

---

## Next Steps

1. ✅ Set up automated cleanup of old images
2. ✅ Configure branch-specific tags (dev, staging, prod)
3. ✅ Add image vulnerability scanning (Trivy)
4. ✅ Set up image signing for security
5. ✅ Create staging environment with separate tags

---

## Resources

- GHCR Documentation: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- Docker Build: https://docs.docker.com/engine/reference/commandline/build/
- Ansible Docker: https://docs.ansible.com/ansible/latest/collections/community/docker/
