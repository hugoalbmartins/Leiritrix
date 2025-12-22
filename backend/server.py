from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr, field_validator
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from enum import Enum
import re
import secrets
import string

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'leiritrix-crm-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Create the main app
app = FastAPI(title="CRM Leiritrix API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

security = HTTPBearer()

# Enums
class UserRole(str, Enum):
    ADMIN = "admin"
    BACKOFFICE = "backoffice"
    VENDEDOR = "vendedor"

class SaleStatus(str, Enum):
    EM_NEGOCIACAO = "em_negociacao"
    PERDIDO = "perdido"
    PENDENTE = "pendente"
    ATIVO = "ativo"
    ANULADO = "anulado"

class SaleCategory(str, Enum):
    ENERGIA = "energia"
    TELECOMUNICACOES = "telecomunicacoes"
    PAINEIS_SOLARES = "paineis_solares"

class SaleType(str, Enum):
    NOVA_INSTALACAO = "nova_instalacao"
    REFID = "refid"

class EnergyType(str, Enum):
    ELETRICIDADE = "eletricidade"
    GAS = "gas"
    DUAL = "dual"

# Portuguese power values (potências)
POTENCIAS_PORTUGAL = [
    "1.15", "2.3", "3.45", "4.6", "5.75", "6.9", "10.35", "13.8", 
    "17.25", "20.7", "27.6", "34.5", "41.4", "Outra"
]

# Password validation regex
# Min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
PASSWORD_PATTERN = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};:\'",.<>?/\\|`~])[A-Za-z\d!@#$%^&*()_+\-=\[\]{};:\'",.<>?/\\|`~]{8,}$')

def validate_password(password: str) -> bool:
    """Validate password meets security requirements"""
    return bool(PASSWORD_PATTERN.match(password))

def generate_password(length: int = 12) -> str:
    """Generate a random password that meets all requirements"""
    # Ensure at least one of each required character type
    lowercase = secrets.choice(string.ascii_lowercase)
    uppercase = secrets.choice(string.ascii_uppercase)
    digit = secrets.choice(string.digits)
    special = secrets.choice('!@#$%^&*()_+-=[]{}')
    
    # Fill the rest with a mix
    remaining_length = length - 4
    all_chars = string.ascii_letters + string.digits + '!@#$%^&*()_+-=[]{}' 
    remaining = ''.join(secrets.choice(all_chars) for _ in range(remaining_length))
    
    # Combine and shuffle
    password_chars = list(lowercase + uppercase + digit + special + remaining)
    secrets.SystemRandom().shuffle(password_chars)
    
    return ''.join(password_chars)

# Models
class UserBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    email: EmailStr
    name: str
    role: UserRole = UserRole.VENDEDOR

class UserCreate(UserBase):
    password: Optional[str] = None  # Now optional - will be auto-generated if not provided

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    role: Optional[UserRole] = None
    password: Optional[str] = None

class PasswordChange(BaseModel):
    current_password: str
    new_password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    active: bool = True
    must_change_password: bool = False

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: UserRole
    active: bool
    must_change_password: bool = False

# Partner Models
class PartnerBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    name: str
    email: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None

class PartnerCreate(PartnerBase):
    pass

class PartnerUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    contact_person: Optional[str] = None
    phone: Optional[str] = None

