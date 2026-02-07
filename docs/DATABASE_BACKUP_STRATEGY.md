# Database Backup Strategy & Implementation Guide

## 📋 Backup Strategy Overview

Your setup uses **PostgreSQL** in Docker. Here are the backup strategies available:

### Strategy Options

| Strategy | Frequency | Retention | Effort | Cost | Best For |
|----------|-----------|-----------|--------|------|----------|
| **pg_dump** | Daily/Hourly | 7-30 days | Medium | Low | Small-Medium databases |
| **WAL Archiving** | Continuous | Full history | High | Medium | Point-in-time recovery |
| **Automated Snapshots** | Daily | 30 days | Low | Medium | Full server recovery |
| **Cloud Backup** | Daily | 30-90 days | Low | Medium | Disaster recovery |

---

## 🎯 Recommended Setup for Your System

### Tier 1: Daily Automated Dumps (Daily)
- **What:** Full PostgreSQL dump
- **Frequency:** Once per day (3 AM)
- **Retention:** 7 days
- **Storage:** Local server `/opt/backups/database/`

### Tier 2: Hourly Incremental (Business Hours)
- **What:** WAL (Write-Ahead Logs) backup
- **Frequency:** Every hour (9 AM - 6 PM)
- **Retention:** 3 days
- **Storage:** Local server

### Tier 3: Off-site Backup (Weekly)
- **What:** Copy to external storage (S3, B2, etc.)
- **Frequency:** Once per week (Sunday 1 AM)
- **Retention:** 12 weeks (3 months)
- **Storage:** Cloud storage

---

## 💾 Implementation Plan

### Step 1: Update Ansible Configuration

Add to [ansible/inventories/production/group_vars/all.yml](../ansible/inventories/production/group_vars/all.yml):

```yaml
# ===== BACKUP CONFIGURATION =====
backup_enabled: true
backup_directory: "/opt/backups"
backup_db_directory: "{{ backup_directory }}/database"
backup_retention_days: 7
backup_hourly_retention_days: 3

# Backup Schedule
backup_daily_time: "03:00"  # 3 AM
backup_hourly_times: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]  # 9 AM - 6 PM

# Cloud Backup (Optional - S3/Backblaze B2)
backup_to_cloud: false  # Set to true if using cloud storage
backup_cloud_provider: "s3"  # or "b2"
backup_cloud_bucket: "techey-stock-pos-backups"
backup_cloud_retention_days: 90
```

### Step 2: Create Backup Scripts

Create [ansible/roles/app-deploy/files/backup-database.sh](../ansible/roles/app-deploy/files/backup-database.sh):

```bash
#!/bin/bash

# Database Backup Script
# Creates automated PostgreSQL backups

set -e

# Configuration
BACKUP_DIR="/opt/backups/database"
DB_CONTAINER="stock-pos-db"
DB_USER="stockpos"
DB_NAME="stock_pos"
RETENTION_DAYS=7
LOG_FILE="/var/log/database-backup.log"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Generate filename with timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/stock_pos_${TIMESTAMP}.sql.gz"

# Log function
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Starting database backup..."

# Perform backup
if docker exec "$DB_CONTAINER" pg_dump \
    -U "$DB_USER" \
    "$DB_NAME" | gzip > "$BACKUP_FILE"; then
    
    log "✓ Backup successful: $BACKUP_FILE"
    ls -lh "$BACKUP_FILE" >> "$LOG_FILE"
    
else
    log "✗ Backup failed!"
    exit 1
fi

# Remove old backups
log "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -name "stock_pos_*.sql.gz" -mtime +$RETENTION_DAYS -delete

log "Backup process completed"
```

### Step 3: Create Cron Job

Create [ansible/roles/app-deploy/tasks/setup-backup-cron.yml](../ansible/roles/app-deploy/tasks/setup-backup-cron.yml):

