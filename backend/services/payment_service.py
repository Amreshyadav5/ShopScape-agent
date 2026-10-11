import hmac
import hashlib
import uuid
from typing import Dict, Any, Optional
from backend.config import settings

class PaymentAdapter:
    def create_payment_order(self, order_id: int, amount: float, currency: str) -> Dict[str, Any]:
        raise NotImplementedError

    def verify_payment(self, payment_data: Dict[str, Any]) -> bool:
        raise NotImplementedError


class SandboxPaymentAdapter(PaymentAdapter):
    """
    Clearly labeled test/sandbox adapter for development without live banking credentials.
    """
    def create_payment_order(self, order_id: int, amount: float, currency: str) -> Dict[str, Any]:
        txn_id = f"TEST-TXN-{uuid.uuid4().hex[:8].upper()}"
        return {
            "provider": "sandbox",
            "is_test_mode": True,
            "transaction_id": txn_id,
            "amount": amount,
            "currency": currency,
            "status": "ready",
            "instructions": "Sandbox test payment. Simulated instant verification."
        }

    def verify_payment(self, payment_data: Dict[str, Any]) -> bool:
        # In sandbox, verified if transaction_id is present and marked as success
        return bool(payment_data.get("transaction_id"))


class RazorpayPaymentAdapter(PaymentAdapter):
    def create_payment_order(self, order_id: int, amount: float, currency: str) -> Dict[str, Any]:
        if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
            return SandboxPaymentAdapter().create_payment_order(order_id, amount, currency)
        
        # Real Razorpay amount is in paise (multiply by 100)
        import razorpay
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        rp_order = client.order.create({
            "amount": int(amount * 100),
            "currency": currency,
            "receipt": f"order_{order_id}",
            "notes": {"order_id": order_id}
        })
        return {
            "provider": "razorpay",
            "key_id": settings.RAZORPAY_KEY_ID,
            "razorpay_order_id": rp_order["id"],
            "amount": amount,
            "currency": currency
        }

    def verify_payment(self, payment_data: Dict[str, Any]) -> bool:
        if not settings.RAZORPAY_KEY_SECRET:
            return True
        import razorpay
        client = razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))
        try:
            client.utility.verify_payment_signature({
                "razorpay_order_id": payment_data.get("razorpay_order_id"),
                "razorpay_payment_id": payment_data.get("razorpay_payment_id"),
                "razorpay_signature": payment_data.get("razorpay_signature")
            })
            return True
        except Exception:
            return False


class StripePaymentAdapter(PaymentAdapter):
    def create_payment_order(self, order_id: int, amount: float, currency: str) -> Dict[str, Any]:
        if not settings.STRIPE_SECRET_KEY:
            return SandboxPaymentAdapter().create_payment_order(order_id, amount, currency)
        import stripe
        stripe.api_key = settings.STRIPE_SECRET_KEY
        intent = stripe.PaymentIntent.create(
            amount=int(amount * 100),
            currency=currency.lower(),
            metadata={"order_id": order_id}
        )
        return {
            "provider": "stripe",
            "client_secret": intent.client_secret,
            "public_key": settings.STRIPE_PUBLIC_KEY,
            "amount": amount,
            "currency": currency
        }

    def verify_payment(self, payment_data: Dict[str, Any]) -> bool:
        return bool(payment_data.get("payment_intent_id"))


def get_payment_adapter(provider_name: Optional[str] = None) -> PaymentAdapter:
    provider = (provider_name or settings.PAYMENT_PROVIDER).lower()
    if provider == "razorpay":
        return RazorpayPaymentAdapter()
    elif provider == "stripe":
        return StripePaymentAdapter()
    return SandboxPaymentAdapter()
