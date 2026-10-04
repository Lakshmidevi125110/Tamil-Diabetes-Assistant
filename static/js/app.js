/**
 * Tamil Voice Diabetes Assistant - Client Application
 * Features:
 * - Bilingual Chat (Tamil & English)
 * - Browser Web Speech API (ta-IN & en-IN) with graceful fallbacks
 * - Loading states, suggestion chips, and responsive conversation handling
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
        micTooltipIdle: "குரல் மூலம் பேச (Speak)"
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
        micTooltipIdle: "Speak your question"
    }
};

// 2. Application State
let currentLang = 'ta';
let isProcessing = false;
let isRecording = false;
let recognition = null;

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

// 4. Helper: Format current time
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// 5. Helper: Escape HTML to prevent XSS
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// 6. Append Message Bubble to Chat
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
    meta.innerHTML = `<span>${sender === 'user' ? (currentLang === 'ta' ? 'நீங்கள்' : 'You') : 'Assistant'}</span><span>${getCurrentTime()}</span>`;
    bubble.appendChild(meta);

    row.appendChild(avatar);
    row.appendChild(bubble);
    chatMessages.appendChild(row);

    // Auto-scroll to bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 7. Animated Typing Indicator
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

// 8. Render Suggestion Chips
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
                userInput.value = promptText;
                handleMessageSubmit();
            }
        });
        chipsList.appendChild(btn);
    });
}

// 9. Update UI Language
function setLanguage(lang) {
    currentLang = lang;

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

// 10. Send Message Handler
async function handleMessageSubmit() {
    const message = userInput.value.trim();
    if (!message || isProcessing) return;

    // Stop recording if active
    if (isRecording && recognition) {
        recognition.stop();
    }

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
            appendMessage('assistant', data.reply);
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

// 11. Speech-to-Text Setup (Web Speech API)
function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.warn("Web Speech API is not supported in this browser.");
        micBtn.classList.add('disabled');
        micBtn.title = I18N[currentLang].speechNotSupported;
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;       // Stop automatically when speaking stops
    recognition.interimResults = true;    // Display interim speech results live
    recognition.maxAlternatives = 1;
    recognition.lang = currentLang === 'ta' ? 'ta-IN' : 'en-IN';

    // When voice recording begins
    recognition.onstart = () => {
        isRecording = true;
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

        // If recognized text is present, automatically submit it!
        const spokenText = userInput.value.trim();
        if (spokenText && !isProcessing) {
            handleMessageSubmit();
        }
    };

    // When an error occurs during speech recognition
    recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        isRecording = false;
        micBtn.classList.remove('recording');
        micBtn.title = I18N[currentLang].micTooltipIdle;
        userInput.placeholder = I18N[currentLang].placeholder;

        if (event.error === 'not-allowed') {
            appendMessage('assistant', I18N[currentLang].micPermissionDenied, true);
        } else if (event.error === 'no-speech') {
            // User stayed silent, reset gracefully without noisy alert
        } else if (event.error === 'network') {
            appendMessage('assistant', I18N[currentLang].errorMsg, true);
        }
    };
}

// Toggle Voice Recording
function toggleSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        // Fallback for unsupported browsers
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

// 12. Event Listeners
chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
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

// 13. Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setLanguage('ta');
    appendMessage('assistant', I18N.ta.welcome);
    setupSpeechRecognition();
});
