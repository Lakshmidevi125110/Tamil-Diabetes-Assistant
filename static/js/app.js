/**
 * Tamil Voice Diabetes Assistant - Client Application
 * Features:
 * - Bilingual Chat UI (Tamil & English)
 * - Browser Web Speech-to-Text (ta-IN & en-IN)
 * - Browser Text-to-Speech (speechSynthesis) with Tamil/English voices & Play/Stop controls
 * - Medical Safety disclaimer banner & emergency guidelines
 */

// 1. UI Localization & Speech Strings
const I18N = {
    ta: {
        title: "தமிழ் குரல் சர்க்கரை நோய் வழிகாட்டி",
        subtitle: "Tamil Voice Diabetes Assistant • கல்வி வழிகாட்டி",
        disclaimer: `<strong>மருத்துவ எச்சரிக்கை:</strong> இது பொது விழிப்புணர்வு வழிகாட்டி மட்டுமே. மருத்துவ ஆலோசனை அல்ல. அவசர அறிகுறிகள் (மயக்கம், தீவிர நடுக்கம்) ஏற்பட்டால் உடனடியாக <strong>108</strong> அவசர சிகிச்சையை அழைக்கவும்.`,
        placeholder: "உங்கள் கேள்வியை இங்கே தட்டச்சு செய்யவும் அல்லது மைக் அழுத்தவும்...",
        chipsLabel: "பரிந்துரைக்கப்பட்ட கேள்விகள்:",
        welcome: "வணக்கம்! நான் உங்கள் சர்க்கரை நோய் விழிப்புணர்வு வழிகாட்டி. மைக் பொத்தானை அழுத்தி பேசலாம் அல்லது தட்டச்சு செய்யலாம்.",
        prompts: [
            "சர்க்கரை நோயாளிகள் ஆப்பிள் சாப்பிடலாமா?",
            "இரத்த சர்க்கரையை கட்டுப்படுத்த சிறந்த உடற்பயிற்சிகள் என்ன?",
            "குறைந்த சர்க்கரை அளவு (Hypoglycemia) அறிகுறிகள் என்ன?",
            "வெண்டைக்காய் சர்க்கரை நோய்க்கு நல்லதா?"
        ],
        errorMsg: "மன்னிக்கவும்! சர்வரை தொடர்பு கொள்ள முடியவில்லை. உங்கள் இணைய இணைப்பை சரிபார்க்கவும்.",
        thinking: "சிந்திக்கிறது...",
        listening: "🎙️ கேட்கிறது... இப்போது பேசுங்கள்...",
        speechNotSupported: "⚠️ உங்கள் உலாவியில் குரல் அறிதல் (Speech Recognition) வசதி ஆதரிக்கப்படவில்லை. சிறந்த அனுபவத்திற்கு Google Chrome அல்லது Microsoft Edge-ஐப் பயன்படுத்தவும். அல்லது கீழேயுள்ள பெட்டியில் தட்டச்சு செய்யவும்.",
        micPermissionDenied: "⚠️ மைக்ரோஃபோன் அணுகல் மறுக்கப்பட்டது. உலாவியின் அமைப்புகளில் மைக் அனுமதியை வழங்கிவிட்டு மீண்டும் முயற்சிக்கவும்.",
        micTooltipActive: "பேசுவதை நிறுத்த அழுத்தவும் (Click to stop)",
        micTooltipIdle: "குரல் மூலம் பேச (Speak)",
        playAudio: "குரலில் கேட்க (Listen)",
        stopAudio: "ஒலிப்பதை நிறுத்த (Stop audio)",
        ttsNotSupported: "⚠️ உங்கள் உலாவியில் ஒலிப் பேச்சு (Text-to-Speech) வசதி ஆதரிக்கப்படவில்லை."
    },
    en: {
        title: "Tamil Voice Diabetes Assistant",
        subtitle: "Bilingual Health Awareness & Educational Guide",
        disclaimer: `<strong>Medical Notice:</strong> This assistant provides general educational awareness only, not medical advice. If experiencing emergencies (severe shakiness, fainting), call <strong>108 / Emergency</strong> immediately.`,
        placeholder: "Type your diabetes question here or click the mic...",
        chipsLabel: "Recommended Questions:",
        welcome: "Hello! I am your Diabetes Educational Assistant. Click the microphone to speak or type your question below.",
        prompts: [
            "Can diabetic patients eat apples?",
            "What exercises help lower blood sugar?",
            "What are common symptoms of low blood sugar?",
            "Is brown rice better than white rice for diabetics?"
        ],
        errorMsg: "Sorry! Unable to reach the server. Please check your connection.",
        thinking: "Thinking...",
        listening: "🎙️ Listening... Speak now...",
        speechNotSupported: "⚠️ Speech recognition is not supported in this browser. For the best experience, please use Google Chrome or Microsoft Edge, or type your question.",
        micPermissionDenied: "⚠️ Microphone access was denied. Please allow microphone permission in your browser settings and try again.",
        micTooltipActive: "Click to stop listening",
        micTooltipIdle: "Speak your question",
        playAudio: "Listen to reply",
        stopAudio: "Stop audio",
        ttsNotSupported: "⚠️ Text-to-speech is not supported in this browser."
    }
};

