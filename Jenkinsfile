pipeline {
    agent any

    options {
        timestamps()
    }

    environment {
        APP_NAME = "boilerplate-express-backend"
        APP_DIR  = "/opt/docker/app-staging/${APP_NAME}"
    }

    stages {
        stage('Preparation & Backup') {
            steps {
                script {
                    sh """
                    BACKUP_DIR="${APP_DIR}_backup_\$(date +%s)"

                    echo "📁 Memastikan folder tujuan ada..."
                    docker run --rm -v /opt/docker/app-staging:/opt/docker/app-staging alpine sh -c "mkdir -p '${APP_DIR}'"

                    echo "📦 Membackup source code lama..."
                    docker run --rm -v /opt/docker/app-staging:/opt/docker/app-staging alpine sh -c "cp -r '${APP_DIR}' '\${BACKUP_DIR}' || true"
                    """
                }
            }
        }

        stage('Update Source Code') {
            steps {
                sh """
                echo "🚚 Menyalin source code BARU ke folder target..."
                docker run --rm -v /opt/docker/app-staging:/opt/docker/app-staging alpine sh -c "rm -rf '${APP_DIR}'/*"

                HELPER_ID=\$(docker create -v /opt/docker/app-staging:/opt/docker/app-staging alpine)
                docker cp "\$WORKSPACE/." "\$HELPER_ID:${APP_DIR}/"
                docker rm -v "\$HELPER_ID"
                """
            }
        }

        stage('Build & Push Image') {
            steps {
                sh """
                echo "🔧 Build image..."
                cd ${APP_DIR}

                docker build -t ${APP_NAME}:latest -t ${APP_NAME}:\$(date +%Y%m%d%H%M%S) .
                """
            }
        }

        stage('Deploy API Server') {
            steps {
                sh """
                echo "🚀 Deploy API Server..."
                cd ${APP_DIR}

                docker compose -f docker-compose.yml -p ${APP_NAME} down --remove-orphans || true
                docker compose -f docker-compose.yml -p ${APP_NAME} up -d
                """
            }
        }

        stage('Deploy Worker') {
            steps {
                sh """
                echo "⚙️ Deploy Worker..."
                cd ${APP_DIR}

                docker compose -f docker-compose.worker.yml -p ${APP_NAME}-worker down --remove-orphans || true
                docker compose -f docker-compose.worker.yml -p ${APP_NAME}-worker up -d
                """
            }
        }

        stage('Health Check') {
            steps {
                sh """
                echo "🏥 Cek health API server..."
                sleep 10

                for i in \$(seq 1 5); do
                    STATUS=\$(curl -s -o /dev/null -w "%{http_code}" http://localhost:4039/health || echo "000")
                    if [ "\$STATUS" = "200" ]; then
                        echo "✅ API server sehat (HTTP \$STATUS)"
                        break
                    fi
                    echo "⏳ Menunggu server siap... (\$i/5)"
                    sleep 5
                done

                if [ "\$STATUS" != "200" ]; then
                    echo "❌ API server tidak merespon!"
                    exit 1
                fi
                """
            }
        }

        stage('Cleanup') {
            steps {
                sh """
                docker run --rm -v /opt/docker/app-staging:/opt/docker/app-staging alpine sh -c "find /opt/docker/app-staging/ -name '*_backup_*' -type d -ctime +1 -exec rm -rf {} +"
                docker image prune -f --filter "until=24h"
                echo "🎯 Deployment Selesai!"
                """
            }
        }
    }

    post {
        failure {
            echo "❌ Deployment Gagal! Periksa log pada stage yang merah."
        }
    }
}
