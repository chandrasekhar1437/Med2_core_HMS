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

router = APIRouter(prefix="/api/billing", tags=["Billing & Invoices"])


# --- Schemas ---

class BillItem(BaseModel):
    description: str
    amount: float = Field(gt=0, description="Cost of service or medication")


class BillCreate(BaseModel):
    patient_id: str
    items: List[BillItem]
    notes: Optional[str] = None


class BillResponse(BaseModel):
    id: str
    patient_id: str
    items: List[BillItem]
    total_amount: float
    status: str
    notes: Optional[str] = None
    created_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None


# --- Helpers ---

def serialize_bill(doc: dict) -> dict:
    """Safely format MongoDB document for BillResponse."""
    doc["id"] = str(doc.pop("_id"))
    doc["items"] = doc.get("items") or []
    doc["total_amount"] = float(doc.get("total_amount", 0.0))
    doc["status"] = doc.get("status", "pending")
    doc["notes"] = doc.get("notes") or ""
    if not doc.get("created_at"):
        doc["created_at"] = datetime.now(timezone.utc)
    return doc


def dispatch_invoice_receipt_email(
    patient_email: str,
    patient_name: str,
    invoice_id: str,
    amount: float,
    items: List[dict]
) -> bool:
    """Dispatches an HTML tax invoice receipt via Gmail SMTP."""
    if not settings.MAIL_USERNAME or not settings.MAIL_PASSWORD:
        return False

    rows = "".join([
        f"<tr>"
        f"<td style='padding: 10px 12px; border-bottom: 1px solid #e2e8f0; color: #1e293b;'>{item.get('description', 'Medical Service')}</td>"
        f"<td style='padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: right; color: #0f172a; font-weight: 600;'>₹{float(item.get('amount', 0)):.2f}</td>"
        f"</tr>"
        for item in items
    ])

    html_content = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
        <div style="background-color: #0284c7; padding: 24px; color: #ffffff;">
            <h2 style="margin: 0; font-size: 22px;">MedCore Health Hospital</h2>
            <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 13px;">Official Payment Receipt & Tax Invoice</p>
        </div>

        <div style="padding: 24px; background: #ffffff;">
            <p style="margin-top: 0; font-size: 15px;">Dear <b>{patient_name}</b>,</p>
            <p style="color: #475569; font-size: 14px;">Your payment has been successfully recorded. Please retain this receipt for your records.</p>

            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin: 16px 0; font-size: 13px;">
                <span style="color: #64748b;">Invoice Reference:</span> <strong style="color: #0f172a;">{invoice_id}</strong><br/>
                <span style="color: #64748b;">Payment Status:</span> <span style="color: #16a34a; font-weight: bold;">PAID</span>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
                <thead>
                    <tr style="background-color: #f1f5f9; text-align: left;">
                        <th style="padding: 10px 12px; color: #475569; font-weight: 600;">Service / Item</th>
                        <th style="padding: 10px 12px; color: #475569; font-weight: 600; text-align: right;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {rows}
                </tbody>
                <tfoot>
                    <tr>
                        <td style="padding: 14px 12px; font-weight: bold; color: #0f172a; border-top: 2px solid #cbd5e1;">Grand Total Paid</td>
                        <td style="padding: 14px 12px; font-weight: bold; text-align: right; color: #0284c7; font-size: 16px; border-top: 2px solid #cbd5e1;">₹{amount:.2f}</td>
                    </tr>
                </tfoot>
            </table>

            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px 0;" />
            <p style="font-size: 11px; color: #94a3b8; margin: 0; text-align: center;">
                MedCore HMS Automated Billing System • Computer-generated receipt, no physical signature required.
            </p>
        </div>
    </div>
    """

    try:
        msg = MIMEMultipart("alternative")
        msg["From"] = settings.MAIL_FROM or settings.MAIL_USERNAME
        msg["To"] = patient_email
        msg["Subject"] = f"MedCore HMS — Payment Receipt [{invoice_id}]"
        msg.attach(MIMEText(html_content, "html"))

        server = smtplib.SMTP(settings.MAIL_SERVER, settings.MAIL_PORT)
        server.starttls()
        server.login(settings.MAIL_USERNAME, settings.MAIL_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"[SMTP SUCCESS] Billing receipt delivered to {patient_email}")
        return True
    except Exception as err:
        print(f"[SMTP ERROR] Failed to send invoice email: {err}")
        return False


# --- Endpoints ---

@router.post("/", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
async def create_bill(
    payload: BillCreate,
    current_user: dict = Depends(require_role(["admin", "receptionist"])),
    db = Depends(get_db)
):
    """Admin or Receptionist generates an invoice for a patient."""
    try:
        patient_oid = ObjectId(payload.patient_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid patient ID")

    patient = await db["users"].find_one({"_id": patient_oid})
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")

    total = sum(item.amount for item in payload.items)
    bill_doc = {
        "patient_id": payload.patient_id,
        "items": [item.model_dump() for item in payload.items],
        "total_amount": round(total, 2),
        "status": "pending",
        "notes": payload.notes,
        "created_at": datetime.now(timezone.utc),
        "paid_at": None
    }

    res = await db["invoices"].insert_one(bill_doc)
    bill_doc["id"] = str(res.inserted_id)
    bill_doc.pop("_id", None)
    return bill_doc


@router.get("/my", response_model=List[BillResponse])
async def get_my_bills(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Patient retrieves all their current and historical invoices."""
    patient_id = str(current_user["_id"])
    bills = []
    cursor = db["invoices"].find({"patient_id": patient_id}).sort("created_at", -1)
    async for doc in cursor:
        bills.append(serialize_bill(doc))
    return bills


