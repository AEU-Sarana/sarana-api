# Docker Network Architecture - Deployment Fixes

## Issues Found & Fixed

### 1. **J2 Template Using Wrong Network Names** ❌ → ✅
- **Problem**: Ansible template was using `{{ app_name }}-network` (e.g., `stock-pos-network`)
- **Solution**: Updated J2 template to use proper network names: `internal-network` and `external-network`
- **File**: `ansible/roles/app-deploy/templates/docker-compose.yml.j2`

### 2. **J2 Template Exposing Private Services** ❌ → ✅
- **Problem**: Database, Redis, MinIO were exposed on host ports in the J2 template
- **Solution**: Removed port exposures for DB (was 5433), Redis (was 6380), MinIO (was 9000-9001)
- **File**: `ansible/roles/app-deploy/templates/docker-compose.yml.j2`

### 3. **Old Network Not Being Removed During Redeploy** ❌ → ✅
- **Problem**: When redeploying, the old `stock-pos-network` remained, preventing new networks from being created
- **Solution**: Added network cleanup script that runs before `docker-compose up`
- **Files**: 
  - `scripts/cleanup-docker-networks.sh` (new cleanup script)
  - `ansible/roles/app-deploy/tasks/deploy-compose.yml` (added cleanup task)

## Current Network Architecture

```
┌─────────────────────────────────────────────────────┐
│                Production Server                     │
│                                                      │
│  Public (Ports 80, 443)                             │
│         │                                            │
│         ▼                                            │
│    ┌─────────────┐                                  │
│    │   Nginx     │──external-network                │
│    │  (public)   │                                  │
│    └──────┬──────┘                                  │
│           │                                         │
│           │ internal-network (private)              │
│           │ proxy to app:3000                       │
│           │                                         │
│    ┌──────┴────────────────────────┐                │
│    ▼           ▼         ▼         ▼                │
│ ┌─────┐  ┌────────┐  ┌─────┐  ┌──────────┐        │
│ │ App │  │Database│  │Redis│  │  MinIO   │        │
│ │     │  │(Postgres)        │             │        │
│ └─────┘  └────────┘  └─────┘  └──────────┘        │
│  (Node) internal-network ONLY (no public ports)    │
│                                                    │
└─────────────────────────────────────────────────────┘
```

## Deployment Process

When you redeploy with Jenkins:

1. ✅ Ansible connects to server
2. ✅ Cleanup script removes old networks (`stock-pos-network`, `stock-pos_default`)
3. ✅ J2 templates generate docker-compose config with correct network names
4. ✅ `docker-compose down` removes old containers
5. ✅ `docker-compose up -d` creates:
   - New `internal-network` (private)
   - New `external-network` (public)
   - Nginx on both networks
   - App, DB, Redis, MinIO on internal-network only

## How to Deploy

```bash
cd /home/techey/stock/stock-pos-server

# All changes committed
git add -A
git commit -m "Fix Docker networks - update J2 template and add cleanup"
git push origin main

# Then Jenkins redeploy will automatically:
# 1. Clean old networks
# 2. Deploy with correct networks
```

## Verification Commands

After deployment:

```bash
ssh deployer@89.167.6.46

# Check networks exist
docker network ls | grep -E "internal|external"

# Verify nginx is on both networks
docker inspect stock-pos-nginx | grep -A 5 '"Networks"'
# Should show: internal-network and external-network

# Verify app is on internal network only
docker inspect stock-pos-app | grep -A 5 '"Networks"'
# Should show: internal-network only

# Check nginx can reach app
docker logs stock-pos-nginx | grep -i "app:3000"
# Should NOT show "host not found" errors

# Test the app
curl -I https://familypos.techey.tech
# Should return 200 or 3xx response
```

## Next Steps

1. ✅ Commit and push all changes
2. ✅ Trigger Jenkins redeploy
3. ✅ Verify networks are created correctly
4. ✅ Test application access at https://familypos.techey.tech
