# បង្កើត scripts directory
mkdir -p /opt/stock-pos/scripts
cd /opt/stock-pos/scripts

nano /opt/stock-pos/scripts/backup-database.sh


#!/bin/bash

#================================================
# Stock POS Database Backup Script
# Containers: stock-pos-db (PostgreSQL 15)
#================================================

set -e  # Stop on errors

# Configuration
BACKUP_BASE_DIR="/opt/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DATE_SIMPLE=$(date +%Y%m%d)

# Container Configuration
DB_CONTAINER="stock-pos-db"
DB_NAME="stockpos"  # ប្តូរតាម database name ពិតប្រាកដរបស់អ្នក
DB_USER="postgres"

# Logging
LOG_DIR="${BACKUP_BASE_DIR}/logs"
mkdir -p ${LOG_DIR}
LOG_FILE="${LOG_DIR}/backup_${DATE_SIMPLE}.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to log messages
log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a ${LOG_FILE}
}

log "========================================="
log "${GREEN}Starting Stock POS Database Backup${NC}"
log "========================================="

# ពិនិត្យថា container កំពុងរត់
if ! docker ps | grep -q ${DB_CONTAINER}; then
    log "${RED}ERROR: Container ${DB_CONTAINER} is not running!${NC}"
    docker ps | tee -a ${LOG_FILE}
    exit 1
fi

log "${GREEN}✅ Container ${DB_CONTAINER} is running${NC}"

# ពិនិត្យ disk space
AVAILABLE=$(df -BG ${BACKUP_BASE_DIR} | tail -1 | awk '{print $4}' | sed 's/G//')
log "Available disk space: ${AVAILABLE}GB"

if [ $AVAILABLE -lt 2 ]; then
    log "${YELLOW}⚠️  WARNING: Low disk space (less than 2GB)!${NC}"
fi

# Determine backup type (daily, weekly, monthly)
BACKUP_TYPE=${1:-daily}
BACKUP_DIR="${BACKUP_BASE_DIR}/${BACKUP_TYPE}/database"
mkdir -p ${BACKUP_DIR}

log "Backup type: ${BACKUP_TYPE}"
log "Backup directory: ${BACKUP_DIR}"

# Backup PostgreSQL database
log "${GREEN}💾 Creating PostgreSQL backup...${NC}"
BACKUP_FILE="${BACKUP_DIR}/stockpos_db_${DATE}.sql.gz"

docker exec ${DB_CONTAINER} pg_dump -U ${DB_USER} ${DB_NAME} | gzip > ${BACKUP_FILE}

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -sh ${BACKUP_FILE} | cut -f1)
    log "${GREEN}✅ Database backup created successfully: ${BACKUP_SIZE}${NC}"
    log "File: ${BACKUP_FILE}"
else
    log "${RED}❌ Database backup FAILED!${NC}"
    exit 1
fi

# Verify backup integrity
log "🔍 Verifying backup integrity..."
gunzip -t ${BACKUP_FILE}

if [ $? -eq 0 ]; then
    log "${GREEN}✅ Backup file is valid${NC}"
else
    log "${RED}❌ Backup file is corrupted!${NC}"
    exit 1
fi

# Create checksum
MD5_CHECKSUM=$(md5sum ${BACKUP_FILE} | cut -d' ' -f1)
log "MD5 Checksum: ${MD5_CHECKSUM}"

