"""WSGI config for FreelanceHub."""
import os
from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'freelancehub_core.settings')
application = get_wsgi_application()
