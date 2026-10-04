/**
 * Tamil Voice Diabetes Assistant - Client Application (Phase 1 Redesign)
 * Features:
 * - Professional Bilingual Healthcare UI (Tamil & English)
 * - Browser Web Speech-to-Text with Live Interim Transcript Preview
 * - Hybrid Text-to-Speech with Low-Latency Sentence Streaming (Edge-TTS / gTTS)
 * - Categorized Suggested Question Cards (5 clinical categories)
 * - Clear Chat History & Welcome Hero Card
 * - One-Click Copy Response with Toast Feedback
 * - Distinct High-Visibility Emergency Interceptor Styling (108 Guidance)
 * - In-Memory Audio Caching & Session Cancellation
 */

// 1. Localization Strings & Categorized Clinical Topics
const I18N = {
    ta: {
        title: "தமிழ் குரல் சர்க்கரை நோய் வழிகாட்டி",
        subtitle: "Tamil Voice Diabetes Assistant • கல்வி வழிகாட்டி தளம்",
        eduBadge: "கல்வி விழிப்புணர்வு தளம்",
        disclaimer: `<strong>மருத்துவ எச்சரிக்கை:</strong> இது பொது விழிப்புணர்வு வழிகாட்டி மட்டுமே. மருத்துவ ஆலோசனை அல்ல. அவசர அறிகுறிகள் (மயக்கம், தீவிர நடுக்கம், நெஞ்சு வலி) ஏற்பட்டால் உடனடியாக <strong>108</strong> அவசர சிகிச்சையை அழைக்கவும்.`,
        placeholder: "உங்கள் கேள்வியை இங்கே தட்டச்சு செய்யவும் அல்லது மைக் அழுத்தவும்...",
        privacyNote: "🔒 மருத்துவ ஆலோசனைக்கு உங்கள் மருத்துவரை அணுகவும் • பொது விழிப்புணர்வு வழிகாட்டி",
        clearChat: "அழிக்க",
        clearChatTooltip: "அரட்டையை அழிக்க (Clear Chat)",
        suggestionsTitle: "வழிகாட்டல் தலைப்புகள்:",
        hideSuggestions: "மறைக்க (Hide)",
        showSuggestions: "காட்டுக (Show)",
        welcomeTitle: "வணக்கம்! உங்கள் நீரிழிவு விழிப்புணர்வு வழிகாட்டிக்கு நல்வரவு.",
        welcomeSubtitle: "உணவு முறை, உடற்பயிற்சி மற்றும் வாழ்க்கை முறை குறித்த சந்தேகங்களை கேட்கலாம்.",
        welcomeDesc: "இந்த தளம் நீரிழிவு நோய் மேலாண்மை குறித்த மருத்துவ ரீதியாக சரிபார்க்கப்பட்ட பொது கல்வித் தகவல்களை குரல் மற்றும் உரை வடிவில் வழங்குகிறது. கீழேயுள்ள வழிகாட்டல் தலைப்புகளை தேர்வு செய்யலாம் அல்லது மைக் மூலம் பேசலாம்.",
        pillars: [
            { icon: "🥗", text: "சமச்சீர் உணவு & காய்கறிகள்" },
            { icon: "🏃", text: "தினசரி உடற்பயிற்சி நெறிமுறைகள்" },
            { icon: "🩸", text: "சர்க்கரை அளவுகள் விழிப்புணர்வு" },
            { icon: "⚠️", text: "108 அவசர கால பாதுகாப்பு" }
        ],
        errorMsg: "மன்னிக்கவும்! சர்வரை தொடர்பு கொள்ள முடியவில்லை. உங்கள் இணைய இணைப்பை சரிபார்க்கவும்.",
        thinking: "AI பதிலளிக்கிறது...",
        listening: "🎙️ கேட்கிறது... இப்போது பேசுங்கள்...",
        speechNotSupported: "⚠️ உங்கள் உலாவியில் குரல் அறிதல் (Speech Recognition) வசதி ஆதரிக்கப்படவில்லை. சிறந்த அனுபவத்திற்கு Google Chrome அல்லது Microsoft Edge-ஐப் பயன்படுத்தவும். அல்லது கீழேயுள்ள பெட்டியில் தட்டச்சு செய்யவும்.",
        micPermissionDenied: "⚠️ மைக்ரோஃபோன் அணுகல் மறுக்கப்பட்டது. உலாவியின் அமைப்புகளில் மைக் அனுமதியை வழங்கிவிட்டு மீண்டும் முயற்சிக்கவும்.",
        micTooltipActive: "பேசுவதை நிறுத்த அழுத்தவும் (Click to stop)",
        micTooltipIdle: "குரல் மூலம் பேச (Speak)",
        playAudio: "குரலில் கேட்க (Listen)",
        stopAudio: "ஒலிப்பதை நிறுத்த (Stop audio)",
        preparingAudio: "ஆடியோ தயாராகிறது...",
        ttsErrorMsg: "மன்னிக்கவும்! குரல் ஒலியை உருவாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
        copyText: "நகலெடுக்க (Copy)",
        copiedText: "நகலெடுக்கப்பட்டது! (Copied)",
        emergencyBadge: "🚨 அவசர மருத்துவ எச்சரிக்கை (EMERGENCY 108)",
        categories: [
            {
                id: "basics",
                name: "நீரிழிவு அடிப்படைகள்",
                icon: "🩺",
                questions: [
                    "சர்க்கரை நோய் என்றால் என்ன? அதன் முக்கிய வகைகள் யாவை?",
                    "சாதாரண இரத்த சர்க்கரை அளவு (Fasting & PP) எவ்வளவு இருக்க வேண்டும்?",
                    "டைப் 1 மற்றும் டைப் 2 நீரிழிவு இடையே உள்ள வித்தியாசம் என்ன?"
                ]
            },
            {
                id: "nutrition",
                name: "உணவு & ஊட்டச்சத்து",
                icon: "🥗",
                questions: [
                    "சர்க்கரை நோயாளிகள் ஆப்பிள் மற்றும் கொய்யாப்பழம் சாப்பிடலாமா?",
                    "வெண்டைக்காய் மற்றும் பாகற்காய் சர்க்கரை நோய்க்கு நல்லதா?",
                    "வெள்ளை அரிசிக்கு பதிலாக சிறுதானியங்கள் சாப்பிடலாமா?"
                ]
            },
            {
                id: "lifestyle",
                name: "உடற்பயிற்சி & வாழ்க்கை முறை",
                icon: "🏃",
                questions: [
                    "இரத்த சர்க்கரையை கட்டுப்படுத்த தினமும் எவ்வளவு நேரம் நடைபயிற்சி செய்ய வேண்டும்?",
                    "உடற்பயிற்சி செய்வதற்கு முன் மற்றும் பின் என்ன சாப்பிட வேண்டும்?",
                    "தூக்கமின்மை மற்றும் மன அழுத்தம் சர்க்கரை அளவை அதிகரிக்குமா?"
                ]
            },
            {
                id: "symptoms",
                name: "அறிகுறிகள் & விழிப்புணர்வு",
                icon: "🔍",
                questions: [
                    "குறைந்த சர்க்கரை அளவு (Hypoglycemia) அறிகுறிகள் என்ன?",
                    "அதிக சர்க்கரை அளவு (Hyperglycemia) எச்சரிக்கை அறிகுறிகள் யாவை?",
                    "நீரிழிவு நோயாளிகள் பாதங்களை எவ்வாறு பராமரிக்க வேண்டும்?"
                ]
            },
            {
                id: "prevention",
                name: "தடுப்பு & பொது கல்வி",
                icon: "🛡️",
                questions: [
                    "நீரிழிவு நோய் வராமல் தடுக்க என்ன வாழ்க்கை முறை மாற்றங்கள் தேவை?",
                    "HbA1c பரிசோதனை என்றால் என்ன? அதை எப்போது செய்ய வேண்டும்?",
                    "குடும்பத்தில் யாருக்காவது சர்க்கரை நோய் இருந்தால் எனக்கு வருமா?"
                ]
            }
        ]
    },
    en: {
        title: "Tamil Voice Diabetes Assistant",
        subtitle: "Bilingual Health Awareness & Voice-Enabled Education Platform",
        eduBadge: "Educational Awareness Platform",
        disclaimer: `<strong>Medical Notice:</strong> This assistant provides general educational awareness only, not medical advice. If experiencing emergencies (severe shakiness, fainting, chest pain), call <strong>108 / Emergency Services</strong> immediately.`,
        placeholder: "Type your diabetes question here or click the mic...",
        privacyNote: "🔒 Always consult your licensed physician for medical advice • General Educational Guide",
        clearChat: "Clear",
        clearChatTooltip: "Clear chat history",
        suggestionsTitle: "Suggested Topics:",
        hideSuggestions: "Hide",
        showSuggestions: "Show",
        welcomeTitle: "Welcome to your Diabetes Educational Assistant.",
        welcomeSubtitle: "Ask dietary questions, exercise guidelines, and blood sugar awareness.",
        welcomeDesc: "This platform provides verified health awareness information with voice narration in Tamil and English. Select any suggested topic below or speak directly using your microphone.",
        pillars: [
            { icon: "🥗", text: "Balanced Diet & Low-GI Foods" },
            { icon: "🏃", text: "Daily Physical Activity Tips" },
            { icon: "🩸", text: "Blood Glucose Awareness" },
            { icon: "⚠️", text: "108 Urgent Emergency Safety" }
        ],
        errorMsg: "Sorry! Unable to reach the server. Please check your connection.",
        thinking: "AI is responding...",
        listening: "🎙️ Listening... Speak now...",
        speechNotSupported: "⚠️ Speech recognition is not supported in this browser. For the best experience, please use Google Chrome or Microsoft Edge, or type your question below.",
        micPermissionDenied: "⚠️ Microphone access was denied. Please allow microphone permission in your browser settings and try again.",
        micTooltipActive: "Click to stop listening",
        micTooltipIdle: "Speak your question",
        playAudio: "Listen to reply",
        stopAudio: "Stop audio",
        preparingAudio: "Preparing audio...",
        ttsErrorMsg: "Sorry! Unable to generate voice audio. Please try again.",
        copyText: "Copy",
        copiedText: "Copied!",
        emergencyBadge: "🚨 CRITICAL MEDICAL EMERGENCY ALERT (Call 108)",
        categories: [
            {
                id: "basics",
                name: "Diabetes Basics",
                icon: "🩺",
                questions: [
                    "What is diabetes and what are its primary types?",
                    "What are normal fasting and post-meal blood sugar levels?",
                    "What is the difference between Type 1 and Type 2 diabetes?"
                ]
            },
            {
                id: "nutrition",
                name: "Food & Nutrition",
                icon: "🥗",
                questions: [
                    "Can diabetic patients eat apples and guavas?",
                    "Are ladies finger and bitter gourd good for diabetes?",
                    "Can diabetics replace white rice with millets or brown rice?"
                ]
            },
            {
                id: "lifestyle",
                name: "Exercise & Lifestyle",
                icon: "🏃",
                questions: [
                    "How much daily walking is recommended to lower blood sugar?",
                    "What should diabetics eat before and after workouts?",
                    "Does poor sleep and stress directly increase blood sugar levels?"
                ]
            },
            {
                id: "symptoms",
                name: "Symptoms & Awareness",
                icon: "🔍",
                questions: [
                    "What are common symptoms of low blood sugar (Hypoglycemia)?",
                    "What are common symptoms of high blood sugar (Hyperglycemia)?",
                    "How should diabetic patients inspect and care for their feet?"
                ]
            },
            {
                id: "prevention",
                name: "Prevention & Education",
                icon: "🛡️",
                questions: [
                    "What lifestyle modifications help prevent Type 2 diabetes?",
                    "What is an HbA1c test and how often should it be checked?",
                    "If a family member has diabetes, what is my risk level?"
                ]
            }
        ]
    }
};