// 2. Application State
let currentLang = 'ta';
let isProcessing = false;
let isRecording = false;
let recognition = null;
let cachedVoices = [];
let activeSpeechBtn = null;
let lastInputWasVoice = false;

// 3. DOM Elements
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.getElementById('chat-form');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');
const langBtnTa = document.getElementById('lang-ta');
const langBtnEn = document.getElementById('lang-en');
const appTitle = document.getElementById('app-title');
const appSubtitle = document.getElementById('app-subtitle');
const disclaimerText = document.getElementById('disclaimer-text');
const chipsLabel = document.getElementById('chips-label');
const chipsList = document.getElementById('chips-list');

// 4. SVG Icons for Audio Play & Stop
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

// 5. Helper: Format current time
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// 6. Helper: Escape HTML to prevent XSS
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// 7. Clean text before passing to Text-to-Speech
function cleanTextForSpeech(text) {
    return text
        .replace(/⚠️/g, '')
        .replace(/\*\*/g, '')
        .replace(/\*/g, '')
        .replace(/\[.*?\]/g, '') // remove bracketed medical terms if spoken awkwardly
        .replace(/https?:\/\/\S+/g, '')
        .trim();
}

// 8. Load and Cache Browser Synthesis Voices
function loadVoices() {
    if ('speechSynthesis' in window) {
        cachedVoices = window.speechSynthesis.getVoices();
    }
}

if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
}

// 9. Stop Speech Helper
function stopSpeech() {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    if (activeSpeechBtn) {
        activeSpeechBtn.innerHTML = PLAY_ICON_SVG;
        activeSpeechBtn.classList.remove('speaking');
        activeSpeechBtn.title = I18N[currentLang].playAudio;
        activeSpeechBtn = null;
    }
}

