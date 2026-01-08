import hmac
import hashlib
import json

SECRET_KEY = b"ROTATED_AT_RUNTIME"  # Inject via ENV in prod

def sign_handoff(payload: dict) -> str:
    msg = json.dumps(payload, sort_keys=True).encode()
    return hmac.new(SECRET_KEY, msg, hashlib.sha256).hexdigest()

def verify_handoff(payload: dict, signature: str) -> bool:
    return hmac.compare_digest(sign_handoff(payload), signature)