# Get database statistics
DB_SIZE=$(docker exec ${DB_CONTAINER} psql -U ${DB_USER} ${DB_NAME} -t -c "SELECT pg_size_pretty(pg_database_size('${DB_NAME}'));" | xargs)
TABLE_COUNT=$(docker exec ${DB_CONTAINER} psql -U ${DB_USER} ${DB_NAME} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" | xargs)

log "Database size: ${DB_SIZE}"
log "Table count: ${TABLE_COUNT}"

# Create manifest file
MANIFEST_FILE="${BACKUP_DIR}/backup_${DATE}_manifest.txt"
cat > ${MANIFEST_FILE} <<EOF
╔════════════════════════════════════════════╗
║     Stock POS Database Backup Manifest     ║
╚════════════════════════════════════════════╝

Backup Information:
-------------------
Backup Date & Time: ${DATE}
Backup Type: ${BACKUP_TYPE}
Database Name: ${DB_NAME}
Container: ${DB_CONTAINER}

File Details:
-------------
Backup File: ${BACKUP_FILE}
File Size: ${BACKUP_SIZE}
MD5 Checksum: ${MD5_CHECKSUM}

Database Statistics:
--------------------
Database Size: ${DB_SIZE}
Table Count: ${TABLE_COUNT}

Server Information:
-------------------
Hostname: $(hostname)
Server IP: $(hostname -I | awk '{print $1}')

Status: ✅ SUCCESS
EOF

log "${GREEN}📄 Manifest created: ${MANIFEST_FILE}${NC}"

# Optional: Upload to cloud storage (uncomment if needed)
# if [ -f ~/.aws/credentials ]; then
#     log "☁️  Uploading to S3..."
#     aws s3 cp ${BACKUP_FILE} s3://your-bucket/${BACKUP_TYPE}/database/ --storage-class STANDARD_IA
#     if [ $? -eq 0 ]; then
#         log "${GREEN}✅ Upload to S3 successful${NC}"
#     else
#         log "${YELLOW}⚠️  Upload to S3 failed (local backup still available)${NC}"
#     fi
# fi

# Summary
log "========================================="
log "${GREEN}✅ Backup completed successfully!${NC}"
log "========================================="
log "Backup file: ${BACKUP_FILE}"
log "Size: ${BACKUP_SIZE}"
log "Location: ${BACKUP_DIR}"
log "========================================="

exit 0


## set permission
chmod +x /opt/stock-pos/scripts/backup-database.sh


nano /opt/stock-pos/scripts/cleanup-old-backups.sh

#!/bin/bash

#================================================
# Stock POS Backup Cleanup Script
#================================================

set -e

BACKUP_BASE_DIR="/opt/backups"
LOG_DIR="${BACKUP_BASE_DIR}/logs"
mkdir -p ${LOG_DIR}
LOG_FILE="${LOG_DIR}/cleanup_$(date +%Y%m%d).log"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a ${LOG_FILE}
}

log "========================================="
log "${GREEN}Starting Backup Cleanup${NC}"
log "========================================="

# Retention policies
DAILY_RETENTION=7      # រក្សាទុក 7 ថ្ងៃ
WEEKLY_RETENTION=28    # រក្សាទុក 4 សប្តាហ៍
MONTHLY_RETENTION=180  # រក្សាទុក 6 ខែ

# Function to clean backups
clean_backups() {
    local backup_type=$1
    local retention_days=$2
    local backup_dir="${BACKUP_BASE_DIR}/${backup_type}"
    
    log "Cleaning ${backup_type} backups older than ${retention_days} days..."
    
    # រក backups ចាស់
    DELETED=$(find ${backup_dir} -name "*.sql.gz" -mtime +${retention_days} -type f -print 2>/dev/null || echo "")
    
    if [ -n "$DELETED" ]; then
        echo "$DELETED" | tee -a ${LOG_FILE}
        find ${backup_dir} -name "*.sql.gz" -mtime +${retention_days} -type f -delete
        find ${backup_dir} -name "*_manifest.txt" -mtime +${retention_days} -type f -delete
        log "${GREEN}✅ ${backup_type} backups cleaned${NC}"
    else
        log "No old ${backup_type} backups to delete"
    fi
}

# Clean each backup type
clean_backups "daily" ${DAILY_RETENTION}
clean_backups "weekly" ${WEEKLY_RETENTION}
clean_backups "monthly" ${MONTHLY_RETENTION}

# Clean old logs (រក្សាទុក 30 ថ្ងៃ)
log "Cleaning old log files..."
find ${LOG_DIR} -name "*.log" -mtime +30 -type f -delete

# Backup summary
log "========================================="
log "${GREEN}Current Backup Summary${NC}"
log "========================================="

