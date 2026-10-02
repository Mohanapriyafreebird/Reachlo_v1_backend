"""
email_utils.py — Async Gmail SMTP email sender using aiosmtplib.
Used for OTP password-reset emails.
"""

import random
import string
import aiosmtplib
from email.message import EmailMessage
from app.config import settings


def generate_otp(length: int = 6) -> str:
    """Generate a numeric OTP of the given length."""
    return "".join(random.choices(string.digits, k=length))


async def send_otp_email(to_email: str, otp: str, user_name: str = "") -> None:
    """
    Send an OTP password-reset email via Gmail SMTP.
    Raises on failure so the caller can catch and return an error.
    """
    smtp_host = settings.SMTP_HOST
    smtp_port = settings.SMTP_PORT
    smtp_user = (settings.SMTP_USER or "").strip()
    smtp_password = (settings.SMTP_PASSWORD or "").strip()

    if not smtp_user or not smtp_password:
        raise RuntimeError("SMTP credentials are not configured.")

    greeting = f"Hi {user_name}," if user_name else "Hi,"

    msg = EmailMessage()
    msg["From"] = f"Reachlo <{smtp_user}>"
    msg["To"] = to_email
    msg["Subject"] = "Your Reachlo Password Reset OTP"
    msg.set_content(
        f"""{greeting}

You requested a password reset for your Reachlo account.

Your One-Time Password (OTP) is:

    {otp}

This OTP is valid for 10 minutes and can only be used once.

If you did not request a password reset, please ignore this email.
Your account remains secure.

— The Reachlo Team
"""
    )

    # HTML version (nicer in most email clients)
    msg.add_alternative(
        f"""
<html>
  <body style="font-family: Arial, sans-serif; background: #f5f8fc; margin:0; padding:0;">
    <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 0;">
      <tr>
        <td align="center">
          <table width="480" cellpadding="0" cellspacing="0"
                 style="background:#ffffff; border-radius:12px;
                        box-shadow:0 2px 12px rgba(0,0,0,0.08); overflow:hidden;">
            <tr>
              <td style="background: linear-gradient(135deg,#2563EB,#4F8CFF);
                          padding: 32px 40px; text-align:center;">
                <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700;">
                  Reachlo
                </h1>
                <p style="margin:6px 0 0; color:rgba(255,255,255,0.85); font-size:14px;">
                  Password Reset
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding: 36px 40px;">
                <p style="margin:0 0 16px; color:#0f172a; font-size:16px;">{greeting}</p>
                <p style="margin:0 0 24px; color:#475569; font-size:15px; line-height:1.6;">
                  You requested a password reset for your Reachlo account.
                  Use the OTP below to proceed. It expires in
                  <strong>10 minutes</strong>.
                </p>
                <div style="background:#EAF2FF; border-radius:10px;
                             padding: 24px; text-align:center; margin-bottom:28px;">
                  <span style="font-size:36px; font-weight:800;
                                letter-spacing:10px; color:#2563EB;">
                    {otp}
                  </span>
                </div>
                <p style="margin:0; color:#94a3b8; font-size:13px; line-height:1.6;">
                  If you did not request this, please ignore this email.
                  Your account is safe.
                </p>
              </td>
            </tr>
            <tr>
              <td style="background:#f8fafc; padding: 20px 40px; text-align:center;
                          border-top: 1px solid #e2e8f0;">
                <p style="margin:0; color:#94a3b8; font-size:12px;">
                  © 2025 Reachlo. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
""",
        subtype="html",
    )

    await aiosmtplib.send(
        msg,
        hostname=smtp_host,
        port=smtp_port,
        username=smtp_user,
        password=smtp_password,
        start_tls=True,
    )
