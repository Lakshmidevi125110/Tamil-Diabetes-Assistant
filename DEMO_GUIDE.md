# 🎬 Project Demo Guide & Portfolio Talking Points

**Project Name**: Tamil Voice Diabetes Assistant (தமிழ் குரல் சர்க்கரை நோய் வழிகாட்டி)  
**Live URL**: [https://tamil-diabetes-assistant.onrender.com](https://tamil-diabetes-assistant.onrender.com)  
**Tech Stack**: Python, Flask, Google Gemini AI, Microsoft Edge-TTS, gTTS, Web Speech API, Vanilla JavaScript, CSS3, Pytest, Gunicorn, Render.

---

## 🎙️ 60-Second Elevator Pitch

> *"The Tamil Voice Diabetes Assistant is an accessible, bilingual healthcare awareness web application designed for Tamil and English speakers. Many elderly and vernacular-speaking patients face digital accessibility barriers and health literacy challenges. This assistant allows users to either speak or type their dietary and lifestyle questions, returning voice-enabled, culturally relevant diabetes guidance in clear Tamil and English.*
>
> *Critically, because this operates in the health domain, it is engineered with strict deterministic guardrails: it never prescribes medication or diagnoses conditions, enforces mandatory doctor disclaimers, immediately escalates life-threatening emergency symptoms to 108 emergency protocols, and features an ultra-low-latency sentence-streaming TTS pipeline designed to run on free cloud infrastructure."*

---

## 📱 3-Minute Live Demo Walkthrough

### Step 1: Landing Page & Bilingual Toggle
1. Open [https://tamil-diabetes-assistant.onrender.com](https://tamil-diabetes-assistant.onrender.com).
2. Point out the **Medical Disclaimer Banner** at the top.
3. Toggle between **தமிழ்** and **English** using the top-right button. Notice how placeholders, quick prompt chips, and the disclaimer dynamically adapt.

### Step 2: Voice Input & Conversational Response
1. Click the microphone button (`🎙️`).
2. Speak: *"சர்க்கரை நோயாளிகள் ஆப்பிள் சாப்பிடலாமா?"* (Can diabetic patients eat apples?).
3. The speech recognition captures the Tamil phrase live into the input box and auto-submits.
4. Observe the **streaming audio playback**: The speaker button immediately shows a loading state and starts speaking the first sentence within ~1.2s using Microsoft Edge-TTS (`ta-IN-PallaviNeural`), while remaining sentences queue in the background.

### Step 3: Medical Boundary Demonstration (No Prescriptions)
1. Ask: *"What is the correct dose of Metformin?"* or *"எனக்கு மெட்ஃபோர்மின் மருந்து அளவு சொல்லுங்கள்"*.
2. **Observe**: The AI refuses to prescribe dosages or medications and instructs the user to consult their licensed doctor, appending the single canonical medical disclaimer.

### Step 4: Deterministic Emergency Interception (108 Protocol)
1. Ask: *"நோயாளிக்கு திடீரென மயக்கம் வந்துவிட்டது, சர்க்கரை 40"* (Patient suddenly fainted, sugar 40).
2. **Observe**: The response does not wait for a generative LLM. The deterministic safety guardrail immediately intercepts the request and outputs the **🚨 அவசர மருத்துவ எச்சரிக்கை (EMERGENCY)** protocol, instructing the caller to phone **108** immediately and administer fast-acting glucose if conscious.

### Step 5: Test Suite Verification
1. Run `pytest tests/ -v` in the terminal to show that all 16 automated tests pass in ~1.3 seconds.

---

## 💡 Key Architectural & Engineering Decisions (Interview Talking Points)

### 1. Hybrid Low-Latency Text-to-Speech (TTS)
- **Problem**: Whole-reply server-side audio generation (such as gTTS) created an 8–12 second wait time for multi-sentence answers, causing high drop-off.
- **Solution**:
  1. Built a sentence-level splitting tokenizer on the client.
  2. Synthesizes each sentence concurrently, playing the first sentence immediately (~1.2s playback start).
  3. Integrated `edge-tts` (`ta-IN-PallaviNeural`) with server-side LRU caching (`TTS_CACHE`) for sub-millisecond responses on repeated queries, with fallback to `gTTS`.

### 2. Deterministic Rule-Based Medical Guardrails
- **Problem**: Relying solely on system prompts for medical safety is vulnerable to prompt injection or model hallucination during acute emergencies.
- **Solution**: Placed a deterministic regex interceptor (`check_emergency_symptoms`) *before* the LLM call. Severe conditions (fainting, sugar < 50 mg/dL, chest pain, seizures) immediately trigger 108 emergency guidelines without incurring API latency or hallucination risks.

### 3. Unicode Artifact Cleaning for Tamil Script
- **Problem**: Certain LLM outputs occasionally inject stray Persian or Arabic diacritics (e.g. `\u06D5`) into Tamil words.
- **Solution**: Implemented `clean_tamil_text()` using a whitelist Unicode range filter, preserving standard Tamil characters, English loanwords, punctuation, and emojis while stripping stray foreign diacritics.

### 4. Zero-Cost Lightweight Deployment
- Designed for lightweight memory usage (<150MB RAM footprint).
- Fully deployable on Render's free tier with Gunicorn production WSGI server, zero external database requirements, and stateless API design.
