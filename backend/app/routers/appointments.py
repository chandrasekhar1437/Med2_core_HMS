from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from bson.errors import InvalidId
from pydantic import BaseModel
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any
from app.database import get_db
from app.utils.rbac import get_current_user

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])


# --- Schemas ---

class AppointmentCreate(BaseModel):
    doctor_id: str
    appointment_date: Any  # Accepts ISO string or datetime
    department: str
    reason: str


class AppointmentUpdate(BaseModel):
    status: Optional[str] = None  # scheduled, completed, cancelled
    appointment_date: Optional[Any] = None
    cancellation_reason: Optional[str] = None


# --- Helper ---

def serialize_appointment(doc: dict) -> dict:
    """Bulletproof serializer for MongoDB appointment records."""
    if not doc:
        return {}

    data = dict(doc)

    # Safe ID resolution
    if "_id" in data:
        data["id"] = str(data.pop("_id"))
    elif "id" in data:
        data["id"] = str(data["id"])
    else:
        data["id"] = "N/A"

    data["patient_id"] = str(data.get("patient_id") or "N/A")
    data["doctor_id"] = str(data.get("doctor_id") or "N/A")
    data["department"] = data.get("department") or "General"
    data["reason"] = data.get("reason") or "Consultation"
    data["status"] = data.get("status") or "scheduled"
    data["cancellation_reason"] = data.get("cancellation_reason")

    # Normalize appointment_date to ISO string
    raw_date = data.get("appointment_date")
    if isinstance(raw_date, datetime):
        data["appointment_date"] = raw_date.isoformat()
    elif isinstance(raw_date, str):
        data["appointment_date"] = raw_date
    else:
        data["appointment_date"] = datetime.now(timezone.utc).isoformat()

    # Normalize created_at to ISO string
    raw_created = data.get("created_at")
    if isinstance(raw_created, datetime):
        data["created_at"] = raw_created.isoformat()
    elif isinstance(raw_created, str):
        data["created_at"] = raw_created
    else:
        data["created_at"] = datetime.now(timezone.utc).isoformat()

    return data


async def check_booking_conflict(db, doctor_id: str, target_time: Any, exclude_id: Optional[str] = None):
    """Prevents overlapping appointments for the same doctor across both BSON Date and ISO string formats."""
    if not doctor_id or doctor_id == "N/A":
        return

    # Parse target_time safely into a UTC datetime
    if isinstance(target_time, str):
        try:
            target_dt = datetime.fromisoformat(target_time.replace("Z", "+00:00"))
        except Exception:
            return
    elif isinstance(target_time, datetime):
        target_dt = target_time
    else:
        return

    if target_dt.tzinfo is not None:
        target_dt = target_dt.astimezone(timezone.utc).replace(tzinfo=None)

    buffer_start = target_dt - timedelta(minutes=29)
    buffer_end = target_dt + timedelta(minutes=29)

    time_conditions = [
        {"appointment_date": {"$gte": buffer_start, "$lte": buffer_end}},
        {"appointment_date": {"$gte": buffer_start.isoformat(), "$lte": buffer_end.isoformat()}}
    ]

    query = {
        "doctor_id": doctor_id,
        "status": "scheduled",
        "$or": time_conditions
    }

    if exclude_id:
        try:
            query["_id"] = {"$ne": ObjectId(exclude_id)}
        except InvalidId:
            pass

    existing = await db["appointments"].find_one(query)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Doctor already has a scheduled consultation around this time. Please select a different slot."
        )


# --- Endpoints ---