@router.get("/", response_model=List[BillResponse])
async def get_all_bills(
    current_user: dict = Depends(require_role(["admin", "receptionist"])),
    db = Depends(get_db)
):
    """Admin or Staff views all system billing invoices."""
    bills = []
    cursor = db["invoices"].find().sort("created_at", -1)
    async for doc in cursor:
        bills.append(serialize_bill(doc))
    return bills


@router.patch("/{bill_id}/pay", response_model=BillResponse)
async def settle_invoice(
    bill_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
    db = Depends(get_db)
):
    """Marks an invoice as paid and dispatches an email receipt to the patient."""
    try:
        oid = ObjectId(bill_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid invoice ID")

    bill = await db["invoices"].find_one({"_id": oid})
    if not bill:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    # Authorization: Patients can only pay their own bill; staff can settle any bill
    user_id = str(current_user["_id"])
    user_role = current_user.get("role", "patient")
    if user_role == "patient" and bill["patient_id"] != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    paid_time = datetime.now(timezone.utc)
    await db["invoices"].update_one(
        {"_id": oid},
        {"$set": {"status": "paid", "paid_at": paid_time}}
    )

    # Fetch patient contact info to send the payment receipt
    try:
        patient_oid = ObjectId(bill["patient_id"])
        patient = await db["users"].find_one({"_id": patient_oid})
    except Exception:
        patient = None

    if patient and patient.get("email"):
        background_tasks.add_task(
            dispatch_invoice_receipt_email,
            patient_email=patient["email"],
            patient_name=patient.get("full_name", "Patient"),
            invoice_id=str(bill["_id"])[:8].upper(),
            amount=bill.get("total_amount", 0.0),
            items=bill.get("items", [])
        )

    bill["status"] = "paid"
    bill["paid_at"] = paid_time
    return serialize_bill(bill)


@router.delete("/{bill_id}", status_code=status.HTTP_200_OK)
async def delete_bill(
    bill_id: str,
    current_user: dict = Depends(require_role(["admin"])),
    db = Depends(get_db)
):
    """Admin removes an errant invoice from the registry."""
    try:
        oid = ObjectId(bill_id)
    except InvalidId:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid invoice ID")

    res = await db["invoices"].delete_one({"_id": oid})
    if res.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")

    return {"message": "Invoice successfully deleted", "id": bill_id}