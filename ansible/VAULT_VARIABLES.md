# Vault Variables Checklist

All sensitive and environment-specific values should be stored in **vault.yml** and loaded for production. This file lists every variable that **must exist in vault** (or be provided elsewhere) so that playbooks and templates do not fail.

## Location

- **Production vault:** `ansible/inventories/production/group_vars/vault.yml` (encrypted)
- **Production vars (reference vault):** `ansible/inventories/production/group_vars/prod.yml`

Ensure `vault.yml` is encrypted and that playbooks run with `--vault-password-file` or `--ask-vault-pass` when they load vault.

---

## Required vault keys (vault_*)

These variables are referenced by **prod.yml** and must be defined in **vault.yml**.

### Database
| Vault key | Used as | Example / note |
|-----------|---------|----------------|
| `vault_prod_postgres_user` | postgres_user | `postgres` |
| `vault_prod_postgres_password` | postgres_password | string (e.g. `"mypass"`) |
| `vault_prod_postgres_db` | postgres_db | `stock_pos_prod` |

### Redis
| Vault key | Used as | Example / note |
|-----------|---------|----------------|
| `vault_prod_redis_password` | redis_password | string (if Redis auth enabled) |

### MinIO / S3
| Vault key | Used as | Example / note |
|-----------|---------|----------------|
| `vault_prod_minio_root_user` | minio_root_user | `minioadmin` |
| `vault_prod_minio_password` | minio_root_password | string |

### JWT
| Vault key | Used as | Example / note |
|-----------|---------|----------------|
| `vault_prod_jwt_secret` | jwt_secret | base64 or long random string |
| `vault_prod_jwt_refresh_secret` | jwt_refresh_secret | base64 or long random string |
| `vault_prod_jwt_expiration` | jwt_expiration, jwt_*_expiry | `24h` |

### Docker registry (GHCR)
| Vault key | Used as | Example / note |
|-----------|---------|----------------|
| `vault_docker_registry_url` | docker_registry | `ghcr.io` |
| `vault_docker_registry_username` | docker_registry_username | GitHub username |
| `vault_docker_registry_password` | docker_registry_password | GitHub PAT or token |

### SMTP (optional)
| Vault key | Used as | Example / note |
|-----------|---------|----------------|
| `vault_smtp_host` | smtp_host | `smtp.example.com` |
| `vault_smtp_user` | smtp_user | optional |
| `vault_smtp_password` | smtp_pass / smtp_password | optional |

### SSH / setup
| Vault key | Used as | Example / note |
|-----------|---------|----------------|
| `vault_jenkins_public_key` | Jenkins deploy key (setup) | ssh-rsa AAAA... |
| `vault_additional_ssh_keys` | additional_ssh_keys (setup) | list of `{ key: "...", comment: "..." }` |

---

## How variables are loaded

1. **Deploy playbook**  
   In `playbooks/deploy.yml`, `pre_tasks` load (in order):
   - `inventories/production/group_vars/prod.yml`
   - `inventories/production/group_vars/vault.yml`  
   So all `vault_*` and vars that reference them (e.g. `nginx_http_port`, `db_*`) are available.

2. **Setup playbook**  
   `playbooks/setup.yml` explicitly loads `prod.yml` and `vault.yml` in `pre_tasks`.

3. **Start / Stop / Rollback**  
   These playbooks load only `prod.yml` in `pre_tasks` (no vault needed for app_directory, app_name, backup_directory).

4. **Templates**  
   `roles/app-deploy/templates/env.j2` and others use variables that are set in **prod.yml** (which in turn pulls secrets from **vault.yml**). Templates use `| default(...)` where sensible so a missing optional var does not break the run.

---

## Quick check

After editing vault, ensure:

- All keys in the tables above exist in `vault.yml` (or have a safe default in prod.yml/templates).
- Passwords and secrets are quoted so they are strings in YAML (e.g. `"862004"`).
- Re-encrypt: `ansible-vault encrypt ansible/inventories/production/group_vars/vault.yml`
- Run a syntax check: `ansible-playbook ansible/playbooks/deploy.yml --syntax-check -i ansible/inventories/production/hosts.ini`
