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
    docker compose up -d
    ;;
  
  stop)
    echo "🛑 Stopping all services..."
    docker compose down
    ;;
  
  restart)
    echo "🔄 Restarting all services..."
    docker compose restart
    ;;
  
  logs)
    echo "📋 Viewing logs..."
    docker compose logs -f ${2:-takalar-sinaka-backend}
    ;;
  
  status)
    echo "✅ Checking service status..."
    docker compose ps
    ;;
  
  migrate)
    echo "🗄️  Running database migrations..."
    docker compose exec takalar-sinaka-backend npx prisma migrate deploy
    ;;
  
  shell)
    echo "💻 Opening shell in app container..."
    docker compose exec takalar-sinaka-backend sh
    ;;
  
  rebuild)
    echo "🔨 Rebuilding and restarting app..."
    docker compose up -d --build takalar-sinaka-backend
    ;;
  
  clean)
    echo "🧹 Cleaning up (keeping volumes)..."
    docker compose down
    echo "✅ Services stopped"
    ;;
  
  clean-all)
    echo "⚠️  WARNING: This will delete all data!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      docker compose down -v
      echo "✅ All data cleaned"
    else
      echo "❌ Cancelled"
    fi
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
    echo "  logs         - View logs (add service name, e.g: logs takalar-sinaka-backend)"
    echo "  status       - Check service status"
    echo "  migrate      - Run database migrations"
    echo "  shell        - Open shell in app container"
    echo "  rebuild      - Rebuild and restart app"
    echo "  clean        - Stop services (keep data)"
    echo "  clean-all    - Stop services and delete all data"
    echo ""
    echo "Examples:"
    echo "  ./docker-commands.sh start"
    echo "  ./docker-commands.sh logs takalar-sinaka-backend"
    echo "  ./docker-commands.sh migrate"
    echo ""
    ;;
esac
