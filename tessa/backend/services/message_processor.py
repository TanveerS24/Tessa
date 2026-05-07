"""
Message Processing Service
Handles three-queue processing: response generation, title generation, and context extraction
"""

import asyncio
from typing import Dict, List, Optional, Tuple
from enum import Enum
import json
from datetime import datetime

from .memory_service import MemoryService
from api.ollama_service import OllamaService


class ContextPriority(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class MessageProcessor:
    """Processes messages through three queues with priority-based context management"""
    
    def __init__(self):
        self.memory_service = MemoryService()
        self.ollama_service = OllamaService()
        
    async def process_message(self, message: str, session_id: Optional[str] = None, 
                           is_temporary: bool = False, is_first_message: bool = False) -> Dict:
        """
        Process message through three queues:
        1. Generate response
        2. Generate title (if first message)
        3. Extract context with priority
        """
        
        results = {
            "response": None,
            "title": None,
            "contexts": []
        }
        
        # Queue 1: Generate response (always)
        results["response"] = await self._generate_response(message, session_id, is_temporary)
        
        # Queue 2: Generate title (only if first message and not temporary)
        if is_first_message and not is_temporary:
            results["title"] = await self._generate_title(message)
        
        # Queue 3: Extract context (only if not temporary)
        if not is_temporary:
            results["contexts"] = await self._extract_context_with_priority(message, results["response"])
            
        return results
    
    async def _generate_response(self, message: str, session_id: Optional[str], is_temporary: bool) -> str:
        """Generate AI response for the user message"""
        try:
            if is_temporary:
                # For temporary chats, don't include past conversations
                prompt = self.memory_service.build_prompt_for_session(message, session_id, include_memory=False)
            else:
                # Include full context and memory
                prompt = self.memory_service.build_prompt(message)
            
            response = await self.ollama_service.generate(prompt)
            return response
            
        except Exception as e:
            print(f"Error generating response: {e}")
            return "I apologize, but I'm having trouble generating a response right now."
    
    async def _generate_title(self, message: str) -> str:
        """Generate AI title for the chat session"""
        try:
            title_prompt = f"""Generate a very short, descriptive title (max 5 words) for this chat message. 
            The title should capture the main topic or question.
            
            Message: "{message}"
            
            Title (max 5 words):"""
            
            ai_title = await self.ollama_service.generate(title_prompt)
            
            # Clean up the AI response
            title = ai_title.strip().strip('"').strip("'")
            
            # Limit to 5 words max
            words = title.split()[:5]
            title = " ".join(words)
            
            return title if title else "New Chat"
            
        except Exception as e:
            print(f"Error generating title: {e}")
            # Fallback to simple truncation
            words = message.strip().split()[:5]
            return " ".join(words) if words else "New Chat"
    
    async def _extract_context_with_priority(self, user_message: str, ai_response: str) -> List[Dict]:
        """Extract context using AI with priority assessment"""
        try:
            # Let Ollama decide what context to extract and its priority
            context_prompt = f"""Analyze this conversation and extract important context about the user.
            For each piece of context, determine its priority (high/medium/low) based on importance.
            
            High priority: Name, critical preferences, important facts, allergies, urgent information
            Medium priority: General preferences, work details, location, hobbies
            Low priority: Casual mentions, temporary states, minor details
            
            Respond with JSON format:
            {{
                "contexts": [
                    {{
                        "key": "user_name",
                        "value": "extracted value",
                        "priority": "high",
                        "reason": "brief explanation"
                    }}
                ]
            }}
            
            User message: "{user_message}"
            AI response: "{ai_response}"
            
            Analysis:"""
            
            ai_context = await self.ollama_service.generate(context_prompt)
            
            # Parse the AI response
            try:
                context_data = json.loads(ai_context)
                contexts = []
                
                for ctx in context_data.get("contexts", []):
                    context_entry = {
                        "key": ctx.get("key", ""),
                        "value": ctx.get("value", ""),
                        "priority": ctx.get("priority", "medium").lower(),
                        "reason": ctx.get("reason", ""),
                        "timestamp": datetime.utcnow().isoformat()
                    }
                    contexts.append(context_entry)
                
                return contexts
                
            except json.JSONDecodeError:
                print(f"Failed to parse AI context response: {ai_context}")
                return []
                
        except Exception as e:
            print(f"Error extracting context: {e}")
            return []
    
    async def manage_context_memory(self, action: str, contexts: List[Dict] = None) -> Dict:
        """
        Let Ollama manage context memory operations
        Actions: add, remove, update, prioritize, cleanup
        """
        try:
            # Get current context
            current_contexts = self.memory_service.get_all_context()
            
            if action == "cleanup":
                # Let AI decide which contexts to keep/remove
                cleanup_prompt = f"""Review these user contexts and decide which ones to keep, update, or remove.
                Consider relevance, accuracy, and priority.
                
                Current contexts:
                {json.dumps([{"key": c["key"], "value": c["value"], "priority": c.get("priority", "medium")} for c in current_contexts], indent=2)}
                
                Respond with JSON:
                {{
                    "actions": [
                        {{
                            "key": "context_key",
                            "action": "keep/remove/update",
                            "new_value": "updated_value_if_updating",
                            "priority": "high/medium/low",
                            "reason": "explanation"
                        }}
                    ]
                }}
                
                Analysis:"""
                
                ai_response = await self.ollama_service.generate(cleanup_prompt)
                
                try:
                    cleanup_data = json.loads(ai_response)
                    results = []
                    
                    for action_item in cleanup_data.get("actions", []):
                        key = action_item.get("key")
                        action_type = action_item.get("action")
                        
                        if action_type == "remove":
                            success = self.memory_service.delete_context_by_key(key)
                            results.append({"key": key, "action": "remove", "success": success})
                        elif action_type == "update":
                            new_value = action_item.get("new_value", "")
                            priority = action_item.get("priority", "medium")
                            success = self.memory_service.update_context(key, new_value)
                            results.append({"key": key, "action": "update", "success": success})
                        elif action_type == "keep":
                            results.append({"key": key, "action": "keep", "success": True})
                    
                    return {"results": results}
                    
                except json.JSONDecodeError:
                    print(f"Failed to parse cleanup response: {ai_response}")
                    return {"results": []}
            
            return {"results": []}
            
        except Exception as e:
            print(f"Error managing context memory: {e}")
            return {"results": []}
    
    async def store_extracted_contexts(self, contexts: List[Dict]) -> int:
        """Store extracted contexts with priority"""
        stored_count = 0
        
        for context in contexts:
            try:
                success = self.memory_service.add_context(
                    key=context["key"],
                    value=context["value"]
                )
                if success:
                    stored_count += 1
                    print(f"Stored context: {context['key']} = {context['value']} (priority: {context['priority']})")
                    
            except Exception as e:
                print(f"Error storing context {context['key']}: {e}")
        
        return stored_count
