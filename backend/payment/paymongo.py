import requests
from django.conf import settings
from decimal import Decimal
from requests.exceptions import RequestException

PAYMONGO_API_URL = settings.PAYMONGO_BASE_URL
PAYMONGO_SECRET_KEY = settings.PAYMONGO_SECRET_KEY 

def create_checkout_session(amount: Decimal, description: str, billing: dict, payment_method_types: list):
    if not PAYMONGO_SECRET_KEY:
        raise RuntimeError("PayMongo Secret Key is not configured.")

    auth_tuple = (PAYMONGO_SECRET_KEY, "")
    headers = {"Content-Type": "application/json"}
    amount_in_centavos = int(amount.quantize(Decimal('0.01')) * 100)

    payload = {
        "data": {
            "attributes": {
                "billing": billing,
                "line_items": [
                    {
                        "currency": "PHP",
                        "amount": amount_in_centavos,
                        "description": description,
                        "name": "Localynk Payment",
                        "quantity": 1
                    }
                ],
                "payment_method_types": payment_method_types, 
                "description": description,
                "send_email_receipt": True,
                "show_description": True,
                "show_line_items": True,
            }
        }
    }

    try:
        response = requests.post(
            f"{PAYMONGO_API_URL}/checkout_sessions",
            json=payload, headers=headers, auth=auth_tuple
        )
        
        if not response.ok:
            data = response.json()
            detail = data.get('errors', [{}])[0].get('detail', 'Unknown Error')
            raise RuntimeError(f"Checkout Session Error: {detail}")

        data = response.json()
        return {
            "checkout_url": data['data']['attributes']['checkout_url'],
            "transaction_id": data['data']['id']
        }

    except RequestException as e:
        raise RuntimeError(f"Network Error: {e}")


def retrieve_checkout_session(checkout_session_id):
    if not PAYMONGO_SECRET_KEY:
        raise RuntimeError("PayMongo Secret Key is not configured.")

    auth_tuple = (PAYMONGO_SECRET_KEY, "")
    headers = {"Content-Type": "application/json"}

    try:
        url = f"{PAYMONGO_API_URL}/checkout_sessions/{checkout_session_id}"
        response = requests.get(url, headers=headers, auth=auth_tuple)
        
        if not response.ok:
            return None
            
        return response.json()
    except RequestException:
        return None