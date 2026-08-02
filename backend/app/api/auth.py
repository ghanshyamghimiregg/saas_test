from fastapi import APIRouter, Depends, HTTPException, status, Request, Response
from sqlalchemy.orm import Session

from app.models.user import User
from app.core.deps import get_current_user
from app.core.database import get_db
from app.core.security import create_access_token, create_refresh_token, decode_token
from app.schemas.user import UserCreate, UserLogin, UserOut, Token
from app.crud.user import create_user, get_user_by_email, authenticate_user
from app.crud.audit_log import log_action
from app.core.limiter import limiter

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, request: Request, db: Session = Depends(get_db)):
    existing = get_user_by_email(db, user_in.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = create_user(db, user_in)
    log_action(db, action="register", user_id=user.id, ip_address=request.client.host)
    return user


@router.post("/login", response_model=Token)
@limiter.limit("5/minute")
def login(credentials: UserLogin, request: Request, response: Response, db: Session = Depends(get_db)):
    user = authenticate_user(db, credentials.email, credentials.password)
    ip = request.client.host

    if not user:
        log_action(db, action="login_failed", user_id=None, ip_address=ip, details=f"email={credentials.email}")
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    if not user.is_active:
        log_action(db, action="login_failed_inactive", user_id=user.id, ip_address=ip)
        raise HTTPException(status_code=403, detail="Account is inactive")

    token_data = {"sub": str(user.id), "role": user.role.value}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,  # set True once you're on HTTPS in production
        samesite="lax",
        max_age=60 * 60 * 24 * 7,  # 7 days, matches REFRESH_TOKEN_EXPIRE_DAYS
    )

    log_action(db, action="login_success", user_id=user.id, ip_address=ip)

    return Token(access_token=access_token)

@router.post("/refresh", response_model=Token)
def refresh_access_token(request: Request, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="No refresh token provided")

    payload = decode_token(refresh_token)
    if payload is None or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")

    user_id = payload.get("sub")
    from app.crud.user import get_user_by_id
    import uuid as _uuid
    user = get_user_by_id(db, _uuid.UUID(user_id))

    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or inactive")

    new_access_token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return Token(access_token=new_access_token)

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.post("/logout")
def logout(response: Response, request: Request, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    response.delete_cookie(key="refresh_token")
    log_action(db, action="logout", user_id=current_user.id, ip_address=request.client.host)
    return {"message": "Logged out successfully"}