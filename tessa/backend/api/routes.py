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
    SystemStatus
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
    
    1. Retrieves memory (context + recent conversations)
    2. Builds prompt with personality
    3. Calls Ollama
    4. Stores conversation in database
    5. Returns AI response
    """
    try:
        memory_service = MemoryService()

        # Build prompt with context
        prompt = memory_service.build_prompt(request.message)

        # Generate response from Ollama
        ai_response = await ollama_service.generate(prompt)

        # Store conversation in database
        memory_service.store_conversation(request.message, ai_response)

        return ChatResponse(response=ai_response)

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
