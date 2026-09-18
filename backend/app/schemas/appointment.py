from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

# Used for POST (Create)
class AppointmentCreate(BaseModel):
    doctor_id: str
    appointment_date: datetime
    reason: str = Field(min_length=3, max_length=255)
    department: str

# Used for PUT (Full Replace / Update)
class AppointmentUpdate(BaseModel):
    doctor_id: str
    appointment_date: datetime
    reason: str = Field(min_length=3, max_length=255)
    department: str
    status: AppointmentStatus

# Used for PATCH (Partial Update)
class AppointmentPatch(BaseModel):
    doctor_id: Optional[str] = None
    appointment_date: Optional[datetime] = None
    reason: Optional[str] = None
    department: Optional[str] = None
    status: Optional[AppointmentStatus] = None

# Used for GET response
class AppointmentResponse(BaseModel):
    id: str
    patient_id: str
    doctor_id: str
    appointment_date: datetime
    reason: str
    department: str
    status: AppointmentStatus
    created_at: datetime