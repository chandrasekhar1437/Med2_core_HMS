from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from bson import ObjectId
from bson.errors import InvalidId
from pydantic import BaseModel, Field
from datetime import datetime, timezone
from typing import List, Optional
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from app.database import get_db
from app.config import settings
from app.utils.rbac import get_current_user, require_role

router = APIRouter(prefix="/api/records", tags=["Medical Records"])


# --- Schemas ---

class RecordCreate(BaseModel):
    patient_id: str
    diagnosis: str
    symptoms: List[str] = Field(default_factory=list)
    prescription: str
    notes: Optional[str] = None


class RecordResponse(BaseModel):
    id: str
    patient_id: str
    doctor_id: Optional[str] = "N/A"
    diagnosis: str
    symptoms: List[str] = Field(default_factory=list)
    prescription: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None


# --- Helpers ---

def serialize_record(doc: dict) -> dict:
    """Format MongoDB document safely for RecordResponse."""
    doc["id"] = str(doc.pop("_id"))
    doc["doctor_id"] = doc.get("doctor_id") or "N/A"
    doc["symptoms"] = doc.get("symptoms") or []
    doc["notes"] = doc.get("notes") or ""
    if not doc.get("created_at"):
        doc["created_at"] = datetime.now(timezone.utc)
    return doc


def dispatch_prescription_email(
    patient_email: str,
    patient_name: str,
    doctor_name: str,
    diagnosis: str,
    symptoms: List[str],
    prescription: str,
    notes: Optional[str] = None
) -> bool:
    """Dispatches a formatted digital prescription slip to the patient's inbox."""
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        return False

    symptoms_text = ", ".join(symptoms) if symptoms else "None noted"
    notes_section = f"<p style='margin: 8px 0;'><b>Physician Advice / Notes:</b> {notes}</p>" if notes else ""

    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; padding: 24px;">
        <div style="border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 16px;">
            <h2 style="color: #2563eb; margin: 0;">MedCore Health — Digital Prescription</h2>
            <span style="font-size: 12px; color: #64748b;">Clinical Care & Patient Management</span>
        </div>
        
        <p>Dear <b>{patient_name}</b>,</p>
        <p>A medical prescription has been issued for your consultation by <b>{doctor_name}</b>.</p>

        <div style="background-color: #f8fafc; border-left: 4px solid #2563eb; padding: 12px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0;"><b>Clinical Diagnosis:</b> {diagnosis}</p>
            <p style="margin: 0;"><b>Reported Symptoms:</b> {symptoms_text}</p>
        </div>

        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 16px; margin: 16px 0;">
            <div style="font-size: 12px; font-weight: bold; color: #1e40af; text-transform: uppercase; margin-bottom: 6px;">
                ℞ Prescribed Medications & Dosage
            </div>
            <p style="margin: 0; color: #0f172a; font-weight: 600; white-space: pre-wrap;">{prescription}</p>
        </div>

        {notes_section}

        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
        <p style="font-size: 11px; color: #94a3b8; margin: 0;">
            This digital record was generated automatically by MedCore HMS. Please adhere strictly to the prescribed regimen.
        </p>
    </div>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = settings.MAIL_FROM or settings.MAIL_USERNAME
        msg["To"] = patient_email
        msg["Subject"] = f"MedCore HMS — Digital Prescription for {diagnosis}"
        msg.attach(MIMEText(html_content, "html"))

        server = smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT)
        server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"[SMTP SUCCESS] Prescription email delivered to {patient_email}")
        return True
    except Exception as err:
        print(f"[SMTP ERROR] Failed to send prescription email: {err}")
        return False


# --- Endpoints ---

@router.post("/", response_model=RecordResponse, status_code=status.HTTP_201_CREATED)
async def create_record(
    payload: RecordCreate,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(require_role(["doctor", "admin"])),
    db = Depends(get_db)
):
    try:
        patient_oid = ObjectId(payload.patient_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid patient ID")

    patient = await db["users"].find_one({"_id": patient_oid})
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    record_doc = payload.model_dump()
    record_doc["doctor_id"] = str(current_user["_id"])
    record_doc["created_at"] = datetime.now(timezone.utc)

    res = await db["records"].insert_one(record_doc)
    record_doc["id"] = str(res.inserted_id)
    record_doc.pop("_id", None)

    # Dispatch email in the background if patient has a valid email address
    patient_email = patient.get("email")
    if patient_email:
        background_tasks.add_task(
            dispatch_prescription_email,
            patient_email=patient_email,
            patient_name=patient.get("full_name", "Patient"),
            doctor_name=current_user.get("full_name", "Attending Physician"),
            diagnosis=payload.diagnosis,
            symptoms=payload.symptoms,
            prescription=payload.prescription,
            notes=payload.notes
        )

    return record_doc


@router.get("/my", response_model=List[RecordResponse])
async def get_my_records(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Fetch all medical records belonging to the currently authenticated patient."""
    patient_id = str(current_user["_id"])
    records = []
    cursor = db["records"].find({"patient_id": patient_id}).sort("created_at", -1)
    async for doc in cursor:
        records.append(serialize_record(doc))
    return records


@router.get("/", response_model=List[RecordResponse])
async def get_all_records(
    current_user: dict = Depends(require_role(["doctor", "admin"])),
    db = Depends(get_db)
):
    """Doctors and Admins: view all issued hospital medical records."""
    records = []
    cursor = db["records"].find().sort("created_at", -1)
    async for doc in cursor:
        records.append(serialize_record(doc))
    return records


@router.delete("/{record_id}", status_code=status.HTTP_200_OK)
async def delete_record(
    record_id: str,
    current_user: dict = Depends(require_role(["admin"])),
    db = Depends(get_db)
):
    try:
        oid = ObjectId(record_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid record ID")

    res = await db["records"].delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found")

    return {"message": "Record deleted successfully", "id": record_id}