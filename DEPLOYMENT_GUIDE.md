# Deployment Checklist & Guide

## ✅ Pre-Deployment Checklist

### Infrastructure (Terraform)
- [x] Terraform configuration created and validated
- [x] Firewall rules configured (ports 22, 80, 443)
- [x] Cloudflare DNS record created with proxy enabled
- [x] Server deployed at 89.167.6.46

### Configuration
- [x] Ansible inventory updated with server IP
- [x] Group variables configured (all.yml)
- [x] Domain variables added (domain, subdomain, SSL)

### Before Running Ansible
- [ ] Verify SSH access to server: `ssh deployer@89.167.6.46`
- [ ] Server is running Ubuntu 22.04
- [ ] Deployer user has sudo access

## 📋 Step-by-Step Deployment

### Step 1: Verify SSH Connection
```bash
# Test SSH connectivity with deployer user
ssh -v deployer@89.167.6.46
# Should connect without password (using SSH key)
exit
```

**If SSH fails:**
- Check if SSH key is in `~/.ssh/id_rsa`
- Verify Hetzner console has the SSH key authorized
- SSH key should be added to server during Terraform setup

### Step 2: Create/Check Vault File

```bash
cd /home/techey/stock/stock-pos-server/ansible

# List vault file if it exists
ls -la inventories/production/group_vars/vault.yml

# If vault.yml doesn't exist, create it:
# (We'll create with default values for testing)
cat > inventories/production/group_vars/vault.yml << 'EOF'
---
# PRODUCTION VAULT - ENCRYPTED SECRETS
# Edit with: ansible-vault edit inventories/production/group_vars/vault.yml

# Docker Registry (GitHub Container Registry or similar)
vault_docker_registry_url: ghcr.io
vault_docker_registry_username: your-username
vault_docker_registry_password: your-token

# PostgreSQL
vault_prod_postgres_user: stockpos
vault_prod_postgres_db: stock_pos
vault_prod_postgres_password: "SecurePassword123!@#"

# Redis
vault_prod_redis_password: "RedisPassword123!@#"

# MinIO
vault_prod_minio_root_user: minioadmin
vault_prod_minio_password: "MinIOPassword123!@#"

# Application Secrets
vault_app_secret_key: "ChangeThisToSecureRandomKey123456"

# JWT Secrets
vault_prod_jwt_secret: "ChangeThisToSecureJWTSecret123456"
vault_prod_jwt_refresh_secret: "ChangeThisToSecureRefreshSecret123456"
vault_prod_jwt_expiration: "7d"

# SMTP Configuration
vault_smtp_host: smtp.example.com
vault_smtp_user: noreply@stockpos.com
vault_smtp_password: "SMTPPassword123!@#"
EOF
```

**IMPORTANT: Replace the passwords with your actual secrets!**

### Step 3: Encrypt Vault File (Optional but Recommended)

```bash
# Create a password for vault encryption
ansible-vault encrypt inventories/production/group_vars/vault.yml

# It will prompt you to create a password
# Save this password securely - you'll need it for deployments

# To edit vault file later:
ansible-vault edit inventories/production/group_vars/vault.yml
```

### Step 4: Create Vault Password File

```bash
# Create file that ansible will use to auto-decrypt vault
echo "your-vault-password" > /home/techey/stock/stock-pos-server/.vault-pass
chmod 600 /home/techey/stock/stock-pos-server/.vault-pass

# Add to .gitignore if not already there
echo ".vault-pass" >> .gitignore
```

### Step 5: Verify Ansible Connectivity

```bash
cd /home/techey/stock/stock-pos-server/ansible

# Test ansible can reach the server
ansible -i inventories/production/hosts.ini app_servers -m ping

# Should output:
# app-server-01 | SUCCESS => {
#     "changed": false,
#     "ping": "pong"
# }
```

### Step 6: Run Deployment Playbook

```bash
cd /home/techey/stock/stock-pos-server

# DRY RUN (no changes, just shows what will happen)
ansible-playbook -i ansible/inventories/production/hosts.ini \
  ansible/playbooks/deploy.yml \
  --vault-password-file .vault-pass \
  --check

# ACTUAL DEPLOYMENT (will prompt for confirmation)
ansible-playbook -i ansible/inventories/production/hosts.ini \
  ansible/playbooks/deploy.yml \
  --vault-password-file .vault-pass \
  --extra-vars "confirm_deploy=yes"
```

## 🔍 Post-Deployment Verification

### Step 7: SSH to Server and Verify Services

