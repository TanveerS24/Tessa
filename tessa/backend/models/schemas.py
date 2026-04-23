from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


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


class ChatSession(BaseModel):
    id: Optional[str] = None
    title: str
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    is_temporary: bool = False
    message_count: int = 0


class ChatSessionDetail(ChatSession):
    messages: List[ConversationEntry] = []


class ChatSessionListResponse(BaseModel):
    sessions: List[ChatSession]
    total: int


class ChatRequest(BaseModel):
    message: str = Field(..., description="User message to Tessa")
    session_id: Optional[str] = Field(None, description="Session ID to continue existing chat")
    is_temporary: bool = Field(False, description="If true, chat won't be stored in memory/context")
    generate_title: bool = Field(True, description="Auto-generate title from first message")


class DataExportResponse(BaseModel):
    conversations: List[Dict[str, Any]]
    context: List[Dict[str, Any]]
    chat_sessions: List[Dict[str, Any]]
    export_timestamp: datetime = Field(default_factory=datetime.utcnow)
