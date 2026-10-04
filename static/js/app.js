/**
 * Tamil Voice Diabetes Assistant - Client Application
 * Features:
 * - Bilingual Chat UI (Tamil & English)
 * - Browser Web Speech-to-Text (ta-IN & en-IN)
 * - Hybrid Text-to-Speech with Sentence Streaming:
 *     * Sentence-by-sentence prefetching via POST /tts (edge-tts / gTTS)
 *     * Immediate playback on first sentence arrival
 *     * In-memory caching on server for instant replay
 * - Visual Loading / "Preparing audio..." button state with double-click prevention
 * - Play / Stop audio toggle controls
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
        preparingAudio: "ஆடியோ தயாராகிறது... (Preparing audio...)",
        ttsErrorMsg: "மன்னிக்கவும்! குரல் ஒலியை உருவாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்."
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
        preparingAudio: "Preparing audio...",
        ttsErrorMsg: "Sorry! Unable to generate voice audio. Please try again."
    }
};

// 2. Application State
let currentLang = 'ta';
let isProcessing = false;
let isRecording = false;
let recognition = null;
let cachedVoices = [];

// Speech Playback & Queue State
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
const langBtnTa = document.getElementById('lang-ta');
const langBtnEn = document.getElementById('lang-en');
const appTitle = document.getElementById('app-title');
const appSubtitle = document.getElementById('app-subtitle');
const disclaimerText = document.getElementById('disclaimer-text');
const chipsLabel = document.getElementById('chips-label');
const chipsList = document.getElementById('chips-list');

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

// 7. Clean text before passing to Text-to-Speech (strips emojis, ⚠️, markdown)
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

// 8. Split text into individual sentences for streamed playback
function splitIntoSentences(text) {
    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) return [];
    // Split on sentence-ending punctuation (. ! ? \n) followed by whitespace
    const parts = cleaned.split(/(?<=[.!?\n])\s+/);
    return parts
        .map(s => s.trim())
        .filter(s => s.length > 0 && !/^[\s.,!?-]+$/.test(s));
}

// 9. Load and Cache Browser Synthesis Voices
function loadVoices() {
    if ('speechSynthesis' in window) {
        cachedVoices = window.speechSynthesis.getVoices();
    }
}

if ('speechSynthesis' in window) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
}

// 10. Check if a matching browser voice exists for language
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

// 11. Stop All Audio Playback & In-Flight Sentence Requests
function stopSpeech() {
    // 1. Cancel browser speech
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
    }
    // 2. Abort any in-flight /tts fetch requests
    if (activeAbortController) {
        activeAbortController.abort();
        activeAbortController = null;
    }
    // 3. Invalidate current playback session
    activePlaybackSessionId++;

    // 4. Stop and reset HTML5 Audio element
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }

    // 5. Revoke all allocated object URLs
    currentAudioUrlList.forEach(url => {
        try { URL.revokeObjectURL(url); } catch (e) {}
    });
    currentAudioUrlList = [];

    // 6. Reset button UI
    if (activeSpeechBtn) {
        activeSpeechBtn.innerHTML = PLAY_ICON_SVG;
        activeSpeechBtn.classList.remove('speaking', 'loading');
        activeSpeechBtn.title = I18N[currentLang].playAudio;
        activeSpeechBtn = null;
    }
}

// 12. Fetch Single Sentence Audio from Server /tts
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

// 13. Speak Text with Sentence Streaming & Loading States
async function speakText(text, lang, btnElement) {
    // If clicked while active or preparing, click acts as STOP
    if (activeSpeechBtn === btnElement) {
        stopSpeech();
        return;
    }

    // Stop any existing speech
    stopSpeech();

    const cleanText = cleanTextForSpeech(text);
    if (!cleanText) return;

    // 1. Set "Preparing audio..." state & disable double-clicks
    btnElement.innerHTML = LOADING_ICON_SVG;
    btnElement.classList.add('loading');
    btnElement.title = I18N[currentLang].preparingAudio;
    activeSpeechBtn = btnElement;

    const currentSession = ++activePlaybackSessionId;
    activeAbortController = new AbortController();

    // Check if browser has a native voice for this language
    const matchingVoice = findMatchingBrowserVoice(lang);

    if (matchingVoice) {
        // --- PATH A: Browser Native SpeechSynthesis ---
        btnElement.classList.remove('loading');
        btnElement.innerHTML = STOP_ICON_SVG;
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
        // --- PATH B: Server-Side Streamed Sentence Pipeline (edge-tts / gTTS) ---
        const sentences = splitIntoSentences(text);
        if (sentences.length === 0) {
            stopSpeech();
            return;
        }

        try {
            // Step 1: Pre-launch fetches for all sentences
            // sentencePromises will resolve to audio URLs in order
            const sentenceAudioPromises = sentences.map(sentence => 
                fetchSentenceAudio(sentence, lang, activeAbortController.signal)
            );

            // Step 2: Await ONLY the first sentence to start playback immediately!
            const firstAudioUrl = await sentenceAudioPromises[0];
            if (activePlaybackSessionId !== currentSession) return;

            currentAudioUrlList.push(firstAudioUrl);

            // Audio is ready: change button from Loading -> Playing (Stop button)
            btnElement.classList.remove('loading');
            btnElement.innerHTML = STOP_ICON_SVG;
            btnElement.classList.add('speaking');
            btnElement.title = I18N[currentLang].stopAudio;

            // Sequential audio player function
            let currentIdx = 0;

            const playNextSentence = async () => {
                if (activePlaybackSessionId !== currentSession) return;

                if (currentIdx >= sentences.length) {
                    stopSpeech();
                    return;
                }

                try {
                    // Await the next pre-fetched sentence audio URL
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
                        appendMessage('assistant', I18N[currentLang].ttsErrorMsg, true);
                    };

                    await currentAudio.play();
                } catch (playErr) {
                    if (activePlaybackSessionId === currentSession) {
                        console.error("Error playing sentence audio:", playErr);
                        stopSpeech();
                        appendMessage('assistant', I18N[currentLang].ttsErrorMsg, true);
                    }
                }
            };

            // Start playing sentence sequence
            playNextSentence();

        } catch (fetchErr) {
            if (activePlaybackSessionId === currentSession) {
                console.error("Error fetching streamed TTS sentences:", fetchErr);
                stopSpeech();
                appendMessage('assistant', I18N[currentLang].ttsErrorMsg, true);
            }
        }
    }
}

// 14. Append Message Bubble to Chat
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

// 15. Animated Typing Indicator
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

// 16. Render Suggestion Chips
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

// 17. Update UI Language
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

// 18. Send Message Handler
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
    lastInputWasVoice = false;

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

// 19. Speech-to-Text Setup (Web Speech API)
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
        stopSpeech();
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

// 20. Event Listeners
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

// 21. Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    setLanguage('ta');
    appendMessage('assistant', I18N.ta.welcome);
    setupSpeechRecognition();
    loadVoices();
});