```bash
# SSH to server
ssh deployer@89.167.6.46

# Switch to root for system commands
sudo -i

# Check all Docker containers are running
docker ps

# You should see:
# - stock-pos-app (your Express.js app)
# - stock-pos-nginx (container nginx on port 8080)
# - stock-pos-db (PostgreSQL)
# - stock-pos-redis (Redis)
# - stock-pos-minio (MinIO for file storage)

# Check host nginx status
systemctl status nginx

# Check host nginx is running on port 443
netstat -tlnp | grep nginx

# Check SSL certificate
certbot certificates

# Should show certificate for pos.techey.tech

# Test container connectivity
curl http://127.0.0.1:8080/health

# Test host nginx health
curl http://127.0.0.1/health

# Check nginx logs
tail -f /var/log/nginx/stock-pos-server_https_access.log
```

### Step 8: Verify HTTPS Access from Internet

```bash
# From your local machine (not SSH'd into server)

# Test HTTP redirect
curl -I http://pos.techey.tech
# Should return: 301 Moved Permanently (redirects to HTTPS)

# Test HTTPS
curl -I https://pos.techey.tech
# Should return: 200 OK

# Test API endpoint
curl https://pos.techey.tech/api/health
# Should return JSON response from your app
```

### Step 9: Check Logs

```bash
# SSH to server
ssh deployer@89.167.6.46
sudo -i

# Host nginx logs
tail -100 /var/log/nginx/stock-pos-server_https_access.log
tail -50 /var/log/nginx/stock-pos-server_https_error.log

# Container nginx logs
docker logs -f stock-pos-nginx

# App container logs
docker logs -f stock-pos-app

# Check for errors in certbot renewal
sudo certbot certificates
sudo certbot renew --dry-run
```

## 🆘 Troubleshooting

### SSH Connection Issues

```bash
# Check SSH key permissions
ls -la ~/.ssh/id_rsa
# Should be: -rw------- (600)

# Check if SSH key loaded in agent
ssh-add -l

# If not, add it:
ssh-add ~/.ssh/id_rsa

# Verbose SSH to debug
ssh -vvv deployer@89.167.6.46
```

### Ansible Playbook Issues

```bash
# Run with verbose output
ansible-playbook ... -vvv

# Check playbook syntax
ansible-playbook --syntax-check ansible/playbooks/deploy.yml

# List all tasks
ansible-playbook ... --list-tasks
```

### Nginx Issues

```bash
ssh deployer@89.167.6.46
sudo -i

# Test nginx configuration
nginx -t

# Reload nginx
systemctl reload nginx

# Check if port 443 is listening
netstat -tlnp | grep :443

# Check Cloudflare is pointing to correct IP
dig pos.techey.tech
# Should show: 89.167.6.46 (after Cloudflare resolves)
```

### SSL Certificate Issues

```bash
ssh deployer@89.167.6.46
sudo -i

# Check certificate expiration
certbot certificates

# Check certificate details
openssl x509 -in /etc/letsencrypt/live/pos.techey.tech/fullchain.pem -text -noout

# Test renewal
certbot renew --dry-run

# Manual renewal if needed
certbot renew --force-renewal
```

### Container Issues

```bash
ssh deployer@89.167.6.46
sudo -i

# Check container status
docker ps -a

# Restart specific container
docker restart stock-pos-app

# View container logs
docker logs stock-pos-app

# Check container IP/network
docker inspect stock-pos-app | grep -A 10 Networks

# Test internal connectivity
docker exec stock-pos-app curl http://localhost:3000/api/health
```

## 📊 Architecture Verification

After everything is deployed, verify the complete flow:

```
1. Test from Internet
   curl https://pos.techey.tech/api/health
   ↓
2. Cloudflare proxies to 89.167.6.46:443
   ↓
3. Host Nginx on port 443 (SSL termination)
   ↓
4. Host Nginx proxies to 127.0.0.1:8080
   ↓
5. Container Nginx on port 8080
   ↓
6. Container Nginx proxies to 127.0.0.1:3000
   ↓
7. Express.js App on port 3000
   ↓
Response: JSON from /api/health endpoint
```

## 🎯 Next Steps After Successful Deployment

1. **Update Application Code** - Push updates to GitHub
2. **Setup CI/CD** - Configure Jenkins for auto-deployment
3. **Setup Monitoring** - Configure logs aggregation, uptime monitoring
4. **Backup Strategy** - Ensure database backups are configured
5. **Scale** - Add more servers or optimize resource allocation

---

**For help with any specific step, run the command and share the output!** 🚀
