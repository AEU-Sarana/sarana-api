pipeline {
    agent any

    environment {
        // ===== Ansible =====
        ANSIBLE_HOST_KEY_CHECKING = 'False'
        ANSIBLE_FORCE_COLOR = 'true'
        VAULT_PASS = credentials('ansible-vault-password')

        // ===== Application =====
        APP_NAME = 'stock-pos'
        ANSIBLE_DIR = 'ansible'

        // ===== Docker =====
        DOCKER_IMAGE = 'stock-pos-app'
        DOCKER_TAG = "${BUILD_NUMBER}"
    }

    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['production', 'staging', 'development'],
            description: 'Target environment'
        )

        choice(
            name: 'ACTION',
            choices: ['deploy', 'build-only', 'status', 'start', 'stop', 'rollback'],
            description: 'Action to perform'
        )

        booleanParam(
            name: 'FORCE_RECREATE',
            defaultValue: false,
            description: 'Force recreate containers'
        )

        booleanParam(
            name: 'SKIP_TESTS',
            defaultValue: false,
            description: 'Skip tests'
        )

        string(
            name: 'GIT_BRANCH_OVERRIDE',
            defaultValue: '',
            description: 'Optional Git branch override'
        )
    }

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {

        stage('Initialization') {
            steps {
                echo """
                ================================================
                Stock POS Deployment Pipeline
                ------------------------------------------------
                Environment : ${params.ENVIRONMENT}
                Action      : ${params.ACTION}
                Build       : #${BUILD_NUMBER}
                ================================================
                """
            }
        }

        stage('Checkout Source') {
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

        stage('Install Ansible Dependencies') {
            steps {
                sh '''
                    cd ${ANSIBLE_DIR}
                    ansible-galaxy install -r requirements.yml --force
                '''
            }
        }

        stage('Validate Ansible') {
            steps {
                sh """
                    cd ${ANSIBLE_DIR}
                    ansible-playbook playbooks/deploy.yml \
                    --syntax-check \
                    -i inventories/${ENVIRONMENT}/hosts.ini

                    ansible-inventory \
                    -i inventories/${ENVIRONMENT}/hosts.ini --list
                """
            }
        }


        stage('Run Tests') {
            when {
                expression { params.ACTION == 'deploy' && !params.SKIP_TESTS }
            }
            steps {
                echo "Running tests..."
                sh 'echo "Tests placeholder"'
            }
        }

        stage('Deploy / Action') {
            when {
                expression {
                    // Only run Ansible when a playbook exists (deploy, rollback, start, stop, setup)
                    params.ACTION in ['deploy', 'rollback', 'start', 'stop', 'setup']
                }
            }
            steps {
                sshagent(['deploy-ssh-key']) {
                    script {
                        def branch = params.GIT_BRANCH_OVERRIDE ?: env.GIT_BRANCH

                        sh """
                            echo "$VAULT_PASS" > vault.pass
                            chmod 600 vault.pass

                            cd ${ANSIBLE_DIR}

                            ansible-playbook playbooks/${params.ACTION}.yml \
                              -i inventories/${params.ENVIRONMENT}/hosts.ini \
                              --vault-password-file vault.pass \
                              -e app_branch=${branch} \
                              -e docker_image_tag=${DOCKER_TAG} \
                              -e force_recreate=${params.FORCE_RECREATE} \
                              -e confirm_${params.ACTION}=yes \
                              -v
                        """
                    }
                }
            }
        }

        stage('Build-only / Status (no Ansible)') {
            when {
                expression { params.ACTION in ['build-only', 'status'] }
            }
            steps {
                script {
                    if (params.ACTION == 'build-only') {
                        echo 'ACTION=build-only: Use Jenkinsfile.build pipeline to build and push Docker image. No Ansible playbook.'
                    } else {
                        echo 'ACTION=status: Check container status on target server (e.g. ssh deployer@89.167.6.46 "docker ps"). No playbook yet.'
                    }
                }
            }
        }

        stage('Health Check') {
            when {
                expression { params.ACTION == 'deploy' || params.ACTION == 'start' }
            }
            steps {
                echo "Health check should be performed on backend server (89.167.6.46)"
                echo "Skipping localhost check as it would test Jenkins, not backend"
            }
        }

        stage('Cleanup Docker Images') {
            steps {
                sh '''
                    echo "=== Before Cleanup ==="
                    docker images | grep stock-pos-server | wc -l || true
                    docker system df || true
                    
                    echo "=== Cleaning up dangling images ==="
                    docker image prune -f || true
                    
                    echo "=== Cleaning up exited containers ==="
                    docker container prune -f || true
                    
                    echo "=== Cleaning up unused volumes ==="
                    docker volume prune -f || true
                    
                    echo "=== Removing old stock-pos-server images (keep last 3) ==="
                    docker images --format "{{.Repository}}:{{.Tag}} {{.ID}}" | \
                    grep "stock-pos-server" | \
                    head -n -3 | \
                    awk '{print $NF}' | \
                    xargs -r docker rmi -f || true
                    
                    echo "=== After Cleanup ==="
                    docker images | grep stock-pos-server | wc -l || true
                    docker system df || true
                '''
            }
        }
    }

    post {
        success {
            echo "✅ Deployment successful"
        }

        failure {
            echo "❌ Deployment failed"
            echo "👉 Consider ACTION=rollback"
        }

        always {
            sh 'rm -f vault.pass || true'
            cleanWs()
        }
    }
}
