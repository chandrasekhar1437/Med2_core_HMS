import random
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from jose import jwt

from app.database import get_db
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# --- Schemas ---

class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    contact_number: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str
    new_password: str


# --- Email Helper ---

def send_otp_email(to_email: str, otp: str) -> bool:
    """Dispatches a 6-digit verification code using Gmail SMTP."""
    subject = "MedCore HMS - Password Reset Verification Code"
    body = f"""Hello,

Your 6-digit verification code to reset your MedCore HMS password is:

    {otp}

This code is valid for 10 minutes. If you did not initiate this request, please ignore this email.

Best regards,
MedCore Clinical Support Team
"""

    try:
        msg = MIMEMultipart()
        msg["From"] = settings.MAIL_FROM
        msg["To"] = to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        server = smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT)
        server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"[SMTP SUCCESS] OTP email successfully sent to {to_email}")
        return True
    except Exception as e:
        print(f"[SMTP ERROR]: Failed to send email: {e}")
        print(f"[FALLBACK LOCAL OTP FOR {to_email}]: {otp}")
        return False


# --- Endpoints ---

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_patient(payload: UserRegister, db=Depends(get_db)):
    email_clean = payload.email.lower().strip()
    existing = await db["users"].find_one({"email": email_clean})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists."
        )

    user_doc = {
        "full_name": payload.full_name,
        "email": email_clean,
        "password": pwd_context.hash(payload.password),
        "role": "patient",
        "contact_number": payload.contact_number,
        "created_at": datetime.now(timezone.utc)
    }

    res = await db["users"].insert_one(user_doc)
    return {"message": "Account created successfully. Please sign in.", "id": str(res.inserted_id)}


@router.post("/login")
async def login(payload: UserLogin, db=Depends(get_db)):
    email_clean = payload.email.lower().strip()
    user = await db["users"].find_one({"email": email_clean})
    if not user or not pwd_context.verify(payload.password, user.get("password", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email address or password"
        )

    uid = str(user["_id"])
    role = user.get("role", "patient")

    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    token_payload = {
        "sub": uid,
        "id": uid,
        "email": email_clean,
        "role": role,
        "exp": expire
    }
    access_token = jwt.encode(token_payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": role,
        "user": {
            "id": uid,
            "full_name": user.get("full_name", ""),
            "email": email_clean,
            "role": role
        }
    }


@router.post("/forgot-password/send-otp")
async def request_otp(payload: ForgotPasswordRequest, db=Depends(get_db)):
    email_clean = payload.email.lower().strip()
    user = await db["users"].find_one({"email": email_clean})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account associated with this email address."
        )

    otp = str(random.randint(100000, 999999))
    expire_at = datetime.now(timezone.utc) + timedelta(minutes=10)

    await db["password_resets"].update_one(
        {"email": email_clean},
        {"$set": {"otp": otp, "expires_at": expire_at}},
        upsert=True
    )

    send_otp_email(email_clean, otp)

    return {"message": "A 6-digit verification code has been sent to your email."}


@router.post("/forgot-password/reset")
async def reset_password(payload: ResetPasswordRequest, db=Depends(get_db)):
    email_clean = payload.email.lower().strip()
    record = await db["password_resets"].find_one({"email": email_clean})

    if not record or record.get("otp") != payload.otp.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code."
        )

    expires_at = record.get("expires_at")
    if expires_at and expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired. Please request a new one."
        )

    hashed = pwd_context.hash(payload.new_password)
    await db["users"].update_one(
        {"email": email_clean},
        {"$set": {"password": hashed}}
    )

    await db["password_resets"].delete_one({"email": email_clean})

    return {"message": "Password has been successfully updated. You may now sign in."}