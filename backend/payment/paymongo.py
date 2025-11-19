import requests
from django.conf import settings
from decimal import Decimal
from requests.exceptions import RequestException

PAYMONGO_API_URL = settings.PAYMONGO_API_URL
PAYMONGO_SECRET_KEY = settings.PAYMONGO_SECRET_KEY 

def create_payment_link(amount: Decimal, description: str, external_id: str, billing: dict):
    """
    Creates a PayMongo payment link using the API, utilizing Basic Auth.
    """

    if not PAYMONGO_SECRET_KEY:
        raise RuntimeError("PayMongo Secret Key is not configured in Django settings.")

    # PayMongo requires the amount to be an integer in centavos.
    amount_in_centavos = int(amount.quantize(Decimal('0.01')) * 100)
    
    payload = {
        "data": {
            "attributes": {
                "amount": amount_in_centavos,
                "description": description,
                "external_id": external_id,
                "currency": "PHP",
                "send_email_receipt": True,
                "show_description": True,
                "billing": {
                    "email": billing.get("email"),
                    "name": billing.get("name"),
                    "phone": billing.get("phone")
                }
            }
        }
    }

    # --- CRITICAL FIX: PayMongo uses Basic Auth with SECRET_KEY as username and empty password ---
    auth_tuple = (PAYMONGO_SECRET_KEY, "") 
    
    headers = {
        "Content-Type": "application/json",
    }

    try:
        response = requests.post(
            PAYMONGO_API_URL,
            headers=headers,
            json=payload,
            auth=auth_tuple  # <--- CORRECT BASIC AUTH
        )
        response_data = response.json()
        
        if not response.ok:
            # Handle PayMongo's error format
            error_msg = "Unknown PayMongo Error"
            if "errors" in response_data:
                error_msg = response_data["errors"][0].get("detail", error_msg)
            
            # This raises the error that PaymentInitiationView catches
            raise RuntimeError(f"PayMongo API error: {response.status_code} {error_msg}")

        return response_data
        
    except RequestException as e:
        # Catch connection errors
        raise RuntimeError(f"Network Error: Failed to connect to PayMongo API: {e}")