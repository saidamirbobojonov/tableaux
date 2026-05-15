import os
import sys
from pathlib import Path
from django.core.wsgi import get_wsgi_application

# 1. Добавляем корневую папку проекта в sys.path, чтобы Python видел 'apps'
# Это важно, так как wsgi запускается из другой среды, чем manage.py
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR / "apps"))

# 2. Указываем файл настроек по умолчанию (dev)
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')

application = get_wsgi_application()