@router.post("/", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    payload: AppointmentCreate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    try:
        doc_oid = ObjectId(payload.doctor_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid doctor ID format")

    doctor = await db["users"].find_one({"_id": doc_oid, "role": "doctor"})
    if not doctor:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found")
    if doctor.get("is_available") is False:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Doctor is currently off-duty")

    await check_booking_conflict(db, payload.doctor_id, payload.appointment_date)

    raw_date = payload.appointment_date
    if isinstance(raw_date, str):
        try:
            parsed_date = datetime.fromisoformat(raw_date.replace("Z", "+00:00")).astimezone(timezone.utc).replace(tzinfo=None)
        except Exception:
            parsed_date = datetime.now(timezone.utc).replace(tzinfo=None)
    elif isinstance(raw_date, datetime):
        parsed_date = raw_date.astimezone(timezone.utc).replace(tzinfo=None) if raw_date.tzinfo else raw_date
    else:
        parsed_date = datetime.now(timezone.utc).replace(tzinfo=None)

    doc_data = payload.model_dump()
    doc_data["appointment_date"] = parsed_date
    doc_data["patient_id"] = str(current_user["_id"])
    doc_data["status"] = "scheduled"
    doc_data["created_at"] = datetime.now(timezone.utc)

    res = await db["appointments"].insert_one(doc_data)
    doc_data["_id"] = res.inserted_id

    return serialize_appointment(doc_data)


@router.get("/", response_model=List[dict])
async def list_appointments(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    role = current_user.get("role", "patient").lower()
    uid = str(current_user["_id"])

    if role == "doctor":
        query = {"doctor_id": uid}
    elif role == "admin":
        query = {}
    else:
        query = {"patient_id": uid}

    cursor = db["appointments"].find(query).sort("appointment_date", 1)
    results = []
    async for item in cursor:
        results.append(serialize_appointment(item))
    return results


@router.patch("/{appointment_id}", response_model=dict)
async def update_appointment(
    appointment_id: str,
    payload: AppointmentUpdate,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    try:
        oid = ObjectId(appointment_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid appointment ID format")

    apt = await db["appointments"].find_one({"_id": oid})
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    user_role = current_user.get("role", "patient").lower()
    update_fields = {}

    if payload.appointment_date:
        await check_booking_conflict(db, apt.get("doctor_id", "N/A"), payload.appointment_date, exclude_id=appointment_id)
        
        raw_date = payload.appointment_date
        if isinstance(raw_date, str):
            try:
                parsed_date = datetime.fromisoformat(raw_date.replace("Z", "+00:00")).astimezone(timezone.utc).replace(tzinfo=None)
            except Exception:
                parsed_date = datetime.now(timezone.utc).replace(tzinfo=None)
        elif isinstance(raw_date, datetime):
            parsed_date = raw_date.astimezone(timezone.utc).replace(tzinfo=None) if raw_date.tzinfo else raw_date
        else:
            parsed_date = datetime.now(timezone.utc).replace(tzinfo=None)
            
        update_fields["appointment_date"] = parsed_date

    if payload.status:
        valid_statuses = ["scheduled", "completed", "cancelled"]
        new_status = payload.status.lower()
        if new_status not in valid_statuses:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status value")
        
        # Patients cannot mark consultations as completed
        if user_role == "patient" and new_status == "completed":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only doctors or administrators can mark an appointment as completed."
            )
        update_fields["status"] = new_status

    if payload.cancellation_reason:
        update_fields["cancellation_reason"] = payload.cancellation_reason

    if update_fields:
        await db["appointments"].update_one({"_id": oid}, {"$set": update_fields})

    updated = await db["appointments"].find_one({"_id": oid})
    return serialize_appointment(updated)


@router.delete("/{appointment_id}", status_code=status.HTTP_200_OK)
async def delete_appointment(
    appointment_id: str,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    try:
        oid = ObjectId(appointment_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid appointment ID format")

    apt = await db["appointments"].find_one({"_id": oid})
    if not apt:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    user_role = current_user.get("role", "patient").lower()
    user_id = str(current_user["_id"])

    if user_role != "admin":
        if str(apt.get("patient_id")) != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this appointment."
            )
        if apt.get("status") != "scheduled":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You can only delete appointments while they are in 'scheduled' status."
            )

    res = await db["appointments"].delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found")

    return {"message": "Appointment deleted successfully", "id": appointment_id}