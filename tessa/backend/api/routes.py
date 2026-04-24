from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import List
from models.schemas import (
    ChatRequest,
    ChatResponse,
    ContextEntry,
    ContextEntryResponse,
    ContextListResponse,
    ConversationHistoryResponse,
    ConversationEntry,
    SystemStatus,
    ChatSession,
    ChatSessionDetail,
    ChatSessionListResponse,
    DataExportResponse
)
from services.memory_service import MemoryService
from services.ollama_service import ollama_service
from services.database import db_manager

router = APIRouter()


@router.get("/health", response_model=SystemStatus)
async def health_check():
    """Check system health status."""
    ollama_ok = await ollama_service.health_check()
    mongo_ok = db_manager.health_check()

    return SystemStatus(
        status="healthy" if (ollama_ok and mongo_ok) else "degraded",
        ollama_connected=ollama_ok,
        mongodb_connected=mongo_ok,
        model=ollama_service.model
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Process a chat message from the user.
    Supports continuing existing chats via session_id.
    Supports temporary chats that won't be stored in memory.
    """
    try:
        memory_service = MemoryService()
        session_id = request.session_id

        # Handle session creation/continuation
        if session_id:
            # Continue existing session
            session = memory_service.get_chat_session(session_id)
            if not session:
                raise HTTPException(status_code=404, detail="Chat session not found")
        elif not request.is_temporary:
            # Create new persistent session
            title = memory_service.generate_chat_title(request.message) if request.generate_title else "New Chat"
            session_id = memory_service.create_chat_session(title=title, is_temporary=False)

        # Build prompt with context (skip memory for temporary chats)
        if request.is_temporary:
            # For temporary chats, don't include past conversations in context
            prompt = memory_service.build_prompt_for_session(request.message, session_id, include_memory=False)
        else:
            prompt = memory_service.build_prompt(request.message)

        # Generate response from Ollama
        ai_response = await ollama_service.generate(prompt)

        # Store conversation in database
        memory_service.store_conversation_with_session(
            request.message, 
            ai_response, 
            session_id=session_id,
            is_temporary=request.is_temporary
        )

        return ChatResponse(response=ai_response)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat processing failed: {str(e)}")


@router.get("/conversations", response_model=ConversationHistoryResponse)
async def get_conversations(limit: int = 50):
    """Get recent conversation history."""
    try:
        memory_service = MemoryService()
        conversations = memory_service.get_recent_conversations(limit=limit)

        entries = [
            ConversationEntry(
                user_message=conv["user_message"],
                ai_response=conv["ai_response"],
                timestamp=conv["timestamp"]
            )
            for conv in conversations
        ]

        return ConversationHistoryResponse(
            conversations=entries,
            total=len(entries)
        )
    except Exception as e:
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to fetch conversations: {str(e)}"
        )


@router.get("/context", response_model=ContextListResponse)
async def get_context():
    """Get all stored context entries."""
    try:
        memory_service = MemoryService()
        contexts = memory_service.get_all_context()

        entries = [
            ContextEntryResponse(
                id=ctx.get("id"),
                key=ctx["key"],
                value=ctx["value"],
                updated_at=ctx.get("updated_at")
            )
            for ctx in contexts
        ]

        return ContextListResponse(contexts=entries)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch context: {str(e)}"
        )


@router.post("/context", response_model=ContextEntryResponse)
async def store_context(entry: ContextEntry):
    """Store or update a context entry."""
    try:
        memory_service = MemoryService()
        success = memory_service.store_context(entry.key, entry.value)

        if not success:
            raise HTTPException(
                status_code=500,
                detail="Failed to store context"
            )

        return ContextEntryResponse(
            key=entry.key,
            value=entry.value
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to store context: {str(e)}"
        )


@router.delete("/context/{key}")
async def delete_context(key: str):
    """Delete a context entry by key."""
    try:
        if db_manager.context is None:
            raise HTTPException(status_code=500, detail="Database not connected")

        result = db_manager.context.delete_one({"key": key})

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail=f"Context key '{key}' not found")

        return JSONResponse(
            content={"message": f"Context key '{key}' deleted successfully"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete context: {str(e)}"
        )


# Chat Session Endpoints

@router.get("/sessions", response_model=ChatSessionListResponse)
async def list_sessions(include_temporary: bool = False):
    """Get all chat sessions, optionally including temporary ones."""
    try:
        memory_service = MemoryService()
        sessions = memory_service.get_all_chat_sessions(include_temporary=include_temporary)
        return ChatSessionListResponse(sessions=sessions, total=len(sessions))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch sessions: {str(e)}")


@router.post("/sessions", response_model=ChatSession)
async def create_session(title: str = None, is_temporary: bool = False):
    """Create a new chat session."""
    try:
        memory_service = MemoryService()
        session_id = memory_service.create_chat_session(title=title or "New Chat", is_temporary=is_temporary)
        if not session_id:
            raise HTTPException(status_code=500, detail="Failed to create session")
        
        return ChatSession(
            id=session_id,
            title=title or "New Chat",
            is_temporary=is_temporary,
            message_count=0
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create session: {str(e)}")


@router.get("/sessions/{session_id}", response_model=ChatSessionDetail)
async def get_session(session_id: str):
    """Get a specific chat session with all its messages."""
    try:
        memory_service = MemoryService()
        
        # Get session details
        session = memory_service.get_chat_session(session_id)
        if not session:
            raise HTTPException(status_code=404, detail="Chat session not found")
        
        # Get session messages
        messages = memory_service.get_session_messages(session_id)
        
        # Build conversation entries
        message_entries = [
            ConversationEntry(
                user_message=msg["user_message"],
                ai_response=msg["ai_response"],
                timestamp=msg["timestamp"]
            )
            for msg in messages
        ]
        
        return ChatSessionDetail(
            id=session.get("id"),
            title=session.get("title", "Untitled"),
            created_at=session.get("created_at"),
            updated_at=session.get("updated_at"),
            is_temporary=session.get("is_temporary", False),
            message_count=session.get("message_count", 0),
            messages=message_entries
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch session: {str(e)}")


@router.delete("/sessions/{session_id}")
async def delete_session(session_id: str):
    """Delete a chat session and all its messages.
    
    Note: This does NOT delete any context memory entries.
    User facts and preferences stored in context are preserved.
    """
    try:
        memory_service = MemoryService()
        success = memory_service.delete_chat_session(session_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete session")
        
        return JSONResponse(content={"message": "Session deleted successfully"})
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete session: {str(e)}")


# Data Export Endpoint

@router.get("/data/export", response_model=DataExportResponse)
async def export_data():
    """Export all data from the database in JSON format."""
    try:
        memory_service = MemoryService()
        data = memory_service.get_all_data_for_export()
        
        return DataExportResponse(
            conversations=data["conversations"],
            context=data["context"],
            chat_sessions=data["chat_sessions"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to export data: {str(e)}")
