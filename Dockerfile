# 1. Берем легкий образ Python
FROM python:3.11-slim

# 2. Отключаем буферизацию (чтобы логи сразу летели в консоль)
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# 3. Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# 4. Устанавливаем системные зависимости (нужны для Postgres и Pillow)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 5. Копируем файл зависимостей и устанавливаем их
COPY requirements.txt /app/
RUN pip install --no-cache-dir -r requirements.txt

# 6. Копируем весь код проекта
COPY . /app/

# 7. Открываем порт 8000
EXPOSE 8000

# 8. Команда запуска (по умолчанию)s
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]