from __future__ import annotations

import re
from decimal import Decimal, InvalidOperation


# NOTE: Kept legacy constant names for compatibility with existing imports.
# Scope is now restricted to Zamboanga City only.
ZDS_LATITUDE_MIN = Decimal("6.75")
ZDS_LATITUDE_MAX = Decimal("7.35")
ZDS_LONGITUDE_MIN = Decimal("121.70")
ZDS_LONGITUDE_MAX = Decimal("122.35")

CITY_SCOPE_LABEL = "Zamboanga City"

# West, South, East, North format used by Mapbox geocoding API.
ZDS_MAPBOX_BBOX = (
    float(ZDS_LONGITUDE_MIN),
    float(ZDS_LATITUDE_MIN),
    float(ZDS_LONGITUDE_MAX),
    float(ZDS_LATITUDE_MAX),
)

ZDS_MUNICIPALITIES = (
    CITY_SCOPE_LABEL,
)


def _normalize_key(value: str | None) -> str:
    text = str(value or "").strip().lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def normalize_location_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def _build_municipality_aliases() -> dict[str, str]:
    aliases: dict[str, str] = {}

    for municipality in ZDS_MUNICIPALITIES:
        aliases[_normalize_key(municipality)] = municipality

    aliases[_normalize_key("Zamboanga")] = CITY_SCOPE_LABEL
    aliases[_normalize_key("Ciudad de Zamboanga")] = CITY_SCOPE_LABEL
    aliases[_normalize_key("Zamboanga City")] = CITY_SCOPE_LABEL

    return aliases


_MUNICIPALITY_ALIASES = _build_municipality_aliases()


def get_zds_municipality_choices() -> list[str]:
    return list(ZDS_MUNICIPALITIES)


def normalize_municipality_name(value: str | None) -> str:
    key = _normalize_key(value)
    return _MUNICIPALITY_ALIASES.get(key, "")


def extract_municipality_from_text(value: str | None) -> str:
    key = _normalize_key(value)
    if not key:
        return ""

    for alias, canonical in _MUNICIPALITY_ALIASES.items():
        if re.search(rf"\b{re.escape(alias)}\b", key):
            return canonical

    return ""


def coerce_decimal(value, field_name: str) -> Decimal | None:
    if value in (None, ""):
        return None

    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise ValueError(f"{field_name} must be a valid decimal value.") from exc


def validate_zds_coordinates(latitude, longitude) -> tuple[Decimal | None, Decimal | None]:
    lat = coerce_decimal(latitude, "latitude")
    lng = coerce_decimal(longitude, "longitude")

    if (lat is None) ^ (lng is None):
        raise ValueError("Latitude and longitude must be provided together.")

    if lat is None and lng is None:
        return None, None

    if lat < ZDS_LATITUDE_MIN or lat > ZDS_LATITUDE_MAX:
        raise ValueError(
            f"Latitude must be between {ZDS_LATITUDE_MIN} and {ZDS_LATITUDE_MAX} for {CITY_SCOPE_LABEL}."
        )

    if lng < ZDS_LONGITUDE_MIN or lng > ZDS_LONGITUDE_MAX:
        raise ValueError(
            f"Longitude must be between {ZDS_LONGITUDE_MIN} and {ZDS_LONGITUDE_MAX} for {CITY_SCOPE_LABEL}."
        )

    return lat, lng


def validate_zds_location_payload(
    *,
    location,
    latitude=None,
    longitude=None,
    municipality=None,
    require_location: bool,
    require_coordinates: bool = False,
) -> dict[str, Decimal | str | None]:
    normalized_location = normalize_location_text(location)
    normalized_municipality = normalize_municipality_name(municipality)

    lat, lng = validate_zds_coordinates(latitude, longitude)

    if require_coordinates and (lat is None or lng is None):
        raise ValueError("Latitude and longitude are required for this location update.")

    inferred_municipality = normalized_municipality or extract_municipality_from_text(normalized_location)

    if not inferred_municipality and (normalized_location or lat is not None):
        inferred_municipality = CITY_SCOPE_LABEL

    if require_location and not normalized_location:
        if lat is not None:
            normalized_location = f"Pinned location in {CITY_SCOPE_LABEL}"
        elif inferred_municipality:
            normalized_location = inferred_municipality
        else:
            raise ValueError("Location is required.")

    return {
        "location": normalized_location,
        "latitude": lat,
        "longitude": lng,
        "municipality": inferred_municipality,
    }


def is_trusted_location_editor(user) -> bool:
    if not user or not getattr(user, "is_authenticated", False):
        return False

    if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
        return True

    if hasattr(user, "agency_profile"):
        return True

    return bool(getattr(user, "is_local_guide", False) and getattr(user, "guide_approved", False))
