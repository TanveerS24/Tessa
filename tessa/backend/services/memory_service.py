from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from services.database import get_db


class MemoryService:
    """Handles RAG-like context retrieval for Tessa's conversations."""

    DEFAULT_RECENT_CONVERSATIONS = 10
    SYSTEM_PROMPT = """You are Tessa, a voice-first AI assistant with a distinct personality.

Personality traits:
- Calm and confident in your responses
- Slightly playful and teasing (like a witty best friend)
- Conversational and natural (never use bullet points or formal structures)
- You keep responses short and engaging
- You're not afraid to ask follow-up questions to keep the conversation flowing
- You remember details about the user and reference them naturally

Important: You have access to previous conversations and user context. Use this information to personalize your responses, but don't explicitly mention "according to my records" or similar phrases. Just naturally incorporate what you know.

Current user context:
{user_context}

Recent conversation history:
{recent_conversations}

Remember: Be Tessa. A best friend assistant who's helpful but has personality."""

    def __init__(self):
        self.db = get_db()

    def get_user_context(self) -> Dict[str, str]:
        """Fetch all persistent context entries for the user."""
        context_entries = {}
        if self.db.context is None:
            return context_entries

        try:
            entries = self.db.context.find()
            for entry in entries:
                key = entry.get("key")
                value = entry.get("value")
                if key and value:
                    context_entries[key] = value
        except Exception as e:
            print(f"Error fetching context: {e}")

        return context_entries

    def get_recent_conversations(self, limit: int = None) -> List[Dict[str, Any]]:
        """Fetch recent conversations from the database."""
        if limit is None:
            limit = self.DEFAULT_RECENT_CONVERSATIONS

        conversations = []
        if self.db.conversations is None:
            return conversations

        try:
            cursor = (self.db.conversations
                     .find()
                     .sort("timestamp", -1)
                     .limit(limit))

            for doc in cursor:
                conversations.append({
                    "user_message": doc.get("user_message", ""),
                    "ai_response": doc.get("ai_response", ""),
                    "timestamp": doc.get("timestamp", datetime.utcnow())
                })

            # Reverse to get chronological order
            conversations.reverse()
        except Exception as e:
            print(f"Error fetching conversations: {e}")

        return conversations

    def format_context_for_prompt(self, context: Dict[str, str]) -> str:
        """Format user context as a readable string for the prompt."""
        if not context:
            return "No specific user context stored yet."

        formatted = []
        for key, value in context.items():
            formatted.append(f"- {key}: {value}")
        return "\n".join(formatted)

    def format_conversations_for_prompt(self, conversations: List[Dict[str, Any]]) -> str:
        """Format conversation history as a readable string for the prompt."""
        if not conversations:
            return "No previous conversation history."

        formatted = []
        for conv in conversations:
            user_msg = conv.get("user_message", "")
            ai_resp = conv.get("ai_response", "")
            formatted.append(f"User: {user_msg}")
            formatted.append(f"Tessa: {ai_resp}")
            formatted.append("")

        return "\n".join(formatted)

    def build_prompt(self, user_message: str, conversation_limit: int = None) -> str:
        """Build the full prompt with context and conversation history."""
        context = self.get_user_context()
        recent_conversations = self.get_recent_conversations(conversation_limit)

        context_str = self.format_context_for_prompt(context)
        conversations_str = self.format_conversations_for_prompt(recent_conversations)

        system_prompt = self.SYSTEM_PROMPT.format(
            user_context=context_str,
            recent_conversations=conversations_str
        )

        # Build the final prompt
        full_prompt = f"{system_prompt}\n\nCurrent message from user: {user_message}\n\nTessa:"
        return full_prompt

    def store_conversation(self, user_message: str, ai_response: str) -> bool:
        """Store a conversation entry in the database."""
        if self.db.conversations is None:
            return False

        try:
            self.db.conversations.insert_one({
                "user_message": user_message,
                "ai_response": ai_response,
                "timestamp": datetime.utcnow()
            })
            return True
        except Exception as e:
            print(f"Error storing conversation: {e}")
            return False

    def store_context(self, key: str, value: str) -> bool:
        """Store or update a context entry."""
        if self.db.context is None:
            return False

        try:
            self.db.context.update_one(
                {"key": key},
                {
                    "$set": {
                        "value": value,
                        "updated_at": datetime.utcnow()
                    }
                },
                upsert=True
            )
            return True
        except Exception as e:
            print(f"Error storing context: {e}")
            return False

    def get_all_context(self) -> List[Dict[str, Any]]:
        """Get all context entries."""
        if self.db.context is None:
            return []

        try:
            entries = []
            for doc in self.db.context.find():
                entries.append({
                    "id": str(doc.get("_id")),
                    "key": doc.get("key", ""),
                    "value": doc.get("value", ""),
                    "updated_at": doc.get("updated_at")
                })
            return entries
        except Exception as e:
            print(f"Error fetching all context: {e}")
            return []
