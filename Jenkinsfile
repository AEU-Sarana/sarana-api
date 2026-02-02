pipeline {
    agent any

    stages {
        stage('Example') {
            steps {
                echo 'Hello, Jenkins!'
            }
        }
    }
}




// pipeline {
//     agent any

//     environment {
//         // ===== Ansible =====
//         ANSIBLE_HOST_KEY_CHECKING = 'False'
//         ANSIBLE_FORCE_COLOR = 'true'
//         VAULT_PASS = credentials('ansible-vault-pass')

//         // ===== Application =====
//         APP_NAME = 'stock-pos'
//         ANSIBLE_DIR = 'ansible-docker-deploy'

//         // ===== Docker =====
//         DOCKER_IMAGE = 'stock-pos-app'
//         DOCKER_TAG = "${BUILD_NUMBER}"
//     }

//     parameters {
//         choice(
//             name: 'ENVIRONMENT',
//             choices: ['production', 'staging', 'development'],
//             description: 'Target environment'
//         )

//         choice(
//             name: 'ACTION',
//             choices: ['deploy', 'build-only', 'status', 'start', 'stop', 'rollback'],
//             description: 'Action to perform'
//         )

//         booleanParam(
//             name: 'FORCE_RECREATE',
//             defaultValue: false,
//             description: 'Force recreate containers'
//         )

//         booleanParam(
//             name: 'SKIP_TESTS',
//             defaultValue: false,
//             description: 'Skip tests'
//         )

//         string(
//             name: 'GIT_BRANCH_OVERRIDE',
//             defaultValue: '',
//             description: 'Optional Git branch override'
//         )
//     }

//     options {
//         timestamps()
//         timeout(time: 30, unit: 'MINUTES')
//         disableConcurrentBuilds()
//         buildDiscarder(logRotator(numToKeepStr: '10'))
//     }

//     stages {

//         stage('Initialization') {
//             steps {
//                 echo """
//                 ================================================
//                 Stock POS Deployment Pipeline
//                 ------------------------------------------------
//                 Environment : ${params.ENVIRONMENT}
//                 Action      : ${params.ACTION}
//                 Build       : #${BUILD_NUMBER}
//                 ================================================
//                 """
//             }
//         }

//         stage('Checkout Source') {
//             steps {
//                 checkout scm
//                 script {
//                     env.GIT_COMMIT_SHORT = sh(
//                         script: "git rev-parse --short HEAD",
//                         returnStdout: true
//                     ).trim()
//                     echo "Git Commit: ${env.GIT_COMMIT_SHORT}"
//                 }
//             }
//         }

//         stage('Install Ansible Dependencies') {
//             steps {
//                 sh '''
//                     cd ${ANSIBLE_DIR}
//                     ansible-galaxy install -r requirements.yml --force
//                 '''
//             }
//         }

//         stage('Validate Ansible') {
//             steps {
//                 sh """
//                     cd ${ANSIBLE_DIR}
//                     ansible-playbook playbooks/deploy.yml \
//                     --syntax-check \
//                     -i inventories/${ENVIRONMENT}/hosts.ini

//                     ansible-inventory \
//                     -i inventories/${ENVIRONMENT}/hosts.ini --list
//                 """
//             }
//         }


//         stage('Run Tests') {
//             when {
//                 expression { params.ACTION == 'deploy' && !params.SKIP_TESTS }
//             }
//             steps {
//                 echo "Running tests..."
//                 sh 'echo "Tests placeholder"'
//             }
//         }

//         stage('Deploy / Action') {
//             steps {
//                 sshagent(['deploy-ssh-key']) {
//                     script {
//                         def branch = params.GIT_BRANCH_OVERRIDE ?: env.GIT_BRANCH

//                         sh """
//                             echo "$VAULT_PASS" > vault.pass
//                             chmod 600 vault.pass

//                             cd ${ANSIBLE_DIR}

//                             ansible-playbook playbooks/${params.ACTION}.yml \
//                               -i inventories/${params.ENVIRONMENT}/jenkins-local.yml \
//                               --vault-password-file vault.pass \
//                               -e app_branch=${branch} \
//                               -e docker_image_tag=${DOCKER_TAG} \
//                               -e force_recreate=${params.FORCE_RECREATE} \
//                               -e confirm_${params.ACTION}=yes \
//                               -v
//                         """
//                     }
//                 }
//             }
//         }

//         stage('Health Check') {
//             when {
//                 expression { params.ACTION == 'deploy' || params.ACTION == 'start' }
//             }
//             steps {
//                 retry(5) {
//                     sleep 10
//                     sh '''
//                         HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8081/health || true)
//                         [ "$HTTP_CODE" = "200" ]
//                     '''
//                 }
//             }
//         }

//         stage('Cleanup Docker Images') {
//             steps {
//                 sh '''
//                     docker image prune -f || true
//                 '''
//             }
//         }
//     }

//     post {
//         success {
//             echo "✅ Deployment successful"
//         }

//         failure {
//             echo "❌ Deployment failed"
//             echo "👉 Consider ACTION=rollback"
//         }

//         always {
//             sh 'rm -f vault.pass || true'
//             cleanWs()
//         }
//     }
// }
