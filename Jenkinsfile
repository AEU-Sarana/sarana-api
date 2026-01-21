pipeline {
    agent any

    environment {
        REGISTRY = credentials('docker-registry-url')
        REGISTRY_CREDENTIALS = credentials('docker-registry-credentials')
        APP_NAME = 'stock-pos-server'
        VERSION = "${BUILD_NUMBER}-${GIT_COMMIT.take(7)}"
        NODE_VERSION = '20'
        PNPM_VERSION = '10.15.1'
    }

    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['dev', 'staging', 'prod'],
            description: 'Deployment environment'
        )
        booleanParam(
            name: 'RUN_TESTS',
            defaultValue: true,
            description: 'Run linting and code quality checks'
        )
        booleanParam(
            name: 'RUN_MIGRATIONS',
            defaultValue: false,
            description: 'Run database migrations (production only)'
        )
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 1, unit: 'HOURS')
        timestamps()
    }

    stages {
        stage('Checkout') {
            steps {
                script {
                    echo "=== Checking out code ==="
                    checkout scm
                    env.GIT_COMMIT_MSG = sh(returnStdout: true, script: 'git log -1 --pretty=%B').trim()
                    env.GIT_AUTHOR = sh(returnStdout: true, script: 'git log -1 --pretty=%an').trim()
                }
            }
        }

        stage('Validate') {
            steps {
                script {
                    echo "=== Validating environment ==="
                    sh '''
                        echo "Node version:"
                        node --version
                        echo "pnpm version:"
                        pnpm --version
                        echo "Docker version:"
                        docker --version
                    '''
                }
            }
        }

        stage('Install Dependencies') {
            steps {
                script {
                    echo "=== Installing dependencies ==="
                    sh '''
                        pnpm install --frozen-lockfile
                    '''
                }
            }
        }

        stage('Code Quality') {
            when {
                expression { params.RUN_TESTS == true }
            }
            steps {
                script {
                    echo "=== Running code quality checks ==="
                    sh '''
                        echo "Linting..."
                        pnpm lint
                        
                        echo "Format check..."
                        pnpm format:check
                    '''
                }
            }
            post {
                always {
                    recordIssues(
                        enabledForFailure: true,
                        tool: checkStyle(pattern: '**/eslint-report.xml'),
                        qualityGates: [[threshold: 10, type: 'TOTAL', unstable: false]]
                    )
                }
            }
        }

        stage('Build') {
            steps {
                script {
                    echo "=== Building application ==="
                    sh '''
                        pnpm db:generate
                        pnpm build
                    '''
                }
            }
        }

        stage('Build Docker Image') {
            steps {
                script {
                    echo "=== Building Docker image ==="
                    sh '''
                        docker build \
                            --target production \
                            -t ${REGISTRY}/${APP_NAME}:${VERSION} \
                            -t ${REGISTRY}/${APP_NAME}:latest \
                            .
                        
                        echo "Image built: ${REGISTRY}/${APP_NAME}:${VERSION}"
                    '''
                }
            }
        }

        stage('Push Docker Image') {
            steps {
                script {
                    echo "=== Pushing Docker image to registry ==="
                    sh '''
                        docker login -u $REGISTRY_CREDENTIALS_USR -p $REGISTRY_CREDENTIALS_PSW
                        docker push ${REGISTRY}/${APP_NAME}:${VERSION}
                        docker push ${REGISTRY}/${APP_NAME}:latest
                        docker logout
                    '''
                }
            }
        }

        stage('Deploy to Dev') {
            when {
                expression { params.ENVIRONMENT == 'dev' }
            }
            steps {
                script {
                    echo "=== Deploying to DEV ==="
                    sh '''
                        ansible-playbook \
                            -i ansible/inventory/dev \
                            -e "app_version=${VERSION}" \
                            -e "environment=dev" \
                            -e "docker_image=${REGISTRY}/${APP_NAME}:${VERSION}" \
                            ansible/playbooks/deploy.yml
                    '''
                }
            }
        }

        stage('Deploy to Staging') {
            when {
                expression { params.ENVIRONMENT == 'staging' }
            }
            steps {
                script {
                    echo "=== Deploying to STAGING ==="
                    sh '''
                        ansible-playbook \
                            -i ansible/inventory/staging \
                            -e "app_version=${VERSION}" \
                            -e "environment=staging" \
                            -e "docker_image=${REGISTRY}/${APP_NAME}:${VERSION}" \
                            -e "run_migrations=${RUN_MIGRATIONS}" \
                            ansible/playbooks/deploy.yml
                    '''
                }
            }
        }

        stage('Deploy to Production') {
            when {
                expression { params.ENVIRONMENT == 'prod' }
                branch 'main'
            }
            input {
                message "Deploy to PRODUCTION?"
                ok "Deploy"
            }
            steps {
                script {
                    echo "=== Deploying to PRODUCTION ==="
                    sh '''
                        ansible-playbook \
                            -i ansible/inventory/prod \
                            -e "app_version=${VERSION}" \
                            -e "environment=prod" \
                            -e "docker_image=${REGISTRY}/${APP_NAME}:${VERSION}" \
                            -e "run_migrations=${RUN_MIGRATIONS}" \
                            ansible/playbooks/deploy.yml
                    '''
                }
            }
        }

        stage('Health Check') {
            steps {
                script {
                    echo "=== Running health checks ==="
                    sh '''
                        ansible-playbook \
                            -i ansible/inventory/${ENVIRONMENT} \
                            ansible/playbooks/healthcheck.yml
                    '''
                }
            }
        }

        stage('Notify') {
            steps {
                script {
                    echo "=== Sending notifications ==="
                    // Slack notification example
                    sh '''
                        if [ "${BUILD_STATUS}" == "SUCCESS" ]; then
                            echo "Deployment successful to ${ENVIRONMENT}"
                        else
                            echo "Deployment failed to ${ENVIRONMENT}"
                        fi
                    '''
                }
            }
        }
    }

    post {
        always {
            echo "=== Cleanup ==="
            cleanWs()
        }
        success {
            script {
                echo "✅ Pipeline completed successfully for ${ENVIRONMENT}"
            }
        }
        failure {
            script {
                echo "❌ Pipeline failed. Check logs above."
            }
        }
    }
}
