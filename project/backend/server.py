from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Query, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
import logging
import asyncio
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import resend

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

# Resend Email
RESEND_API_KEY = os.environ.get('RESEND_API_KEY', '')
SENDER_EMAIL = os.environ.get('SENDER_EMAIL', 'onboarding@resend.dev')
if RESEND_API_KEY:
    resend.api_key = RESEND_API_KEY

app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class UserBase(BaseModel):
    username: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: str = "user"  # user, approver, admin
    sub_role: Optional[str] = None  # For approver: "approver" or "ci_excellence"
    department: Optional[str] = None
    team: Optional[str] = None
    pillar: Optional[str] = None
    manager: Optional[str] = None
    approved_pillars: Optional[List[str]] = []  # For approvers: which pillars they can approve
    approved_departments: Optional[List[str]] = []  # For approvers: which departments they can approve

class UserCreate(UserBase):
    password: str

class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class SubRoleSelection(BaseModel):
    sub_role: str  # "approver" or "ci_excellence"

class UserLogin(BaseModel):
    username: str
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    created_at: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: User

class IdeaBase(BaseModel):
    pillar: str
    title: str
    improvement_type: str
    current_process: str
    suggested_solution: str
    benefits: str
    target_completion: str
    department: Optional[str] = None
    team: Optional[str] = None

class IdeaCreate(IdeaBase):
    pass

class CIEvaluation(BaseModel):
    is_quick_win: bool
    complexity_level: Optional[str] = None  # Low, Medium, High
    savings_type: Optional[str] = None  # cost_savings, time_saved
    cost_savings: Optional[float] = None
    time_saved_hours: Optional[float] = None
    time_saved_minutes: Optional[float] = None
    evaluation_notes: Optional[str] = None
    assigned_to_tech: Optional[bool] = False
    tech_person_name: Optional[str] = None

class BestIdeaSelection(BaseModel):
    idea_id: str
    is_best_idea: bool

class Idea(IdeaBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    idea_number: str
    status: str  # draft, pending, approved, declined, revision_requested
    submitted_by: str
    submitted_by_username: str
    assigned_approver: Optional[str] = None
    assigned_approver_username: Optional[str] = None
    created_at: str
    updated_at: str
    # C.I. Excellence Team Evaluation fields
    is_quick_win: Optional[bool] = None
    complexity_level: Optional[str] = None
    savings_type: Optional[str] = None
    cost_savings: Optional[float] = None
    time_saved_hours: Optional[float] = None
    time_saved_minutes: Optional[float] = None
    evaluation_notes: Optional[str] = None
    assigned_to_tech: Optional[bool] = False
    tech_person_name: Optional[str] = None
    is_best_idea: Optional[bool] = False
    evaluated_by: Optional[str] = None
    evaluated_by_username: Optional[str] = None
    evaluated_at: Optional[str] = None
    is_evaluated: Optional[bool] = False  # Computed field to indicate if idea has been evaluated

class CommentBase(BaseModel):
    comment_text: str

class Comment(CommentBase):
    model_config = ConfigDict(extra="ignore")
    id: str
    idea_id: str
    user_id: str
    username: str
    created_at: str

class IdeaAction(BaseModel):
    comment: Optional[str] = None

class DepartmentBase(BaseModel):
    name: str
    pillar: str  # Add pillar association

class Department(DepartmentBase):
    model_config = ConfigDict(extra="ignore")
    id: str

class PillarBase(BaseModel):
    name: str

class Pillar(PillarBase):
    model_config = ConfigDict(extra="ignore")
    id: str

class TeamBase(BaseModel):
    name: str
    pillar: str
    department: str  # Add department association

class Team(TeamBase):
    model_config = ConfigDict(extra="ignore")
    id: str

class TechPersonBase(BaseModel):
    name: str
    email: Optional[str] = None
    specialization: Optional[str] = None

class TechPerson(TechPersonBase):
    model_config = ConfigDict(extra="ignore")
    id: str

class DashboardStats(BaseModel):
    total_ideas: int
    pending_ideas: int
    approved_ideas: int
    declined_ideas: int
    revision_requested_ideas: int
    my_ideas: int

# ==================== UTILITIES ====================

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def create_reset_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(hours=1)  # Token valid for 1 hour
    to_encode = {"email": email, "exp": expire, "type": "password_reset"}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

def verify_reset_token(token: str) -> str:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("email")
        token_type: str = payload.get("type")
        if email is None or token_type != "password_reset":
            raise HTTPException(status_code=400, detail="Invalid reset token")
        return email
    except JWTError:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if user is None:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication credentials")

async def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user

async def send_email_async(recipient_email: str, subject: str, html_content: str):
    if not RESEND_API_KEY:
        logging.warning(f"Email not sent (no API key): {subject} to {recipient_email}")
        return False
    
    params = {
        "from": SENDER_EMAIL,
        "to": [recipient_email],
        "subject": subject,
        "html": html_content
    }
    
    try:
        result = await asyncio.to_thread(resend.Emails.send, params)
        logging.info(f"Email sent successfully: {subject} to {recipient_email}, ID: {result}")
        return True
    except Exception as e:
        logging.error(f"Failed to send email to {recipient_email}: {str(e)}")
        return False

async def generate_idea_number() -> str:
    count = await db.ideas.count_documents({})
    return f"EYE-{str(count + 1).zfill(5)}"

# ==================== HEALTH CHECK ====================

# Health check route
@api_router.get("/health")
async def health():
    return {"status": "healthy", "service": "Philtech Eye-dea API"}

# ==================== PUBLIC DATA ROUTES (for registration) ====================

@api_router.get("/public/pillars", response_model=List[Pillar])
async def get_public_pillars():
    """Public endpoint to get pillars for registration form"""
    pillars = await db.pillars.find({}, {"_id": 0}).to_list(1000)
    return [Pillar(**pillar) for pillar in pillars]

@api_router.get("/public/departments", response_model=List[Department])
async def get_public_departments(pillar: Optional[str] = None):
    """Public endpoint to get departments for registration form"""
    query = {"pillar": pillar} if pillar else {}
    departments = await db.departments.find(query, {"_id": 0}).to_list(1000)
    return [Department(**dept) for dept in departments]

@api_router.get("/public/teams", response_model=List[Team])
async def get_public_teams(pillar: Optional[str] = None, department: Optional[str] = None):
    """Public endpoint to get teams for registration form"""
    query = {}
    if pillar:
        query["pillar"] = pillar
    if department:
        query["department"] = department
    teams = await db.teams.find(query, {"_id": 0}).to_list(1000)
    return [Team(**team) for team in teams]

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=User)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"username": user_data.username}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    existing_email = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")
    
    user_id = f"user_{datetime.now(timezone.utc).timestamp()}"
    user_doc = {
        "id": user_id,
        "username": user_data.username,
        "email": user_data.email,
        "first_name": user_data.first_name,
        "last_name": user_data.last_name,
        "password_hash": get_password_hash(user_data.password),
        "role": user_data.role,
        "department": user_data.department,
        "team": user_data.team,
        "pillar": user_data.pillar,
        "manager": user_data.manager,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.users.insert_one(user_doc)
    user_doc.pop("password_hash")
    return User(**user_doc)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"username": credentials.username}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    
    token = create_access_token(data={"sub": user["id"]})
    user.pop("password_hash")
    return TokenResponse(access_token=token, token_type="bearer", user=User(**user))

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return User(**current_user)