```yaml
---
- name: Create backup directory
  file:
    path: "{{ backup_db_directory }}"
    state: directory
    mode: '0755'
  become: yes

- name: Copy backup script
  copy:
    src: backup-database.sh
    dest: /usr/local/bin/backup-database.sh
    mode: '0755'
  become: yes

- name: Setup daily backup cron job (3 AM)
  cron:
    name: "Daily database backup"
    hour: "3"
    minute: "0"
    job: "/usr/local/bin/backup-database.sh"
    user: root
  become: yes

- name: Setup hourly backup cron jobs (Business hours)
  cron:
    name: "Hourly database backup at {{ item }}:00"
    hour: "{{ item }}"
    minute: "0"
    job: "/usr/local/bin/backup-database.sh"
    user: root
  loop: [9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
  become: yes
  when: backup_hourly_enabled | default(false)

- name: Setup weekly cloud sync (Sunday 1 AM)
  cron:
    name: "Weekly cloud backup sync"
    weekday: "0"
    hour: "1"
    minute: "0"
    job: "/usr/local/bin/sync-backups-to-cloud.sh"
    user: root
  become: yes
  when: backup_to_cloud | default(false)
```

### Step 4: Create Restore Script

Create [scripts/restore-database.sh](../scripts/restore-database.sh):

```bash
#!/bin/bash

# Database Restore Script
# Restores PostgreSQL from backup

set -e

if [ -z "$1" ]; then
    echo "Usage: ./restore-database.sh <backup-file>"
    echo ""
    echo "Available backups:"
    ls -lh /opt/backups/database/
    exit 1
fi

BACKUP_FILE="$1"
DB_CONTAINER="stock-pos-db"
DB_USER="stockpos"
DB_NAME="stock_pos"

echo "⚠️  WARNING: This will restore the database from backup!"
echo "Backup file: $BACKUP_FILE"
read -p "Continue? (yes/no) " -n 3 -r
echo
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "Cancelled"
    exit 1
fi

echo "Starting database restore..."

# Drop and recreate database
echo "Recreating database..."
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -c "DROP DATABASE IF EXISTS $DB_NAME;"
docker exec "$DB_CONTAINER" psql -U "$DB_USER" -c "CREATE DATABASE $DB_NAME;"

# Restore from backup
echo "Restoring data..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$DB_CONTAINER" psql -U "$DB_USER" "$DB_NAME"

echo "✓ Database restore completed!"
```

---

## 🚀 Quick Start Implementation

### Option A: Manual Setup (Recommended for Learning)

```bash
# SSH to server
ssh deployer@89.167.6.46
sudo -i

# Create backup directory
mkdir -p /opt/backups/database
chmod 755 /opt/backups

# Create simple daily backup cron
cat > /usr/local/bin/backup-database.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/backups/database"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
docker exec stock-pos-db pg_dump -U stockpos stock_pos | gzip > "$BACKUP_DIR/stock_pos_${TIMESTAMP}.sql.gz"
find "$BACKUP_DIR" -name "stock_pos_*.sql.gz" -mtime +7 -delete
EOF

chmod +x /usr/local/bin/backup-database.sh

# Test backup script
/usr/local/bin/backup-database.sh

# Verify backup was created
ls -lh /opt/backups/database/

# Add to crontab (runs daily at 3 AM)
(crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/backup-database.sh") | crontab -

# Verify cron
crontab -l | grep backup
```

### Option B: Automated with Ansible

```bash
# Add to deploy playbook tasks

- name: Setup database backup
  block:
    - name: Create backup directories
      file:
        path: "{{ item }}"
        state: directory
        mode: '0755'
      with_items:
        - /opt/backups
        - /opt/backups/database
      become: yes

    - name: Copy backup script
      copy:
        content: |
          #!/bin/bash
          BACKUP_DIR="/opt/backups/database"
          mkdir -p "$BACKUP_DIR"
          TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
          docker exec stock-pos-db pg_dump -U stockpos stock_pos | gzip > "$BACKUP_DIR/stock_pos_${TIMESTAMP}.sql.gz"
          find "$BACKUP_DIR" -name "stock_pos_*.sql.gz" -mtime +7 -delete
        dest: /usr/local/bin/backup-database.sh
        mode: '0755'
      become: yes

    - name: Create daily backup cron
      cron:
        name: "Daily database backup"
        hour: "3"
        minute: "0"
        job: "/usr/local/bin/backup-database.sh"
        user: root
      become: yes
```

---

## 📊 Backup Verification

### Check Backup Status

