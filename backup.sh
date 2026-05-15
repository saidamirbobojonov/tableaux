#!/bin/bash

# Настройки
BACKUP_DIR="./db_backups"
DATE=$(date +%Y-%m-%d_%H-%M-%S)
FILENAME="backup_$DATE.sql.gz"

# Ищем ID контейнера с базой данных (по имени образа или части имени)
# В нашем docker-compose.prod.yml сервис называется 'db'
CONTAINER_NAME=$(docker-compose -f docker-compose.prod.yml ps -q db)

if [ -z "$CONTAINER_NAME" ]; then
    echo "Error: Database container not found running."
    exit 1
fi

echo "Creating backup: $FILENAME ..."

# 1. Выполняем pg_dump внутри контейнера
# 2. Передаем результат (потоком) на хост-машину
# 3. Сжимаем gzip'ом
docker exec -t $CONTAINER_NAME pg_dump -U saeed_prod restaurant_prod_db | gzip > "$BACKUP_DIR/$FILENAME"

# (Опционально) Удаляем бэкапы старше 7 дней, чтобы не забить диск
find $BACKUP_DIR -type f -name "*.sql.gz" -mtime +7 -delete

echo "Backup success: $BACKUP_DIR/$FILENAME"