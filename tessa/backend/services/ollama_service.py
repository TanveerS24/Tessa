import os
import httpx
from typing import AsyncGenerator, Optional


class OllamaService:
    """Service for interacting with local Ollama instance."""

    DEFAULT_MODEL = "mistral"
    DEFAULT_TIMEOUT = 60.0

    def __init__(self):
        self.base_url = os.getenv("OLLAMA_HOST", "http://host.docker.internal:11434")
        self.model = os.getenv("OLLAMA_MODEL", self.DEFAULT_MODEL)
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=self.DEFAULT_TIMEOUT)
        return self._client

    async def health_check(self) -> bool:
        """Check if Ollama is accessible and the model is available."""
        try:
            client = await self._get_client()
            # Check if Ollama is running
            response = await client.get(f"{self.base_url}/api/tags")
            if response.status_code != 200:
                return False

            # Check if our model is available
            data = response.json()
            models = data.get("models", [])
            model_names = [m.get("name", "").split(":")[0] for m in models]

            return self.model in model_names
        except Exception as e:
            print(f"Ollama health check failed: {e}")
            return False

    async def generate(self, prompt: str, stream: bool = False) -> str:
        """Generate a response from Ollama."""
        client = await self._get_client()

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": stream,
            "options": {
                "temperature": 0.7,
                "top_p": 0.9,
            }
        }

        try:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json=payload
            )
            response.raise_for_status()

            data = response.json()
            return data.get("response", "").strip()
        except httpx.HTTPStatusError as e:
            print(f"Ollama HTTP error: {e}")
            raise Exception(f"Ollama API error: {e.response.status_code}")
        except Exception as e:
            print(f"Ollama generation error: {e}")
            raise Exception(f"Failed to generate response: {str(e)}")

    async def generate_stream(self, prompt: str) -> AsyncGenerator[str, None]:
        """Stream a response from Ollama (for future use)."""
        client = await self._get_client()

        payload = {
            "model": self.model,
            "prompt": prompt,
            "stream": True,
            "options": {
                "temperature": 0.7,
                "top_p": 0.9,
            }
        }

        try:
            async with client.stream(
                "POST",
                f"{self.base_url}/api/generate",
                json=payload
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    if line.strip():
                        import json
                        try:
                            data = json.loads(line)
                            chunk = data.get("response", "")
                            if chunk:
                                yield chunk
                        except json.JSONDecodeError:
                            continue
        except Exception as e:
            print(f"Ollama streaming error: {e}")
            raise Exception(f"Failed to stream response: {str(e)}")

    async def close(self):
        """Close the HTTP client."""
        if self._client:
            await self._client.aclose()
            self._client = None


ollama_service = OllamaService()
