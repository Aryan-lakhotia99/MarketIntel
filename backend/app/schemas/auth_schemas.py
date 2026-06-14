import re
from pydantic import BaseModel, Field, field_validator

# Regex for email validation
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

class UserSignupRequest(BaseModel):
    email: str = Field(..., description="User email address")
    password: str = Field(..., description="User password")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not EMAIL_REGEX.match(cleaned):
            raise ValueError("Invalid email format")
        return cleaned

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must contain at least 8 characters")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        if not any(c in "!@#$%^&*()_+=-[]{}|;:',.<>?/" for c in v):
            raise ValueError("Password must contain at least one special character")
        return v

class UserLoginRequest(BaseModel):
    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return v.strip().lower()

class ForgotPasswordRequest(BaseModel):
    email: str

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        cleaned = v.strip().lower()
        if not EMAIL_REGEX.match(cleaned):
            raise ValueError("Invalid email format")
        return cleaned

class ResetPasswordRequest(BaseModel):
    email: str
    token: str
    new_password: str = Field(..., alias="newPassword")

    @field_validator("email")
    @classmethod
    def validate_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must contain at least 8 characters")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        if not any(c in "!@#$%^&*()_+=-[]{}|;:',.<>?/" for c in v):
            raise ValueError("Password must contain at least one special character")
        return v

    class Config:
        populate_by_name = True

class AuthResponse(BaseModel):
    access_token: str = Field(..., alias="accessToken")
    token_type: str = Field("bearer", alias="tokenType")
    email: str

    class Config:
        populate_by_name = True

class GoogleLoginRequest(BaseModel):
    token: str = Field(..., description="Google ID credential token")
    email: str = Field(..., description="User email address")
    name: str | None = Field(None, description="User full name")
    profile_pic: str | None = Field(None, alias="profilePic", description="User profile picture URL")

    class Config:
        populate_by_name = True
