from django.apps import AppConfig


class UserAuthenticationConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'user_authentication'
    
    def ready(self):
        # Register the signals for guide approval notifications
        import user_authentication.signals