DAILY_COUNT=$(find ${BACKUP_BASE_DIR}/daily -name "*.sql.gz" -type f 2>/dev/null | wc -l)
WEEKLY_COUNT=$(find ${BACKUP_BASE_DIR}/weekly -name "*.sql.gz" -type f 2>/dev/null | wc -l)
MONTHLY_COUNT=$(find ${BACKUP_BASE_DIR}/monthly -name "*.sql.gz" -type f 2>/dev/null | wc -l)

log "Daily backups: ${DAILY_COUNT} files"
log "Weekly backups: ${WEEKLY_COUNT} files"
log "Monthly backups: ${MONTHLY_COUNT} files"

TOTAL_SIZE=$(du -sh ${BACKUP_BASE_DIR} 2>/dev/null | cut -f1)
log "Total backup size: ${TOTAL_SIZE}"

DISK_USAGE=$(df -h ${BACKUP_BASE_DIR} | tail -1)
log "Disk usage:"
echo "${DISK_USAGE}" | tee -a ${LOG_FILE}

log "========================================="
log "${GREEN}✅ Cleanup completed${NC}"
log "========================================="

chmod +x /opt/stock-pos/scripts/cleanup-old-backups.sh



### test 

# ពិនិត្យថា database name ត្រឹមត្រូវ
docker exec stock-pos-db psql -U postgres -l

# ប្រសិនបើ database name មិនមែន "stockpos", edit script និងប្តូរ:
# DB_NAME="your_actual_database_name"

# Test backup script
/opt/stock-pos/scripts/backup-database.sh daily

# ពិនិត្យ results
ls -lh /opt/backups/daily/database/
cat /opt/backups/logs/backup_$(date +%Y%m%d).log

# Test restore
/opt/stock-pos/scripts/test-restore.sh

# Test cleanup
/opt/stock-pos/scripts/cleanup-old-backups.sh




### JEKINSFILE