// 2. Application State
let currentLang = 'ta';
let activeCategory = 'basics';
let isProcessing = false;
let isRecording = false;
let recognition = null;
let cachedVoices = [];
let suggestionsVisible = true;
let conversationHistory = [];

// Speech Playback & Streaming State
let activeSpeechBtn = null;
let currentAudio = null;
let currentAudioUrlList = [];
let activePlaybackSessionId = 0;
let activeAbortController = null;
let lastInputWasVoice = false;

// 3. DOM Elements
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const charCounter = document.getElementById('char-counter');
const langBtnTa = document.getElementById('lang-ta');
const langBtnEn = document.getElementById('lang-en');
const clearChatBtn = document.getElementById('clear-chat-btn');
const clearChatText = document.getElementById('clear-chat-text');
const appTitle = document.getElementById('app-title');
const appSubtitle = document.getElementById('app-subtitle');
const eduBadgeText = document.getElementById('edu-badge-text');
const disclaimerText = document.getElementById('disclaimer-text');
const privacyNote = document.getElementById('privacy-note');
const suggestionsSection = document.getElementById('suggestions-section');
const suggestionsTitle = document.getElementById('suggestions-title');
const toggleSuggestionsBtn = document.getElementById('toggle-suggestions-btn');
const toggleSuggestionsText = document.getElementById('toggle-suggestions-text');
const categoryTabs = document.getElementById('category-tabs');
const questionCardsGrid = document.getElementById('question-cards-grid');

