# Tessa 🎙️

A voice-first, fully offline desktop AI assistant with a strong personality.

## Overview

Tessa is a single-user desktop AI assistant that runs entirely on your local machine. She has a distinct personality — calm, confident, and slightly playful — and can remember conversations and user preferences over time.

### Wake Words
- "Hey Tessa"
- "Hey Tess"
- "Tessa"
- "Tess"

## Architecture

```
┌─────────────────┐
│   Electron +    │
│     React       │  ← Frontend (desktop UI)
│   (Port 3000)   │
└────────┬────────┘
         │
         │ HTTP
         ▼
┌─────────────────┐
│    FastAPI      │  ← Backend (API server)
│   (Port 8000)   │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌─────────────┐
│MongoDB │ │   Ollama    │  ← AI running locally
│(Docker)│ │ (localhost: │     on host machine
└────────┘ │   11434)    │
           └─────────────┘
```

## Tech Stack

- **Frontend**: Electron + React (minimal UI with chat window)
- **Backend**: FastAPI (Python)
- **AI**: Ollama running locally (default: llama3 8B)
- **Database**: MongoDB (Docker container)
- **Orchestration**: Docker Compose

## Project Structure

```
tessa/
├── backend/              # FastAPI backend
│   ├── api/              # API routes
│   │   └── routes.py     # /chat, /context endpoints
│   ├── models/           # Pydantic schemas
│   │   └── schemas.py
│   ├── services/         # Business logic
│   │   ├── database.py   # MongoDB connection
│   │   ├── memory_service.py   # RAG context retrieval
│   │   ├── ollama_service.py   # Ollama integration
│   │   └── voice_service.py    # Voice placeholders
│   ├── main.py           # FastAPI app entry point
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/             # Electron + React
│   ├── src/
│   │   ├── components/   # React components
│   │   │   ├── ChatWindow.js
│   │   │   ├── Message.js
│   │   │   └── InputArea.js
│   │   ├── services/
│   │   │   └── api.js     # Backend API client
│   │   ├── App.js
│   │   └── index.js
│   ├── public/
│   │   └── index.html
│   ├── main.js           # Electron main process
│   ├── preload.js        # Electron preload
│   └── package.json
├── docker/
│   └── docker-compose.yml # Docker orchestration
└── README.md
```

## Prerequisites

1. **Docker & Docker Compose** - For running MongoDB and backend
2. **Ollama** - Install from [ollama.ai](https://ollama.ai) and pull a model:
   ```bash
   ollama pull mistral
   ```
3. **Node.js 18+** - For running the Electron frontend

## Quick Start

### 1. Start Ollama

Make sure Ollama is running on your machine:

```bash
ollama serve
```

### 2. Start Backend & Database

```bash
cd docker
docker-compose up -d
```

This starts:
- MongoDB on port 27017
- FastAPI backend on port 8000

### 3. Start Frontend

In a new terminal:

```bash
cd frontend
npm install
npm run electron-dev
```

The Electron app will open. You can now chat with Tessa!

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | System health check |
| `/api/chat` | POST | Send message to Tessa |
| `/api/conversations` | GET | Get conversation history |
| `/api/context` | GET | Get all stored context |
| `/api/context` | POST | Store/update context |
| `/api/context/{key}` | DELETE | Delete context entry |

## Features

### 1. Voice System (Placeholder)
The architecture is ready for:
- Wake word detection
- Speech-to-text (STT)
- Text-to-speech (TTS)

Currently simulates with text input/output.

### 2. Chat System
- User sends message (text for now)
- Backend retrieves memory and builds prompt
- Calls Ollama for response
- Stores conversation in MongoDB
- Displays response in UI

### 3. Memory System
Two MongoDB collections:

**convo**: Stores full conversations
- `user_message`
- `ai_response`
- `timestamp`

**context**: Stores persistent user data
- `key` (e.g., "name", "preferences")
- `value`
- `updated_at`

### 4. RAG-like Context Retrieval
Before sending to Ollama:
- Fetches recent conversations (last N)
- Fetches all context entries
- Injects into system prompt as "memory"

### 5. Tessa's Personality
System prompt enforces:
- Calm, confident, slightly teasing tone
- Short responses
- Conversational (no bullet points)
- Asks follow-up questions
- Acts like a best friend, not formal AI

## Environment Variables

### Backend

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` | `mongodb://mongodb:27017/tessa` | MongoDB connection |
| `OLLAMA_HOST` | `http://host.docker.internal:11434` | Ollama API |
| `OLLAMA_MODEL` | `mistral` | Model to use |
| `HOST` | `0.0.0.0` | API bind host |
| `PORT` | `8000` | API port |

### Frontend

Create `.env` in `frontend/`:
```
REACT_APP_API_URL=http://localhost:8000/api
```

## Development Commands

### Backend (without Docker)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run in browser (for development)
npm start

# Run Electron app
npm run electron-dev

# Build for production
npm run build

# Package Electron app
npm run package
```

### Docker

```bash
cd docker

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all
docker-compose down

# Rebuild after code changes
docker-compose up -d --build
```

## Future-Ready Design

The codebase is modular and ready for:

1. **Voice Input/Output** - Placeholder structure exists
2. **System Commands** - Command execution framework ready
3. **Wake Word Listener** - Wake word service defined
4. **File Search/Control** - Can be added as new services

## Troubleshooting

### Ollama Connection Issues

If the backend can't connect to Ollama:

1. Verify Ollama is running:
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. On macOS, if using Docker Desktop, you may need to:
   ```bash
   # Start Ollama with host binding
   OLLAMA_HOST=0.0.0.0 ollama serve
   ```

3. Update `docker-compose.yml` with correct host:
   ```yaml
   environment:
     - OLLAMA_HOST=http://host.docker.internal:11434
   ```

### MongoDB Issues

Reset the database:
```bash
cd docker
docker-compose down -v
docker-compose up -d
```

### Frontend Can't Connect to Backend

1. Verify backend is running:
   ```bash
   curl http://localhost:8000/api/health
   ```

2. Check CORS settings in `backend/main.py`

## License

MIT - Feel free to use and modify!

## Credits

Built with:
- [Ollama](https://ollama.ai) - Local LLM runner
- [FastAPI](https://fastapi.tiangolo.com) - Web framework
- [Electron](https://electronjs.org) - Desktop framework
- [MongoDB](https://mongodb.com) - Database
