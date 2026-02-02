# Jenkins Ansible Role

This Ansible role installs and configures Jenkins CI/CD server with Java 21 on Debian/Ubuntu systems.

## Requirements

- Ansible 2.9 or higher
- Target system running Ubuntu (20.04, 22.04, 24.04) or Debian (11, 12)
- Root or sudo access on target servers

## Role Variables

Available variables are listed below, along with default values (see `defaults/main.yml`):

```yaml
# Jenkins configuration
jenkins_port: 8080
jenkins_home: /var/lib/jenkins

# Java configuration
java_version: "21"
java_home: "/usr/lib/jvm/java-21-openjdk-amd64"

# Jenkins admin configuration
jenkins_admin_username: admin
jenkins_admin_email: admin@example.com

# Jenkins plugins (optional - can be extended)
jenkins_plugins:
  - git
  - workflow-aggregator
  - docker-workflow
  - ansible

# Jenkins service configuration
jenkins_service_enabled: true
jenkins_service_state: started
```

## Dependencies

None.

## Example Playbook

### Basic Usage

```yaml
---
- hosts: jenkins_servers
  become: yes
  roles:
    - jenkins-role
```

### With Custom Variables

```yaml
---
- hosts: jenkins_servers
  become: yes
  roles:
    - role: jenkins-role
      vars:
        jenkins_port: 9090
        jenkins_admin_email: devops@company.com
```

### Full Playbook Example

```yaml
---
- name: Install Jenkins with Java 21
  hosts: jenkins_servers
  become: yes
  
  vars:
    jenkins_port: 8080
    jenkins_admin_username: admin
    jenkins_admin_email: admin@mycompany.com
  
  roles:
    - jenkins-role
  
  post_tasks:
    - name: Display Jenkins URL
      debug:
        msg: "Jenkins is available at http://{{ ansible_host }}:{{ jenkins_port }}"
```

## Post-Installation

After running this role:

1. Access Jenkins at `http://your-server-ip:8080`
2. Use the initial admin password displayed in the Ansible output
3. Complete the initial setup wizard
4. Install recommended plugins or select custom plugins

## Role Structure

```
jenkins-role/
├── defaults/
│   └── main.yml          # Default variables
├── handlers/
│   └── main.yml          # Service handlers
├── meta/
│   └── main.yml          # Role metadata
├── tasks/
│   └── main.yml          # Main installation tasks
└── README.md             # This file
```

## What This Role Does

1. Updates package cache
2. Installs required dependencies
3. Installs OpenJDK 21
4. Adds Jenkins GPG key and repository
5. Installs Jenkins
6. Configures Jenkins to use Java 21
7. Starts and enables Jenkins service
8. Retrieves and displays initial admin password

## Accessing Jenkins

Once the role completes:

- **URL**: `http://your-server-ip:8080`
- **Initial Password**: Check the Ansible output or run:
  ```bash
  sudo cat /var/lib/jenkins/secrets/initialAdminPassword
  ```

## Firewall Configuration

Don't forget to allow traffic on the Jenkins port:

```bash
# UFW (Ubuntu)
sudo ufw allow 8080/tcp

# Firewalld (RHEL/CentOS)
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

## License

MIT

## Author Information

Created by [Your Name]