// Voice Preview Elements
const voicePreviewBar = document.getElementById('voice-preview-bar');
const voiceStatusText = document.getElementById('voice-status-text');
const voiceTranscriptText = document.getElementById('voice-transcript-text');
const stopRecordingBtn = document.getElementById('stop-recording-btn');

// 4. SVG Icons
const PLAY_ICON_SVG = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
    </svg>
`;

const STOP_ICON_SVG = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="6" y="6" width="12" height="12" rx="2"></rect>
    </svg>
`;

const LOADING_ICON_SVG = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="2" x2="12" y2="6"></line>
        <line x1="12" y1="18" x2="12" y2="22"></line>
        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
        <line x1="2" y1="12" x2="6" y2="12"></line>
        <line x1="18" y1="12" x2="22" y2="12"></line>
        <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
        <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
    </svg>
`;

const COPY_ICON_SVG = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
`;

const CHECK_ICON_SVG = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
`;

// 5. Utility Helpers
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function cleanTextForSpeech(text) {
    return text
        .replace(/⚠️/g, '')
        .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
        .replace(/[🚨ℹ️👉🩺👤🎙️🔊⏹️]/g, '')
        .replace(/[*_#`~]/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/^\s*[-•]\s*/gm, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function splitIntoSentences(text) {
    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) return [];
    const parts = cleaned.split(/(?<=[.!?\n])\s+/);
    return parts
        .map(s => s.trim())
        .filter(s => s.length > 0 && !/^[\s.,!?-]+$/.test(s));
}