pipeline {
    agent any
    
    triggers {
        cron('0 2 * * *')
    }
    
    environment {
        BACKUP_SCRIPT = '/opt/stock-pos/scripts/backup-database.sh'
        CLEANUP_SCRIPT = '/opt/stock-pos/scripts/cleanup-old-backups.sh'
        BACKUP_TYPE = 'daily'
        BACKUP_DIR = '/opt/backups'
    }
    
    stages {
        stage('Pre-flight Check') {
            steps {
                script {
                    echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
                    echo '🔍 PRE-FLIGHT CHECK'
                    echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
                    
                    sh """
                        echo "Checking Stock POS containers..."
                        docker ps --filter "name=stock-pos" --format "table {{.Names}}\\t{{.Status}}\\t{{.Ports}}"
                        
                        echo ""
                        echo "Checking disk space..."
                        df -h /opt/backups
                        
                        echo ""
                        echo "Checking backup scripts..."
                        ls -lh /opt/stock-pos/scripts/*.sh
                    """
                }
            }
        }
        
        stage('Backup Database') {
            steps {
                script {
                    echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
                    echo '💾 STARTING DATABASE BACKUP'
                    echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
                    
                    sh "${BACKUP_SCRIPT} ${BACKUP_TYPE}"
                }
            }
        }
        
        stage('Verify Backup') {
            steps {
                script {
                    echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
                    echo '🔍 VERIFYING BACKUP'
                    echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
                    
                    sh """
                        LATEST_BACKUP=\$(ls -t ${BACKUP_DIR}/${BACKUP_TYPE}/database/*.sql.gz 2>/dev/null | head -1)
                        
                        if [ -f "\$LATEST_BACKUP" ]; then
                            echo "✅ Latest backup found: \$LATEST_BACKUP"
                            echo "File size: \$(du -sh \$LATEST_BACKUP | cut -f1)"
                            echo "Created: \$(stat -c %y \$LATEST_BACKUP)"
                            
                            if gunzip -t "\$LATEST_BACKUP" 2>/dev/null; then
                                echo "✅ Backup file integrity: OK"
                            else
                                echo "❌ Backup file integrity: FAILED"
                                exit 1
                            fi
                        else
                            echo "❌ No backup file found!"
                            exit 1
                        fi
                    """
                }
            }
        }
        
        stage('Clean Old Backups') {
            steps {
                script {
                    echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
                    echo '🗑️  CLEANING OLD BACKUPS'
                    echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
                    
                    sh "${CLEANUP_SCRIPT}"
                }
            }
        }
        
        stage('Backup Report') {
            steps {
                script {
                    echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
                    echo '📊 BACKUP REPORT'
                    echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
                    
                    sh """
                        echo "Date: \$(date '+%Y-%m-%d %H:%M:%S')"
                        echo ""
                        
                        echo "Latest Backups (Top 5):"
                        ls -lht ${BACKUP_DIR}/${BACKUP_TYPE}/database/*.sql.gz 2>/dev/null | head -5 || echo "No backups found"
                        echo ""
                        
                        echo "Backup Statistics:"
                        DAILY_COUNT=\$(find ${BACKUP_DIR}/daily -name "*.sql.gz" -type f 2>/dev/null | wc -l)
                        WEEKLY_COUNT=\$(find ${BACKUP_DIR}/weekly -name "*.sql.gz" -type f 2>/dev/null | wc -l)
                        MONTHLY_COUNT=\$(find ${BACKUP_DIR}/monthly -name "*.sql.gz" -type f 2>/dev/null | wc -l)
                        
                        echo "   Daily backups: \${DAILY_COUNT}"
                        echo "   Weekly backups: \${WEEKLY_COUNT}"
                        echo "   Monthly backups: \${MONTHLY_COUNT}"
                        echo ""
                        
                        echo "Storage Usage:"
                        du -sh ${BACKUP_DIR}
                        du -sh ${BACKUP_DIR}/daily 2>/dev/null || true
                        du -sh ${BACKUP_DIR}/weekly 2>/dev/null || true
                        du -sh ${BACKUP_DIR}/monthly 2>/dev/null || true
                        echo ""
                        
                        echo "Disk Space:"
                        df -h ${BACKUP_DIR}
                        echo ""
                        
                        echo "Latest Log Entries:"
                        tail -10 ${BACKUP_DIR}/logs/backup_\$(date +%Y%m%d).log 2>/dev/null || echo "No logs found"
                    """
                }
            }
        }
    }
    
    post {
        success {
            script {
                echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
                echo '✅ ✅ ✅ BACKUP SUCCESSFUL ✅ ✅ ✅'
                echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
                
                sh """
                    echo "Job: ${JOB_NAME}"
                    echo "Build: #${BUILD_NUMBER}"
                    echo "Status: SUCCESS"
                    echo "Completed: \$(date '+%Y-%m-%d %H:%M:%S')"
                """
            }
        }
        
        failure {
            script {
                echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
                echo '❌ ❌ ❌ BACKUP FAILED ❌ ❌ ❌'
                echo '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
                
                sh """
                    echo "Job: ${JOB_NAME}"
                    echo "Build: #${BUILD_NUMBER}"
                    echo "Status: FAILED"
                    echo "Please check logs"
                """
            }
        }
        
        always {
            script {
                echo "Build finished at: ${new Date()}"
            }
        }
    }
}






ដំណោះស្រាយ: Remote Backup តាមរយៈ SSH
ជំហានទី 1: Setup SSH Key ពី Jenkins ទៅ POS Server
នៅលើ Jenkins Server:
bash# ប្តូរទៅជា jenkins user
sudo su - jenkins


# នៅលើ Jenkins Server
sudo mkdir -p /var/lib/jenkins/backup-scripts
sudo chown jenkins:jenkins /var/lib/jenkins/backup-scripts

sudo nano /var/lib/jenkins/backup-scripts/remote-backup-stockpos.sh

#!/bin/bash

#================================================
# Remote Stock POS Database Backup Script
# Run from: Jenkins Server
# Target: POS Server (pos-server-01)
#================================================