@api_router.post("/auth/set-sub-role")
async def set_sub_role(selection: SubRoleSelection, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "approver":
        raise HTTPException(status_code=403, detail="Only approvers can set sub-role")
    
    if selection.sub_role not in ["approver", "ci_excellence"]:
        raise HTTPException(status_code=400, detail="Invalid sub-role")
    
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"sub_role": selection.sub_role}}
    )
    
    return {"message": "Sub-role set successfully", "sub_role": selection.sub_role}

@api_router.post("/auth/change-password")
async def change_password(password_data: UserPasswordChange, current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["id"]}, {"_id": 0})
    if not user or not verify_password(password_data.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    new_hash = get_password_hash(password_data.new_password)
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"password_hash": new_hash}}
    )
    return {"message": "Password changed successfully"}

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    user = await db.users.find_one({"email": request.email}, {"_id": 0})
    
    # Always return success to prevent email enumeration
    if not user:
        return {"message": "If the email exists, a password reset link has been sent"}
    
    # Generate reset token
    reset_token = create_reset_token(request.email)
    
    # Create reset link
    frontend_url = os.environ.get('FRONTEND_URL', 'http://localhost:3000')
    reset_link = f"{frontend_url}/reset-password?token={reset_token}"
    
    # Send email if configured
    if RESEND_API_KEY:
        html = f"""
        <html>
            <body>
                <h2>Password Reset Request</h2>
                <p>Hello {user['username']},</p>
                <p>You requested to reset your password for Philtech Eye-dea.</p>
                <p>Click the link below to reset your password (valid for 1 hour):</p>
                <p><a href="{reset_link}">Reset Password</a></p>
                <p>If you didn't request this, please ignore this email.</p>
                <br>
                <p>Best regards,<br>Philtech Eye-dea Team</p>
            </body>
        </html>
        """
        # Try to send email but also return the link for testing
        # (Resend test mode only sends to verified emails)
        asyncio.create_task(send_email_async(request.email, "Password Reset Request", html))
        return {
            "message": "Password reset link has been sent to your email",
            "note": "Using Resend test mode - emails only delivered to verified addresses",
            "reset_link": reset_link
        }
    else:
        # For testing without email configuration
        return {
            "message": "Password reset link generated (email service not configured)",
            "reset_link": reset_link
        }

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    # Verify token and get email
    email = verify_reset_token(request.token)
    
    # Find user
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update password
    new_hash = get_password_hash(request.new_password)
    await db.users.update_one(
        {"email": email},
        {"$set": {"password_hash": new_hash}}
    )
    
    return {"message": "Password reset successfully. You can now login with your new password."}

# ==================== IDEAS ROUTES ====================

def add_is_evaluated(idea_doc: dict) -> dict:
    """Add computed is_evaluated field based on evaluated_by presence"""
    idea_doc["is_evaluated"] = idea_doc.get("evaluated_by") is not None
    return idea_doc

@api_router.get("/ideas", response_model=List[Idea])
async def get_ideas(
    status: Optional[str] = None,
    pillar: Optional[str] = None,
    department: Optional[str] = None,
    team: Optional[str] = None,
    submitted_by: Optional[str] = None,
    assigned_approver: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    if status:
        query["status"] = status
    if pillar:
        query["pillar"] = pillar
    if department:
        query["department"] = department
    if team:
        query["team"] = team
    if submitted_by:
        query["submitted_by"] = submitted_by
    if assigned_approver:
        query["assigned_approver"] = assigned_approver
    
    ideas = await db.ideas.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Idea(**add_is_evaluated(idea)) for idea in ideas]

