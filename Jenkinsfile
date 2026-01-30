// Jenkinsfile for Stock POS Application Deployment
// This file should be placed in the root of your application repository

pipeline {
    agent any
    
    environment {
        // Ansible Configuration
        ANSIBLE_HOST_KEY_CHECKING = 'False'
        ANSIBLE_FORCE_COLOR = 'true'
        
        // Application Configuration
        APP_NAME = 'stock-pos'
        APP_DIR = '/opt/stock-pos'
        ANSIBLE_DIR = 'ansible-docker-deploy'
        
        // Docker Configuration
        DOCKER_TAG = "${env.BUILD_NUMBER}"
        DOCKER_IMAGE = "${APP_NAME}-app"
    }
    
    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['production', 'staging', 'development'],
            description: 'Target deployment environment'
        )
        
        choice(
            name: 'ACTION',
            choices: ['deploy', 'build-only', 'status', 'start', 'stop', 'rollback'],
            description: 'Deployment action to perform'
        )
        
        booleanParam(
            name: 'FORCE_RECREATE',
            defaultValue: false,
            description: 'Force recreate all containers (stops and recreates everything)'
        )
        
        booleanParam(
            name: 'SKIP_TESTS',
            defaultValue: false,
            description: 'Skip running tests before deployment'
        )
        
        string(
            name: 'GIT_BRANCH_OVERRIDE',
            defaultValue: '',
            description: 'Override Git branch (leave empty to use job default)'
        )
    }
    
    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
    }
    
    stages {
        stage('Initialization') {
            steps {
                script {
                    echo "╔════════════════════════════════════════╗"
                    echo "║   Stock POS Deployment Pipeline        ║"
                    echo "╚════════════════════════════════════════╝"
                    echo ""
                    echo "Environment: ${params.ENVIRONMENT}"
                    echo "Action: ${params.ACTION}"
                    echo "Branch: ${params.GIT_BRANCH_OVERRIDE ?: env.GIT_BRANCH}"
                    echo "Build: #${env.BUILD_NUMBER}"
                    echo "Force Recreate: ${params.FORCE_RECREATE}"
                    echo ""
                }
            }
        }
        
        stage('Checkout') {
            steps {
                checkout scm
                script {
                    env.GIT_COMMIT_SHORT = sh(
                        script: "git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()
                    echo "Git Commit: ${env.GIT_COMMIT_SHORT}"
                }
            }
        }
        
        stage('Setup Dependencies') {
            steps {
                echo "Installing Python and Ansible dependencies..."
                sh '''
                    # Install Python packages
                    pip3 install --user --upgrade pip
                    pip3 install --user docker docker-compose
                    
                    # Install Ansible collections
                    cd ${ANSIBLE_DIR}
                    ansible-galaxy install -r requirements.yml --force
                '''
            }
        }
        
        stage('Validate Configuration') {
            steps {
                echo "Validating Ansible configuration..."
                sh '''
                    cd ${ANSIBLE_DIR}
                    
                    # Check syntax
                    ansible-playbook playbooks/deploy.yml \
                        --syntax-check \
                        -i inventories/${ENVIRONMENT}/jenkins-local.yml
                    
                    # Verify inventory
                    ansible-inventory \
                        -i inventories/${ENVIRONMENT}/jenkins-local.yml \
                        --list
                '''
            }
        }
        
        stage('Run Tests') {
            when {
                expression { params.SKIP_TESTS == false && params.ACTION == 'deploy' }
            }
            steps {
                echo "Running application tests..."
                sh '''
                    # Add your test commands here
                    # npm test || true
                    # npm run lint || true
                    echo "Tests would run here"
                '''
            }
        }
        
        stage('Pre-Deployment Status') {
            when {
                expression { params.ACTION == 'deploy' }
            }
            steps {
                echo "Checking current application status..."
                sh """
                    cd ${ANSIBLE_DIR}
                    ansible-playbook playbooks/status.yml \
                        -i inventories/${params.ENVIRONMENT}/jenkins-local.yml \
                        || true
                """
            }
        }
        
        stage('Deploy Application') {
            when {
                expression { params.ACTION == 'deploy' }
            }
            steps {
                script {
                    def branchToDeploy = params.GIT_BRANCH_OVERRIDE ?: env.GIT_BRANCH
                    
                    echo "Deploying application..."
                    sh """
                        cd ${ANSIBLE_DIR}
                        ansible-playbook playbooks/deploy.yml \
                            -i inventories/${params.ENVIRONMENT}/jenkins-local.yml \
                            -e confirm_deploy=yes \
                            -e force_recreate=${params.FORCE_RECREATE} \
                            -e docker_image_tag=${DOCKER_TAG} \
                            -e app_branch=${branchToDeploy} \
                            -e build_image=true \
                            -v
                    """
                }
            }
        }
        
        stage('Build Only') {
            when {
                expression { params.ACTION == 'build-only' }
            }
            steps {
                echo "Building Docker image only..."
                sh """
                    cd ${ANSIBLE_DIR}
                    ansible-playbook playbooks/deploy.yml \
                        -i inventories/${params.ENVIRONMENT}/jenkins-local.yml \
                        -e confirm_deploy=yes \
                        -e docker_image_tag=${DOCKER_TAG} \
                        --tags build \
                        -v
                """
            }
        }
        
        stage('Start Application') {
            when {
                expression { params.ACTION == 'start' }
            }
            steps {
                sh """
                    cd ${ANSIBLE_DIR}
                    ansible-playbook playbooks/start.yml \
                        -i inventories/${params.ENVIRONMENT}/jenkins-local.yml
                """
            }
        }
        
        stage('Stop Application') {
            when {
                expression { params.ACTION == 'stop' }
            }
            steps {
                sh """
                    cd ${ANSIBLE_DIR}
                    ansible-playbook playbooks/stop.yml \
                        -i inventories/${params.ENVIRONMENT}/jenkins-local.yml \
                        -e confirm_stop=yes
                """
            }
        }
        
        stage('Rollback') {
            when {
                expression { params.ACTION == 'rollback' }
            }
            steps {
                input message: 'Are you sure you want to rollback?', ok: 'Yes, rollback'
                sh """
                    cd ${ANSIBLE_DIR}
                    ansible-playbook playbooks/rollback.yml \
                        -i inventories/${params.ENVIRONMENT}/jenkins-local.yml \
                        -e confirm_rollback=yes
                """
            }
        }
        
        stage('Check Status') {
            when {
                expression { params.ACTION == 'status' || params.ACTION == 'deploy' || params.ACTION == 'start' }
            }
            steps {
                echo "Checking application status..."
                sh """
                    cd ${ANSIBLE_DIR}
                    ansible-playbook playbooks/status.yml \
                        -i inventories/${params.ENVIRONMENT}/jenkins-local.yml
                """
            }
        }
        
        stage('Health Check') {
            when {
                expression { params.ACTION == 'deploy' || params.ACTION == 'start' }
            }
            steps {
                echo "Performing health checks..."
                script {
                    retry(5) {
                        sleep(time: 10, unit: 'SECONDS')
                        sh '''
                            # Health check endpoint
                            HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/health)
                            if [ "$HTTP_CODE" != "200" ]; then
                                echo "Health check failed with HTTP code: $HTTP_CODE"
                                exit 1
                            fi
                            echo "Health check passed!"
                        '''
                    }
                }
            }
        }
        
        stage('Smoke Tests') {
            when {
                expression { params.ACTION == 'deploy' }
            }
            steps {
                echo "Running smoke tests..."
                sh '''
                    # Add your smoke tests here
                    # curl http://localhost:8081/api/health
                    # curl http://localhost:8081/api/version
                    echo "Smoke tests would run here"
                '''
            }
        }
        
        stage('Cleanup') {
            steps {
                echo "Cleaning up old Docker images..."
                sh '''
                    # Remove old images (keep last 5)
                    docker images ${DOCKER_IMAGE} --format "{{.ID}}\t{{.Tag}}" | \
                        sort -rn | \
                        tail -n +6 | \
                        awk '{print $1}' | \
                        xargs -r docker rmi -f || true
                    
                    # Prune dangling images
                    docker image prune -f || true
                '''
            }
        }
    }
    
    post {
        always {
            echo "Archiving deployment artifacts..."
            archiveArtifacts artifacts: "${ANSIBLE_DIR}/ansible.log", allowEmptyArchive: true
            
            script {
                // Get final container status
                def containerStatus = sh(
                    script: "docker ps --filter 'name=${APP_NAME}' --format 'table {{.Names}}\t{{.Status}}'",
                    returnStdout: true
                ).trim()
                
                echo "Final Container Status:"
                echo containerStatus
            }
        }
        
        success {
            echo "╔════════════════════════════════════════╗"
            echo "║   Deployment Successful! ✓             ║"
            echo "╚════════════════════════════════════════╝"
            
            // Uncomment to send notifications
            // emailext (
            //     subject: "✅ Deployment Successful: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
            //     body: """
            //         Deployment completed successfully!
            //         
            //         Environment: ${params.ENVIRONMENT}
            //         Action: ${params.ACTION}
            //         Build: #${env.BUILD_NUMBER}
            //         Git Commit: ${env.GIT_COMMIT_SHORT}
            //         
            //         View details: ${env.BUILD_URL}
            //     """,
            //     to: 'team@example.com'
            // )
            
            // slackSend (
            //     color: 'good',
            //     message: "✅ Deployment successful: ${env.JOB_NAME} #${env.BUILD_NUMBER} to ${params.ENVIRONMENT}"
            // )
        }
        
        failure {
            echo "╔════════════════════════════════════════╗"
            echo "║   Deployment Failed! ✗                 ║"
            echo "╚════════════════════════════════════════╝"
            
            script {
                if (params.ACTION == 'deploy') {
                    echo "⚠️  Consider running a rollback!"
                    echo "To rollback, trigger a new build with ACTION=rollback"
                }
            }
            
            // Uncomment to send notifications
            // emailext (
            //     subject: "❌ Deployment Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
            //     body: """
            //         Deployment failed!
            //         
            //         Environment: ${params.ENVIRONMENT}
            //         Action: ${params.ACTION}
            //         Build: #${env.BUILD_NUMBER}
            //         
            //         Check logs: ${env.BUILD_URL}console
            //         
            //         Consider running a rollback if needed.
            //     """,
            //     to: 'team@example.com'
            // )
            
            // slackSend (
            //     color: 'danger',
            //     message: "❌ Deployment failed: ${env.JOB_NAME} #${env.BUILD_NUMBER} to ${params.ENVIRONMENT}"
            // )
        }
        
        unstable {
            echo "⚠️  Build is unstable"
        }
        
        cleanup {
            echo "Performing final cleanup..."
            cleanWs(
                deleteDirs: true,
                patterns: [
                    [pattern: '**/.git/**', type: 'EXCLUDE'],
                    [pattern: '**/ansible.log', type: 'INCLUDE']
                ]
            )
        }
    }
}