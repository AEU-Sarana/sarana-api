# Architecture Implementation Summary

## ✅ Implemented Architecture

```
Internet → Cloudflare (Proxy) → Host Nginx (HTTPS:443) → Container Nginx (Port 8080) → App Container (Port 3000)
```

## Changes Made

### 1. **Docker Compose Configuration** ([docker-compose.prod.yml](../docker-compose.prod.yml))
   - Changed container nginx from ports `80/443` to internal port `8080`
   - Removed SSL volume mount (SSL now handled by host nginx)
   - Container nginx now only accessible via host nginx reverse proxy

### 2. **Host Nginx Setup** (Ansible Role: `nginx-letsencrypt`)
   - **Templates Created:**
     - `nginx-http-only.conf.j2` - Temporary config for Let's Encrypt verification
     - `nginx-site-ssl.conf.j2` - Production config with SSL/TLS termination
   
   - **Features:**
     - Automatic Let's Encrypt SSL certificate generation
     - SSL/TLS termination at host level
     - Cloudflare real IP restoration
     - Security headers (HSTS, X-Frame-Options, etc.)
     - Proxies all traffic to container nginx on `127.0.0.1:8080`
     - Auto-renewal cron job for certificates

### 3. **Ansible Deployment** ([playbooks/deploy.yml](../ansible/playbooks/deploy.yml))
   - Added `nginx-letsencrypt` role to deployment workflow
   - Role runs after Docker containers are deployed
   - Installs nginx on host, obtains SSL certificates, configures reverse proxy

### 4. **Terraform Infrastructure**
   
   #### Firewall ([modules/firewall/main.tf](../terraform/modules/firewall/main.tf))
   - ✅ Port 22 (SSH) - Restricted IPs
   - ✅ Port 80 (HTTP) - Open for Let's Encrypt challenges
   - ✅ Port 443 (HTTPS) - Open for HTTPS traffic
   - Port 8080 is NOT exposed (internal only)

   #### Cloudflare Module ([modules/cloudflare-proxy/](../terraform/modules/cloudflare-proxy/))
   - Updated to support `proxied` variable
   - SSL mode set to "full" (validates SSL certificate on origin)
   - Variables updated: `domain`, `subdomain`, `proxied`
   - DNS A record points to server IP with proxy enabled

   #### Main Configuration ([environments/prod/main.tf](../terraform/environments/prod/main.tf))
   - Added Cloudflare module integration
   - Outputs: `server_ip`, `domain_name`, `cloudflare_proxied`

### 5. **Configuration Variables** ([terraform.tfvars](../terraform/environments/prod/terraform.tfvars))
   - Current settings:
     - `proxied = true` - Cloudflare proxy enabled (orange cloud)
     - `subdomain = "backendhr"`
     - `domain = "techey.tech"`
     - Full domain: `backendhr.techey.tech`

## Traffic Flow

1. **Client Request:** `https://backendhr.techey.tech`
2. **Cloudflare:** 
   - DDoS protection, CDN, SSL encryption
   - Forwards to server IP on port 443
3. **Host Nginx (Port 443):**
   - SSL/TLS termination with Let's Encrypt certificate
   - Security headers, rate limiting
   - Proxies to `127.0.0.1:8080`
4. **Container Nginx (Port 8080):**
   - Application-specific routing
   - API rate limiting
   - Proxies to app container
5. **App Container (Port 3000):**
   - Express.js application
   - Business logic

## Environment Variables

Add to your `.env` file:
```bash
# Container Nginx Internal Port (not exposed externally)
NGINX_INTERNAL_PORT=8080
```

## Deployment Steps

### 1. Apply Terraform (One-time Infrastructure Setup)
```bash
cd terraform/environments/prod
terraform init
terraform plan
terraform apply
```

This creates:
- Hetzner server
- Firewall rules (SSH, HTTP, HTTPS)
- Cloudflare DNS record with proxy

### 2. Deploy Application with Ansible
```bash
cd ansible
ansible-playbook -i inventories/production/hosts.ini playbooks/deploy.yml \
  --vault-password-file .vault-pass \
  --extra-vars "confirm_deploy=yes"
```

This will:
- Install Docker
- Deploy Docker containers (app, db, redis, minio, nginx)
- Install host nginx
- Obtain Let's Encrypt SSL certificate
- Configure host nginx to proxy to container nginx
- Set up auto-renewal for SSL certificates

### 3. Verify Deployment
```bash
# Check host nginx status
sudo systemctl status nginx

# Check SSL certificate
sudo certbot certificates

# Test HTTPS access
curl -I https://backendhr.techey.tech

# Check container nginx
docker ps | grep stock-pos-nginx
docker logs stock-pos-nginx

# Check all containers
docker ps
```

## Security Notes

1. **Cloudflare Protection:**
   - DDoS mitigation
   - WAF (Web Application Firewall)
   - Bot protection
   - Rate limiting at edge

2. **Host Nginx:**
   - SSL/TLS 1.2+ only
   - Strong cipher suites
   - HSTS enabled (force HTTPS)
   - Security headers

3. **Container Isolation:**
   - Container nginx not exposed to public
   - Only accessible via host nginx (localhost:8080)
   - Docker network isolation

4. **Firewall:**
   - Only ports 22, 80, 443 open
   - SSH restricted to specified IPs
   - Internal port 8080 not exposed

## Troubleshooting

### Check Host Nginx Logs
```bash
sudo tail -f /var/log/nginx/stock-pos-server_https_access.log
sudo tail -f /var/log/nginx/stock-pos-server_https_error.log
```

### Check Container Nginx Logs
```bash
docker logs -f stock-pos-nginx
```

### Test Internal Connection
```bash
# On server
curl http://localhost:8080/health
curl http://localhost:8080/api/health
```

### SSL Certificate Issues
```bash
# Check certificate
sudo certbot certificates

# Test renewal
sudo certbot renew --dry-run

# Force renewal
sudo certbot renew --force-renewal
```

### Nginx Configuration Test
```bash
# Test host nginx config
sudo nginx -t

# Reload host nginx
sudo systemctl reload nginx

# Restart host nginx
sudo systemctl restart nginx
```

## Architecture Verification Checklist

- ✅ Terraform firewall allows ports 22, 80, 443
- ✅ Cloudflare DNS record created with proxy enabled
- ✅ Container nginx on internal port 8080 (not exposed)
- ✅ Host nginx installed with Let's Encrypt SSL
- ✅ Host nginx proxies to container nginx on localhost:8080
- ✅ SSL mode set to "full" in Cloudflare
- ✅ Ansible playbook includes nginx-letsencrypt role
- ✅ Security headers configured in host nginx
- ✅ Cloudflare real IP restoration configured

## Next Steps

1. **First Time Setup:**
   - Run Terraform to create infrastructure
   - Update Ansible inventory with server IP
   - Run Ansible deployment playbook
   
2. **Subsequent Deployments:**
   - Build new Docker image
   - Push to registry
   - Run Ansible deploy playbook (skips nginx setup if already configured)

3. **Monitor:**
   - SSL certificate expiration (auto-renewed)
   - Nginx access/error logs
   - Application logs
   - Docker container health
