# 🩺 Tamil Voice Diabetes Assistant (தமிழ் குரல் சர்க்கரை நோய் வழிகாட்டி)

A voice-enabled AI health awareness assistant designed for Tamil and English speakers. It delivers conversational diabetes education, dietary guidelines, and lifestyle insights while enforcing strict medical safety guardrails.

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
Frontend (HTML5 / CSS3 / Vanilla JS + Web Speech API)
       │ HTTP / JSON
       ▼
Backend (Flask REST API + CORS + Blueprints)
 ├── config.py           (Environment settings)
 ├── routes/             (health, chat blueprints)
 └── services/           (Gemini AI, Text-to-Speech)
       │
       ▼
AI & Speech Engine (Gemini 2.5 Flash + Browser TTS)
```

---

## 📁 Project Structure

```
Tamil-Diabetes-Assistant/
├── config.py             # Application configuration & environment loader
├── app.py                # Main Flask entrypoint & application factory
├── routes/               # Modular API route blueprints
│   ├── __init__.py
│   ├── health.py         # Health check endpoint (GET /health)
│   └── chat.py           # Chat & validation endpoint (POST /chat)
├── services/             # Business logic (AI and Speech integrations)
│   └── __init__.py
├── static/               # Frontend static assets
│   ├── css/              # Stylesheets
│   └── js/               # Client-side JavaScript
├── templates/            # HTML templates
├── .env                  # Environment secrets (ignored by Git)
├── .gitignore            # Git ignore rules
├── requirements.txt      # Python dependencies
└── README.md             # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites

- Python 3.10 or higher
- Google Chrome or Microsoft Edge (for Web Speech recognition)
- Free Gemini API key from [Google AI Studio](https://aistudio.google.com/)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/Tamil-Diabetes-Assistant.git
   cd Tamil-Diabetes-Assistant
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On Linux/macOS:
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   Create a `.env` file in the project root:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   GEMINI_MODEL=gemini-2.5-flash
   PORT=5000
   DEBUG=True
   ```

5. **Run the server:**
   ```bash
   python app.py
   ```
   Visit `http://localhost:5000/health` in your browser to verify.

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

## 🗺️ Development Roadmap

- [x] **Module 1**: Backend architecture, CORS, modular blueprints, logging, `.gitignore`, README skeleton.
- [x] **Module 2**: Gemini API integration with safety prompts & error handling.
- [x] **Module 3**: Responsive chat frontend (Tamil/English toggle, disclaimer banner).
- [ ] **Module 4**: Browser Web Speech-to-Text integration with fallbacks.
- [ ] **Module 5**: Text-to-Speech synthesis for natural voice replies.
- [ ] **Module 6**: Safety guardrails, length limits, and edge case hardening.
- [ ] **Module 7**: Automated testing with pytest.
- [ ] **Module 8**: Cloud deployment (Render/HuggingFace).
- [ ] **Module 9**: Portfolio polish, demo scripts, and final documentation.
