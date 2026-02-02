# Ansible Docker Deployment for Stock POS

Ansible automation for deploying the Stock POS application using Docker and Docker Compose. This setup includes Jenkins and the application on the same server, with the Express application built as a Docker image.

## 📁 Project Structure

```
ansible-docker-deploy/
├── ansible.cfg                      # Ansible configuration
├── requirements.yml                 # Ansible Galaxy dependencies
├── inventories/
│   └── production/
│       └── hosts.yml               # Production inventory with variables
├── roles/
│   ├── docker/                     # Docker installation role
│   │   ├── defaults/
│   │   │   └── main.yml
│   │   ├── tasks/
│   │   │   └── main.yml
│   │   └── handlers/
│   │       └── main.yml
│   ├── jenkins/                    # Jenkins setup role (if needed)
│   └── app-deploy/                 # Application deployment role
│       ├── defaults/
│       │   └── main.yml
│       ├── tasks/
│       │   ├── main.yml
│       │   ├── pre-deploy.yml
│       │   ├── setup-app.yml
│       │   ├── build-image.yml
│       │   ├── deploy-compose.yml
│       │   └── post-deploy.yml
│       ├── templates/
│       │   ├── env.j2
│       │   ├── docker-compose.yml.j2
│       │   ├── docker-compose.prod.yml.j2
│       │   ├── Dockerfile.j2
│       │   ├── nginx.conf.j2
│       │   └── nginx-default.conf.j2
│       └── handlers/
│           └── main.yml
└── playbooks/
    ├── deploy.yml                  # Main deployment playbook
    ├── rollback.yml                # Rollback to previous version
    ├── start.yml                   # Start containers
    ├── stop.yml                    # Stop containers
    └── status.yml                  # Check application status
```

## 🚀 Quick Start

### Prerequisites

1. **Control Machine** (your local machine or CI/CD server):
   - Ansible 2.9+
   - Python 3.8+
   - SSH access to target servers

2. **Target Server**:
   - Ubuntu 20.04+ or Debian 11+
   - SSH access with sudo privileges
   - Minimum 2GB RAM, 20GB disk space

### Installation

1. **Install Ansible**:
```bash
# On Ubuntu/Debian
sudo apt update
sudo apt install ansible python3-pip

# On macOS
brew install ansible

# Verify installation
ansible --version
```

2. **Install required Ansible collections**:
```bash
ansible-galaxy install -r requirements.yml
```

3. **Install Python dependencies**:
```bash
pip3 install docker docker-compose
```

### Configuration

1. **Update Inventory** (`inventories/production/hosts.ini`):
```yaml
app_servers:
  hosts:
    app-server-01:
      ansible_host: YOUR_SERVER_IP
      ansible_user: YOUR_SSH_USER
      
      # Application settings
      app_repo: https://github.com/YOUR_USERNAME/YOUR_REPO.git
      app_branch: main
      
      # Security: Change these passwords!
      db_password: "YOUR_SECURE_DB_PASSWORD"
      minio_root_password: "YOUR_SECURE_MINIO_PASSWORD"
```

