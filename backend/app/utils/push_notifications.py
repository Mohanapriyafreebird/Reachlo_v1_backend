"""
push_notifications.py
Utility for sending Expo Push Notifications to REACHLO users.

Expo's push service works for both iOS and Android.
The client registers a token by calling POST /api/auth/push-token.
This utility sends to Expo's push API — no extra infrastructure needed.

PERFORMANCE NOTE:
  send_push_notification() is dispatched on a background daemon thread
  so it NEVER blocks the API response. Push delivery latency (~1-3s) is
  completely hidden from the user's send-message round-trip.
"""

import logging
import threading
import httpx
from typing import Optional

EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send"

logger = logging.getLogger(__name__)


def _do_send(expo_push_token: str, payload: dict) -> None:
    """Internal: runs in a daemon thread. Does NOT raise."""
    try:
        with httpx.Client(timeout=8.0) as client:
            response = client.post(
                EXPO_PUSH_URL,
                json=payload,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
            )
            if response.status_code == 200:
                result = response.json()
                errors = [r for r in result.get("data", []) if r.get("status") == "error"]
                if errors:
                    logger.warning("Expo push error(s): %s", errors)
            else:
                logger.warning("Expo push HTTP %s: %s", response.status_code, response.text[:200])
    except Exception as exc:
        logger.error("Failed to send push notification: %s", exc)


def send_push_notification(
    expo_push_token: Optional[str],
    title: str,
    body: str,
    data: Optional[dict] = None,
) -> None:
    """
    Fire-and-forget push notification via Expo's push API.
    Dispatches on a daemon thread so the caller is NOT blocked.
    Does NOT raise — a failed push should never crash a chat/lead flow.
    """
    if not expo_push_token:
        return
    if not expo_push_token.startswith("ExponentPushToken["):
        logger.warning("Invalid Expo push token format: %s", expo_push_token[:30])
        return

    payload = {
        "to": expo_push_token,
        "title": title,
        "body": body,
        "sound": "default",
        "channelId": "default",
        "data": data or {},
        "priority": "high",
    }

    # Run in background so we never block the HTTP response
    t = threading.Thread(target=_do_send, args=(expo_push_token, payload), daemon=True)
    t.start()


def send_new_lead_notification(seller_token: Optional[str], campaign_title: str, buyer_name: str) -> None:
    """Notify the seller about a new lead (buyer claimed a deal)."""
    send_push_notification(
        expo_push_token=seller_token,
        title="🎯 New Lead on Reachlo!",
        body=f"{buyer_name} is interested in \"{campaign_title}\". Open chat to respond.",
        data={"type": "NEW_LEAD", "screen": "SellerMessages"},
    )


def send_new_message_to_seller(seller_token: Optional[str], buyer_name: str, campaign_title: str, message_preview: str) -> None:
    """Notify the seller about a new message from a buyer."""
    preview = message_preview[:60] + "..." if len(message_preview) > 60 else message_preview
    send_push_notification(
        expo_push_token=seller_token,
        title=f"💬 New message from {buyer_name}",
        body=f"Re: {campaign_title} — {preview}",
        data={"type": "NEW_MESSAGE", "screen": "SellerMessages"},
    )


def send_new_message_to_buyer(buyer_token: Optional[str], seller_name: str, campaign_title: str, message_preview: str) -> None:
    """Notify the buyer about a new reply from the seller."""
    preview = message_preview[:60] + "..." if len(message_preview) > 60 else message_preview
    send_push_notification(
        expo_push_token=buyer_token,
        title=f"💬 {seller_name} replied",
        body=f"Re: {campaign_title} — {preview}",
        data={"type": "NEW_MESSAGE", "screen": "BuyerInbox"},
    )