// 6. Voice Synthesis Setup
function loadVoices() {
    if ('speechSynthesis' in window) {
        cachedVoices = window.speechSynthesis.getVoices();
    }
}

if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
}

function findMatchingBrowserVoice(lang) {
    if (!('speechSynthesis' in window)) return null;
    if (cachedVoices.length === 0) loadVoices();

    if (lang === 'ta') {
        return cachedVoices.find(v => 
            v.lang === 'ta-IN' || 
            v.lang.toLowerCase().startsWith('ta') || 
            v.name.toLowerCase().includes('tamil') ||
            v.name.toLowerCase().includes('valluvar') ||
            v.name.toLowerCase().includes('pallavi')
        ) || null;
    } else {
        return cachedVoices.find(v => v.lang === 'en-IN' || v.name.toLowerCase().includes('neerja')) ||
               cachedVoices.find(v => v.lang.startsWith('en')) || null;
    }
}

// 7. Stop Speech Audio
function stopSpeech() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
    }
    activePlaybackSessionId++;

    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }

    currentAudioUrlList.forEach(url => {
        try { URL.revokeObjectURL(url); } catch (e) {}
    });
    currentAudioUrlList = [];

    if (activeSpeechBtn) {
        activeSpeechBtn.innerHTML = `${PLAY_ICON_SVG} <span>${I18N[currentLang].playAudio}</span>`;
        activeSpeechBtn.classList.remove('speaking', 'loading');
        activeSpeechBtn.title = I18N[currentLang].playAudio;
        activeSpeechBtn = null;
    }
}

