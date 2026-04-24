from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from bson.objectid import ObjectId
from services.database import get_db


class MemoryService:
    """Handles RAG-like context retrieval for Tessa's conversations."""

    DEFAULT_RECENT_CONVERSATIONS = 10
    SYSTEM_PROMPT = """You are Tessa, a voice-first AI assistant with a distinct personality.

Personality traits:
- Calm and confident in your responses
- Slightly playful and teasing (like a witty best friend)
- Conversational and natural (never use bullet points or formal structures)
- Strictly no longer than 2 sentences unless required
- You keep responses short and engaging
- You're not afraid to ask follow-up questions to keep the conversation flowing
- You're not afraid to be a bit sarcastic or witty
- You're responses should not feel heavy or overly structured
- Behave like the users personal secretary and assistant
- You give concise and direct answers
- You don't over-explain unless asked
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

    def build_prompt_for_session(
        self,
        user_message: str,
        session_id: str = None,
        conversation_limit: int = None,
        include_memory: bool = True
    ) -> str:
        """Build prompt for a specific session, optionally excluding memory."""
        if include_memory:
            # Use standard prompt with full memory
            return self.build_prompt(user_message, conversation_limit)

        # For temporary chats, only include user context, not past conversations
        context = self.get_user_context()
        context_str = self.format_context_for_prompt(context)

        system_prompt = self.SYSTEM_PROMPT.format(
            user_context=context_str,
            recent_conversations="No previous conversation history (temporary chat)."
        )

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

    def generate_chat_title(self, message: str) -> str:
        """Generate a concise title from the first message."""
        words = message.strip().split()[:8]
        title = " ".join(words)
        if len(message) > 50:
            title += "..."
        return title if title else "New Chat"

    def create_chat_session(self, title: str = None, is_temporary: bool = False) -> Optional[str]:
        """Create a new chat session and return its ID."""
        if self.db.chat_sessions is None:
            return None

        try:
            session_doc = {
                "title": title or "New Chat",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "is_temporary": is_temporary,
                "message_count": 0
            }
            result = self.db.chat_sessions.insert_one(session_doc)
            return str(result.inserted_id)
        except Exception as e:
            print(f"Error creating chat session: {e}")
            return None

    def get_chat_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get a chat session by ID."""
        if self.db.chat_sessions is None:
            return None

        try:
            session = self.db.chat_sessions.find_one({"_id": ObjectId(session_id)})
            if session:
                session["id"] = str(session.pop("_id"))
            return session
        except Exception as e:
            print(f"Error fetching chat session: {e}")
            return None

    def get_session_messages(self, session_id: str) -> List[Dict[str, Any]]:
        """Get all messages for a specific chat session."""
        if self.db.conversations is None:
            return []

        try:
            cursor = (self.db.conversations
                     .find({"session_id": session_id})
                     .sort("timestamp", 1))

            messages = []
            for doc in cursor:
                messages.append({
                    "user_message": doc.get("user_message", ""),
                    "ai_response": doc.get("ai_response", ""),
                    "timestamp": doc.get("timestamp", datetime.utcnow())
                })
            return messages
        except Exception as e:
            print(f"Error fetching session messages: {e}")
            return []

    def get_all_chat_sessions(self, include_temporary: bool = False) -> List[Dict[str, Any]]:
        """Get all chat sessions, optionally excluding temporary ones."""
        if self.db.chat_sessions is None:
            return []

        try:
            query = {} if include_temporary else {"is_temporary": False}
            cursor = (self.db.chat_sessions
                     .find(query)
                     .sort("updated_at", -1))

            sessions = []
            for doc in cursor:
                sessions.append({
                    "id": str(doc.get("_id")),
                    "title": doc.get("title", "Untitled"),
                    "created_at": doc.get("created_at"),
                    "updated_at": doc.get("updated_at"),
                    "is_temporary": doc.get("is_temporary", False),
                    "message_count": doc.get("message_count", 0)
                })
            return sessions
        except Exception as e:
            print(f"Error fetching chat sessions: {e}")
            return []

    def store_conversation_with_session(
        self,
        user_message: str,
        ai_response: str,
        session_id: str = None,
        is_temporary: bool = False
    ) -> bool:
        """Store a conversation entry with optional session support."""
        if self.db.conversations is None:
            return False

        try:
            # Build the conversation document
            conv_doc = {
                "user_message": user_message,
                "ai_response": ai_response,
                "timestamp": datetime.utcnow(),
                "is_temporary": is_temporary
            }
            if session_id:
                conv_doc["session_id"] = session_id

            # Store the conversation
            self.db.conversations.insert_one(conv_doc)

            # Update session if provided
            if session_id and self.db.chat_sessions is not None:
                self.db.chat_sessions.update_one(
                    {"_id": ObjectId(session_id)},
                    {
                        "$set": {"updated_at": datetime.utcnow()},
                        "$inc": {"message_count": 1}
                    }
                )

            return True
        except Exception as e:
            print(f"Error storing conversation: {e}")
            return False

    def update_session_title(self, session_id: str, title: str) -> bool:
        """Update the title of a chat session."""
        if self.db.chat_sessions is None:
            return False

        try:
            result = self.db.chat_sessions.update_one(
                {"_id": ObjectId(session_id)},
                {"$set": {"title": title, "updated_at": datetime.utcnow()}}
            )
            return result.modified_count > 0
        except Exception as e:
            print(f"Error updating session title: {e}")
            return False

    def delete_chat_session(self, session_id: str) -> bool:
        """Delete a chat session and all its messages.
        
        Note: This does NOT delete any context memory entries (user facts, preferences).
        Context memory is stored separately and persists even when chat sessions are deleted.
        """
        if self.db.chat_sessions is None or self.db.conversations is None:
            return False

        try:
            # Delete all messages for this session
            self.db.conversations.delete_many({"session_id": session_id})
            # Delete the session
            self.db.chat_sessions.delete_one({"_id": ObjectId(session_id)})
            # Note: We intentionally do NOT delete from the context collection
            # This preserves user's learned preferences and facts
            return True
        except Exception as e:
            print(f"Error deleting chat session: {e}")
            return False

    def get_all_data_for_export(self) -> Dict[str, List[Dict[str, Any]]]:
        """Export all data from the database."""
        data = {
            "conversations": [],
            "context": [],
            "chat_sessions": []
        }

        # Export conversations (exclude temporary ones by default)
        if self.db.conversations is not None:
            try:
                for doc in self.db.conversations.find({"is_temporary": {"$ne": True}}):
                    doc["id"] = str(doc.pop("_id"))
                    data["conversations"].append(doc)
            except Exception as e:
                print(f"Error exporting conversations: {e}")

        # Export context
        if self.db.context is not None:
            try:
                for doc in self.db.context.find():
                    doc["id"] = str(doc.pop("_id"))
                    data["context"].append(doc)
            except Exception as e:
                print(f"Error exporting context: {e}")

        # Export chat sessions (exclude temporary ones)
        if self.db.chat_sessions is not None:
            try:
                for doc in self.db.chat_sessions.find({"is_temporary": False}):
                    doc["id"] = str(doc.pop("_id"))
                    data["chat_sessions"].append(doc)
            except Exception as e:
                print(f"Error exporting chat sessions: {e}")

        return data
