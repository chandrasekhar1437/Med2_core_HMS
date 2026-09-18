from enum import Enum
from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class UserRole(str, Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"
    RECEPTIONIST = "receptionist"
    ADMIN = "admin"

class UserRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str = Field(min_length=6)
    role: UserRole = UserRole.PATIENT
    contact_number: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    full_name: str
    email: EmailStr
    role: UserRole
    contact_number: Optional[str] = None