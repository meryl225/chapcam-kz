"""
Validation du token GPU emis par l'app Next.js.

Format (cf. lib/live-access.ts -> signGpuToken) :
    "<userId>.<exp>.<hmac>"
ou hmac = HMAC_SHA256(LIVE_GPU_SHARED_SECRET, "<userId>.<exp>")  (hex)
et  exp = timestamp unix (secondes) d'expiration.
"""

from __future__ import annotations

import hashlib
import hmac
import os
import time
from dataclasses import dataclass
from typing import Optional


@dataclass
class TokenInfo:
    user_id: str
    exp: int


def verify_token(token: str, secret: Optional[str] = None) -> Optional[TokenInfo]:
    secret = secret or os.getenv("LIVE_GPU_SHARED_SECRET")
    if not secret or not token:
        return None

    parts = token.split(".")
    if len(parts) != 3:
        return None

    user_id, exp_str, sig = parts
    try:
        exp = int(exp_str)
    except ValueError:
        return None

    # Expire ?
    if exp < int(time.time()):
        return None

    payload = f"{user_id}.{exp}".encode("utf-8")
    expected = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).hexdigest()

    # Comparaison a temps constant
    if not hmac.compare_digest(expected, sig):
        return None

    return TokenInfo(user_id=user_id, exp=exp)