@api_router.post("/ideas", response_model=Idea)
async def create_idea(idea_data: IdeaCreate, current_user: dict = Depends(get_current_user)):
    idea_number = await generate_idea_number()
    idea_id = f"idea_{datetime.now(timezone.utc).timestamp()}"
    
    # Find approver for this pillar/department
    # First try to find an approver assigned to this specific pillar or department
    approver = await db.users.find_one({
        "role": "approver",
        "$or": [
            {"approved_pillars": idea_data.pillar},
            {"approved_departments": idea_data.department},
            {"department": idea_data.department}  # Fallback to approver's own department
        ]
    }, {"_id": 0})
    
    idea_doc = {
        "id": idea_id,
        "idea_number": idea_number,
        "pillar": idea_data.pillar,
        "title": idea_data.title,
        "improvement_type": idea_data.improvement_type,
        "current_process": idea_data.current_process,
        "suggested_solution": idea_data.suggested_solution,
        "benefits": idea_data.benefits,
        "target_completion": idea_data.target_completion,
        "department": idea_data.department,
        "team": idea_data.team,
        "status": "pending",
        "submitted_by": current_user["id"],
        "submitted_by_username": current_user["username"],
        "assigned_approver": approver["id"] if approver else None,
        "assigned_approver_username": approver["username"] if approver else None,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.ideas.insert_one(idea_doc)
    
    # Send email to approver
    if approver:
        html = f"""
        <html>
            <body>
                <h2>New Eye-dea Submitted for Approval</h2>
                <p><strong>Idea Number:</strong> {idea_number}</p>
                <p><strong>Title:</strong> {idea_data.title}</p>
                <p><strong>Submitted By:</strong> {current_user['username']}</p>
                <p><strong>Pillar:</strong> {idea_data.pillar}</p>
                <p><strong>Department:</strong> {idea_data.department}</p>
                <p>Please review and approve/decline this Eye-dea.</p>
            </body>
        </html>
        """
        asyncio.create_task(send_email_async(approver["email"], f"New Eye-dea: {idea_data.title}", html))
    
    return Idea(**idea_doc)

@api_router.get("/ideas/{idea_id}", response_model=Idea)
async def get_idea(idea_id: str, current_user: dict = Depends(get_current_user)):
    idea = await db.ideas.find_one({"id": idea_id}, {"_id": 0})
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    return Idea(**add_is_evaluated(idea))

@api_router.put("/ideas/{idea_id}", response_model=Idea)
async def update_idea(idea_id: str, idea_data: IdeaCreate, current_user: dict = Depends(get_current_user)):
    idea = await db.ideas.find_one({"id": idea_id}, {"_id": 0})
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    if idea["submitted_by"] != current_user["id"] and current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to update this idea")
    
    update_doc = {
        "pillar": idea_data.pillar,
        "title": idea_data.title,
        "improvement_type": idea_data.improvement_type,
        "current_process": idea_data.current_process,
        "suggested_solution": idea_data.suggested_solution,
        "benefits": idea_data.benefits,
        "target_completion": idea_data.target_completion,
        "department": idea_data.department,
        "team": idea_data.team,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.ideas.update_one({"id": idea_id}, {"$set": update_doc})
    updated_idea = await db.ideas.find_one({"id": idea_id}, {"_id": 0})
    return Idea(**add_is_evaluated(updated_idea))

@api_router.delete("/ideas/{idea_id}")
async def delete_idea(idea_id: str, current_user: dict = Depends(get_admin_user)):
    result = await db.ideas.delete_one({"id": idea_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Idea not found")
    await db.comments.delete_many({"idea_id": idea_id})
    return {"message": "Idea deleted successfully"}

@api_router.post("/ideas/{idea_id}/approve")
async def approve_idea(idea_id: str, action: IdeaAction, current_user: dict = Depends(get_current_user)):
    # Only approvers with "approver" sub_role or admins can approve
    if current_user["role"] == "approver" and current_user.get("sub_role") == "ci_excellence":
        raise HTTPException(status_code=403, detail="C.I. Excellence Team cannot approve ideas. Only evaluate approved ideas.")
    if current_user["role"] not in ["approver", "admin"]:
        raise HTTPException(status_code=403, detail="Only approvers can approve ideas")
    
    idea = await db.ideas.find_one({"id": idea_id}, {"_id": 0})
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    await db.ideas.update_one(
        {"id": idea_id},
        {"$set": {"status": "approved", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if action.comment:
        comment_id = f"comment_{datetime.now(timezone.utc).timestamp()}"
        await db.comments.insert_one({
            "id": comment_id,
            "idea_id": idea_id,
            "user_id": current_user["id"],
            "username": current_user["username"],
            "comment_text": action.comment,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Send email to submitter
    submitter = await db.users.find_one({"id": idea["submitted_by"]}, {"_id": 0})
    if submitter:
        html = f"""
        <html>
            <body>
                <h2>Your Eye-dea Has Been Approved!</h2>
                <p><strong>Idea Number:</strong> {idea['idea_number']}</p>
                <p><strong>Title:</strong> {idea['title']}</p>
                <p><strong>Approved By:</strong> {current_user['username']}</p>
                {f'<p><strong>Comment:</strong> {action.comment}</p>' if action.comment else ''}
            </body>
        </html>
        """
        asyncio.create_task(send_email_async(submitter["email"], f"Eye-dea Approved: {idea['title']}", html))
    
    return {"message": "Idea approved successfully"}

@api_router.post("/ideas/{idea_id}/decline")
async def decline_idea(idea_id: str, action: IdeaAction, current_user: dict = Depends(get_current_user)):
    # Only approvers with "approver" sub_role or admins can decline
    if current_user["role"] == "approver" and current_user.get("sub_role") == "ci_excellence":
        raise HTTPException(status_code=403, detail="C.I. Excellence Team cannot decline ideas")
    if current_user["role"] not in ["approver", "admin"]:
        raise HTTPException(status_code=403, detail="Only approvers can decline ideas")
    
    idea = await db.ideas.find_one({"id": idea_id}, {"_id": 0})
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    await db.ideas.update_one(
        {"id": idea_id},
        {"$set": {"status": "declined", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    if action.comment:
        comment_id = f"comment_{datetime.now(timezone.utc).timestamp()}"
        await db.comments.insert_one({
            "id": comment_id,
            "idea_id": idea_id,
            "user_id": current_user["id"],
            "username": current_user["username"],
            "comment_text": action.comment,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Send email to submitter
    submitter = await db.users.find_one({"id": idea["submitted_by"]}, {"_id": 0})
    if submitter:
        html = f"""
        <html>
            <body>
                <h2>Your Eye-dea Has Been Declined</h2>
                <p><strong>Idea Number:</strong> {idea['idea_number']}</p>
                <p><strong>Title:</strong> {idea['title']}</p>
                <p><strong>Declined By:</strong> {current_user['username']}</p>
                {f'<p><strong>Comment:</strong> {action.comment}</p>' if action.comment else ''}
            </body>
        </html>
        """
        asyncio.create_task(send_email_async(submitter["email"], f"Eye-dea Declined: {idea['title']}", html))
    
    return {"message": "Idea declined successfully"}

@api_router.post("/ideas/{idea_id}/request-revision")
async def request_revision(idea_id: str, action: IdeaAction, current_user: dict = Depends(get_current_user)):
    # Only approvers with "approver" sub_role or admins can request revision
    if current_user["role"] == "approver" and current_user.get("sub_role") == "ci_excellence":
        raise HTTPException(status_code=403, detail="C.I. Excellence Team cannot request revisions")
    if current_user["role"] not in ["approver", "admin"]:
        raise HTTPException(status_code=403, detail="Only approvers can request revisions")
    
    if not action.comment:
        raise HTTPException(status_code=400, detail="Comment is required for revision requests")
    
    idea = await db.ideas.find_one({"id": idea_id}, {"_id": 0})
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    await db.ideas.update_one(
        {"id": idea_id},
        {"$set": {"status": "revision_requested", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    comment_id = f"comment_{datetime.now(timezone.utc).timestamp()}"
    await db.comments.insert_one({
        "id": comment_id,
        "idea_id": idea_id,
        "user_id": current_user["id"],
        "username": current_user["username"],
        "comment_text": action.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    # Send email to submitter
    submitter = await db.users.find_one({"id": idea["submitted_by"]}, {"_id": 0})
    if submitter:
        html = f"""
        <html>
            <body>
                <h2>Revision Requested for Your Eye-dea</h2>
                <p><strong>Idea Number:</strong> {idea['idea_number']}</p>
                <p><strong>Title:</strong> {idea['title']}</p>
                <p><strong>Requested By:</strong> {current_user['username']}</p>
                <p><strong>Comment:</strong> {action.comment}</p>
                <p>Please revise and resubmit your Eye-dea.</p>
            </body>
        </html>
        """
        asyncio.create_task(send_email_async(submitter["email"], f"Revision Requested: {idea['title']}", html))
    
    return {"message": "Revision requested successfully"}

@api_router.post("/ideas/{idea_id}/resubmit")
async def resubmit_idea(idea_id: str, current_user: dict = Depends(get_current_user)):
    idea = await db.ideas.find_one({"id": idea_id}, {"_id": 0})
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    if idea["submitted_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Not authorized to resubmit this idea")
    
    await db.ideas.update_one(
        {"id": idea_id},
        {"$set": {"status": "pending", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Send email to approver
    if idea["assigned_approver"]:
        approver = await db.users.find_one({"id": idea["assigned_approver"]}, {"_id": 0})
        if approver:
            html = f"""
            <html>
                <body>
                    <h2>Eye-dea Resubmitted for Review</h2>
                    <p><strong>Idea Number:</strong> {idea['idea_number']}</p>
                    <p><strong>Title:</strong> {idea['title']}</p>
                    <p><strong>Submitted By:</strong> {current_user['username']}</p>
                    <p>This Eye-dea has been revised and resubmitted for your review.</p>
                </body>
            </html>
            """
            asyncio.create_task(send_email_async(approver["email"], f"Eye-dea Resubmitted: {idea['title']}", html))
    
    return {"message": "Idea resubmitted successfully"}

@api_router.get("/ideas/{idea_id}/comments", response_model=List[Comment])
async def get_comments(idea_id: str, current_user: dict = Depends(get_current_user)):
    comments = await db.comments.find({"idea_id": idea_id}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return [Comment(**comment) for comment in comments]

@api_router.post("/ideas/{idea_id}/comments", response_model=Comment)
async def add_comment(idea_id: str, comment_data: CommentBase, current_user: dict = Depends(get_current_user)):
    idea = await db.ideas.find_one({"id": idea_id}, {"_id": 0})
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    comment_id = f"comment_{datetime.now(timezone.utc).timestamp()}"
    comment_doc = {
        "id": comment_id,
        "idea_id": idea_id,
        "user_id": current_user["id"],
        "username": current_user["username"],
        "comment_text": comment_data.comment_text,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.comments.insert_one(comment_doc)
    return Comment(**comment_doc)

# ==================== C.I. EXCELLENCE TEAM ROUTES ====================

@api_router.post("/ideas/{idea_id}/ci-evaluate")
async def ci_evaluate_idea(idea_id: str, evaluation: CIEvaluation, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "approver" or current_user.get("sub_role") != "ci_excellence":
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Only C.I. Excellence Team can evaluate ideas")
    
    idea = await db.ideas.find_one({"id": idea_id}, {"_id": 0})
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    # Determine new status based on evaluation
    new_status = idea.get("status", "approved")  # Keep current status by default
    if evaluation.is_quick_win:
        new_status = "implemented"  # Quick wins are immediately implemented
    elif evaluation.assigned_to_tech and evaluation.tech_person_name:
        new_status = "assigned_to_te"  # Assigned to Tech & Engineering
    
    update_doc = {
        "is_quick_win": evaluation.is_quick_win,
        "evaluated_by": current_user["id"],
        "evaluated_by_username": current_user["username"],
        "evaluated_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "status": new_status
    }
    
    if not evaluation.is_quick_win:
        update_doc["complexity_level"] = evaluation.complexity_level
        update_doc["savings_type"] = evaluation.savings_type
        update_doc["cost_savings"] = evaluation.cost_savings
        update_doc["time_saved_hours"] = evaluation.time_saved_hours
        update_doc["time_saved_minutes"] = evaluation.time_saved_minutes
        update_doc["evaluation_notes"] = evaluation.evaluation_notes
        update_doc["assigned_to_tech"] = evaluation.assigned_to_tech
        update_doc["tech_person_name"] = evaluation.tech_person_name
    
    await db.ideas.update_one({"id": idea_id}, {"$set": update_doc})
    
    # Send notification to submitter
    submitter = await db.users.find_one({"id": idea["submitted_by"]}, {"_id": 0})
    if submitter and RESEND_API_KEY:
        html = f"""
        <html>
            <body>
                <h2>Your Eye-dea Has Been Evaluated</h2>
                <p><strong>Idea Number:</strong> {idea['idea_number']}</p>
                <p><strong>Title:</strong> {idea['title']}</p>
                <p><strong>Evaluated By:</strong> {current_user['username']} (C.I. Excellence Team)</p>
                <p><strong>Quick Win:</strong> {'Yes' if evaluation.is_quick_win else 'No'}</p>
                {f'<p><strong>Complexity Level:</strong> {evaluation.complexity_level}</p>' if not evaluation.is_quick_win else ''}
            </body>
        </html>
        """
        asyncio.create_task(send_email_async(submitter["email"], f"Eye-dea Evaluated: {idea['title']}", html))
    
    return {"message": "Idea evaluated successfully"}

@api_router.post("/ideas/{idea_id}/set-best-idea")
async def set_best_idea(idea_id: str, selection: BestIdeaSelection, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "approver" or current_user.get("sub_role") != "ci_excellence":
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Only C.I. Excellence Team can select best ideas")
    
    # Unset previous best idea if exists
    if selection.is_best_idea:
        await db.ideas.update_many({}, {"$set": {"is_best_idea": False}})
    
    await db.ideas.update_one(
        {"id": idea_id},
        {"$set": {"is_best_idea": selection.is_best_idea, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Best idea status updated"}

@api_router.post("/ideas/{idea_id}/mark-best-idea")
async def mark_best_idea(idea_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "approver" or current_user.get("sub_role") != "ci_excellence":
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Only C.I. Excellence Team can select best ideas")
    
    # Verify idea exists
    idea = await db.ideas.find_one({"id": idea_id}, {"_id": 0})
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    # Unset previous best idea if exists
    await db.ideas.update_many({}, {"$set": {"is_best_idea": False}})
    
    # Set this idea as best
    await db.ideas.update_one(
        {"id": idea_id},
        {"$set": {"is_best_idea": True, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"message": "Idea marked as best Eye-dea"}

class CIStatusUpdate(BaseModel):
    new_status: str  # implemented, revision_requested, declined

@api_router.post("/ideas/{idea_id}/ci-update-status")
async def ci_update_status(idea_id: str, status_update: CIStatusUpdate, current_user: dict = Depends(get_current_user)):
    """C.I. Excellence Team can update status of ideas assigned to T&E"""
    if current_user["role"] != "approver" or current_user.get("sub_role") != "ci_excellence":
        if current_user["role"] != "admin":
            raise HTTPException(status_code=403, detail="Only C.I. Excellence Team can update idea status")
    
    idea = await db.ideas.find_one({"id": idea_id}, {"_id": 0})
    if not idea:
        raise HTTPException(status_code=404, detail="Idea not found")
    
    # Only allow status change for ideas that are "assigned_to_te"
    if idea.get("status") != "assigned_to_te":
        raise HTTPException(status_code=400, detail="Can only change status of ideas assigned to T&E")
    
    # Validate new status
    valid_statuses = ["implemented", "revision_requested", "declined"]
    if status_update.new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    await db.ideas.update_one(
        {"id": idea_id},
        {"$set": {
            "status": status_update.new_status,
            "status_updated_by": current_user["id"],
            "status_updated_by_username": current_user["username"],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": f"Idea status updated to {status_update.new_status}"}

# ==================== DASHBOARD ROUTES ====================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    total = await db.ideas.count_documents({})
    pending = await db.ideas.count_documents({"status": "pending"})
    approved = await db.ideas.count_documents({"status": "approved"})
    declined = await db.ideas.count_documents({"status": "declined"})
    revision = await db.ideas.count_documents({"status": "revision_requested"})
    implemented = await db.ideas.count_documents({"status": "implemented"})
    assigned_to_te = await db.ideas.count_documents({"status": "assigned_to_te"})
    my_ideas = await db.ideas.count_documents({"submitted_by": current_user["id"]})
    
    # Get best idea for display
    best_idea_doc = await db.ideas.find_one({"is_best_idea": True}, {"_id": 0})
    best_idea_data = None
    if best_idea_doc:
        best_idea_data = add_is_evaluated(best_idea_doc)
    
    return {
        "total_ideas": total,
        "pending_ideas": pending,
        "approved_ideas": approved,
        "declined_ideas": declined,
        "revision_requested_ideas": revision,
        "implemented_ideas": implemented,
        "assigned_to_te_ideas": assigned_to_te,
        "my_ideas": my_ideas,
        "best_idea": best_idea_data
    }

@api_router.get("/dashboard/analytics")
async def get_dashboard_analytics(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    # Build date filter
    date_filter = {}
    if start_date:
        date_filter["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in date_filter:
            date_filter["created_at"]["$lte"] = end_date
        else:
            date_filter["created_at"] = {"$lte": end_date}
    
    # Base query with date filter
    base_query = date_filter if date_filter else {}
    
    # Total counts
    total_ideas = await db.ideas.count_documents(base_query)
    declined_count = await db.ideas.count_documents({**base_query, "status": "declined"})
    approved_count = await db.ideas.count_documents({**base_query, "status": "approved"})
    implemented_count = await db.ideas.count_documents({**base_query, "status": "implemented"})
    assigned_to_te_count = await db.ideas.count_documents({**base_query, "status": "assigned_to_te"})
    pending_count = await db.ideas.count_documents({**base_query, "status": "pending"})
    revision_count = await db.ideas.count_documents({**base_query, "status": "revision_requested"})
    
    # Quick Wins count
    quick_wins_count = await db.ideas.count_documents({**base_query, "is_quick_win": True})
    
    # Complexity counts
    low_complexity = await db.ideas.count_documents({**base_query, "complexity_level": "Low"})
    medium_complexity = await db.ideas.count_documents({**base_query, "complexity_level": "Medium"})
    high_complexity = await db.ideas.count_documents({**base_query, "complexity_level": "High"})
    
    # Best idea
    best_idea = await db.ideas.find_one({"is_best_idea": True}, {"_id": 0})
    
    # Total cost savings
    cost_match = {**base_query, "savings_type": "cost_savings", "cost_savings": {"$ne": None}}
    cost_savings_pipeline = [
        {"$match": cost_match},
        {"$group": {"_id": None, "total": {"$sum": "$cost_savings"}}}
    ]
    cost_result = await db.ideas.aggregate(cost_savings_pipeline).to_list(1)
    total_cost_savings = cost_result[0]["total"] if cost_result else 0
    
    # Total time saved
    time_match = {**base_query, "savings_type": "time_saved"}
    time_saved_pipeline = [
        {"$match": time_match},
        {"$group": {
            "_id": None,
            "total_hours": {"$sum": {"$ifNull": ["$time_saved_hours", 0]}},
            "total_minutes": {"$sum": {"$ifNull": ["$time_saved_minutes", 0]}}
        }}
    ]
    time_result = await db.ideas.aggregate(time_saved_pipeline).to_list(1)
    total_hours = time_result[0]["total_hours"] if time_result else 0
    total_minutes = time_result[0]["total_minutes"] if time_result else 0
    
    # Convert minutes to hours
    total_hours += total_minutes // 60
    total_minutes = total_minutes % 60
    
    # Calculate rates using formula: count / (total - declined)
    denominator = total_ideas - declined_count
    
    # Approval Rate = approved / (total - declined)
    approval_rate = (approved_count / denominator * 100) if denominator > 0 else 0
    
    # Implementation Rate = implemented / (total - declined)
    implementation_rate = (implemented_count / denominator * 100) if denominator > 0 else 0
    
    # Assigned to T&E Rate = assigned_to_te / (total - declined)
    assigned_to_te_rate = (assigned_to_te_count / denominator * 100) if denominator > 0 else 0
    
    return {
        "quick_wins_count": quick_wins_count,
        "complexity_counts": {
            "low": low_complexity,
            "medium": medium_complexity,
            "high": high_complexity
        },
        "best_idea": Idea(**add_is_evaluated(best_idea)) if best_idea else None,
        "total_cost_savings": total_cost_savings,
        "total_time_saved": {
            "hours": total_hours,
            "minutes": total_minutes
        },
        # Counts
        "total_ideas": total_ideas,
        "approved_count": approved_count,
        "declined_count": declined_count,
        "implemented_count": implemented_count,
        "assigned_to_te_count": assigned_to_te_count,
        "pending_count": pending_count,
        "revision_count": revision_count,
        # Rates
        "approval_rate": round(approval_rate, 2),
        "implementation_rate": round(implementation_rate, 2),
        "assigned_to_te_rate": round(assigned_to_te_rate, 2),
        "charts_data": {
            "complexity_chart": [
                {"name": "Low Complexity", "value": low_complexity},
                {"name": "Medium Complexity", "value": medium_complexity},
                {"name": "High Complexity", "value": high_complexity}
            ],
            "quick_wins_chart": [
                {"name": "Quick Wins", "value": quick_wins_count},
                {"name": "Not Quick Wins", "value": low_complexity + medium_complexity + high_complexity}
            ],
            "status_chart": [
                {"name": "Approved", "value": approved_count},
                {"name": "Implemented", "value": implemented_count},
                {"name": "Assigned to T&E", "value": assigned_to_te_count},
                {"name": "Pending", "value": pending_count},
                {"name": "Revision Requested", "value": revision_count},
                {"name": "Declined", "value": declined_count}
            ]
        }
    }

@api_router.get("/dashboard/export-excel")
async def export_ideas_excel(current_user: dict = Depends(get_current_user)):
    import io
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill
    
    # Fetch all ideas
    ideas = await db.ideas.find({}, {"_id": 0}).to_list(10000)
    
    # Create workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Eye-deas"
    
    # Headers
    headers = [
        "Idea Number", "Title", "Status", "Pillar", "Department", "Team",
        "Improvement Type", "Submitted By", "Assigned Approver",
        "Quick Win", "Complexity", "Savings Type", "Cost Savings",
        "Time Saved (Hours)", "Time Saved (Minutes)", "Evaluated By",
        "Tech Person", "Best Idea", "Target Completion", "Created At"
    ]
    
    # Style headers
    header_fill = PatternFill(start_color="0066CC", end_color="0066CC", fill_type="solid")
    header_font = Font(color="FFFFFF", bold=True)
    
    for col_num, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col_num, value=header)
        cell.fill = header_fill
        cell.font = header_font
    
    # Add data
    for row_num, idea in enumerate(ideas, 2):
        ws.cell(row=row_num, column=1, value=idea.get("idea_number"))
        ws.cell(row=row_num, column=2, value=idea.get("title"))
        ws.cell(row=row_num, column=3, value=idea.get("status"))
        ws.cell(row=row_num, column=4, value=idea.get("pillar"))
        ws.cell(row=row_num, column=5, value=idea.get("department"))
        ws.cell(row=row_num, column=6, value=idea.get("team"))
        ws.cell(row=row_num, column=7, value=idea.get("improvement_type"))
        ws.cell(row=row_num, column=8, value=idea.get("submitted_by_username"))
        ws.cell(row=row_num, column=9, value=idea.get("assigned_approver_username"))
        ws.cell(row=row_num, column=10, value="Yes" if idea.get("is_quick_win") else "No" if idea.get("is_quick_win") is not None else "")
        ws.cell(row=row_num, column=11, value=idea.get("complexity_level") or "")
        ws.cell(row=row_num, column=12, value=idea.get("savings_type") or "")
        ws.cell(row=row_num, column=13, value=idea.get("cost_savings") or "")
        ws.cell(row=row_num, column=14, value=idea.get("time_saved_hours") or "")
        ws.cell(row=row_num, column=15, value=idea.get("time_saved_minutes") or "")
        ws.cell(row=row_num, column=16, value=idea.get("evaluated_by_username") or "")
        ws.cell(row=row_num, column=17, value=idea.get("tech_person_name") or "")
        ws.cell(row=row_num, column=18, value="Yes" if idea.get("is_best_idea") else "No")
        ws.cell(row=row_num, column=19, value=idea.get("target_completion"))
        ws.cell(row=row_num, column=20, value=idea.get("created_at"))
    
    # Adjust column widths
    for col in ws.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            if cell.value:
                max_length = max(max_length, len(str(cell.value)))
        ws.column_dimensions[column].width = min(max_length + 2, 50)
    
    # Save to bytes
    excel_file = io.BytesIO()
    wb.save(excel_file)
    excel_file.seek(0)
    
    from fastapi.responses import StreamingResponse
    
    return StreamingResponse(
        excel_file,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=philtech_eyedeas.xlsx"}
    )

# ==================== ADMIN ROUTES ====================

@api_router.get("/admin/users", response_model=List[User])
async def get_users(current_user: dict = Depends(get_admin_user)):
    # Exclude demo accounts from admin panel (but they can still login)
    demo_usernames = ["admin", "approver1", "user1"]
    users = await db.users.find(
        {"username": {"$nin": demo_usernames}}, 
        {"_id": 0, "password_hash": 0}
    ).to_list(1000)
    return [User(**user) for user in users]

@api_router.put("/admin/users/{user_id}", response_model=User)
async def update_user(user_id: str, user_data: UserBase, current_user: dict = Depends(get_admin_user)):
    result = await db.users.update_one(
        {"id": user_id},
        {"$set": {
            "username": user_data.username,
            "email": user_data.email,
            "role": user_data.role,
            "department": user_data.department,
            "team": user_data.team,
            "pillar": user_data.pillar,
            "manager": user_data.manager,
            "approved_pillars": user_data.approved_pillars if user_data.role == "approver" else [],
            "approved_departments": user_data.approved_departments if user_data.role == "approver" else []
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return User(**updated_user)

@api_router.post("/admin/users/bulk-upload")
async def bulk_upload_users(file: bytes = File(...), current_user: dict = Depends(get_admin_user)):
    import csv
    import io
    
    try:
        # Parse CSV file
        csv_content = file.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(csv_content))
        
        created_users = []
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                # Validate required fields
                if not row.get('username') or not row.get('email') or not row.get('password'):
                    errors.append(f"Row {row_num}: Missing required fields (username, email, password)")
                    continue
                
                # Check if user already exists
                existing = await db.users.find_one({"username": row['username']}, {"_id": 0})
                if existing:
                    errors.append(f"Row {row_num}: Username '{row['username']}' already exists")
                    continue
                
                # Create user
                user_id = f"user_{datetime.now(timezone.utc).timestamp()}_{row['username']}"
                approved_pillars = row.get('approved_pillars', '').split(';') if row.get('approved_pillars') else []
                approved_departments = row.get('approved_departments', '').split(';') if row.get('approved_departments') else []
                
                user_doc = {
                    "id": user_id,
                    "username": row['username'],
                    "email": row['email'],
                    "password_hash": get_password_hash(row['password']),
                    "role": row.get('role', 'user'),
                    "department": row.get('department', ''),
                    "team": row.get('team', ''),
                    "pillar": row.get('pillar', ''),
                    "manager": row.get('manager', ''),
                    "approved_pillars": approved_pillars,
                    "approved_departments": approved_departments,
                    "created_at": datetime.now(timezone.utc).isoformat()
                }
                
                await db.users.insert_one(user_doc)
                created_users.append(row['username'])
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
        
        return {
            "message": f"Bulk upload completed. Created {len(created_users)} users.",
            "created_users": created_users,
            "errors": errors
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")

@api_router.delete("/admin/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_admin_user)):
    # Prevent deletion of demo accounts
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user and user.get("username") in ["admin", "approver1", "user1"]:
        raise HTTPException(status_code=403, detail="Cannot delete demo accounts")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

@api_router.get("/admin/departments", response_model=List[Department])
async def get_departments(pillar: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {"pillar": pillar} if pillar else {}
    departments = await db.departments.find(query, {"_id": 0}).to_list(1000)
    return [Department(**dept) for dept in departments]

@api_router.post("/admin/departments", response_model=Department)
async def create_department(dept_data: DepartmentBase, current_user: dict = Depends(get_admin_user)):
    dept_id = f"dept_{datetime.now(timezone.utc).timestamp()}"
    dept_doc = {"id": dept_id, "name": dept_data.name, "pillar": dept_data.pillar}
    await db.departments.insert_one(dept_doc)
    return Department(**dept_doc)

@api_router.delete("/admin/departments/{dept_id}")
async def delete_department(dept_id: str, current_user: dict = Depends(get_admin_user)):
    result = await db.departments.delete_one({"id": dept_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Department not found")
    return {"message": "Department deleted successfully"}

@api_router.get("/admin/pillars", response_model=List[Pillar])
async def get_pillars(current_user: dict = Depends(get_current_user)):
    pillars = await db.pillars.find({}, {"_id": 0}).to_list(1000)
    return [Pillar(**pillar) for pillar in pillars]

@api_router.post("/admin/pillars", response_model=Pillar)
async def create_pillar(pillar_data: PillarBase, current_user: dict = Depends(get_admin_user)):
    pillar_id = f"pillar_{datetime.now(timezone.utc).timestamp()}"
    pillar_doc = {"id": pillar_id, "name": pillar_data.name}
    await db.pillars.insert_one(pillar_doc)
    return Pillar(**pillar_doc)

@api_router.delete("/admin/pillars/{pillar_id}")
async def delete_pillar(pillar_id: str, current_user: dict = Depends(get_admin_user)):
    result = await db.pillars.delete_one({"id": pillar_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Pillar not found")
    return {"message": "Pillar deleted successfully"}

@api_router.get("/admin/teams", response_model=List[Team])
async def get_teams(pillar: Optional[str] = None, department: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if pillar:
        query["pillar"] = pillar
    if department:
        query["department"] = department
    teams = await db.teams.find(query, {"_id": 0}).to_list(1000)
    return [Team(**team) for team in teams]

@api_router.post("/admin/teams", response_model=Team)
async def create_team(team_data: TeamBase, current_user: dict = Depends(get_admin_user)):
    team_id = f"team_{datetime.now(timezone.utc).timestamp()}"
    team_doc = {"id": team_id, "name": team_data.name, "pillar": team_data.pillar, "department": team_data.department}
    await db.teams.insert_one(team_doc)
    return Team(**team_doc)

@api_router.delete("/admin/teams/{team_id}")
async def delete_team(team_id: str, current_user: dict = Depends(get_admin_user)):
    result = await db.teams.delete_one({"id": team_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Team not found")
    return {"message": "Team deleted successfully"}

# ==================== TECH PERSONS ROUTES ====================

@api_router.get("/admin/tech-persons", response_model=List[TechPerson])
async def get_tech_persons(current_user: dict = Depends(get_current_user)):
    tech_persons = await db.tech_persons.find({}, {"_id": 0}).to_list(1000)
    return [TechPerson(**person) for person in tech_persons]

@api_router.post("/admin/tech-persons", response_model=TechPerson)
async def create_tech_person(person_data: TechPersonBase, current_user: dict = Depends(get_admin_user)):
    person_id = f"tech_{datetime.now(timezone.utc).timestamp()}"
    person_doc = {
        "id": person_id,
        "name": person_data.name,
        "email": person_data.email,
        "specialization": person_data.specialization
    }
    await db.tech_persons.insert_one(person_doc)
    return TechPerson(**person_doc)

@api_router.delete("/admin/tech-persons/{person_id}")
async def delete_tech_person(person_id: str, current_user: dict = Depends(get_admin_user)):
    result = await db.tech_persons.delete_one({"id": person_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Tech person not found")
    return {"message": "Tech person deleted successfully"}

# ==================== SEED DATA ====================

@api_router.post("/admin/seed-data")
async def seed_data(current_user: dict = Depends(get_admin_user)):
    # Check if already seeded
    existing_pillars = await db.pillars.count_documents({})
    if existing_pillars > 0:
        return {"message": "Data already seeded"}
    
    # Seed pillars
    pillars = ["GBS", "Tech", "Finance", "HR"]
    for pillar_name in pillars:
        pillar_id = f"pillar_{datetime.now(timezone.utc).timestamp()}_{pillar_name}"
        await db.pillars.insert_one({"id": pillar_id, "name": pillar_name})
    
    # Seed teams
    teams = [
        {"name": "Allowance Billing", "pillar": "GBS"},
        {"name": "Pre-audit and AB", "pillar": "GBS"}
    ]
    for team in teams:
        team_id = f"team_{datetime.now(timezone.utc).timestamp()}_{team['name']}"
        await db.teams.insert_one({"id": team_id, "name": team["name"], "pillar": team["pillar"]})
    
    # Seed departments
    departments = ["Operations", "Technology", "Finance", "Human Resources"]
    for dept_name in departments:
        dept_id = f"dept_{datetime.now(timezone.utc).timestamp()}_{dept_name}"
        await db.departments.insert_one({"id": dept_id, "name": dept_name})
    
    # Seed sample users
    sample_users = [
        {
            "username": "admin", 
            "email": "admin@philtech.com", 
            "password": "admin123", 
            "role": "admin", 
            "department": "Operations",
            "pillar": "GBS",
            "manager": "",
            "approved_pillars": [],
            "approved_departments": []
        },
        {
            "username": "approver1", 
            "email": "approver1@philtech.com", 
            "password": "approver123", 
            "role": "approver", 
            "department": "Operations",
            "pillar": "GBS",
            "manager": "admin",
            "approved_pillars": ["GBS", "Tech"],
            "approved_departments": ["Operations", "Technology"]
        },
        {
            "username": "user1", 
            "email": "user1@philtech.com", 
            "password": "user123", 
            "role": "user", 
            "department": "Operations", 
            "team": "Allowance Billing",
            "pillar": "GBS",
            "manager": "approver1",
            "approved_pillars": [],
            "approved_departments": []
        }
    ]
    
    for user_data in sample_users:
        user_id = f"user_{datetime.now(timezone.utc).timestamp()}_{user_data['username']}"
        await db.users.insert_one({
            "id": user_id,
            "username": user_data["username"],
            "email": user_data["email"],
            "password_hash": get_password_hash(user_data["password"]),
            "role": user_data["role"],
            "department": user_data["department"],
            "team": user_data.get("team"),
            "pillar": user_data.get("pillar", ""),
            "manager": user_data.get("manager", ""),
            "approved_pillars": user_data.get("approved_pillars", []),
            "approved_departments": user_data.get("approved_departments", []),
            "created_at": datetime.now(timezone.utc).isoformat()
        })
    
    # Seed sample ideas
    approver_user = await db.users.find_one({"role": "approver"}, {"_id": 0})
    regular_user = await db.users.find_one({"role": "user"}, {"_id": 0})
    
    if approver_user and regular_user:
        sample_ideas = [
            {
                "title": "Automate Invoice Processing",
                "pillar": "GBS",
                "improvement_type": "Automation",
                "current_process": "Manual invoice data entry and validation",
                "suggested_solution": "Implement OCR and AI-powered invoice processing system",
                "benefits": "Reduce processing time by 70% and eliminate manual errors",
                "target_completion": "Q2 2025",
                "department": "Operations",
                "team": "Allowance Billing",
                "status": "pending"
            },
            {
                "title": "Standardize Approval Workflows",
                "pillar": "Tech",
                "improvement_type": "Standardization",
                "current_process": "Different approval processes across departments",
                "suggested_solution": "Create unified approval workflow system",
                "benefits": "Improve consistency and reduce approval time by 40%",
                "target_completion": "Q3 2025",
                "department": "Technology",
                "team": None,
                "status": "approved"
            }
        ]
        
        for idea_data in sample_ideas:
            idea_number = await generate_idea_number()
            idea_id = f"idea_{datetime.now(timezone.utc).timestamp()}_{idea_data['title']}"
            await db.ideas.insert_one({
                "id": idea_id,
                "idea_number": idea_number,
                "pillar": idea_data["pillar"],
                "title": idea_data["title"],
                "improvement_type": idea_data["improvement_type"],
                "current_process": idea_data["current_process"],
                "suggested_solution": idea_data["suggested_solution"],
                "benefits": idea_data["benefits"],
                "target_completion": idea_data["target_completion"],
                "department": idea_data["department"],
                "team": idea_data["team"],
                "status": idea_data["status"],
                "submitted_by": regular_user["id"],
                "submitted_by_username": regular_user["username"],
                "assigned_approver": approver_user["id"],
                "assigned_approver_username": approver_user["username"],
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            })
    
    return {"message": "Sample data seeded successfully"}

# ==================== APP INITIALIZATION ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()