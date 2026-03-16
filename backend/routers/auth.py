from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
from dotenv import load_dotenv
import resend
from datetime import datetime, timedelta
import jwt

# Load environment variables
load_dotenv()

router = APIRouter()

# JWT Secret for magic link tokens
JWT_SECRET = os.getenv("JWT_SECRET", "aircraftworth_magic_link_secret")
JWT_ALGORITHM = "HS256"

# Resend configuration
RESEND_API_KEY = os.getenv("RESEND_API_KEY")
RESEND_FROM_EMAIL = os.getenv("RESEND_FROM_EMAIL", "noreply@aircraftworth.io")
FRONTEND_URL = os.getenv("NEXT_PUBLIC_APP_URL", "http://localhost:3000")

class MagicLinkRequest(BaseModel):
    email: EmailStr
    wallet_address: Optional[str] = None

class MagicLinkResponse(BaseModel):
    message: str
    success: bool

@router.get("/test-env")
async def test_env():
    """Test environment variables"""
    return {
        "RESEND_API_KEY": os.getenv("RESEND_API_KEY"),
        "RESEND_FROM_EMAIL": os.getenv("RESEND_FROM_EMAIL"),
        "NEXT_PUBLIC_APP_URL": os.getenv("NEXT_PUBLIC_APP_URL")
    }

@router.post("/magic-link", response_model=MagicLinkResponse)
async def send_magic_link(request: MagicLinkRequest):
    """Send magic link for email authentication"""
    
    print(f"DEBUG: RESEND_API_KEY = {os.getenv('RESEND_API_KEY')}")
    print(f"DEBUG: RESEND_FROM_EMAIL = {os.getenv('RESEND_FROM_EMAIL')}")
    print(f"DEBUG: FRONTEND_URL = {os.getenv('NEXT_PUBLIC_APP_URL')}")
    
    if not RESEND_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="RESEND_API_KEY not configured"
        )
    
    try:
        # Configure Resend
        resend.api_key = RESEND_API_KEY
        
        # Create magic link token (valid for 15 minutes)
        token_payload = {
            "email": request.email,
            "wallet_address": request.wallet_address,
            "exp": datetime.utcnow() + timedelta(minutes=15),
            "iat": datetime.utcnow()
        }
        
        token = jwt.encode(token_payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
        
        # Create magic link URL
        magic_link_url = f"{FRONTEND_URL}/auth/magic-link?token={token}"
        
        # Send email
        email_params = {
            "from": RESEND_FROM_EMAIL,
            "to": [request.email],
            "subject": "Sign in to AircraftWorth",
            "html": f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Welcome to AircraftWorth</h2>
                    <p>Click the link below to sign in to your account:</p>
                    <a href="{magic_link_url}" style="
                        background-color: #007bff;
                        color: white;
                        padding: 12px 24px;
                        text-decoration: none;
                        border-radius: 4px;
                        display: inline-block;
                        margin: 20px 0;
                    ">Sign In to AircraftWorth</a>
                    <p style="color: #666; font-size: 14px;">
                        This link will expire in 15 minutes. If you didn't request this email, you can safely ignore it.
                    </p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #999; font-size: 12px;">
                        AircraftWorth - Decentralized Aviation Tracking & Data Marketplace
                    </p>
                </div>
            """
        }
        
        result = resend.Emails.send(email_params)
        
        if result.get("id"):
            return MagicLinkResponse(
                message="Magic link sent successfully",
                success=True
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to send email"
            )
            
    except Exception as e:
        print(f"ERROR: {str(e)}")
        print(f"ERROR TYPE: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email. Check RESEND_API_KEY. Error: {str(e)}"
        )

@router.post("/verify-magic-link")
async def verify_magic_link(token: str):
    """Verify magic link token and return user info"""
    
    try:
        # Decode token
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        return {
            "email": payload.get("email"),
            "wallet_address": payload.get("wallet_address"),
            "valid": True
        }
        
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Magic link has expired"
        )
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid magic link"
        )
