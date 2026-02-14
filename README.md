

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
    