**Note about existing files:** If your repository already contains these files, Ansible will use them:
- `Dockerfile` - Your existing Dockerfile (set `create_dockerfile: true` only if you don't have one)
- `docker/nginx/nginx.conf` - Your nginx config (set `create_nginx_config: true` only if you don't have nginx configs)
- `docker/nginx/conf.d/default.conf` - Your nginx server config

By default, both `create_dockerfile` and `create_nginx_config` are `false`, so Ansible will use your existing files.

2. **Configure SSH access**:
```bash
# Copy your SSH key to the server
ssh-copy-id YOUR_SSH_USER@YOUR_SERVER_IP

# Test connection
ssh YOUR_SSH_USER@YOUR_SERVER_IP
```

3. **Test Ansible connectivity**:
```bash
ansible app_servers -m ping
```

## 📝 Usage

### Deploy Application

Deploy the complete application stack:

```bash
# Full deployment (will prompt for confirmation)
ansible-playbook playbooks/deploy.yml

# Deploy without confirmation prompt
ansible-playbook playbooks/deploy.yml -e confirm_deploy=yes

# Deploy only specific tags
ansible-playbook playbooks/deploy.yml --tags docker
ansible-playbook playbooks/deploy.yml --tags app

# Dry run (check mode)
ansible-playbook playbooks/deploy.yml --check

# Verbose output
ansible-playbook playbooks/deploy.yml -v   # or -vv, -vvv for more verbosity
```

### Check Application Status

```bash
ansible-playbook playbooks/status.yml
```

### Start/Stop Application

```bash
# Start all containers
ansible-playbook playbooks/start.yml

# Stop all containers
ansible-playbook playbooks/stop.yml
```

### Rollback Deployment

```bash
# Rollback to latest backup
ansible-playbook playbooks/rollback.yml

# Rollback to specific backup
ansible-playbook playbooks/rollback.yml -e backup_timestamp=20240115_143022
```

## 🔧 Advanced Usage

### Deploy to Specific Host

```bash
ansible-playbook playbooks/deploy.yml -l app-server-01
```

### Override Variables

```bash
ansible-playbook playbooks/deploy.yml \
  -e "app_branch=develop" \
  -e "force_recreate=true" \
  -e "docker_image_tag=v1.2.3"
```

### Build Only (Skip Deployment)

```bash
ansible-playbook playbooks/deploy.yml --tags build
```

### Deploy Without Building

```bash
ansible-playbook playbooks/deploy.yml -e build_image=false
```

## 🐳 Docker Management

### View Running Containers

```bash
ansible app_servers -a "docker ps"
```

### View Container Logs

```bash
ansible app_servers -a "docker logs stock-pos-app --tail 100"
```

### Execute Commands in Container

```bash
ansible app_servers -a "docker exec stock-pos-app npm run migrate"
```

### Clean Up Docker Resources

```bash
ansible app_servers -a "docker system prune -af"
```

## 🔐 Security Best Practices

1. **Encrypt Sensitive Data** with Ansible Vault:

```bash
# Create encrypted file
ansible-vault create inventories/production/vault.yml

# Edit encrypted file
ansible-vault edit inventories/production/vault.yml

# Run playbook with vault
ansible-playbook playbooks/deploy.yml --ask-vault-pass
```

2. **Use SSH Key Authentication** (never passwords)

3. **Change Default Passwords** in inventory

4. **Use Environment-Specific Inventories**:
   - `inventories/staging/`
   - `inventories/production/`

## 📊 Variables Reference

### Inventory Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `app_name` | Application name | `stock-pos` |
| `app_directory` | Installation directory | `/opt/stock-pos` |
| `app_repo` | Git repository URL | Required |
| `app_branch` | Git branch to deploy | `main` |
| `docker_image_name` | Docker image name | `stock-pos-app` |
| `docker_image_tag` | Docker image tag | `latest` |
| `build_image` | Build image locally | `true` |
| `force_recreate` | Force recreate containers | `false` |
| `db_password` | PostgreSQL password | Required |
| `minio_root_password` | MinIO password | Required |

### Runtime Variables

```bash
# Force container recreation
-e force_recreate=true

# Skip image build
-e build_image=false

# Use specific image tag
-e docker_image_tag=v1.2.3

# Skip confirmation
-e confirm_deploy=yes
```

## 🔄 CI/CD Integration

### Jenkins Pipeline Example

```groovy
pipeline {
    agent any
    
    environment {
        ANSIBLE_HOST_KEY_CHECKING = 'False'
    }
    
    stages {
        stage('Deploy') {
            steps {
                sh '''
                    cd ansible-docker-deploy
                    ansible-playbook playbooks/deploy.yml \
                        -e confirm_deploy=yes \
                        -e app_branch=${GIT_BRANCH}
                '''
            }
        }
        
        stage('Health Check') {
            steps {
                sh 'ansible-playbook playbooks/status.yml'
            }
        }
    }
    
    post {
        failure {
            sh 'ansible-playbook playbooks/rollback.yml -e confirm_rollback=yes'
        }
    }
}
```

### GitHub Actions Example

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install Ansible
        run: |
          pip install ansible
          ansible-galaxy install -r requirements.yml
      
      - name: Deploy Application
        env:
          ANSIBLE_HOST_KEY_CHECKING: 'False'
        run: |
          cd ansible-docker-deploy
          ansible-playbook playbooks/deploy.yml -e confirm_deploy=yes
```

## 🐛 Troubleshooting

### Connection Issues

```bash
# Test SSH connection
ansible app_servers -m ping -vvv

# Check inventory
ansible-inventory --list -i inventories/production/hosts.yml
```

### Docker Issues

```bash
# Check Docker service
ansible app_servers -a "systemctl status docker"

# View Docker logs
ansible app_servers -a "journalctl -u docker -n 50"
```

### Container Issues

```bash
# Check container status
ansible-playbook playbooks/status.yml

# View container logs
ansible app_servers -a "docker logs stock-pos-app --tail 100"

# Restart containers
ansible-playbook playbooks/stop.yml
ansible-playbook playbooks/start.yml
```

### Build Issues

```bash
# Check if Dockerfile exists
ansible app_servers -a "ls -la /opt/stock-pos/Dockerfile"

# Manual build test
ansible app_servers -a "docker build -t test /opt/stock-pos"
```

## 📚 Additional Resources

- [Ansible Documentation](https://docs.ansible.com/)
- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Community Docker Collection](https://docs.ansible.com/ansible/latest/collections/community/docker/)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For issues and questions:
- Create an issue in the repository
- Check existing documentation
- Review Ansible logs in `ansible.log`

---

**Last Updated**: January 2026