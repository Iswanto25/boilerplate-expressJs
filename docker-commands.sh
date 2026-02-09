#!/bin/bash

# ==================================
# Docker Quick Commands
# ==================================
# Quick reference untuk Docker operations
# Usage: ./docker-commands.sh [command]
# ==================================

case "$1" in
  start)
    echo "🚀 Starting all services..."
    docker-compose up -d
    ;;
  
  stop)
    echo "🛑 Stopping all services..."
    docker-compose down
    ;;
  
  restart)
    echo "🔄 Restarting all services..."
    docker-compose restart
    ;;
  
  logs)
    echo "📋 Viewing logs..."
    docker-compose logs -f ${2:-app}
    ;;
  
  status)
    echo "✅ Checking service status..."
    docker-compose ps
    ;;
  
  migrate)
    echo "🗄️  Running database migrations..."
    docker-compose exec app npx prisma migrate deploy
    ;;
  
  shell)
    echo "💻 Opening shell in app container..."
    docker-compose exec app sh
    ;;
  
  db-shell)
    echo "🗄️  Opening PostgreSQL shell..."
    docker-compose exec postgres psql -U postgres -d expressdb
    ;;
  
  redis-cli)
    echo "📦 Opening Redis CLI..."
    docker-compose exec redis redis-cli -a ${REDIS_PASSWORD:-redis123}
    ;;
  
  rebuild)
    echo "🔨 Rebuilding and restarting app..."
    docker-compose up -d --build app
    ;;
  
  clean)
    echo "🧹 Cleaning up (keeping volumes)..."
    docker-compose down
    echo "✅ Services stopped"
    ;;
  
  clean-all)
    echo "⚠️  WARNING: This will delete all data!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      docker-compose down -v
      echo "✅ All data cleaned"
    else
      echo "❌ Cancelled"
    fi
    ;;
  
  backup-db)
    echo "💾 Backing up database..."
    DATE=$(date +%Y%m%d_%H%M%S)
    docker-compose exec postgres pg_dump -U postgres expressdb > "backup_db_$DATE.sql"
    echo "✅ Database backed up to: backup_db_$DATE.sql"
    ;;
  
  restore-db)
    if [ -z "$2" ]; then
      echo "❌ Please provide backup file: ./docker-commands.sh restore-db backup.sql"
      exit 1
    fi
    echo "♻️  Restoring database from: $2"
    docker-compose exec -T postgres psql -U postgres expressdb < "$2"
    echo "✅ Database restored"
    ;;
  
  *)
    echo "Docker Quick Commands"
    echo "====================="
    echo ""
    echo "Usage: ./docker-commands.sh [command]"
    echo ""
    echo "Available commands:"
    echo "  start        - Start all services"
    echo "  stop         - Stop all services"
    echo "  restart      - Restart all services"
    echo "  logs         - View logs (add service name, e.g: logs app)"
    echo "  status       - Check service status"
    echo "  migrate      - Run database migrations"
    echo "  shell        - Open shell in app container"
    echo "  db-shell     - Open PostgreSQL shell"
    echo "  redis-cli    - Open Redis CLI"
    echo "  rebuild      - Rebuild and restart app"
    echo "  clean        - Stop services (keep data)"
    echo "  clean-all    - Stop services and delete all data"
    echo "  backup-db    - Backup database to SQL file"
    echo "  restore-db   - Restore database from SQL file"
    echo ""
    echo "Examples:"
    echo "  ./docker-commands.sh start"
    echo "  ./docker-commands.sh logs app"
    echo "  ./docker-commands.sh migrate"
    echo ""
    ;;
esac