// 8. Streamed Speech Audio Playback
async function fetchSentenceAudio(sentence, lang, signal) {
    const response = await fetch('/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            text: sentence,
            language: lang
        }),
        signal: signal
    });

    if (!response.ok) {
        throw new Error(`TTS server error (${response.status})`);
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

async function speakText(text, lang, btnElement) {
    if (activeSpeechBtn === btnElement) {
        stopSpeech();
        return;
    }

    stopSpeech();

    const cleanText = cleanTextForSpeech(text);
    if (!cleanText) return;

    btnElement.innerHTML = `${LOADING_ICON_SVG} <span>${I18N[currentLang].preparingAudio}</span>`;
    btnElement.classList.add('loading');
    btnElement.title = I18N[currentLang].preparingAudio;
    activeSpeechBtn = btnElement;

    const currentSession = ++activePlaybackSessionId;
    activeAbortController = new AbortController();

    const matchingVoice = findMatchingBrowserVoice(lang);

    if (matchingVoice) {
        btnElement.classList.remove('loading');
        btnElement.innerHTML = `${STOP_ICON_SVG} <span>${I18N[currentLang].stopAudio}</span>`;
        btnElement.classList.add('speaking');
        btnElement.title = I18N[currentLang].stopAudio;

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.voice = matchingVoice;
        utterance.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
        utterance.rate = lang === 'ta' ? 0.95 : 1.0;

        utterance.onend = () => { stopSpeech(); };
        utterance.onerror = (e) => {
            console.warn("Speech synthesis error:", e);
            stopSpeech();
        };

        window.speechSynthesis.speak(utterance);
    } else {
        const sentences = splitIntoSentences(text);
        if (sentences.length === 0) {
            stopSpeech();
            return;
        }

        try {
            const sentenceAudioPromises = sentences.map(sentence => 
                fetchSentenceAudio(sentence, lang, activeAbortController.signal)
            );

            const firstAudioUrl = await sentenceAudioPromises[0];
            if (activePlaybackSessionId !== currentSession) return;

            currentAudioUrlList.push(firstAudioUrl);

            btnElement.classList.remove('loading');
            btnElement.innerHTML = `${STOP_ICON_SVG} <span>${I18N[currentLang].stopAudio}</span>`;
            btnElement.classList.add('speaking');
            btnElement.title = I18N[currentLang].stopAudio;

            let currentIdx = 0;

            const playNextSentence = async () => {
                if (activePlaybackSessionId !== currentSession) return;

                if (currentIdx >= sentences.length) {
                    stopSpeech();
                    return;
                }

                try {
                    const audioUrl = await sentenceAudioPromises[currentIdx];
                    if (activePlaybackSessionId !== currentSession) return;

                    if (!currentAudioUrlList.includes(audioUrl)) {
                        currentAudioUrlList.push(audioUrl);
                    }

                    currentAudio = new Audio(audioUrl);
                    currentAudio.onended = () => {
                        currentIdx++;
                        playNextSentence();
                    };
                    currentAudio.onerror = (e) => {
                        console.error("Audio sentence playback error:", e);
                        stopSpeech();
                        appendMessage('assistant', I18N[currentLang].ttsErrorMsg, false, true);
                    };

                    await currentAudio.play();
                } catch (playErr) {
                    if (activePlaybackSessionId === currentSession) {
                        console.error("Error playing sentence audio:", playErr);
                        stopSpeech();
                        appendMessage('assistant', I18N[currentLang].ttsErrorMsg, false, true);
                    }
                }
            };

            playNextSentence();

        } catch (fetchErr) {
            if (activePlaybackSessionId === currentSession) {
                console.error("Error fetching streamed TTS sentences:", fetchErr);
                stopSpeech();
                appendMessage('assistant', I18N[currentLang].ttsErrorMsg, false, true);
            }
        }
    }
}

// 9. Copy Text to Clipboard
async function copyMessageText(text, btnElement) {
    try {
        await navigator.clipboard.writeText(text);
        const originalHTML = btnElement.innerHTML;
        btnElement.innerHTML = `${CHECK_ICON_SVG} <span>${I18N[currentLang].copiedText}</span>`;
        btnElement.classList.add('copied');
        setTimeout(() => {
            btnElement.innerHTML = originalHTML;
            btnElement.classList.remove('copied');
        }, 2000);
    } catch (err) {
        console.warn("Unable to copy to clipboard:", err);
    }
}

// 10. Append Message Bubble
function appendMessage(sender, text, isEmergency = false, isError = false) {
    const row = document.createElement('div');
    row.className = `message-row ${sender}`;
    if (isEmergency) row.classList.add('emergency');

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = sender === 'user' ? '👤' : (isEmergency ? '🚨' : '🩺');

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    if (isError) bubble.style.borderColor = '#f87171';

    // If emergency, show distinct urgent badge
    if (isEmergency) {
        const emergencyTag = document.createElement('div');
        emergencyTag.className = 'emergency-tag';
        emergencyTag.textContent = I18N[currentLang].emergencyBadge;
        bubble.appendChild(emergencyTag);
    }

    const contentDiv = document.createElement('div');
    contentDiv.className = 'bubble-content';
    contentDiv.innerHTML = escapeHTML(text).replace(/\n/g, '<br>');
    bubble.appendChild(contentDiv);

    const meta = document.createElement('div');
    meta.className = 'bubble-meta';

    const senderLabel = sender === 'user' 
        ? (currentLang === 'ta' ? 'நீங்கள் (You)' : 'You') 
        : (isEmergency ? '108 Emergency Protocol' : 'Health Assistant');
    
    let speechBtn = null;

    if (sender === 'assistant' && !isError) {
        meta.innerHTML = `
            <span>${senderLabel} • ${getCurrentTime()}</span>
            <div class="bubble-actions">
                <button type="button" class="bubble-btn copy-btn" title="${I18N[currentLang].copyText}" aria-label="Copy message text">
                    ${COPY_ICON_SVG} <span>${I18N[currentLang].copyText}</span>
                </button>
                <button type="button" class="bubble-btn speech-btn" title="${I18N[currentLang].playAudio}" aria-label="Play reply aloud">
                    ${PLAY_ICON_SVG} <span>${I18N[currentLang].playAudio}</span>
                </button>
            </div>
        `;

        const copyBtn = meta.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => {
            copyMessageText(text, copyBtn);
        });

        speechBtn = meta.querySelector('.speech-btn');
        speechBtn.addEventListener('click', () => {
            speakText(text, currentLang, speechBtn);
        });
    } else {
        meta.innerHTML = `<span>${senderLabel}</span><span>${getCurrentTime()}</span>`;
    }

    bubble.appendChild(meta);
    row.appendChild(avatar);
    row.appendChild(bubble);
    chatMessages.appendChild(row);

    // Auto-scroll smoothly
    row.scrollIntoView({ behavior: 'smooth', block: 'end' });

    return speechBtn;
}