// 10. Text-to-Speech Speak Function
function speakText(text, lang, btnElement) {
    if (!('speechSynthesis' in window)) {
        appendMessage('assistant', I18N[currentLang].ttsNotSupported, true);
        return;
    }

    // If currently speaking this specific message, click acts as STOP
    if (window.speechSynthesis.speaking && activeSpeechBtn === btnElement) {
        stopSpeech();
        return;
    }

    // Stop any existing speech
    stopSpeech();

    const cleanText = cleanTextForSpeech(text);
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);

    if (cachedVoices.length === 0) {
        loadVoices();
    }

    // Voice Selection with Fallbacks
    if (lang === 'ta') {
        utterance.lang = 'ta-IN';
        utterance.rate = 0.95; // slightly slower for clear, comfortable Tamil cadence
        const tamilVoice = cachedVoices.find(v => 
            v.lang === 'ta-IN' || 
            v.lang.toLowerCase().startsWith('ta') || 
            v.name.toLowerCase().includes('tamil') ||
            v.name.toLowerCase().includes('valluvar') ||
            v.name.toLowerCase().includes('pallavi')
        );
        if (tamilVoice) {
            utterance.voice = tamilVoice;
        } else {
            console.info("No dedicated Tamil voice detected. Falling back to browser default voice with ta-IN language tag.");
        }
    } else {
        utterance.lang = 'en-IN';
        utterance.rate = 1.0;
        const englishVoice = cachedVoices.find(v => v.lang === 'en-IN' || v.name.toLowerCase().includes('neerja')) ||
                             cachedVoices.find(v => v.lang.startsWith('en'));
        if (englishVoice) {
            utterance.voice = englishVoice;
        }
    }

    // Visual button feedback
    btnElement.innerHTML = STOP_ICON_SVG;
    btnElement.classList.add('speaking');
    btnElement.title = I18N[currentLang].stopAudio;
    activeSpeechBtn = btnElement;

    utterance.onend = () => {
        btnElement.innerHTML = PLAY_ICON_SVG;
        btnElement.classList.remove('speaking');
        btnElement.title = I18N[currentLang].playAudio;
        activeSpeechBtn = null;
    };

    utterance.onerror = (e) => {
        console.warn("Speech synthesis error or interruption:", e);
        btnElement.innerHTML = PLAY_ICON_SVG;
        btnElement.classList.remove('speaking');
        btnElement.title = I18N[currentLang].playAudio;
        activeSpeechBtn = null;
    };

    window.speechSynthesis.speak(utterance);
}

