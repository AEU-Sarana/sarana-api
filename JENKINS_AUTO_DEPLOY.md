# Jenkins Auto-Deploy Setup - Quick Reference

## Required Jenkins Credentials (3 total)

Add these in **Jenkins → Manage Credentials → (global) → Add Credentials**:

### 1. GitHub Username
- **ID**: `github-username`
- **Kind**: Secret text
- **Secret**: Your GitHub username (e.g., `techey`)

### 2. GitHub Personal Access Token
- **ID**: `github-token`
- **Kind**: Secret text
- **Secret**: Your GitHub PAT with `write:packages` and `read:packages` scopes
- Generate at: https://github.com/settings/tokens

### 3. Ansible Vault Password
- **ID**: `ansible-vault-password`
- **Kind**: Secret text
- **Secret**: The password you used when running `ansible-vault encrypt`

---

## Complete Workflow

```
┌────────────────────────────────────────────────────────────────┐
│  Developer pushes code to GitHub                               │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│  GitHub Webhook triggers Jenkins (37.27.247.8:8080)            │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│  JENKINS BUILD STAGE (Jenkinsfile.build)                       │
│  ├─ Checkout code from GitHub                                  │
│  ├─ Install dependencies (pnpm install)                        │
│  ├─ Build TypeScript (pnpm build)                              │
│  ├─ Build Docker image                                         │
│  │   docker build -t ghcr.io/USER/stock-pos-server:VERSION    │
│  └─ Push to GHCR (uses github-username + github-token)        │
│      docker push ghcr.io/USER/stock-pos-server:VERSION        │
└────────────────────────────────────────────────────────────────┘
                            ↓
┌────────────────────────────────────────────────────────────────┐
│  JENKINS DEPLOY STAGE (same pipeline, auto-triggered)          │
│  ├─ Decrypt vault.yml (uses ansible-vault-password)           │
│  ├─ SSH to production server from hosts.ini                    │
│  ├─ Run: ansible-playbook deploy.yml                          │
│  └─ Ansible on production server:                             │
│      ├─ Login to GHCR (credentials from vault.yml)            │
│      ├─ Pull: ghcr.io/USER/stock-pos-server:VERSION           │
│      ├─ Stop old containers: docker-compose down              │
│      └─ Start new containers: docker-compose up -d            │
└────────────────────────────────────────────────────────────────┘
                            ↓
                    ✅ Deployment Complete!
```

---

## What Each Credential Does

| Credential ID | Where Used | Purpose |
|--------------|------------|---------|
| `github-username` | Jenkins (Build stage) | Authenticate with GHCR to **push** images |
| `github-token` | Jenkins (Build stage) | Authenticate with GHCR to **push** images |
| `ansible-vault-password` | Jenkins (Deploy stage) | Decrypt vault.yml to get production server credentials |

**vault.yml** contains:
- GHCR credentials (for production server to **pull** images)
- Database passwords
- JWT secrets
- Other production secrets

---

## Setup Steps Summary

### 1. Encrypt vault.yml
```bash
ansible-vault encrypt ansible/inventories/production/group_vars/vault.yml
# Enter a password (e.g., "mySecurePassword123")
```

### 2. Add Jenkins Credentials
- Go to Jenkins → Manage Credentials
- Add 3 credentials (see table above)
- Use the same password from step 1 for `ansible-vault-password`

### 3. Configure Jenkins Job
- Create pipeline from SCM
- Repository: Your GitHub repo
- Script Path: `Jenkinsfile.build`
- Enable GitHub webhook trigger

### 4. Configure GitHub Webhook
- Repository Settings → Webhooks → Add webhook
- URL: `http://37.27.247.8:8080/github-webhook/`
- Events: Push events

### 5. Test
```bash
git add .
git commit -m "Test auto-deploy"
git push origin main
```

Jenkins will:
1. ✅ Build → Push to GHCR
2. ✅ Deploy to production server
3. ✅ Verify deployment

---

## Troubleshooting

### "Vault password required"
- Check `ansible-vault-password` credential exists in Jenkins
- Verify the password matches what you used to encrypt vault.yml
- Test locally: `ansible-vault view vault.yml` with same password

### "Failed to push to GHCR"
- Check `github-token` has correct scopes: `write:packages`, `read:packages`
- Verify token not expired: https://github.com/settings/tokens
- Check `github-username` matches your actual GitHub username

### "SSH connection failed"
- Verify Jenkins can SSH to production server
- Check `ansible/inventories/production/hosts.ini` has correct IP
- Ensure Jenkins server has SSH key access to production server

### "Cannot pull image on production server"
- Check vault.yml has correct GHCR credentials
- Verify vault decryption worked (check Jenkins console output)
- Manually test: `docker pull ghcr.io/USER/APP:latest` on production server

---

## Pipeline Stages

| Stage | Branch | Duration | Description |
|-------|--------|----------|-------------|
| Checkout | All | ~5s | Clone repo |
| Install Dependencies | All | ~30s | pnpm install |
| Build | All | ~20s | TypeScript compile |
| Build Docker Image | All | ~60s | docker build |
| Push to GHCR | main only | ~30s | docker push |
| Deploy with Ansible | main only | ~60s | ansible-playbook |

**Total time**: ~3-4 minutes for full build + deploy

---

## Security Notes

✅ **Safe to commit to git**:
- Encrypted vault.yml
- Jenkinsfile.build
- All Ansible playbooks

❌ **NEVER commit**:
- Decrypted vault.yml
- Ansible vault password in plain text
- GitHub Personal Access Tokens
- SSH private keys

---

## Commands Reference

```bash
# View encrypted vault
ansible-vault view ansible/inventories/production/group_vars/vault.yml

# Edit encrypted vault
ansible-vault edit ansible/inventories/production/group_vars/vault.yml

# Re-encrypt with new password
ansible-vault rekey ansible/inventories/production/group_vars/vault.yml

# Manual deployment (if Jenkins fails)
ansible-playbook ansible/playbooks/deploy.yml \
  -i ansible/inventories/production/hosts.ini \
  --ask-vault-pass

# Check Jenkins from CLI
curl -I http://37.27.247.8:8080/github-webhook/

# View Docker images on GHCR
# https://github.com/YOUR_USERNAME?tab=packages
```

---

## Next Steps After Setup

1. ✅ Test full pipeline end-to-end
2. ✅ Monitor first automated deployment
3. ✅ Set up Slack/email notifications
4. ✅ Configure staging environment (separate branch)
5. ✅ Add rollback capability
6. ✅ Set up health checks post-deployment

---

## Support

If deployment fails, check:
1. Jenkins console output (build logs)
2. Production server logs: `docker logs stock-pos-app`
3. Ansible playbook output in Jenkins
4. GitHub webhook delivery status