class Partner(PartnerBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    active: bool = True

# Sale Models
class SaleBase(BaseModel):
    model_config = ConfigDict(extra="ignore")
    # Client info
    client_name: str
    client_email: Optional[str] = None
    client_phone: Optional[str] = None
    client_address: Optional[str] = None
    client_nif: Optional[str] = None
    # Contract info
    category: SaleCategory
    sale_type: Optional[SaleType] = None
    partner_id: str  # Now required - reference to Partner
    contract_value: float = 0
    loyalty_months: int = 0
    notes: Optional[str] = None
    # Energy specific fields
    energy_type: Optional[EnergyType] = None
    cpe: Optional[str] = None
    potencia: Optional[str] = None
    cui: Optional[str] = None
    escalao: Optional[str] = None
    # Telecom specific fields
    req: Optional[str] = None

class SaleCreate(SaleBase):
    pass

# Limited update - only status, date, notes, REQ (telecom), commission
class SaleUpdate(BaseModel):
    status: Optional[SaleStatus] = None
    active_date: Optional[str] = None  # ISO date string
    notes: Optional[str] = None
    req: Optional[str] = None  # Only for telecom
    commission: Optional[float] = None  # Can be edited by Admin/BO

class Sale(SaleBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: SaleStatus = SaleStatus.EM_NEGOCIACAO
    seller_id: str
    seller_name: str
    partner_name: str = ""  # Denormalized for display
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    active_date: Optional[datetime] = None
    loyalty_end_date: Optional[datetime] = None
    commission: Optional[float] = None
    commission_assigned_by: Optional[str] = None
    commission_assigned_at: Optional[datetime] = None

class CommissionAssign(BaseModel):
    commission: float

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    payload = decode_token(credentials.credentials)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="Utilizador não encontrado")
    return user

async def require_admin_or_backoffice(user: dict = Depends(get_current_user)):
    if user["role"] not in [UserRole.ADMIN, UserRole.BACKOFFICE]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    return user

async def require_admin(user: dict = Depends(get_current_user)):
    if user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Apenas administradores")
    return user

# Auth endpoints
@api_router.post("/auth/register", response_model=UserResponse)
async def register_user(user_data: UserCreate, current_user: dict = Depends(require_admin)):
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email já registado")
    
    user = User(**user_data.model_dump(exclude={"password"}))
    user_dict = user.model_dump()
    user_dict["password_hash"] = hash_password(user_data.password)
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    return UserResponse(**user_dict)

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    
    if not user.get("active", True):
        raise HTTPException(status_code=401, detail="Conta desativada")
    
    token = create_token(user["id"], user["email"], user["role"])
    return {
        "token": token,
        "user": UserResponse(**user)
    }

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(**user)

# Users endpoints
@api_router.get("/users", response_model=List[UserResponse])
async def list_users(current_user: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    return [UserResponse(**u) for u in users]

@api_router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    return UserResponse(**user)

@api_router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(user_id: str, update_data: UserUpdate, current_user: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    # Handle password update
    if "password" in update_dict:
        update_dict["password_hash"] = hash_password(update_dict.pop("password"))
    
    # Check for email conflict
    if "email" in update_dict and update_dict["email"] != user["email"]:
        existing = await db.users.find_one({"email": update_dict["email"]})
        if existing:
            raise HTTPException(status_code=400, detail="Email já registado")
    
    if update_dict:
        await db.users.update_one({"id": user_id}, {"$set": update_dict})
    
    updated_user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return UserResponse(**updated_user)

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    # Prevent self-deletion
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Não pode eliminar a própria conta")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    return {"message": "Utilizador eliminado"}

@api_router.put("/users/{user_id}/toggle-active")
async def toggle_user_active(user_id: str, current_user: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utilizador não encontrado")
    
    new_status = not user.get("active", True)
    await db.users.update_one({"id": user_id}, {"$set": {"active": new_status}})
    return {"message": "Status atualizado", "active": new_status}

# Partner endpoints
@api_router.post("/partners")
async def create_partner(partner_data: PartnerCreate, current_user: dict = Depends(require_admin_or_backoffice)):
    partner = Partner(**partner_data.model_dump())
    partner_dict = partner.model_dump()
    partner_dict["created_at"] = partner_dict["created_at"].isoformat()
    
    await db.partners.insert_one(partner_dict)
    partner_dict.pop("_id", None)
    return partner_dict

@api_router.get("/partners")
async def list_partners(current_user: dict = Depends(get_current_user)):
    partners = await db.partners.find({"active": True}, {"_id": 0}).sort("name", 1).to_list(1000)
    return partners

@api_router.get("/partners/all")
async def list_all_partners(current_user: dict = Depends(require_admin_or_backoffice)):
    partners = await db.partners.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return partners

@api_router.get("/partners/{partner_id}")
async def get_partner(partner_id: str, current_user: dict = Depends(get_current_user)):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Parceiro não encontrado")
    return partner

@api_router.put("/partners/{partner_id}")
async def update_partner(partner_id: str, update_data: PartnerUpdate, current_user: dict = Depends(require_admin_or_backoffice)):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Parceiro não encontrado")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_dict:
        await db.partners.update_one({"id": partner_id}, {"$set": update_dict})
    
    updated_partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    return updated_partner

@api_router.delete("/partners/{partner_id}")
async def delete_partner(partner_id: str, current_user: dict = Depends(require_admin_or_backoffice)):
    # Check if partner has sales
    sales_count = await db.sales.count_documents({"partner_id": partner_id})
    if sales_count > 0:
        # Soft delete - just deactivate
        await db.partners.update_one({"id": partner_id}, {"$set": {"active": False}})
        return {"message": "Parceiro desativado (tem vendas associadas)"}
    
    result = await db.partners.delete_one({"id": partner_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Parceiro não encontrado")
    return {"message": "Parceiro eliminado"}

@api_router.put("/partners/{partner_id}/toggle-active")
async def toggle_partner_active(partner_id: str, current_user: dict = Depends(require_admin_or_backoffice)):
    partner = await db.partners.find_one({"id": partner_id}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=404, detail="Parceiro não encontrado")
    
    new_status = not partner.get("active", True)
    await db.partners.update_one({"id": partner_id}, {"$set": {"active": new_status}})
    return {"message": "Status atualizado", "active": new_status}

# Utility endpoint for potências
@api_router.get("/config/potencias")
async def get_potencias():
    return POTENCIAS_PORTUGAL

# Sales endpoints
@api_router.post("/sales", response_model=dict)
async def create_sale(sale_data: SaleCreate, current_user: dict = Depends(get_current_user)):
    # Validate partner exists
    partner = await db.partners.find_one({"id": sale_data.partner_id, "active": True}, {"_id": 0})
    if not partner:
        raise HTTPException(status_code=400, detail="Parceiro não encontrado ou inativo")
    
    sale = Sale(
        **sale_data.model_dump(),
        seller_id=current_user["id"],
        seller_name=current_user["name"],
        partner_name=partner["name"]
    )
    sale_dict = sale.model_dump()
    sale_dict["created_at"] = sale_dict["created_at"].isoformat()
    sale_dict["updated_at"] = sale_dict["updated_at"].isoformat()
    
    await db.sales.insert_one(sale_dict)
    sale_dict.pop("_id", None)
    return sale_dict

@api_router.get("/sales")
async def list_sales(
    status: Optional[SaleStatus] = None,
    category: Optional[SaleCategory] = None,
    seller_id: Optional[str] = None,
    partner_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {}
    
    # Vendedores só veem suas próprias vendas
    if current_user["role"] == UserRole.VENDEDOR:
        query["seller_id"] = current_user["id"]
    elif seller_id:
        query["seller_id"] = seller_id
    
    if status:
        query["status"] = status
    if category:
        query["category"] = category
    if partner_id:
        query["partner_id"] = partner_id
    if search:
        query["$or"] = [
            {"client_name": {"$regex": search, "$options": "i"}},
            {"client_nif": {"$regex": search, "$options": "i"}},
            {"partner_name": {"$regex": search, "$options": "i"}}
        ]
    
    sales = await db.sales.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return sales

@api_router.get("/sales/{sale_id}")
async def get_sale(sale_id: str, current_user: dict = Depends(get_current_user)):
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    # Vendedores só veem suas próprias vendas
    if current_user["role"] == UserRole.VENDEDOR and sale["seller_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    return sale

@api_router.put("/sales/{sale_id}")
async def update_sale(sale_id: str, update_data: SaleUpdate, current_user: dict = Depends(get_current_user)):
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    # Vendedores só editam suas próprias vendas
    if current_user["role"] == UserRole.VENDEDOR and sale["seller_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Acesso negado")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    # REQ field only allowed for telecom
    if "req" in update_dict and sale.get("category") != SaleCategory.TELECOMUNICACOES:
        del update_dict["req"]
    
    # Commission can only be edited by Admin/BO
    if "commission" in update_dict:
        if current_user["role"] not in [UserRole.ADMIN, UserRole.BACKOFFICE]:
            del update_dict["commission"]
        else:
            update_dict["commission_assigned_by"] = current_user["name"]
            update_dict["commission_assigned_at"] = datetime.now(timezone.utc).isoformat()
    
    # Handle active_date parsing
    if "active_date" in update_dict and update_dict["active_date"]:
        try:
            active_date = datetime.fromisoformat(update_dict["active_date"].replace("Z", "+00:00"))
            update_dict["active_date"] = active_date.isoformat()
            
            # Calculate loyalty end date
            loyalty_months = sale.get("loyalty_months", 0)
            if loyalty_months > 0:
                loyalty_end = active_date + timedelta(days=loyalty_months * 30)
                update_dict["loyalty_end_date"] = loyalty_end.isoformat()
        except ValueError:
            raise HTTPException(status_code=400, detail="Formato de data inválido")
    
    # Se o status mudar para ATIVO e não há active_date, definir agora
    if update_data.status == SaleStatus.ATIVO and sale.get("status") != SaleStatus.ATIVO:
        if not sale.get("active_date") and "active_date" not in update_dict:
            active_date = datetime.now(timezone.utc)
            update_dict["active_date"] = active_date.isoformat()
            
            loyalty_months = sale.get("loyalty_months", 0)
            if loyalty_months > 0:
                loyalty_end = active_date + timedelta(days=loyalty_months * 30)
                update_dict["loyalty_end_date"] = loyalty_end.isoformat()
    
    await db.sales.update_one({"id": sale_id}, {"$set": update_dict})
    
    updated_sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    return updated_sale

@api_router.delete("/sales/{sale_id}")
async def delete_sale(sale_id: str, current_user: dict = Depends(require_admin_or_backoffice)):
    result = await db.sales.delete_one({"id": sale_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    return {"message": "Venda eliminada"}

# Commission endpoints
@api_router.put("/sales/{sale_id}/commission")
async def assign_commission(
    sale_id: str, 
    commission_data: CommissionAssign, 
    current_user: dict = Depends(require_admin_or_backoffice)
):
    sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    if not sale:
        raise HTTPException(status_code=404, detail="Venda não encontrada")
    
    update_dict = {
        "commission": commission_data.commission,
        "commission_assigned_by": current_user["name"],
        "commission_assigned_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.sales.update_one({"id": sale_id}, {"$set": update_dict})
    
    updated_sale = await db.sales.find_one({"id": sale_id}, {"_id": 0})
    return updated_sale

# Dashboard / Metrics endpoints
@api_router.get("/dashboard/metrics")
async def get_dashboard_metrics(current_user: dict = Depends(get_current_user)):
    query = {}
    if current_user["role"] == UserRole.VENDEDOR:
        query["seller_id"] = current_user["id"]
    
    total_sales = await db.sales.count_documents(query)
    
    pipeline = [
        {"$match": query},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}}
    ]
    status_counts = await db.sales.aggregate(pipeline).to_list(100)
    status_dict = {s["_id"]: s["count"] for s in status_counts}
    
    pipeline_cat = [
        {"$match": query},
        {"$group": {"_id": "$category", "count": {"$sum": 1}}}
    ]
    category_counts = await db.sales.aggregate(pipeline_cat).to_list(100)
    category_dict = {c["_id"]: c["count"] for c in category_counts}
    
    active_query = {**query, "status": SaleStatus.ATIVO}
    pipeline_value = [
        {"$match": active_query},
        {"$group": {"_id": None, "total": {"$sum": "$contract_value"}}}
    ]
    value_result = await db.sales.aggregate(pipeline_value).to_list(1)
    total_value = value_result[0]["total"] if value_result else 0
    
    pipeline_commission = [
        {"$match": {**query, "commission": {"$ne": None}}},
        {"$group": {"_id": None, "total": {"$sum": "$commission"}}}
    ]
    commission_result = await db.sales.aggregate(pipeline_commission).to_list(1)
    total_commission = commission_result[0]["total"] if commission_result else 0
    
    # Total mensalidades contratadas (telecomunicações apenas)
    telecom_query = {**query, "category": SaleCategory.TELECOMUNICACOES}
    pipeline_mensalidades = [
        {"$match": telecom_query},
        {"$group": {"_id": None, "total": {"$sum": "$contract_value"}}}
    ]
    mensalidades_result = await db.sales.aggregate(pipeline_mensalidades).to_list(1)
    total_mensalidades = mensalidades_result[0]["total"] if mensalidades_result else 0
    
    # Comissões previstas (vendas em estado pendente)
    pendente_query = {**query, "status": SaleStatus.PENDENTE, "commission": {"$ne": None}}
    pipeline_previstas = [
        {"$match": pendente_query},
        {"$group": {"_id": None, "total": {"$sum": "$commission"}}}
    ]
    previstas_result = await db.sales.aggregate(pipeline_previstas).to_list(1)
    comissoes_previstas = previstas_result[0]["total"] if previstas_result else 0
    
    # Comissões ativas (vendas em estado ativo)
    ativo_query = {**query, "status": SaleStatus.ATIVO, "commission": {"$ne": None}}
    pipeline_ativas = [
        {"$match": ativo_query},
        {"$group": {"_id": None, "total": {"$sum": "$commission"}}}
    ]
    ativas_result = await db.sales.aggregate(pipeline_ativas).to_list(1)
    comissoes_ativas = ativas_result[0]["total"] if ativas_result else 0
    
    now = datetime.now(timezone.utc)
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    month_query = {**query, "created_at": {"$gte": start_of_month.isoformat()}}
    sales_this_month = await db.sales.count_documents(month_query)
    
    return {
        "total_sales": total_sales,
        "sales_by_status": status_dict,
        "sales_by_category": category_dict,
        "total_contract_value": total_value,
        "total_commission": total_commission,
        "total_mensalidades": total_mensalidades,
        "comissoes_previstas": comissoes_previstas,
        "comissoes_ativas": comissoes_ativas,
        "sales_this_month": sales_this_month
    }

@api_router.get("/dashboard/monthly-stats")
async def get_monthly_stats(months: int = 6, current_user: dict = Depends(get_current_user)):
    query = {}
    if current_user["role"] == UserRole.VENDEDOR:
        query["seller_id"] = current_user["id"]
    
    now = datetime.now(timezone.utc)
    stats = []
    
    for i in range(months - 1, -1, -1):
        month_start = (now.replace(day=1) - timedelta(days=i * 30)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        if month_start.month == 12:
            month_end = month_start.replace(year=month_start.year + 1, month=1)
        else:
            month_end = month_start.replace(month=month_start.month + 1)
        
        month_query = {
            **query,
            "created_at": {
                "$gte": month_start.isoformat(),
                "$lt": month_end.isoformat()
            }
        }
        
        count = await db.sales.count_documents(month_query)
        
        pipeline = [
            {"$match": {**month_query, "status": SaleStatus.ATIVO}},
            {"$group": {"_id": None, "total": {"$sum": "$contract_value"}}}
        ]
        value_result = await db.sales.aggregate(pipeline).to_list(1)
        value = value_result[0]["total"] if value_result else 0
        
        stats.append({
            "month": month_start.strftime("%b %Y"),
            "sales": count,
            "value": value
        })
    
    return stats

# Loyalty Alerts endpoint
@api_router.get("/alerts/loyalty")
async def get_loyalty_alerts(current_user: dict = Depends(get_current_user)):
    now = datetime.now(timezone.utc)
    alert_threshold = now + timedelta(days=7 * 30)  # 7 months
    
    query = {
        "status": SaleStatus.ATIVO,
        "loyalty_end_date": {"$ne": None, "$lte": alert_threshold.isoformat()}
    }
    
    if current_user["role"] == UserRole.VENDEDOR:
        query["seller_id"] = current_user["id"]
    
    alerts = await db.sales.find(query, {"_id": 0}).sort("loyalty_end_date", 1).to_list(100)
    
    for alert in alerts:
        if alert.get("loyalty_end_date"):
            end_date = datetime.fromisoformat(alert["loyalty_end_date"].replace("Z", "+00:00"))
            days_left = (end_date - now).days
            alert["days_until_end"] = max(0, days_left)
    
    return alerts

# Reports endpoint
@api_router.get("/reports/sales")
async def generate_sales_report(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    category: Optional[SaleCategory] = None,
    status: Optional[SaleStatus] = None,
    seller_id: Optional[str] = None,
    partner_id: Optional[str] = None,
    current_user: dict = Depends(require_admin_or_backoffice)
):
    query = {}
    
    if start_date:
        query["created_at"] = {"$gte": start_date}
    if end_date:
        if "created_at" in query:
            query["created_at"]["$lte"] = end_date
        else:
            query["created_at"] = {"$lte": end_date}
    if category:
        query["category"] = category
    if status:
        query["status"] = status
    if seller_id:
        query["seller_id"] = seller_id
    if partner_id:
        query["partner_id"] = partner_id
    
    sales = await db.sales.find(query, {"_id": 0}).sort("created_at", -1).to_list(10000)
    
    total_value = sum(s.get("contract_value", 0) for s in sales)
    total_commission = sum(s.get("commission", 0) or 0 for s in sales)
    
    return {
        "sales": sales,
        "summary": {
            "total_count": len(sales),
            "total_value": total_value,
            "total_commission": total_commission
        }
    }

# Initialize default admin user
@api_router.post("/init")
async def init_system():
    admin = await db.users.find_one({"role": UserRole.ADMIN})
    if admin:
        return {"message": "Sistema já inicializado"}
    
    admin_user = User(
        email="admin@leiritrix.pt",
        name="Administrador",
        role=UserRole.ADMIN
    )
    admin_dict = admin_user.model_dump()
    admin_dict["password_hash"] = hash_password("admin123")
    admin_dict["created_at"] = admin_dict["created_at"].isoformat()
    
    await db.users.insert_one(admin_dict)
    
    return {
        "message": "Sistema inicializado",
        "admin_email": "admin@leiritrix.pt",
        "admin_password": "admin123"
    }

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "CRM Leiritrix API", "version": "1.1.0"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
