from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ChatRequest(BaseModel):
    message: str = Field(..., description="User message to Tessa")


class ChatResponse(BaseModel):
    response: str = Field(..., description="Tessa's response")
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class ContextEntry(BaseModel):
    key: str = Field(..., description="Context key (e.g., 'name', 'preferences')")
    value: str = Field(..., description="Context value")


class ContextEntryResponse(ContextEntry):
    id: Optional[str] = None
    updated_at: Optional[datetime] = None


class ConversationEntry(BaseModel):
    user_message: str
    ai_response: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    metadata: Optional[Dict[str, Any]] = None


class ConversationHistoryResponse(BaseModel):
    conversations: List[ConversationEntry]
    total: int


class ContextListResponse(BaseModel):
    contexts: List[ContextEntryResponse]


class VoiceCommandRequest(BaseModel):
    command: str = Field(..., description="Voice command text")


class SystemStatus(BaseModel):
    status: str
    ollama_connected: bool
    mongodb_connected: bool
    model: str