set -e

# Configuration
POS_SERVER_IP="YOUR_POS_SERVER_IP"  # ប្តូរតាម IP របស់អ្នក
POS_SERVER_USER="deployer"
BACKUP_TYPE=${1:-daily}
DATE=$(date +%Y%m%d_%H%M%S)

# Local backup directory នៅលើ Jenkins server
LOCAL_BACKUP_DIR="/var/lib/jenkins/backups/stock-pos/${BACKUP_TYPE}"
mkdir -p ${LOCAL_BACKUP_DIR}

# Remote paths នៅលើ POS server
REMOTE_BACKUP_DIR="/opt/backups/${BACKUP_TYPE}/database"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log() {
    echo -e "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

log "${GREEN}=========================================${NC}"
log "${GREEN}Remote Stock POS Database Backup${NC}"
log "${GREEN}=========================================${NC}"
log "Backup type: ${BACKUP_TYPE}"
log "Target server: ${POS_SERVER_IP}"

# ពិនិត្យ SSH connection
log "Testing SSH connection..."
if ssh -o ConnectTimeout=10 ${POS_SERVER_USER}@${POS_SERVER_IP} "echo 'SSH OK'" > /dev/null 2>&1; then
    log "${GREEN}✅ SSH connection successful${NC}"
else
    log "${RED}❌ SSH connection failed!${NC}"
    exit 1
fi

# ពិនិត្យ containers នៅលើ remote server
log "Checking remote containers..."
CONTAINER_STATUS=$(ssh ${POS_SERVER_USER}@${POS_SERVER_IP} "docker ps --filter 'name=stock-pos-db' --format '{{.Status}}'")

if [ -n "$CONTAINER_STATUS" ]; then
    log "${GREEN}✅ Database container is running: ${CONTAINER_STATUS}${NC}"
else
    log "${RED}❌ Database container not found!${NC}"
    exit 1
fi

# បង្កើត backup នៅលើ remote server
log "${GREEN}💾 Creating backup on remote server...${NC}"

ssh ${POS_SERVER_USER}@${POS_SERVER_IP} bash <<'ENDSSH'
    set -e
    
    BACKUP_TYPE="BACKUP_TYPE_PLACEHOLDER"
    DATE=$(date +%Y%m%d_%H%M%S)
    BACKUP_DIR="/opt/backups/${BACKUP_TYPE}/database"
    
    mkdir -p ${BACKUP_DIR}
    
    echo "Creating PostgreSQL backup..."
    docker exec stock-pos-db pg_dump -U postgres stockpos | gzip > ${BACKUP_DIR}/stockpos_db_${DATE}.sql.gz
    
    if [ $? -eq 0 ]; then
        BACKUP_SIZE=$(du -sh ${BACKUP_DIR}/stockpos_db_${DATE}.sql.gz | cut -f1)
        echo "✅ Backup created: ${BACKUP_SIZE}"
        echo ${BACKUP_DIR}/stockpos_db_${DATE}.sql.gz
    else
        echo "❌ Backup failed!"
        exit 1
    fi
ENDSSH

# Replace placeholder
ssh ${POS_SERVER_USER}@${POS_SERVER_IP} "
    BACKUP_TYPE='${BACKUP_TYPE}'
    DATE='${DATE}'
    BACKUP_DIR='/opt/backups/\${BACKUP_TYPE}/database'
    
    mkdir -p \${BACKUP_DIR}
    
    echo 'Creating PostgreSQL backup...'
    docker exec stock-pos-db pg_dump -U postgres stockpos | gzip > \${BACKUP_DIR}/stockpos_db_\${DATE}.sql.gz
    
    if [ \$? -eq 0 ]; then
        BACKUP_SIZE=\$(du -sh \${BACKUP_DIR}/stockpos_db_\${DATE}.sql.gz | cut -f1)
        echo \"✅ Backup created: \${BACKUP_SIZE}\"
        ls -lh \${BACKUP_DIR}/stockpos_db_\${DATE}.sql.gz
    else
        echo '❌ Backup failed!'
        exit 1
    fi
"

if [ $? -eq 0 ]; then
    log "${GREEN}✅ Remote backup successful${NC}"
else
    log "${RED}❌ Remote backup failed!${NC}"
    exit 1
fi

# Download backup ទៅ Jenkins server (optional)
log "${YELLOW}📥 Downloading backup to Jenkins server...${NC}"

REMOTE_BACKUP_FILE=$(ssh ${POS_SERVER_USER}@${POS_SERVER_IP} "ls -t /opt/backups/${BACKUP_TYPE}/database/stockpos_db_*.sql.gz | head -1")

if [ -n "$REMOTE_BACKUP_FILE" ]; then
    scp ${POS_SERVER_USER}@${POS_SERVER_IP}:${REMOTE_BACKUP_FILE} ${LOCAL_BACKUP_DIR}/
    
    if [ $? -eq 0 ]; then
        LOCAL_FILE=$(basename ${REMOTE_BACKUP_FILE})
        LOCAL_SIZE=$(du -sh ${LOCAL_BACKUP_DIR}/${LOCAL_FILE} | cut -f1)
        log "${GREEN}✅ Backup downloaded: ${LOCAL_SIZE}${NC}"
        log "Location: ${LOCAL_BACKUP_DIR}/${LOCAL_FILE}"
    else
        log "${YELLOW}⚠️  Download failed (remote backup still exists)${NC}"
    fi
else
    log "${YELLOW}⚠️  No backup file found to download${NC}"
fi

# Clean old remote backups
log "${YELLOW}🗑️  Cleaning old remote backups...${NC}"

ssh ${POS_SERVER_USER}@${POS_SERVER_IP} "
    RETENTION_DAYS=7
    if [ '${BACKUP_TYPE}' = 'weekly' ]; then
        RETENTION_DAYS=28
    elif [ '${BACKUP_TYPE}' = 'monthly' ]; then
        RETENTION_DAYS=180
    fi
    
    echo \"Retention: \${RETENTION_DAYS} days\"
    find /opt/backups/${BACKUP_TYPE}/database -name '*.sql.gz' -mtime +\${RETENTION_DAYS} -type f -delete
    
    echo 'Remaining backups:'
    ls -lh /opt/backups/${BACKUP_TYPE}/database/*.sql.gz 2>/dev/null | wc -l
"

# Clean old local backups
log "🗑️  Cleaning old local backups..."
find ${LOCAL_BACKUP_DIR} -name "*.sql.gz" -mtime +30 -type f -delete

# Summary
log "${GREEN}=========================================${NC}"
log "${GREEN}✅ Backup completed successfully!${NC}"
log "${GREEN}=========================================${NC}"
log "Remote backups: ${POS_SERVER_IP}:/opt/backups/${BACKUP_TYPE}/database/"
log "Local backups: ${LOCAL_BACKUP_DIR}"

exit 0


sudo chmod +x /var/lib/jenkins/backup-scripts/remote-backup-stockpos.sh
sudo chown jenkins:jenkins /var/lib/jenkins/backup-scripts/remote-backup-stockpos.sh




### JEKIND FILLE FOR REMOTE BACKUP 

pipeline {
    agent any

    triggers {
        cron('0 2 * * *')
    }

    environment {
        POS_SERVER = '89.167.6.46'
        POS_USER   = 'deployer'
        BACKUP_TYPE = 'daily'
        DATE = sh(script: "date +%Y%m%d_%H%M%S", returnStdout: true).trim()

            TELEGRAM_BOT_TOKEN = '8469597174:AAHkhd345CvQaEMPLveGMuaIOdbtF-789BM'
        TELEGRAM_CHAT_ID = '-5118246928'
    }

    stages {

        stage('Pre-check') {
            steps {
                echo '🔍 Checking POS Server connection...'
                sshagent(['deploy-ssh-key']) {
                    sh """
                    ssh -o StrictHostKeyChecking=no ${POS_USER}@${POS_SERVER} '
                        echo "Hostname: \$(hostname)"
                        docker ps --filter "name=stock-pos" --format "table {{.Names}}\\t{{.Status}}"
                    '
                    """
                }
            }
        }

        stage('Create Remote Backup') {
            steps {
                echo '💾 Creating database backup...'

                sshagent(['deploy-ssh-key']) {
                    sh """
                    ssh -o StrictHostKeyChecking=no ${POS_USER}@${POS_SERVER} '
                        set -e

                        BACKUP_DIR="/opt/backups/${BACKUP_TYPE}/database"
                        mkdir -p \$BACKUP_DIR

                        if ! docker ps | grep -q stock-pos-db; then
                            echo "Database container not running!"
                            exit 1
                        fi

                        docker exec stock-pos-db pg_dump -U postgres stock_pos_prod \
                        | gzip > \$BACKUP_DIR/stockpos_db_${DATE}.sql.gz

                        gunzip -t \$BACKUP_DIR/stockpos_db_${DATE}.sql.gz
                    '
                    """
                }
            }
        }

        stage('Get Backup Info') {
            steps {
                script {
                    sshagent(['deploy-ssh-key']) {

                        env.LATEST_FILE = sh(
                            script: """
                            ssh -o StrictHostKeyChecking=no ${POS_USER}@${POS_SERVER} \
                            "ls -t /opt/backups/${BACKUP_TYPE}/database/*.sql.gz | head -1"
                            """,
                            returnStdout: true
                        ).trim()

                        env.FILE_NAME = sh(
                            script: "basename ${env.LATEST_FILE}",
                            returnStdout: true
                        ).trim()

                        env.FILE_SIZE = sh(
                            script: """
                            ssh -o StrictHostKeyChecking=no ${POS_USER}@${POS_SERVER} \
                            "du -sh ${env.LATEST_FILE} | cut -f1"
                            """,
                            returnStdout: true
                        ).trim()
                    }
                }
            }
        }

        stage('Download Backup') {
            steps {
                sshagent(['deploy-ssh-key']) {
                    sh """
                    mkdir -p /var/jenkins_home/backups/stock-pos/${BACKUP_TYPE}

                    scp -o StrictHostKeyChecking=no \
                    ${POS_USER}@${POS_SERVER}:${LATEST_FILE} \
                    /var/jenkins_home/backups/stock-pos/${BACKUP_TYPE}/
                    """
                }
            }
        }

        stage('Clean Old Backups') {
            steps {
                sshagent(['deploy-ssh-key']) {
                    sh """
                    ssh -o StrictHostKeyChecking=no ${POS_USER}@${POS_SERVER} '
                        find /opt/backups/${BACKUP_TYPE}/database -name "*.sql.gz" -mtime +7 -delete
                    '

                    find /var/jenkins_home/backups/stock-pos/${BACKUP_TYPE} \
                    -name "*.sql.gz" -mtime +30 -delete 2>/dev/null || true
                    """
                }
            }
        }
    }

    post {

        success {
    script {

        def duration = currentBuild.durationString.replace(' and counting','')

        def message = """
✅ Stock POS Backup SUCCESS

📦 Type: ${BACKUP_TYPE}
🖥 Server: ${POS_SERVER}
📁 File: ${FILE_NAME}
📊 Size: ${FILE_SIZE}

🏗 Job: ${JOB_NAME}
🔢 Build: #${BUILD_NUMBER}
⏱ Duration: ${duration}

🚀 Backup completed successfully
"""

        sh """
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
        --data-urlencode "text=${message}"
        """
    }
}


        failure {
    script {

        def message = """
❌ Stock POS Backup FAILED

Server: ${POS_SERVER}
Type: ${BACKUP_TYPE}
Job: ${JOB_NAME}
Build: #${BUILD_NUMBER}

Check Jenkins logs.
"""

        sh """
        curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
        --data-urlencode "text=${message}"
        """
    }
}


        always {
            echo "Backup finished at: ${new Date()}"
        }
    }
}
