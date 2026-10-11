import uuid
from typing import Optional
from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User
from backend.schemas import AgentChatRequest, AgentChatResponse
from backend.services.agent_service import AIAgentService
from backend.security import get_optional_user

router = APIRouter(prefix="/agent", tags=["AI Shopping Agent"])

@router.post("/chat", response_model=AgentChatResponse)
def agent_chat(
    payload: AgentChatRequest,
    x_session_id: Optional[str] = Header(None),
    user: Optional[User] = Depends(get_optional_user),
    db: Session = Depends(get_db)
):
    session_id = payload.session_id or x_session_id or f"sess-{uuid.uuid4().hex[:8]}"
    
    try:
        result = AIAgentService.process_chat(
            db=db,
            message=payload.message,
            session_id=session_id,
            user=user,
            provider=payload.provider,
            model=payload.model
        )
        return result
    except Exception as e:
        return {
            "reply": f"I encountered an issue processing your request: {str(e)}. Please check your AI API key in `.env`.",
            "session_id": session_id,
            "recommended_products": [],
            "actions_taken": [f"Error: {str(e)}"],
            "cart_updated": False
        }
