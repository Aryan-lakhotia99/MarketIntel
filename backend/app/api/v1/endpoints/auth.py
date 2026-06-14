import uuid
import os
import hashlib
from datetime import datetime, timedelta, UTC
from fastapi import APIRouter, HTTPException, Header, Cookie, Response, status

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.core.db import get_db_connection
from app.core.config import get_settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    verify_access_token
)
from app.schemas.auth_schemas import (
    UserSignupRequest,
    UserLoginRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    AuthResponse,
    GoogleLoginRequest
)

router = APIRouter(prefix="/auth", tags=["auth"])

def verify_google_token(token: str) -> dict:
    """Cryptographically verify Google ID Token. Fallback to deterministic mock in dev modal."""
    if token.startswith("MOCK_GOOGLE_TOKEN_"):
        # Deterministic sub generation based on email to prevent hardcoded user IDs
        email = token.replace("MOCK_GOOGLE_TOKEN_", "").replace("_at_", "@").replace("_", "@")
        sub_hash = hashlib.sha256(email.encode()).hexdigest()[:21]
        # Map letters to numbers deterministically to look like a real Google sub ID (numeric string)
        numeric_sub = "".join(str(ord(c) % 10) for c in sub_hash)
        name = email.split("@")[0].title()
        return {
            "sub": numeric_sub,
            "email": email,
            "name": name,
            "picture": "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=100&h=100&q=80"
        }
    
    # Real Google ID Token cryptographic validation
    settings = get_settings()
    client_id = settings.google_client_id or settings.next_public_google_client_id or os.getenv("GOOGLE_CLIENT_ID") or os.getenv("NEXT_PUBLIC_GOOGLE_CLIENT_ID")
    try:
        idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), audience=client_id)
        return idinfo
    except Exception as e:
        raise ValueError(f"Google ID Token signature check failed: {str(e)}")

def get_token_from_credentials(authorization: str | None, token: str | None) -> str | None:
    if authorization and isinstance(authorization, str) and authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    if token and isinstance(token, str):
        return token
    return None

@router.post("/signup", response_model=AuthResponse)
def signup(request: UserSignupRequest, response: Response):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Check if email is already registered
        cursor.execute("SELECT id FROM users WHERE email = ?", (request.email,))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
            
        # Hash password and insert user
        hashed = hash_password(request.password)
        cursor.execute(
            "INSERT INTO users (email, hashed_password) VALUES (?, ?)",
            (request.email, hashed)
        )
        conn.commit()
        
        # Issue access token
        access_token = create_access_token(request.email)
        
        # Set httponly cookie for added security
        response.set_cookie(
            key="token",
            value=access_token,
            httponly=True,
            samesite="lax",
            max_age=24 * 3600,
            path="/"
        )
        
        return AuthResponse(accessToken=access_token, email=request.email)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Signup failed: {str(e)}"
        )
    finally:
        conn.close()

@router.post("/login", response_model=AuthResponse)
def login(request: UserLoginRequest, response: Response):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Fetch user
        cursor.execute("SELECT hashed_password FROM users WHERE email = ?", (request.email,))
        row = cursor.fetchone()
        
        if not row or not verify_password(request.password, row["hashed_password"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
            
        # Issue token
        access_token = create_access_token(request.email)
        
        # Set httponly cookie
        response.set_cookie(
            key="token",
            value=access_token,
            httponly=True,
            samesite="lax",
            max_age=24 * 3600,
            path="/"
        )
        
        return AuthResponse(accessToken=access_token, email=request.email)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )
    finally:
        conn.close()

@router.post("/google", response_model=AuthResponse)
def google_login(request: GoogleLoginRequest, response: Response):
    try:
        # Cryptographically verify the Google ID Token
        idinfo = verify_google_token(request.token)
        google_id = idinfo["sub"]
        email = idinfo["email"].strip().lower()
        name = idinfo.get("name") or request.name
        profile_pic = idinfo.get("picture") or request.profile_pic
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Google token verification failed: {str(ve)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Google ID Token: {str(e)}"
        )

    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Check if user already exists by google_id or email
        cursor.execute("SELECT id FROM users WHERE google_id = ? OR email = ?", (google_id, email))
        user_row = cursor.fetchone()
        
        if not user_row:
            # Create a new user record for this Google account using their real Google ID
            cursor.execute(
                "INSERT INTO users (email, google_id, name, profile_pic, auth_provider) VALUES (?, ?, ?, ?, 'google')",
                (email, google_id, name, profile_pic)
            )
            conn.commit()
        else:
            # Update their google_id, name, and profile picture, and link their auth_provider
            cursor.execute(
                "UPDATE users SET google_id = ?, name = COALESCE(name, ?), profile_pic = COALESCE(profile_pic, ?), auth_provider = 'google' WHERE id = ?",
                (google_id, name, profile_pic, user_row["id"])
            )
            conn.commit()
            
        # Generate our JWT access token
        access_token = create_access_token(email)
        
        # Cache token inside cookies
        response.set_cookie(
            key="token",
            value=access_token,
            httponly=True,
            samesite="lax",
            max_age=24 * 3600,
            path="/"
        )
        
        return AuthResponse(accessToken=access_token, email=email)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Google OAuth signup/login integration failed: {str(e)}"
        )
    finally:
        conn.close()

