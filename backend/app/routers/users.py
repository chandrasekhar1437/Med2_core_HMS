from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from bson.errors import InvalidId
from datetime import datetime, timezone
from pydantic import BaseModel, EmailStr
from passlib.context import CryptContext
from typing import List, Optional
from app.database import get_db
from app.utils.rbac import get_current_user, require_role

router = APIRouter(prefix="/api/users", tags=["Users"])
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# --- Request Schemas ---

class StaffCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    role: str  # 'doctor' or 'admin'
    contact_number: str
    department: Optional[str] = "General Medicine"


# --- Helper ---

def serialize_user(doc: dict) -> dict:
    """Sanitize and format user document for responses."""
    doc["id"] = str(doc.pop("_id"))
    doc.pop("password", None)
    return doc


# --- Endpoints ---

@router.get("/doctors/list")
async def list_doctors(db=Depends(get_db)):
    """
    Public/Patient endpoint: List doctors who are on-duty and available for booking.
    """
    cursor = db["users"].find({
        "role": "doctor", 
        "is_available": {"$ne": False}
    })
    doctors = []
    async for doc in cursor:
        doctors.append({
            "id": str(doc["_id"]),
            "full_name": doc.get("full_name", "Doctor"),
            "email": doc["email"],
            "department": doc.get("department", "General Medicine"),
            "is_available": doc.get("is_available", True)
        })
    return doctors


@router.get("/", response_model=List[dict])
async def list_all_users(
    current_user: dict = Depends(require_role(["admin"])), 
    db=Depends(get_db)
):
    """
    Admin-only endpoint: Retrieve the full hospital user directory.
    """
    users = []
    cursor = db["users"].find().sort("created_at", -1)
    async for doc in cursor:
        users.append(serialize_user(doc))
    return users


@router.post("/staff", status_code=status.HTTP_201_CREATED)
async def create_staff(
    payload: StaffCreate, 
    current_user: dict = Depends(require_role(["admin"])), 
    db=Depends(get_db)
):
    """
    Admin-only endpoint: Onboard a new Doctor or Administrator.
    """
    normalized_email = payload.email.lower()
    existing = await db["users"].find_one({"email": normalized_email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="A user with this email address already exists"
        )

    user_doc = {
        "full_name": payload.full_name,
        "email": normalized_email,
        "password": pwd_context.hash(payload.password),
        "role": payload.role.lower(),
        "contact_number": payload.contact_number,
        "department": payload.department if payload.role.lower() == "doctor" else None,
        "is_available": True if payload.role.lower() == "doctor" else None,
        "created_at": datetime.now(timezone.utc)
    }
    
    res = await db["users"].insert_one(user_doc)
    return {
        "id": str(res.inserted_id), 
        "message": f"{payload.role.capitalize()} registered successfully"
    }


@router.patch("/{user_id}/availability")
async def toggle_availability(
    user_id: str, 
    current_user: dict = Depends(get_current_user), 
    db=Depends(get_db)
):
    """
    Toggle on-duty / off-duty availability.
    - Doctors can toggle their own active status.
    - Admins can toggle the availability of any staff member.
    """
    try:
        oid = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid user ID format"
        )

    role = current_user.get("role", "").lower()
    if role == "doctor" and str(current_user["_id"]) != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="You are not authorized to modify another doctor's availability"
        )

    user = await db["users"].find_one({"_id": oid})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User not found"
        )

    current_availability = user.get("is_available", True)
    new_availability = not current_availability

    await db["users"].update_one(
        {"_id": oid},
        {"$set": {"is_available": new_availability}}
    )

    return {
        "id": user_id, 
        "is_available": new_availability, 
        "message": f"Status updated to {'Available' if new_availability else 'Off-Duty'}"
    }


@router.delete("/{user_id}", status_code=status.HTTP_200_OK)
async def delete_user(
    user_id: str, 
    current_user: dict = Depends(require_role(["admin"])), 
    db=Depends(get_db)
):
    """
    Admin-only endpoint: Remove an account from the system.
    """
    try:
        oid = ObjectId(user_id)
    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Invalid user ID format"
        )

    if str(current_user["_id"]) == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Administrators cannot delete their own active account"
        )

    res = await db["users"].delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="User not found"
        )

    return {"message": "User account removed successfully", "id": user_id}