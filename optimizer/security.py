import hmac
import hashlib
import json
import os

SECRET_KEY = os.environ.get("HANDOFF_SECRET_KEY", "default-handoff-secret-key").encode()

def sign_handoff(payload: dict) -> str:
    """Sign a handoff payload with HMAC-SHA256."""
    msg = json.dumps(payload, sort_keys=True).encode()
    return hmac.new(SECRET_KEY, msg, hashlib.sha256).hexdigest()

def verify_handoff(payload: dict, signature: str) -> bool:
    """Verify a handoff signature."""
    return hmac.compare_digest(sign_handoff(payload), signature)
