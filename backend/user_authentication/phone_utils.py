from rest_framework.exceptions import ValidationError  # type: ignore


def normalize_ph_phone(value, field_name="phone"):
    """Normalize Philippine mobile numbers to +639XXXXXXXXX."""
    if value is None:
        return ""

    raw = str(value).strip()
    if not raw:
        return ""

    cleaned = "".join(ch for ch in raw if ch.isdigit() or ch == "+")
    if cleaned.startswith("+"):
        digits = cleaned[1:]
    else:
        digits = cleaned

    normalized = None
    if digits.startswith("639") and len(digits) == 12:
        normalized = f"+{digits}"
    elif digits.startswith("09") and len(digits) == 11:
        normalized = f"+63{digits[1:]}"
    elif digits.startswith("9") and len(digits) == 10:
        normalized = f"+63{digits}"

    if not normalized:
        raise ValidationError({field_name: "Use a valid PH mobile number (e.g., 09123456789 or +639123456789)."})

    return normalized