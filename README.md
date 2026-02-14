

* about deployment flow seup project 

    * about this project plan is one jenkins and many server
    * the first is : 
        run terraform for setup servers 
            - server jenkins (has already)
            - server for cliens 
        
        jenkins server need : 
            - set up jenkins on this server
            - generate ssh key if not have yet (public and private ssh key )
            - 
            

ANSIBLE : 
    for encrypt 
    ansible-vault encrypt ansible/inventories/production/group_vars/vault.yml


jan / 31 / 2026
    
    - run for create server clien
    - configre for jenkins server and clien server can ssh
    - set point DNS and SSL (HTTPS) not yet (i will add after conatiner is UP)
    - 

feb / 2 / 2026

    - prepare jenkins dashbaord credenatail 

    ***(when whe use scm in job pipeline not work make sure you have 
        - set ssh private key on jenkins dashbaord 
        - set ssh public key on github SSH and GPG key 
    )

    - create job pepiline
    - setup webhook 

    


## Rollback Runbook

Use this runbook when a deployment fails and you need to restore the previous working version quickly.

### 1) Preconditions

- Make sure you can access the repo and vault password file.
- Confirm Ansible can reach the production server.

```bash
cd /home/techey/develop/stock-pos-server
ansible -i ansible/inventories/production/hosts.ini app_servers -m ping
```

### 2) Identify rollback target

- If you know the backup timestamp, use it directly.
- If not, start with latest backup rollback.

### 3) Execute rollback

Rollback to latest backup:

```bash
cd /home/techey/develop/stock-pos-server
ansible-playbook -i ansible/inventories/production/hosts.ini \
  ansible/playbooks/rollback.yml \
  --vault-password-file .vault-pass
```

Rollback to a specific backup timestamp:

```bash
cd /home/techey/develop/stock-pos-server
ansible-playbook -i ansible/inventories/production/hosts.ini \
  ansible/playbooks/rollback.yml \
  --vault-password-file .vault-pass \
  -e backup_timestamp=20240115_143022
```

### 4) Verify service health after rollback

```bash
# container status
ansible -i ansible/inventories/production/hosts.ini app_servers -a "docker ps"

# app logs
ansible -i ansible/inventories/production/hosts.ini app_servers -a "docker logs stock-pos-app --tail 100"

# health endpoint from server
ansible -i ansible/inventories/production/hosts.ini app_servers -a "curl -f http://127.0.0.1:8080/health"
```

### 5) Incident follow-up (same day)

- Record incident timeline (deployment time, rollback time, restored time).
- Document root cause and preventive action.
- Open a fix PR with tests before next production deploy.



============================================================
### 6) Fast rollback (switch-only, blue/green)

Use this when both colors are already running and you only need to switch traffic back quickly.

```bash
cd /home/techey/develop/stock-pos-server
ansible-playbook -i ansible/inventories/production/hosts.ini \
  ansible/playbooks/rollback-switch.yml \
  --vault-password-file .vault-pass
```

You can choose:
- `auto` (default): flips to the other color
- `blue` or `green`: force target color



================================================================
================================================================
## Blue/Green Deployment

This project uses blue/green for app containers in production.

### Services

- `stock-pos-app-blue` -> `127.0.0.1:3001`
- `stock-pos-app-green` -> `127.0.0.1:3002`
- Public traffic enters from `stock-pos-nginx` on `80/443`

Only one color is active at a time. Active color is stored in:

```bash
/opt/stock-pos/.active_color
```

### Deployment flow

1. Read current active color from `.active_color`
2. Choose inactive color as deploy target
3. Deploy new image tag to inactive color only
4. Health check inactive color
5. Switch nginx upstream to inactive color
6. Persist new active color in `.active_color`

This keeps previous tag on the other color for fast rollback.

### Verify current state

```bash
# show active color
cat /opt/stock-pos/.active_color

# show blue/green running tags
docker ps --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}" | grep stock-pos-app-

# check nginx upstream target
grep -n "server app-" /opt/stock-pos/docker/nginx/conf.d/default.conf
```

### Deploy command

```bash
cd /home/techey/develop/stock-pos-server
ansible-playbook -i ansible/inventories/production/hosts.ini \
  ansible/playbooks/deploy.yml \
  --vault-password-file .vault-pass \
  -e confirm_deploy=yes
```

### Rollback options

- Tag rollback (re-deploy previous image tag):

```bash
ansible-playbook -i ansible/inventories/production/hosts.ini \
  ansible/playbooks/rollback.yml \
  --vault-password-file .vault-pass
```

- Switch-only rollback (no pull/build, only traffic switch):

```bash
ansible-playbook -i ansible/inventories/production/hosts.ini \
  ansible/playbooks/rollback-switch.yml \
  --vault-password-file .vault-pass
```



================================================================
## Node Exporter

Node Exporter is enabled on the app server to expose host metrics (CPU, memory, filesystem, load, network) for Prometheus.

### Configuration

Configured in:
- `ansible/inventories/production/group_vars/all.yml`
- `ansible/roles/app-deploy/defaults/main.yml`

Variables:
- `node_exporter_enabled: true`
- `node_exporter_port: 9100`
- `node_exporter_bind_address: 0.0.0.0`
- `node_exporter_allowed_source_ip: 37.27.180.31` (Jenkins server IP)

### Container service

Defined in:
- `ansible/roles/app-deploy/templates/docker-compose.yml.j2`

Service name:
- `stock-pos-node-exporter`

Port binding:
- `0.0.0.0:9100 -> 9100` (published on host)

### Restrict access to Jenkins IP only

Apply firewall rules on app server so only Jenkins can scrape port `9100`:

```bash
cd /home/techey/develop/stock-pos-server
ansible-playbook -i ansible/inventories/production/hosts.ini \
  ansible/playbooks/secure-node-exporter.yml
```

This playbook adds `DOCKER-USER` iptables rules:
- `ACCEPT` source `37.27.180.31` to `tcp/9100`
- `DROP` everyone else to `tcp/9100`

### Apply compose change

After changing `node_exporter_bind_address`, redeploy app stack:

```bash
cd /home/techey/develop/stock-pos-server
ansible-playbook -i ansible/inventories/production/hosts.ini \
  ansible/playbooks/deploy.yml \
  --vault-password-file .vault-pass \
  -e confirm_deploy=yes
```

### Verify on app server

```bash
docker ps | grep node-exporter
curl -s http://127.0.0.1:9100/metrics | head
```

### Prometheus scrape example

If Prometheus runs on another server, expose this endpoint through private network/VPN/firewall rules and scrape:

```yaml
scrape_configs:
  - job_name: stock-pos-node
    static_configs:
      - targets: ['APP_SERVER_PRIVATE_IP:9100']
```
============================================================
    
