from django.apps import AppConfig


class SystemManagementModuleConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'system_management_module'

    def ready(self):
        # This import registers the signals when the app starts
        import system_management_module.signals
