from django.contrib.auth import get_user_model
from django.core.mail import send_mail

User = get_user_model()


def should_send_user_email(user):
    if not user:
        return False
    return bool(getattr(user, 'email_enabled', True))


def filter_recipient_list_by_preference(recipient_list):
    if not recipient_list:
        return []

    cleaned = []
    seen = set()
    for raw_email in recipient_list:
        email = str(raw_email or '').strip()
        if not email:
            continue

        email_key = email.lower()
        if email_key in seen:
            continue

        seen.add(email_key)
        cleaned.append(email)

    if not cleaned:
        return []

    opted_out_email_keys = {
        str(user.email).strip().lower()
        for user in User.objects.filter(email__in=cleaned)
        if not bool(getattr(user, 'email_enabled', True))
    }

    return [email for email in cleaned if email.lower() not in opted_out_email_keys]


def send_preference_aware_email(
    *,
    subject,
    message,
    from_email,
    recipient_list,
    html_message=None,
    fail_silently=False,
):
    filtered_recipients = filter_recipient_list_by_preference(recipient_list)
    if not filtered_recipients:
        return 0

    return send_mail(
        subject=subject,
        message=message,
        from_email=from_email,
        recipient_list=filtered_recipients,
        html_message=html_message,
        fail_silently=fail_silently,
    )