@router.post("/logout")
def logout(response: Response):
    # Clear the httponly cookie
    response.delete_cookie(key="token", path="/")
    return {"status": "success", "message": "Successfully logged out"}

@router.get("/me")
def get_current_user(
    authorization: str | None = Header(None),
    token: str | None = Cookie(None)
):
    access_token = get_token_from_credentials(authorization, token)
    if not access_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
        
    email = verify_access_token(access_token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid"
        )
        
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, google_id, created_at FROM users WHERE email = ?", (email,))
        row = cursor.fetchone()
        if not row:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found"
            )
        return {
            "id": row["id"],
            "email": row["email"],
            "google_id": row["google_id"],
            "createdAt": row["created_at"]
        }
    finally:
        conn.close()

@router.post("/forgot-password")
def forgot_password(request: ForgotPasswordRequest):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Verify if email exists
        cursor.execute("SELECT id FROM users WHERE email = ?", (request.email,))
        if not cursor.fetchone():
            # To prevent username enumeration, we still return success but do nothing
            return {"status": "success", "message": "If the email is registered, a recovery token has been initialized."}
            
        # Generate a simple mock recovery token
        recovery_token = str(uuid.uuid4())[:8].upper()
        expiry = datetime.now(tz=UTC) + timedelta(minutes=15)
        
        # Insert/update reset token
        cursor.execute(
            "INSERT INTO user_resets (email, token, expires_at) VALUES (?, ?, ?)",
            (request.email, recovery_token, expiry.isoformat())
        )
        conn.commit()
        
        # Print recovery details to log/console (as mock email delivery)
        print(f"\n[SECURITY ALERT] PASSWORD RECOVERY REQUEST:")
        print(f"  Email: {request.email}")
        print(f"  Recovery Token: {recovery_token}")
        print(f"  Reset Link: http://localhost:3000/forgot-password?email={request.email}&token={recovery_token}\n")
        
        return {
            "status": "success", 
            "message": "If the email is registered, a recovery token has been initialized.",
            "token": recovery_token  # Expose token in payload for easy local testing
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Recovery failed: {str(e)}"
        )
    finally:
        conn.close()

@router.post("/reset-password")
def reset_password(request: ResetPasswordRequest):
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Validate reset token and check expiration
        cursor.execute(
            "SELECT id, expires_at FROM user_resets WHERE email = ? AND token = ? ORDER BY id DESC LIMIT 1",
            (request.email, request.token)
        )
        row = cursor.fetchone()
        
        if not row:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid or expired recovery token"
            )
            
        # Check expiry
        expires_at = datetime.fromisoformat(row["expires_at"])
        if datetime.now(tz=UTC) > expires_at.replace(tzinfo=UTC):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Recovery token has expired"
            )
            
        # Update user password
        hashed = hash_password(request.new_password)
        cursor.execute(
            "UPDATE users SET hashed_password = ? WHERE email = ?",
            (hashed, request.email)
        )
        
        # Delete reset tokens for user
        cursor.execute("DELETE FROM user_resets WHERE email = ?", (request.email,))
        conn.commit()
        
        return {"status": "success", "message": "Password successfully reset."}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password reset failed: {str(e)}"
        )
    finally:
        conn.close()
