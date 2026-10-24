"""ASGI config for FreelanceHub."""
import os
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'freelancehub_core.settings')
application = get_asgi_application()
