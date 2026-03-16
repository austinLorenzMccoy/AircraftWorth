from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
from dotenv import load_dotenv
import resend
from datetime import datetime, timedelta
import jwt
import hashlib
import secrets

# Load environment variables
load_dotenv()

# Import Supabase service
from services.supabase_service import SupabaseService

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
async def send_magic_link(request: MagicLinkRequest, supabase: SupabaseService = Depends()):
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
        # Check if user exists, create if not
        existing_user = supabase.client.table('users').select('*').eq('email', request.email).execute()
        
        if not existing_user.data:
            # Create new user
            user_data = {
                'email': request.email,
                'wallet_address': request.wallet_address,
                'preferences': {},
                'login_count': 0
            }
            supabase.client.table('users').insert(user_data).execute()
        else:
            # Update existing user with wallet address if provided
            if request.wallet_address:
                supabase.client.table('users').update({
                    'wallet_address': request.wallet_address,
                    'updated_at': datetime.utcnow().isoformat()
                }).eq('email', request.email).execute()
        
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
        
        # Log authentication attempt
        auth_log = {
            'email': request.email,
            'auth_method': 'magic_link',
            'success': True,
            'ip_address': '127.0.0.1',  # TODO: Get real IP
            'user_agent': 'AircraftWorth Frontend'
        }
        supabase.client.table('auth_logs').insert(auth_log).execute()
        
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
        # Log failed authentication attempt
        auth_log = {
            'email': request.email,
            'auth_method': 'magic_link',
            'success': False,
            'ip_address': '127.0.0.1',  # TODO: Get real IP
            'user_agent': 'AircraftWorth Frontend',
            'error_message': str(e)
        }
        supabase.client.table('auth_logs').insert(auth_log).execute()
        
        print(f"ERROR: {str(e)}")
        print(f"ERROR TYPE: {type(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send email. Check RESEND_API_KEY. Error: {str(e)}"
        )

@router.post("/verify-magic-link")
async def verify_magic_link(token: str, supabase: SupabaseService = Depends()):
    """Verify magic link token and return user info"""
    
    try:
        # Decode token
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        email = payload.get("email")
        wallet_address = payload.get("wallet_address")
        
        # Get user from database
        user_result = supabase.client.table('users').select('*').eq('email', email).execute()
        
        if not user_result.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User not found"
            )
        
        user = user_result.data[0]
        
        # Create session token
        session_token = secrets.token_urlsafe(32)
        session_hash = hashlib.sha256(session_token.encode()).hexdigest()
        
        # Store session
        session_data = {
            'user_id': user['id'],
            'token_hash': session_hash,
            'expires_at': (datetime.utcnow() + timedelta(days=7)).isoformat(),
            'ip_address': '127.0.0.1',  # TODO: Get real IP
            'user_agent': 'AircraftWorth Frontend'
        }
        supabase.client.table('user_sessions').insert(session_data).execute()
        
        # Update user login count and last login
        supabase.client.table('users').update({
            'last_login': datetime.utcnow().isoformat(),
            'login_count': user['login_count'] + 1
        }).eq('email', email).execute()
        
        # Log successful authentication
        auth_log = {
            'user_id': user['id'],
            'email': email,
            'auth_method': 'magic_link',
            'success': True,
            'ip_address': '127.0.0.1',  # TODO: Get real IP
            'user_agent': 'AircraftWorth Frontend'
        }
        supabase.client.table('auth_logs').insert(auth_log).execute()
        
        return {
            "email": email,
            "wallet_address": wallet_address,
            "session_token": session_token,
            "user_id": user['id'],
            "preferences": user.get('preferences', {}),
            "login_count": user['login_count'] + 1,
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

@router.get("/profile")
async def get_user_profile(supabase: SupabaseService = Depends()):
    """Get current user profile"""
    # TODO: Implement JWT session validation from frontend
    return {"message": "Session validation required"}

@router.post("/analytics")
async def track_user_analytics(
    event_data: dict,
    supabase: SupabaseService = Depends()
):
    """Track user analytics events"""
    # TODO: Implement JWT session validation from frontend
    return {"message": "Session validation required"}