// 11. Welcome Hero Card
function renderWelcomeCard() {
    const t = I18N[currentLang];
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'welcome-card';
    welcomeDiv.id = 'welcome-card';

    welcomeDiv.innerHTML = `
        <div class="welcome-header">
            <div class="welcome-icon-box" aria-hidden="true">🩺</div>
            <div class="welcome-title-group">
                <h2>${t.welcomeTitle}</h2>
                <p>${t.welcomeSubtitle}</p>
            </div>
        </div>
        <p class="welcome-desc">${t.welcomeDesc}</p>
        <div class="welcome-pillars">
            ${t.pillars.map(p => `
                <div class="pillar-item">
                    <span class="pillar-emoji">${p.icon}</span>
                    <span>${p.text}</span>
                </div>
            `).join('')}
        </div>
    `;

    chatMessages.appendChild(welcomeDiv);
}

// 12. Typing Indicator
function showTypingIndicator() {
    const row = document.createElement('div');
    row.className = 'message-row assistant';
    row.id = 'typing-row';

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = '🩺';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.innerHTML = `
        <div class="typing-bubble" aria-label="${I18N[currentLang].thinking}">
            <span class="typing-status-text">${I18N[currentLang].thinking}</span>
            <div class="typing-dots">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
            </div>
        </div>
    `;

    row.appendChild(avatar);
    row.appendChild(bubble);
    chatMessages.appendChild(row);
    row.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function removeTypingIndicator() {
    const typingRow = document.getElementById('typing-row');
    if (typingRow) typingRow.remove();
}

// 13. Render Categorized Question Cards
function renderCategoriesAndQuestions() {
    const categories = I18N[currentLang].categories;
    categoryTabs.innerHTML = '';

    // Render Category Tabs
    categories.forEach(cat => {
        const tabBtn = document.createElement('button');
        tabBtn.type = 'button';
        tabBtn.className = `category-tab-btn ${cat.id === activeCategory ? 'active' : ''}`;
        tabBtn.innerHTML = `<span>${cat.icon}</span> <span>${cat.name}</span>`;
        tabBtn.setAttribute('role', 'tab');
        tabBtn.setAttribute('aria-selected', cat.id === activeCategory ? 'true' : 'false');

        tabBtn.addEventListener('click', () => {
            activeCategory = cat.id;
            renderCategoriesAndQuestions();
        });

        categoryTabs.appendChild(tabBtn);
    });

    // Render Question Cards for Active Category
    questionCardsGrid.innerHTML = '';
    const currentCatObj = categories.find(c => c.id === activeCategory) || categories[0];

    currentCatObj.questions.forEach(qText => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'question-card';
        card.innerHTML = `
            <span class="question-icon" aria-hidden="true">${currentCatObj.icon}</span>
            <span class="question-text">${escapeHTML(qText)}</span>
        `;

        card.addEventListener('click', () => {
            if (!isProcessing) {
                lastInputWasVoice = false;
                userInput.value = qText;
                handleMessageSubmit();
            }
        });

        questionCardsGrid.appendChild(card);
    });
}

