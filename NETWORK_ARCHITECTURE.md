# Docker Network Architecture - Production

## Overview

The production environment now uses a **two-network architecture** for security and isolation:

1. **internal-network**: Private bridge network for inter-container communication
2. **external-network**: Public network where only nginx is exposed

## Network Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    Host Machine                         │
│                                                          │
│  Port 80/443 (Public)                                   │
│         │                                               │
│         ▼                                               │
│   ┌──────────────┐                                     │
│   │    Nginx     │ ◄─── external-network              │
│   │   (Public)   │                                     │
│   └──────┬───────┘                                     │
│          │                                              │
│          │ internal-network (Private)                   │
│          │ proxy_pass http://app:3000                   │
│          │                                              │
│    ┌─────┴──────────────────────────────────┐           │
│    ▼                    ▼         ▼          ▼           │
│ ┌────────┐         ┌─────────┐ ┌─────┐ ┌──────────┐   │
│ │  App   │────────►│ Database│ │Redis│ │  MinIO   │   │
│ │(Node)  │         │(Postgres)│      │ │          │   │
│ └────────┘         └─────────┘ └─────┘ └──────────┘   │
│                                                          │
│  All internal containers: Only on internal-network      │
│  Nginx: On both networks (internal + external)          │
└─────────────────────────────────────────────────────────┘
```

## Configuration Changes

### Before
- **Database**: Exposed on port 5433 (publicly accessible)
- **Redis**: Exposed on port 6380 (publicly accessible)
- **MinIO**: Exposed on ports 9000-9001 (publicly accessible)
- **App**: Only internal port exposure (good)
- **Nginx**: Exposed on port 8080 (custom internal port)

### After
- **Database**: No port exposure (private network only)
- **Redis**: No port exposure (private network only)
- **MinIO**: No port exposure (private network only)
- **App**: No port exposure (private network only)
- **Nginx**: Exposed on ports 80/443 (HTTP/HTTPS)
- **All containers**: Connected to `internal-network`
- **Nginx only**: Also connected to `external-network`

## Container Network Assignments

| Container | internal-network | external-network | Public Ports |
|-----------|:----------------:|:----------------:|--------------|
| PostgreSQL DB | ✅ | ❌ | None |
| Redis | ✅ | ❌ | None |
| MinIO | ✅ | ❌ | None |
| App (Node.js) | ✅ | ❌ | None |
| Nginx | ✅ | ✅ | 80, 443 |

## How It Works

1. **User Access**: Users connect to nginx on ports 80/443
2. **Nginx Routing**: Nginx resolves internal container names (e.g., `app:3000`) via the internal network
3. **Service Discovery**: Docker DNS automatically resolves `http://app:3000` within containers on the same network
4. **Isolation**: Other containers (DB, Redis, MinIO) are not accessible from outside
5. **Security**: Direct access to database, cache, or storage is impossible from the internet

## Environment Variables

No changes needed. The following env vars should still work:
- `DB_PORT` - No longer exposed (internal only)
- `REDIS_PORT` - No longer exposed (internal only)
- `MINIO_API_PORT` - No longer exposed (internal only)
- `MINIO_CONSOLE_PORT` - No longer exposed (internal only)

These can be removed or left as-is (won't be used).

## Nginx Configuration Requirements

Ensure your nginx config proxies to containers using their service names:

```nginx
upstream backend {
    server app:3000;  # ✅ Correct - uses internal network DNS
}

location /api {
    proxy_pass http://backend;
}
```

❌ **Don't use**: `proxy_pass http://localhost:3000` (won't work from nginx container)

## Deploying Changes

1. **Backup current state**:
   ```bash
   docker ps -a > containers_before.txt
   docker volume ls > volumes_before.txt
   ```

2. **Pull latest configuration**:
   ```bash
   git pull origin main
   ```

3. **Recreate containers**:
   ```bash
   docker-compose -f docker-compose.prod.yml down
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. **Verify networks**:
   ```bash
   docker network ls
   docker network inspect stock-pos-internal-network
   docker network inspect stock-pos-external-network
   ```

5. **Test access**:
   ```bash
   # From host, access via nginx
   curl http://localhost/api/health
   
   # Direct access should fail (expected)
   curl http://localhost:5432  # Connection refused
   curl http://localhost:6379  # Connection refused
   ```

## Debugging Network Issues

### Check if containers are on correct networks
```bash
docker network inspect stock-pos-internal-network
docker network inspect stock-pos-external-network
```

### Test internal connectivity
```bash
docker exec stock-pos-app ping redis  # Should work
docker exec stock-pos-app ping db     # Should work
docker exec stock-pos-app curl http://db:5432  # DB port should work
```

### Check nginx can reach app
```bash
docker logs stock-pos-nginx
docker exec stock-pos-nginx curl http://app:3000/api/health
```

### View open ports
```bash
netstat -tulpn | grep -E ':(80|443|3000|5432|6379|9000)'
```

## Security Benefits

✅ **Prevents direct database access** - No external connection to PostgreSQL  
✅ **Protects cached data** - Redis only accessible via app through nginx  
✅ **Secures object storage** - MinIO admin console not exposed  
✅ **Single entry point** - All traffic flows through nginx (centralized logging, rate limiting)  
✅ **Reduced attack surface** - Only nginx listens on public ports  
✅ **Compliance ready** - Follows defense-in-depth security principle  

## Rolling Back

If issues occur, restore the old docker-compose.prod.yml:
```bash
git checkout docker-compose.prod.yml
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```
