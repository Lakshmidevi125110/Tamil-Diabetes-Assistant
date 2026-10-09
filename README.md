# 🩺 Tamil Voice Diabetes Assistant (தமிழ் குரல் சர்க்கரை நோய் வழிகாட்டி)

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-backend-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-Vite-61DAFB.svg)](https://react.dev/)
[![Google Gemini](https://img.shields.io/badge/AI-Google%20Gemini-orange.svg)](https://ai.google.dev/)

A voice-enabled AI health awareness assistant designed for Tamil and English speakers. It delivers conversational diabetes education, dietary guidelines, and lifestyle insights while enforcing strict medical safety guardrails.

🔗 **Live Web Application**: [https://tamil-diabetes-assistant.onrender.com](https://tamil-diabetes-assistant.onrender.com)  
📖 **Demo & Interview Guide**: See [`DEMO_GUIDE.md`](DEMO_GUIDE.md) for 60-second elevator pitch and presentation script.

---

## 🌟 Key Features

- 🗣️ **Bilingual Speech Interface**: Converse naturally in Tamil (`ta-IN`) and English (`en-IN`).
- 🤖 **Context-Aware AI Guidance**: Powered by Google Gemini with strict educational guardrails.
- 🛡️ **Built-in Safety Boundaries**:
  - Never provides medical diagnoses or prescriptions.
  - Recommends consulting licensed healthcare professionals.
  - Flags emergency symptoms (severe hypoglycemia/hyperglycemia) for immediate medical attention.
- ⚡ **Lightweight Architecture**: Designed to run smoothly on hardware with 8GB RAM using free-tier cloud services.

---

## 🏛️ Project Architecture

```
User (Voice / Text)
       │
       ▼
frontend/  React + Vite (Web Speech API, localStorage tracker)   → Vercel
       │ HTTPS / JSON  (VITE_API_BASE_URL)
       ▼
backend/   FastAPI + Uvicorn (CORS, rate limits, safety guardrails) → Render
 ├── app/routers/    chat, tts, glucose, questions, health
 └── app/services/   RAG retrieval, Gemini/LLM providers, safety validators
       │
       ├── Google Gemini (answers + embeddings) & edge-tts / gTTS (speech)
       └── Neon PostgreSQL (DATABASE_URL, reserved for upcoming persistence)
```

---

## 📁 Project Structure

```
Tamil-Diabetes-Assistant/
├── backend/                    # FastAPI service (deploys to Render)
│   ├── app/
│   │   ├── main.py             # App factory: CORS, security headers, error handlers
│   │   ├── config.py           # Settings loaded from backend/.env
│   │   ├── routers/            # health, chat (/chat, /rag), tts, glucose, questions
│   │   └── services/           # RAG, embeddings, LLM providers, guardrails, safety
│   ├── data/                   # Knowledge documents, prebuilt vector index, reference JSON
│   ├── scripts/                # add_document, build_index, test_query (run with python -m)
│   ├── tests/                  # pytest suite
│   ├── requirements.txt        # Runtime dependencies
│   ├── requirements-dev.txt    # + pytest, httpx
│   └── .env.example            # Backend environment template
├── frontend/                   # React + Vite app (deploys to Vercel)
│   ├── src/
│   │   ├── components/         # layout/, chat/, tracker/
│   │   ├── hooks/              # speech playback & speech recognition
│   │   ├── lib/                # API client, tracker storage, chart geometry (+ tests)
│   │   ├── data/questions.js   # Fallback suggested questions
│   │   └── i18n.js             # Tamil & English strings
│   ├── vercel.json
│   └── .env.example            # Frontend environment template
├── render.yaml                 # Render blueprint (rootDir: backend)
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.11, Node.js 20+
- Google Chrome or Microsoft Edge (for Web Speech recognition)
- Free Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### 1. Backend (FastAPI) — http://localhost:8000

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows  (Linux/macOS: source .venv/bin/activate)
pip install -r requirements-dev.txt
copy .env.example .env          # Linux/macOS: cp .env.example .env — then set GEMINI_API_KEY
uvicorn app.main:app --reload --port 8000
```

Interactive API docs: http://localhost:8000/docs · Tests: `pytest`

### 2. Frontend (React) — http://localhost:5173

```bash
cd frontend
npm install
copy .env.example .env.local    # Linux/macOS: cp .env.example .env.local
npm run dev
```

Tests: `npm test` · Production build: `npm run build`

### Environment variables

| Where | Variable | Purpose |
|---|---|---|
| `backend/.env` | `GEMINI_API_KEY` | Gemini key (secret) |
| `backend/.env` | `CORS_ORIGINS` | Comma-separated frontend URLs allowed to call the API |
| `backend/.env` | `DATABASE_URL` | Neon PostgreSQL connection string (reserved, not used yet) |
| `frontend/.env.local` | `VITE_API_BASE_URL` | Backend URL. Bundled into the browser — never put secrets here |

`.env` files are git-ignored; only the `.env.example` templates are committed.

---

## 📡 API Endpoints

### 1. Health Check
* **Endpoint**: `GET /health`
* **Response**:
  ```json
  {
    "status": "healthy",
    "service": "Tamil Voice Diabetes Assistant Backend",
    "version": "1.0.0"
  }
  ```

### 2. Chat Query
* **Endpoint**: `POST /chat`
* **Request Body**:
  ```json
  {
    "message": "சர்க்கரை நோயாளிகள் என்ன பழங்கள் சாப்பிடலாம்?",
    "language": "ta"
  }
  ```
* **Response**:
  ```json
  {
    "status": "success",
    "received_message": "சர்க்கரை நோயாளிகள் என்ன பழங்கள் சாப்பிடலாம்?",
    "language": "ta",
    "reply": "..."
  }
  ```

---

## ⚠️ Medical Disclaimer

> **IMPORTANT**: This assistant is built solely for informational and educational purposes. It does not provide medical diagnoses, treatment plans, or drug prescriptions. Always seek guidance from a qualified physician or healthcare provider for personal health decisions. If experiencing acute emergencies (extreme weakness, confusion, chest pain, or fainting), contact local emergency medical services immediately.

---

## 🌐 Deployment

### Backend → Render

Render hosts **only the API**; it no longer serves any web pages.

1. In Render choose **New + → Blueprint** and select this repository; `render.yaml` creates the service from `backend/`
   (start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`, health check: `/health`).
   It redeploys only when files under `backend/` change.
2. Fill in the secret environment variables Render asks for:
   - `GEMINI_API_KEY` — your Gemini key
   - `CORS_ORIGINS` — your Vercel URL, e.g. `https://tamil-diabetes-assistant.vercel.app`
   - `DATABASE_URL` — your Neon connection string (optional for now)

   `CORS_ORIGIN_REGEX` is preset so Vercel preview URLs (`tamil-diabetes-assistant-*.vercel.app`) can call the API;
   change it if your Vercel project has a different name.
3. Delete the old Render service that used to serve the whole app, once the new one is healthy.

### Frontend → Vercel

1. Import the repository in Vercel and set **Root Directory** to `frontend`. `frontend/vercel.json` sets the build, caching and security headers.
2. Add the environment variable `VITE_API_BASE_URL` = your Render URL, e.g. `https://tamil-diabetes-assistant-api.onrender.com`.
3. Deploy, then make sure that Vercel URL is listed in the backend's `CORS_ORIGINS`.

---

## 🗺️ Development Roadmap

- [x] **Module 1**: Backend architecture, CORS, modular blueprints, logging, `.gitignore`, README skeleton.
- [x] **Module 2**: Gemini API integration with safety prompts & error handling.
- [x] **Module 3**: Responsive chat frontend (Tamil/English toggle, disclaimer banner).
- [x] **Module 4**: Browser Web Speech-to-Text integration with fallbacks.
- [x] **Module 5**: Text-to-Speech synthesis for natural voice replies.
- [x] **Module 6**: Safety guardrails, length limits, and edge case hardening.
- [x] **Module 7**: Automated testing with pytest.
- [x] **Module 8**: Cloud deployment (Render/HuggingFace).
- [x] **Module 9**: Portfolio polish, demo scripts, and final documentation.
