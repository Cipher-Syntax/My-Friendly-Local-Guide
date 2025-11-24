from django.apps import AppConfig


class AgencyManagementModuleConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "agency_management_module"

    def ready(self):
        from . import signals  # Auto-load signals