// 11. Append Message Bubble to Chat
function appendMessage(sender, text, isError = false) {
    const row = document.createElement('div');
    row.className = `message-row ${sender}`;

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = sender === 'user' ? '👤' : '🩺';

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    if (isError) bubble.style.borderColor = '#f87171';

    // Format newlines into line breaks
    const formattedText = escapeHTML(text).replace(/\n/g, '<br>');
    bubble.innerHTML = formattedText;

    const meta = document.createElement('div');
    meta.className = 'bubble-meta';

    const senderLabel = sender === 'user' ? (currentLang === 'ta' ? 'நீங்கள்' : 'You') : 'Assistant';
    
    let speechBtn = null;
    if (sender === 'assistant' && !isError) {
        meta.innerHTML = `
            <span>${senderLabel}</span>
            <div class="meta-right">
                <span>${getCurrentTime()}</span>
                <button type="button" class="speech-btn" title="${I18N[currentLang].playAudio}" aria-label="Play reply">
                    ${PLAY_ICON_SVG}
                </button>
            </div>
        `;
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

    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return speechBtn;
}

// 12. Animated Typing Indicator
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
        <div class="typing-indicator" aria-label="${I18N[currentLang].thinking}">
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        </div>
    `;

    row.appendChild(avatar);
    row.appendChild(bubble);
    chatMessages.appendChild(row);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeTypingIndicator() {
    const typingRow = document.getElementById('typing-row');
    if (typingRow) typingRow.remove();
}

// 13. Render Suggestion Chips
function renderChips() {
    chipsList.innerHTML = '';
    const prompts = I18N[currentLang].prompts;
    prompts.forEach(promptText => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'chip-btn';
        btn.textContent = promptText;
        btn.addEventListener('click', () => {
            if (!isProcessing) {
                lastInputWasVoice = false;
                userInput.value = promptText;
                handleMessageSubmit();
            }
        });
        chipsList.appendChild(btn);
    });
}

// 14. Update UI Language
function setLanguage(lang) {
    currentLang = lang;
    stopSpeech();

    // Toggle button active state
    if (lang === 'ta') {
        langBtnTa.classList.add('active');
        langBtnEn.classList.remove('active');
    } else {
        langBtnEn.classList.add('active');
        langBtnTa.classList.remove('active');
    }

    // Update localized text
    const t = I18N[lang];
    appTitle.textContent = t.title;
    appSubtitle.textContent = t.subtitle;
    disclaimerText.innerHTML = t.disclaimer;
    userInput.placeholder = t.placeholder;
    chipsLabel.textContent = t.chipsLabel;
    micBtn.title = isRecording ? t.micTooltipActive : t.micTooltipIdle;

    renderChips();

    // If speech recognition is active, update its language
    if (recognition) {
        recognition.lang = currentLang === 'ta' ? 'ta-IN' : 'en-IN';
    }
}

// 15. Send Message Handler
async function handleMessageSubmit() {
    const message = userInput.value.trim();
    if (!message || isProcessing) return;

    // Stop ongoing speech when user submits a new query
    stopSpeech();

    // Stop recording if active
    if (isRecording && recognition) {
        recognition.stop();
    }

    const triggeredByVoice = lastInputWasVoice;
    lastInputWasVoice = false; // reset flag

    // 1. Display User Message
    appendMessage('user', message);
    userInput.value = '';
    userInput.focus();

    // 2. Set Loading State
    isProcessing = true;
    sendBtn.disabled = true;
    showTypingIndicator();

    try {
        // 3. Send POST request to Flask backend
        const response = await fetch('/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                language: currentLang
            })
        });

        const data = await response.json();
        removeTypingIndicator();

        if (response.ok && data.status === 'success') {
            const speechBtn = appendMessage('assistant', data.reply);
            // If the user spoke their question aloud, speak the response aloud automatically!
            if (triggeredByVoice && speechBtn) {
                speakText(data.reply, currentLang, speechBtn);
            }
        } else {
            const err = data.error || I18N[currentLang].errorMsg;
            appendMessage('assistant', `⚠️ ${err}`, true);
        }
    } catch (err) {
        console.error('Network Error:', err);
        removeTypingIndicator();
        appendMessage('assistant', `⚠️ ${I18N[currentLang].errorMsg}`, true);
    } finally {
        isProcessing = false;
        sendBtn.disabled = false;
    }
}

// 16. Speech-to-Text Setup (Web Speech API)
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

    // When voice recording begins
    recognition.onstart = () => {
        isRecording = true;
        lastInputWasVoice = true;
        stopSpeech(); // Stop any audio playback while recording user's voice
        micBtn.classList.add('recording');
        micBtn.title = I18N[currentLang].micTooltipActive;
        userInput.placeholder = I18N[currentLang].listening;
    };

    // When speech recognition receives audio results
    recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            transcript += event.results[i][0].transcript;
        }
        userInput.value = transcript;
    };

    // When voice recording ends
    recognition.onend = () => {
        isRecording = false;
        micBtn.classList.remove('recording');
        micBtn.title = I18N[currentLang].micTooltipIdle;
        userInput.placeholder = I18N[currentLang].placeholder;

        // Auto-submit recognized speech
        const spokenText = userInput.value.trim();
        if (spokenText && !isProcessing) {
            handleMessageSubmit();
        }
    };

    // When an error occurs during speech recognition
    recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        isRecording = false;
        lastInputWasVoice = false;
        micBtn.classList.remove('recording');
        micBtn.title = I18N[currentLang].micTooltipIdle;
        userInput.placeholder = I18N[currentLang].placeholder;

        if (event.error === 'not-allowed') {
            appendMessage('assistant', I18N[currentLang].micPermissionDenied, true);
        } else if (event.error === 'no-speech') {
            // User stayed silent
        } else if (event.error === 'network') {
            appendMessage('assistant', I18N[currentLang].errorMsg, true);
        }
    };
}

// Toggle Voice Recording
function toggleSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        appendMessage('assistant', I18N[currentLang].speechNotSupported, true);
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
        recognition.lang = currentLang === 'ta' ? 'ta-IN' : 'en-IN';
        try {
            recognition.start();
        } catch (err) {
            console.error("Error starting speech recognition:", err);
        }
    }
}

// 17. Event Listeners
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    lastInputWasVoice = false;
    handleMessageSubmit();
});

langBtnTa.addEventListener('click', () => {
    if (currentLang !== 'ta') {
        setLanguage('ta');
        appendMessage('assistant', I18N.ta.welcome);
    }
});

langBtnEn.addEventListener('click', () => {
    if (currentLang !== 'en') {
        setLanguage('en');
        appendMessage('assistant', I18N.en.welcome);
    }
});

micBtn.addEventListener('click', () => {
    toggleSpeechRecognition();
});

// 18. Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setLanguage('ta');
    appendMessage('assistant', I18N.ta.welcome);
    setupSpeechRecognition();
    loadVoices();
});