```bash
ssh deployer@89.167.6.46
sudo -i

# List all backups
ls -lh /opt/backups/database/

# Check backup size
du -sh /opt/backups/database/

# Check latest backup
stat /opt/backups/database/stock_pos_*.sql.gz | tail -20

# Check cron job
crontab -l | grep backup

# Check backup logs
tail -50 /var/log/database-backup.log
```

### Test Restore (Dry Run)

```bash
# DO NOT RUN ON PRODUCTION - for testing only!
# Use a dev database instead

# List backup files
ls -lh /opt/backups/database/

# Check backup integrity
gunzip -t /opt/backups/database/stock_pos_20260206_030000.sql.gz
# Should output: "ok" if backup is valid
```

---

## 🔄 Restore Procedures

### Full Database Restore

```bash
ssh deployer@89.167.6.46
sudo -i

# Find backup file
ls -lh /opt/backups/database/

# Restore from backup
BACKUP_FILE="/opt/backups/database/stock_pos_20260206_030000.sql.gz"

# Stop app to prevent connections
docker stop stock-pos-app

# Restore database
gunzip -c "$BACKUP_FILE" | docker exec -i stock-pos-db psql -U stockpos stock_pos

# Start app
docker start stock-pos-app

# Verify
docker exec stock-pos-app curl http://localhost:3000/api/health
```

### Point-in-Time Recovery (with WAL)

For PITR, you need to:
1. Enable WAL archiving in PostgreSQL
2. Archive WAL files continuously
3. Use `pg_basebackup` for base backups

(More complex - see advanced guide)

---

## ☁️ Cloud Backup (Optional)

### Using Backblaze B2

```bash
# Install B2 CLI
pip install b2-cli

# Authenticate
b2 authorize-account <account-id> <application-key>

# Create bucket
b2 create-bucket techey-stock-pos-backups private

# Upload backup
b2 upload-file techey-stock-pos-backups /opt/backups/database/stock_pos_*.sql.gz backups/

# Setup sync cron (weekly)
cat >> /usr/local/bin/sync-backups-to-cloud.sh << 'EOF'
#!/bin/bash
b2 authorize-account <account-id> <application-key>
b2 sync --keepDays 90 /opt/backups/database/ b2://techey-stock-pos-backups/backups/
EOF

chmod +x /usr/local/bin/sync-backups-to-cloud.sh

# Add to crontab (Sunday 1 AM)
(crontab -l; echo "0 1 * * 0 /usr/local/bin/sync-backups-to-cloud.sh") | crontab -
```

### Using AWS S3

```bash
# Install AWS CLI
aws configure

# Upload backup
aws s3 cp /opt/backups/database/ s3://techey-stock-pos-backups/ --recursive

# Setup automated sync
cat >> /usr/local/bin/sync-backups-to-s3.sh << 'EOF'
#!/bin/bash
aws s3 sync /opt/backups/database/ s3://techey-stock-pos-backups/database/
EOF
```

---

## 📝 Backup Checklist

- [ ] Create backup directory `/opt/backups/database/`
- [ ] Create backup script `/usr/local/bin/backup-database.sh`
- [ ] Test backup script manually
- [ ] Setup daily cron job (3 AM)
- [ ] Verify cron job is running
- [ ] Check backup logs
- [ ] Test restore procedure (on non-prod first!)
- [ ] Setup monitoring for backup success
- [ ] Document restore procedures
- [ ] Setup cloud backup (optional)
- [ ] Test cloud backup sync
- [ ] Document disaster recovery plan

---

## ⚠️ Important Reminders

1. **Always test restores** - A backup that can't be restored is useless
2. **Keep 3 copies** - Local, local backup, and off-site
3. **Encrypt sensitive data** - Use pgcrypto or app-level encryption
4. **Monitor backup success** - Get alerts if backups fail
5. **Document procedures** - Keep recovery instructions updated
6. **Test recovery regularly** - Monthly restore tests recommended

---

## Next Steps

Which backup strategy would you like to implement?

1. **Basic Daily Dumps** (simple, recommended first)
2. **Daily + Hourly Backups** (better coverage)
3. **With Cloud Sync** (disaster recovery)
4. **Full WAL Archiving** (advanced PITR)

Let me know and I'll help set it up! 🚀