// 14. Language Toggle Handler
function setLanguage(lang) {
    currentLang = lang;
    stopSpeech();

    if (lang === 'ta') {
        langBtnTa.classList.add('active');
        langBtnTa.setAttribute('aria-pressed', 'true');
        langBtnEn.classList.remove('active');
        langBtnEn.setAttribute('aria-pressed', 'false');
    } else {
        langBtnEn.classList.add('active');
        langBtnEn.setAttribute('aria-pressed', 'true');
        langBtnTa.classList.remove('active');
        langBtnTa.setAttribute('aria-pressed', 'false');
    }

    const t = I18N[lang];
    appTitle.textContent = t.title;
    appSubtitle.textContent = t.subtitle;
    eduBadgeText.textContent = t.eduBadge;
    disclaimerText.innerHTML = t.disclaimer;
    privacyNote.textContent = t.privacyNote;
    clearChatText.textContent = t.clearChat;
    clearChatBtn.title = t.clearChatTooltip;
    userInput.placeholder = t.placeholder;
    suggestionsTitle.textContent = t.suggestionsTitle;
    toggleSuggestionsText.textContent = suggestionsVisible ? t.hideSuggestions : t.showSuggestions;
    micBtn.title = isRecording ? t.micTooltipActive : t.micTooltipIdle;

    renderCategoriesAndQuestions();

    // Re-render chat messages with new welcome card
    resetChat();

    if (recognition) {
        recognition.lang = currentLang === 'ta' ? 'ta-IN' : 'en-IN';
    }
}

// 15. Reset Chat
function resetChat() {
    stopSpeech();
    conversationHistory = [];
    chatMessages.innerHTML = '';
    renderWelcomeCard();
}

// 16. Message Submission
async function handleMessageSubmit() {
    const message = userInput.value.trim();
    if (!message || isProcessing) return;

    stopSpeech();

    if (isRecording && recognition) {
        recognition.stop();
    }

    const triggeredByVoice = lastInputWasVoice;
    lastInputWasVoice = false;

    // Display user bubble
    appendMessage('user', message);
    userInput.value = '';
    charCounter.textContent = '0/500';
    userInput.focus();

    isProcessing = true;
    sendBtn.disabled = true;
    showTypingIndicator();

    try {
        const response = await fetch('/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: message,
                language: currentLang,
                history: conversationHistory.slice(-6)
            })
        });

        const data = await response.json();
        removeTypingIndicator();

        if (response.ok && (data.status === 'success' || data.status === 'emergency')) {
            const isEmergency = data.status === 'emergency';
            const speechBtn = appendMessage('assistant', data.reply, isEmergency, false);

            // Maintain conversation context for subsequent follow-up queries
            conversationHistory.push({ role: 'user', text: message });
            conversationHistory.push({ role: 'assistant', text: data.reply });
            if (conversationHistory.length > 10) {
                conversationHistory = conversationHistory.slice(-10);
            }

            if (triggeredByVoice && speechBtn) {
                speakText(data.reply, currentLang, speechBtn);
            }
        } else {
            const err = data.error || I18N[currentLang].errorMsg;
            appendMessage('assistant', `⚠️ ${err}`, false, true);
        }
    } catch (err) {
        console.error('Network Error:', err);
        removeTypingIndicator();
        appendMessage('assistant', `⚠️ ${I18N[currentLang].errorMsg}`, false, true);
    } finally {
        isProcessing = false;
        sendBtn.disabled = false;
    }
}

