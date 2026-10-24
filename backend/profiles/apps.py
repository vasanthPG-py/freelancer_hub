from django.apps import AppConfig

class ProfilesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'profiles'
    verbose_name = 'User Profiles, Skills & Portfolios'

    def ready(self):
        import profiles.signals  # Connect signals on application startup