// 17. Speech-to-Text Setup
function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.warn("Web Speech API is not supported in this browser.");
        micBtn.classList.add('disabled');
        micBtn.title = I18N[currentLang].speechNotSupported;
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = currentLang === 'ta' ? 'ta-IN' : 'en-IN';

    recognition.onstart = () => {
        isRecording = true;
        lastInputWasVoice = true;
        stopSpeech();
        micBtn.classList.add('recording');
        micBtn.title = I18N[currentLang].micTooltipActive;
        voicePreviewBar.classList.remove('hidden');
        voiceStatusText.textContent = I18N[currentLang].listening;
        voiceTranscriptText.textContent = '';
    };

    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
        }
        userInput.value = transcript;
        voiceTranscriptText.textContent = transcript || '...';
        charCounter.textContent = `${transcript.length}/500`;
    };

    recognition.onend = () => {
        isRecording = false;
        micBtn.classList.remove('recording');
        micBtn.title = I18N[currentLang].micTooltipIdle;
        voicePreviewBar.classList.add('hidden');

        const spokenText = userInput.value.trim();
        if (spokenText && !isProcessing) {
            handleMessageSubmit();
        }
    };

    recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        isRecording = false;
        lastInputWasVoice = false;
        micBtn.classList.remove('recording');
        micBtn.title = I18N[currentLang].micTooltipIdle;
        voicePreviewBar.classList.add('hidden');

        if (event.error === 'not-allowed') {
            appendMessage('assistant', I18N[currentLang].micPermissionDenied, false, true);
        } else if (event.error === 'network') {
            appendMessage('assistant', I18N[currentLang].errorMsg, false, true);
        }
    };
}

function toggleSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        appendMessage('assistant', I18N[currentLang].speechNotSupported, false, true);
        userInput.focus();
        return;
    }

    if (isProcessing) return;

    if (!recognition) {
        setupSpeechRecognition();
    }

    if (isRecording) {
        recognition.stop();
    } else {
        userInput.value = '';
        charCounter.textContent = '0/500';
        recognition.lang = currentLang === 'ta' ? 'ta-IN' : 'en-IN';
        try {
            recognition.start();
        } catch (err) {
            console.error("Error starting speech recognition:", err);
        }
    }
}

// 18. Event Listeners
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    lastInputWasVoice = false;
    handleMessageSubmit();
});

userInput.addEventListener('input', () => {
    charCounter.textContent = `${userInput.value.length}/500`;
});

langBtnTa.addEventListener('click', () => {
    if (currentLang !== 'ta') setLanguage('ta');
});

langBtnEn.addEventListener('click', () => {
    if (currentLang !== 'en') setLanguage('en');
});

clearChatBtn.addEventListener('click', () => {
    resetChat();
});

toggleSuggestionsBtn.addEventListener('click', () => {
    suggestionsVisible = !suggestionsVisible;
    if (suggestionsVisible) {
        categoryTabs.style.display = 'flex';
        questionCardsGrid.style.display = 'grid';
        toggleSuggestionsText.textContent = I18N[currentLang].hideSuggestions;
    } else {
        categoryTabs.style.display = 'none';
        questionCardsGrid.style.display = 'none';
        toggleSuggestionsText.textContent = I18N[currentLang].showSuggestions;
    }
});

micBtn.addEventListener('click', () => {
    toggleSpeechRecognition();
});

stopRecordingBtn.addEventListener('click', () => {
    if (isRecording && recognition) {
        recognition.stop();
    }
});

// 19. Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    setLanguage('ta');
    setupSpeechRecognition();
    loadVoices();
});
