/**
 * Tamil Voice Diabetes Assistant - Client Application (Stage 1, 3 & 4)
 * Features:
 * - Bilingual Healthcare Chat UI (Tamil & English) with Gemini Multi-turn History
 * - Browser Web Speech-to-Text with Live Interim Transcript Preview
 * - Hybrid Text-to-Speech with Low-Latency Sentence Streaming (Edge-TTS / gTTS)
 * - Stage 4: Blood Glucose Tracker with Numeric Validation (20 - 600 mg/dL)
 * - Stage 4: Interactive Responsive SVG Glucose Trend Line Chart
 * - Stage 4: Filterable Glucose History & Daily Wellness Tracker (Walking, Water)
 * - Stage 4: Rule-based Educational Clinical Insights & Non-diagnostic Guardrails
 * - Stage 4: Device-Local Persistence via localStorage with transparent privacy
 */

// ============================================================================
// 1. I18N Localization Dictionary (Bilingual: Tamil & English)
// ============================================================================
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
        navChat: "AI குரல் வழிகாட்டி (Chat)",
        navTracker: "உடல்நல கண்காணிப்பு (Tracker)",

        // Chat Suggestions & Welcome
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
        speechNotSupported: "⚠️ உங்கள் உலாவியில் குரல் அறிதல் (Speech Recognition) வசதி ஆதரிக்கப்படவில்லை. சிறந்த அனுபவத்திற்கு Google Chrome அல்லது Microsoft Edge-ஐப் பயன்படுத்தவும்.",
        micPermissionDenied: "⚠️ மைக்ரோஃபோன் அணுகல் மறுக்கப்பட்டது. உலாவியின் அமைப்புகளில் மைக் அனுமதியை வழங்கவும்.",
        micTooltipActive: "பேசுவதை நிறுத்த அழுத்தவும் (Click to stop)",
        micTooltipIdle: "குரல் மூலம் பேச (Speak)",
        playAudio: "குரலில் கேட்க (Listen)",
        stopAudio: "ஒலிப்பதை நிறுத்த (Stop audio)",
        preparingAudio: "ஆடியோ தயாராகிறது...",
        ttsErrorMsg: "மன்னிக்கவும்! குரல் ஒலியை உருவாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
        copyText: "நகலெடுக்க (Copy)",
        copiedText: "நகலெடுக்கப்பட்டது! (Copied)",
        emergencyBadge: "🚨 அவசர மருத்துவ எச்சரிக்கை (EMERGENCY 108)",

        // Stage 4 Tracker Strings
        trackerHeading: "இரத்த சர்க்கரை & நல்வாழ்வு கண்காணிப்பு",
        trackerSubheading: "அளவுகளைப் பதிவு செய்து, உங்கள் வரலாற்றுப் போக்குகளை எளிதில் தெரிந்து கொள்ளுங்கள்.",
        trackerStorageNotice: "உங்கள் சாதனத்தில் மட்டுமே பாதுகாப்பாக சேமிக்கப்படுகிறது (Local Device Storage)",
        chartTitle: "இரத்த சர்க்கரை போக்கு வரைபடம் (Glucose Trend)",
        chartLegend: "பொது வழிகாட்டல் வரம்பு (70 - 180 mg/dL)",
        chartEmptyMsg: "வரைபடம் காட்ட குறைந்தபட்சம் 1 பதிவு தேவை.",
        insightTitle: "கல்வி அவதானிப்பு (Educational Insight):",
        insightDisclaimer: "⚠️ இது பொதுவான கல்வி அவதானிப்பு மட்டுமே. தனிப்பயனாக்கப்பட்ட மருத்துவ இலக்குகளுக்கு உங்கள் மருத்துவரை அணுகவும்.",
        
        // Form Labels
        subtabGlucose: "சர்க்கரை பதிவு (Glucose)",
        subtabWellness: "தினசரி நல்வாழ்வு (Wellness)",
        formGlucoseTitle: "புதிய சர்க்கரை அளவைச் சேர்க்கவும்",
        labelGlucoseVal: "சர்க்கரை அளவு (Blood Glucose)*",
        labelGlucoseType: "பரிசோதனை வகை (Measurement Type)*",
        labelDate: "தேதி (Date)*",
        labelTime: "நேரம் (Time)*",
        labelNotes: "குறிப்புகள் (Optional Notes)",
        btnAddGlucose: "அளவைச் சேர்க்கவும் (Add Reading)",
        formWellnessTitle: "தினசரி நல்வாழ்வுப் பதிவு (Daily Wellness)",
        labelWalking: "நடைபயிற்சி / உடற்பயிற்சி (Physical Activity)*",
        unitWalking: "நிமிடங்கள் (Mins)",
        labelWater: "குடித்த தண்ணீர் (Water Intake)*",
        unitWater: "டம்ளர்கள் (Glasses)",
        labelDailyNotes: "நல்வாழ்வு குறிப்புகள் (Daily Notes)",
        btnAddWellness: "நல்வாழ்வைப் பதிவு செய்க (Save Wellness)",
        
        // Validation Errors
        errGlucoseRange: "தயவுசெய்து 20 முதல் 600 mg/dL-க்குள் சரியான எண்ணை உள்ளிடவும்.",
        errWalkingRange: "நடைபயிற்சி நிமிடங்களை 0 முதல் 360-க்குள் உள்ளிடவும்.",
        errWaterRange: "தண்ணீர் டம்ளர்களை 0 முதல் 30-க்குள் உள்ளிடவும்.",

        // Measurement Types
        types: {
            fasting: "வெறும் வயிற்றில் (Fasting)",
            before_meal: "உணவுக்கு முன் (Before Meal)",
            after_meal: "உணவுக்கு 2 மணி நேரம் பின் (2h Post-Meal)",
            random: "சீரற்ற நேரம் (Random)"
        },

        // History
        historyTitle: "பதிவு செய்யப்பட்ட வரலாறு (History Log)",
        filterAll: "அனைத்தும்",
        filterFasting: "வெறும் வயிற்றில்",
        filterAfterMeal: "உணவுக்குப் பின்",
        filterWellness: "நல்வாழ்வு",
        emptyHistoryTitle: "பதிவுகள் எதுவும் இல்லை",
        emptyHistoryDesc: "உங்கள் முதல் இரத்த சர்க்கரை அளவை மேலே உள்ள படிவத்தில் பதிவு செய்யவும்.",
        recordsCount: (n) => `${n} பதிவுகள்`,

        // Delete Modal
        deleteModalTitle: "பதிவை நீக்கவா? (Confirm Delete)",
        deleteModalDesc: "இந்தப் பதிவை நிரந்தரமாக நீக்க விரும்புகிறீர்களா? இந்த செயலை மாற்றியமைக்க முடியாது.",
        btnCancel: "ரத்து (Cancel)",
        btnDelete: "நீக்கு (Delete)",

        // Module A3: Glucose Feedback Strings
        glucoseFeedbackTitle: "கல்வி வழிகாட்டல் (Educational Feedback)",
        glucoseFeedbackDisclaimer: "ℹ️ இது பொதுவான கல்வி விழிப்புணர்வு தகவல் மட்டுமே, நோய் கண்டறிதல் அல்ல.",
        glucoseFeedbackLoading: "கல்வி வழிகாட்டல் விளக்கத்தைப் பெறுகிறது...",
        glucoseFeedbackFallback: "கல்வி வழிகாட்டல் தகவலை தற்போது பெற முடியவில்லை. உங்கள் அளவு உங்கள் சாதனத்தில் பாதுகாப்பாக பதிவு செய்யப்பட்டுள்ளது.",

        // Suggested Questions Categories
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
        navChat: "AI Voice Assistant (Chat)",
        navTracker: "Health Tracker & Dashboard",

        // Chat Suggestions & Welcome
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
        speechNotSupported: "⚠️ Speech recognition is not supported in this browser. For the best experience, please use Google Chrome or Microsoft Edge.",
        micPermissionDenied: "⚠️ Microphone access was denied. Please allow microphone permission in your browser settings.",
        micTooltipActive: "Click to stop listening",
        micTooltipIdle: "Speak your question",
        playAudio: "Listen to reply",
        stopAudio: "Stop audio",
        preparingAudio: "Preparing audio...",
        ttsErrorMsg: "Sorry! Unable to generate voice audio. Please try again.",
        copyText: "Copy",
        copiedText: "Copied!",
        emergencyBadge: "🚨 CRITICAL MEDICAL EMERGENCY ALERT (Call 108)",

        // Stage 4 Tracker Strings
        trackerHeading: "Blood Glucose & Wellness Tracker",
        trackerSubheading: "Log daily readings, monitor glucose trends, and track wellness activities.",
        trackerStorageNotice: "Stored securely on your local device only (Browser LocalStorage)",
        chartTitle: "Blood Glucose Trend Chart",
        chartLegend: "General Reference Range (70 - 180 mg/dL)",
        chartEmptyMsg: "Add at least one reading to view the trend chart.",
        insightTitle: "Educational Insight:",
        insightDisclaimer: "⚠️ General educational observation only. Please consult your physician for individualized medical targets.",

        // Form Labels
        subtabGlucose: "Blood Glucose Entry",
        subtabWellness: "Daily Wellness Log",
        formGlucoseTitle: "Add New Glucose Reading",
        labelGlucoseVal: "Blood Glucose Value*",
        labelGlucoseType: "Measurement Type*",
        labelDate: "Date*",
        labelTime: "Time*",
        labelNotes: "Optional Notes",
        btnAddGlucose: "Add Reading",
        formWellnessTitle: "Daily Wellness Entry",
        labelWalking: "Physical Activity / Walking*",
        unitWalking: "Minutes",
        labelWater: "Water Intake*",
        unitWater: "Glasses",
        labelDailyNotes: "Daily Notes",
        btnAddWellness: "Save Wellness Entry",

        // Validation Errors
        errGlucoseRange: "Please enter a valid glucose number between 20 and 600 mg/dL.",
        errWalkingRange: "Please enter activity minutes between 0 and 360.",
        errWaterRange: "Please enter water glasses between 0 and 30.",

        // Measurement Types
        types: {
            fasting: "Fasting",
            before_meal: "Before Meal",
            after_meal: "2 Hours After Meal",
            random: "Random"
        },

        // History
        historyTitle: "Recorded History Log",
        filterAll: "All",
        filterFasting: "Fasting",
        filterAfterMeal: "Post-Meal",
        filterWellness: "Wellness",
        emptyHistoryTitle: "No readings recorded yet",
        emptyHistoryDesc: "Record your first blood glucose entry using the form on the left.",
        recordsCount: (n) => `${n} records`,

        // Delete Modal
        deleteModalTitle: "Confirm Delete",
        deleteModalDesc: "Are you sure you want to permanently delete this entry? This action cannot be undone.",
        btnCancel: "Cancel",
        btnDelete: "Delete",

        // Module A3: Glucose Feedback Strings
        glucoseFeedbackTitle: "Educational Feedback",
        glucoseFeedbackDisclaimer: "ℹ️ This is general educational information, not a diagnosis.",
        glucoseFeedbackLoading: "Getting educational guidance...",
        glucoseFeedbackFallback: "Unable to retrieve automated educational feedback right now. Your reading has been safely saved on your device.",

        // Suggested Questions Categories
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

// ============================================================================
// 2. Application State
// ============================================================================
let currentLang = 'ta';
let currentActiveView = 'chat'; // 'chat' or 'tracker'
let activeCategory = 'basics';
let isProcessing = false;
let isRecording = false;
let recognition = null;
let cachedVoices = [];
let suggestionsVisible = true;
let conversationHistory = [];

// Module B2: Dynamic Suggested Questions Session State
let questionsPool = [];
let displayedQuestions = [null, null, null];
let usedQuestionIds = new Set();
let recentlyShownIds = new Set();
let lastTopic = null;

// Speech Playback State
let activeSpeechBtn = null;
let currentAudio = null;
let currentAudioUrlList = [];
let activePlaybackSessionId = 0;
let activeAbortController = null;
let lastInputWasVoice = false;

// Stage 4 Tracker State
const STORAGE_KEYS = {
    GLUCOSE: 'diabetes_assistant_glucose_readings',
    WELLNESS: 'diabetes_assistant_wellness_logs'
};
let activeFilter = 'all';
let pendingDeleteId = null;
let pendingDeleteType = 'glucose'; // 'glucose' or 'wellness'

// ============================================================================
// 3. DOM Elements Selection
// ============================================================================
// Navigation Tabs
const navBtnChat = document.getElementById('nav-btn-chat');
const navBtnTracker = document.getElementById('nav-btn-tracker');
const navTextChat = document.getElementById('nav-text-chat');
const navTextTracker = document.getElementById('nav-text-tracker');
const viewChat = document.getElementById('view-chat');
const viewTracker = document.getElementById('view-tracker');

// Chat UI Elements
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

// Stage 4 Tracker Elements
const trackerHeading = document.getElementById('tracker-heading');
const trackerSubheading = document.getElementById('tracker-subheading');
const trackerStorageNotice = document.getElementById('tracker-storage-notice');
const chartTitle = document.getElementById('chart-title');
const chartLegendText = document.getElementById('chart-legend-text');
const glucoseSvgChart = document.getElementById('glucose-svg-chart');
const insightTitle = document.getElementById('insight-title');
const insightText = document.getElementById('insight-text');
const insightDisclaimer = document.getElementById('insight-disclaimer');

const subtabBtnGlucose = document.getElementById('subtab-btn-glucose');
const subtabBtnWellness = document.getElementById('subtab-btn-wellness');
const subtabTextGlucose = document.getElementById('subtab-text-glucose');
const subtabTextWellness = document.getElementById('subtab-text-wellness');

const glucoseEntryForm = document.getElementById('glucose-entry-form');
const wellnessEntryForm = document.getElementById('wellness-entry-form');
const formGlucoseTitle = document.getElementById('form-glucose-title');
const labelGlucoseVal = document.getElementById('label-glucose-val');
const inputGlucoseVal = document.getElementById('input-glucose-val');
const glucoseErrorMsg = document.getElementById('glucose-error-msg');
const labelGlucoseType = document.getElementById('label-glucose-type');
const selectGlucoseType = document.getElementById('select-glucose-type');
const labelGlucoseDate = document.getElementById('label-glucose-date');
const inputGlucoseDate = document.getElementById('input-glucose-date');
const labelGlucoseTime = document.getElementById('label-glucose-time');
const inputGlucoseTime = document.getElementById('input-glucose-time');
const labelGlucoseNotes = document.getElementById('label-glucose-notes');
const btnAddGlucose = document.getElementById('btn-add-glucose');
const btnTextAddGlucose = document.getElementById('btn-text-add-glucose');
const btnScrollToChart = document.getElementById('btn-scroll-to-chart');

// Module A3: Glucose Educational Feedback Elements
const glucoseResponseCard = document.getElementById('glucose-response-card');
const glucoseResponseTitle = document.getElementById('glucose-response-title');
const glucoseResponseIcon = document.getElementById('glucose-response-icon');
const glucoseResponseBody = document.getElementById('glucose-response-body');
const glucoseResponseDisclaimer = document.getElementById('glucose-response-disclaimer');
const glucoseResponseClose = document.getElementById('glucose-response-close');

const formWellnessTitle = document.getElementById('form-wellness-title');
const labelWellnessWalking = document.getElementById('label-wellness-walking');
const inputWellnessWalking = document.getElementById('input-wellness-walking');
const unitWalking = document.getElementById('unit-walking');
const labelWellnessWater = document.getElementById('label-wellness-water');
const inputWellnessWater = document.getElementById('input-wellness-water');
const unitWater = document.getElementById('unit-water');
const btnWaterMinus = document.getElementById('btn-water-minus');
const btnWaterPlus = document.getElementById('btn-water-plus');
const labelWellnessDate = document.getElementById('label-wellness-date');
const inputWellnessDate = document.getElementById('input-wellness-date');
const labelWellnessNotes = document.getElementById('label-wellness-notes');
const inputWellnessNotes = document.getElementById('input-wellness-notes');
const btnTextAddWellness = document.getElementById('btn-text-add-wellness');

const historyTitle = document.getElementById('history-title');
const recordsCountBadge = document.getElementById('records-count-badge');
const historyRecordsList = document.getElementById('history-records-list');
const filterAll = document.getElementById('filter-all');
const filterFasting = document.getElementById('filter-fasting');
const filterAfterMeal = document.getElementById('filter-after-meal');
const filterWellness = document.getElementById('filter-wellness');

// Delete Modal Elements
const deleteModal = document.getElementById('delete-modal');
const modalTitle = document.getElementById('modal-title');
const modalDesc = document.getElementById('modal-desc');
const btnModalCancel = document.getElementById('btn-modal-cancel');
const btnModalConfirm = document.getElementById('btn-modal-confirm');

// ============================================================================
// 4. SVG Icons
// ============================================================================
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

const TRASH_ICON_SVG = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 6h18"/>
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
    </svg>
`;

// ============================================================================
// 5. Utility Helpers
// ============================================================================
function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getFormattedDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function cleanTextForSpeech(text) {
    return text
        .replace(/⚠️/g, '')
        .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
        .replace(/[🚨ℹ️👉🩺👤🎙️🔊⏹️📋📊📈]/g, '')
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

// ============================================================================
// 6. Voice Synthesis Setup (Web Speech API + Edge-TTS Streaming)
// ============================================================================
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

// ============================================================================
// 7. Chat Assistant Helpers (Stage 1 & Stage 3 Preserved)
// ============================================================================
function fallbackCopyText(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.width = "2em";
    textArea.style.height = "2em";
    textArea.style.padding = "0";
    textArea.style.border = "none";
    textArea.style.outline = "none";
    textArea.style.boxShadow = "none";
    textArea.style.background = "transparent";
    textArea.style.opacity = "0";
    textArea.setAttribute("readonly", "");
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    let successful = false;
    try {
        successful = document.execCommand('copy');
    } catch (err) {
        successful = false;
    }
    document.body.removeChild(textArea);
    return successful;
}

async function copyMessageText(text, btnElement) {
    let copied = false;
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            copied = true;
        } else {
            copied = fallbackCopyText(text);
        }
    } catch (err) {
        copied = fallbackCopyText(text);
    }

    const originalHTML = btnElement.innerHTML;
    btnElement.innerHTML = `${CHECK_ICON_SVG} <span>${I18N[currentLang].copiedText}</span>`;
    btnElement.classList.add('copied');
    setTimeout(() => {
        btnElement.innerHTML = originalHTML;
        btnElement.classList.remove('copied');
    }, 2000);
}


function appendMessage(sender, text, isEmergency = false, isError = false, sources = []) {
    const row = document.createElement('div');
    row.className = `message-row ${sender}`;
    if (isEmergency) row.classList.add('emergency');

    const avatar = document.createElement('div');
    avatar.className = 'msg-avatar';
    avatar.textContent = sender === 'user' ? '👤' : (isEmergency ? '🚨' : '🩺');

    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    if (isError) bubble.style.borderColor = '#f87171';

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

    // Render calm RAG sources box if verified documents were retrieved
    if (sources && Array.isArray(sources) && sources.length > 0) {
        const sourcesBox = document.createElement('div');
        sourcesBox.className = 'rag-sources-box';
        const labelText = currentLang === 'ta' ? 'மருத்துவ ஆதாரங்கள் (Trusted Sources):' : 'Trusted Sources:';
        sourcesBox.innerHTML = `
            <div class="rag-sources-title">
                <span class="rag-sources-icon" aria-hidden="true">📚</span>
                <span>${labelText}</span>
            </div>
            <ul class="rag-sources-list">
                ${sources.map(s => {
                    const title = escapeHTML(s.title || 'Guideline');
                    const src = escapeHTML(s.source || '');
                    const url = s.url ? escapeHTML(s.url) : '';
                    const linkHtml = url ? `<a href="${url}" target="_blank" rel="noopener noreferrer" class="rag-source-link">🔗 ${currentLang === 'ta' ? 'பார்வை' : 'View'}</a>` : '';
                    return `<li><span class="rag-source-item-title">${title}</span> <span class="rag-source-item-org">(${src})</span> ${linkHtml}</li>`;
                }).join('')}
            </ul>
        `;
        bubble.appendChild(sourcesBox);
    }

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

    row.scrollIntoView({ behavior: 'smooth', block: 'end' });
    return speechBtn;
}

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

// ============================================================================
// Module B2: Dynamic Suggested Questions Engine & Fallback Pool
// ============================================================================
const DEFAULT_QUESTIONS_POOL = [
  {
    "id": "basics_01",
    "topic": "basics",
    "en": "What is diabetes and how does it develop in the human body?",
    "ta": "சர்க்கரை நோய் என்றால் என்ன, அது மனித உடலில் எவ்வாறு உருவாகிறது?"
  },
  {
    "id": "basics_02",
    "topic": "basics",
    "en": "What role does the pancreas and insulin play in regulating blood glucose?",
    "ta": "இரத்த சர்க்கரையை கட்டுப்படுத்துவதில் கணையம் மற்றும் இன்சுலின் பங்கு என்ன?"
  },
  {
    "id": "basics_03",
    "topic": "basics",
    "en": "What is prediabetes and can lifestyle changes help prevent its progression?",
    "ta": "ப்ரீடியாபயாட்டீஸ் (Prediabetes) என்றால் என்ன, வாழ்க்கை முறை மாற்றங்கள் அதை தடுக்க உதவுமா?"
  },
  {
    "id": "type1_01",
    "topic": "type 1",
    "en": "What causes Type 1 diabetes and how does it differ from Type 2?",
    "ta": "டைப் 1 நீரிழிவு நோய் எவ்வாறு ஏற்படுகிறது, அது டைப் 2-லிருந்து எவ்வாறு வேறுபடுகிறது?"
  },
  {
    "id": "type1_02",
    "topic": "type 1",
    "en": "Why is Type 1 diabetes considered an autoimmune condition?",
    "ta": "டைப் 1 நீரிழிவு நோய் ஏன் ஒரு சுயதடுப்பாற்றல் (Autoimmune) நிலையாகக் கருதப்படுகிறது?"
  },
  {
    "id": "type2_01",
    "topic": "type 2",
    "en": "What is insulin resistance and how does it contribute to Type 2 diabetes?",
    "ta": "இன்சுலின் எதிர்ப்பு (Insulin Resistance) என்றால் என்ன, அது டைப் 2 நீரிழிவை எவ்வாறு உருவாக்குகிறது?"
  },
  {
    "id": "type2_02",
    "topic": "type 2",
    "en": "What are the common lifestyle and hereditary risk factors for Type 2 diabetes?",
    "ta": "டைப் 2 நீரிழிவு ஏற்படுவதற்கான பொதுவான வாழ்க்கை முறை மற்றும் பரம்பரை காரணிகள் யாவை?"
  },
  {
    "id": "type2_03",
    "topic": "type 2",
    "en": "Can regular exercise and a balanced diet help manage Type 2 diabetes?",
    "ta": "முறையான உடற்பயிற்சி மற்றும் சரிவிகித உணவு டைப் 2 நீரிழிவை நிர்வகிக்க உதவுமா?"
  },
  {
    "id": "gestational_01",
    "topic": "gestational",
    "en": "What is gestational diabetes and when is it typically screened during pregnancy?",
    "ta": "கர்ப்பகால நீரிழிவு (Gestational Diabetes) என்றால் என்ன, கர்ப்ப காலத்தில் இது எப்போது பரிசோதிக்கப்படுகிறது?"
  },
  {
    "id": "gestational_02",
    "topic": "gestational",
    "en": "Why is blood sugar monitoring important for both mother and baby during pregnancy?",
    "ta": "கர்ப்ப காலத்தில் தாய் மற்றும் குழந்தையின் ஆரோக்கியத்திற்கு சர்க்கரை கண்காணிப்பு ஏன் முக்கியம்?"
  },
  {
    "id": "gestational_03",
    "topic": "gestational",
    "en": "Does gestational diabetes usually resolve after delivery, and is follow-up testing needed?",
    "ta": "பிரசவத்திற்குப் பிறகு கர்ப்பகால நீரிழிவு பொதுவாக சரியாகிவிடுமா, தொடர் பரிசோதனை தேவையா?"
  },
  {
    "id": "glucose_01",
    "topic": "glucose",
    "en": "What is blood glucose and why does the body require it for energy?",
    "ta": "இரத்த குளுக்கோஸ் என்றால் என்ன, உடலின் ஆற்றலுக்கு அது ஏன் தேவைப்படுகிறது?"
  },
  {
    "id": "glucose_02",
    "topic": "glucose",
    "en": "Why do blood sugar levels fluctuate naturally throughout the day?",
    "ta": "நாள் முழுவதும் இரத்த சர்க்கரை அளவு இயற்கையாக ஏன் ஏற்ற இறக்கங்களை சந்திக்கிறது?"
  },
  {
    "id": "fasting_01",
    "topic": "fasting",
    "en": "What is a fasting blood glucose test and how many hours of fasting are needed?",
    "ta": "வெறும் வயிற்று சர்க்கரை பரிசோதனை (Fasting Test) என்றால் என்ன, எத்தனை மணி நேரம் உண்ணாமல் இருக்க வேண்டும்?"
  },
  {
    "id": "fasting_02",
    "topic": "fasting",
    "en": "What is the typical educational reference range for fasting blood glucose?",
    "ta": "வெறும் வயிற்று சர்க்கரை அளவிற்கான பொதுவான கல்வி வழிகாட்டல் வரம்பு என்ன?"
  },
  {
    "id": "post_meal_01",
    "topic": "post-meal",
    "en": "When should post-meal blood sugar be tested, and why is the 2-hour mark standard?",
    "ta": "உணவுக்குப் பின் சர்க்கரை பரிசோதனையை எப்போது செய்ய வேண்டும், 2 மணி நேர இடைவெளி ஏன் முக்கியம்?"
  },
  {
    "id": "post_meal_02",
    "topic": "post-meal",
    "en": "Why does the timing of the 2-hour post-meal test start from the first bite of the meal?",
    "ta": "உணவுக்குப் பின் 2 மணி நேர கணக்கு முதல் கவளம் சாப்பிட்டதில் இருந்தே ஏன் தொடங்கப்பட வேண்டும்?"
  },
  {
    "id": "hba1c_01",
    "topic": "HbA1c",
    "en": "What does the HbA1c test measure and how does it reflect a 3-month average?",
    "ta": "HbA1c பரிசோதனை எதை அளவிடுகிறது, அது 3 மாத சராசரி சர்க்கரை அளவை எவ்வாறு காட்டுகிறது?"
  },
  {
    "id": "hba1c_02",
    "topic": "HbA1c",
    "en": "How often do healthcare providers generally recommend checking HbA1c levels?",
    "ta": "HbA1c பரிசோதனையை எத்தனை மாதங்களுக்கு ஒருமுறை செய்ய மருத்துவர்கள் பொதுவாக பரிந்துரைக்கிறார்கள்?"
  },
  {
    "id": "hba1c_03",
    "topic": "HbA1c",
    "en": "What is the difference between a daily fingerstick glucose reading and an HbA1c result?",
    "ta": "தினசரி குளுக்கோமீட்டர் பரிசோதனைக்கும் HbA1c பரிசோதனைக்கும் உள்ள வித்தியாசம் என்ன?"
  },
  {
    "id": "hypo_01",
    "topic": "hypoglycemia awareness",
    "en": "What are common early warning signs of low blood sugar (Hypoglycemia)?",
    "ta": "குறைந்த இரத்த சர்க்கரை அளவின் (Hypoglycemia) ஆரம்ப எச்சரிக்கை அறிகுறிகள் யாவை?"
  },
  {
    "id": "hypo_02",
    "topic": "hypoglycemia awareness",
    "en": "What is the educational 'Rule of 15' used for managing mild low blood sugar?",
    "ta": "லேசான சர்க்கரை குறைவை சரிசெய்ய உதவும் பொதுவான '15-விதி' (Rule of 15) என்றால் என்ன?"
  },
  {
    "id": "hypo_03",
    "topic": "hypoglycemia awareness",
    "en": "Why can delayed meals or unexpected physical exertion cause blood sugar drops?",
    "ta": "உணவை தாமதப்படுத்துவது அல்லது எதிர்பாராத உடற்பயிற்சி சர்க்கரை அளவை ஏன் குறைக்கக்கூடும்?"
  },
  {
    "id": "hyper_01",
    "topic": "hyperglycemia awareness",
    "en": "What are common signs of elevated blood sugar (Hyperglycemia) such as thirst and fatigue?",
    "ta": "அதிக தாகம், அடிக்கடி சிறுநீர் கழித்தல் போன்ற அதிக சர்க்கரை அளவின் (Hyperglycemia) அறிகுறிகள் யாவை?"
  },
  {
    "id": "hyper_02",
    "topic": "hyperglycemia awareness",
    "en": "What everyday factors can contribute to temporary blood sugar spikes?",
    "ta": "இரத்த சர்க்கரை அளவு தற்காலிகமாக உயர்வதற்கு அன்றாட காரணிகள் எவை காரணமாக அமையலாம்?"
  },
  {
    "id": "healthy_eating_01",
    "topic": "healthy eating",
    "en": "What is the healthy plate method for balancing vegetables, protein, and grains?",
    "ta": "காய்கறிகள், புரதம் மற்றும் தானியங்களை சமச்சீராக அமைக்கும் ஆரோக்கிய தட்டு முறை (Plate Method) என்றால் என்ன?"
  },
  {
    "id": "healthy_eating_02",
    "topic": "healthy eating",
    "en": "How does portion control support stable blood glucose throughout the day?",
    "ta": "உணவு அளவைக் கட்டுப்படுத்துவது (Portion Control) நாள் முழுவதும் சர்க்கரை அளவை சீராக வைக்க எவ்வாறு உதவுகிறது?"
  },
  {
    "id": "healthy_eating_03",
    "topic": "healthy eating",
    "en": "Are whole fruits preferred over strained fruit juices for blood sugar balance?",
    "ta": "இரத்த சர்க்கரை சமநிலைக்கு பழச்சாறுகளை விட முழு பழங்களை உண்பது ஏன் சிறந்தது?"
  },
  {
    "id": "carbs_01",
    "topic": "carbohydrates",
    "en": "What is the glycemic index and how does it categorize foods based on sugar release?",
    "ta": "கிளைசெமிக் குறியீடு (Glycemic Index) என்றால் என்ன, அது உணவுகளை எவ்வாறு வகைப்படுத்துகிறது?"
  },
  {
    "id": "carbs_02",
    "topic": "carbohydrates",
    "en": "What is the difference between simple carbohydrates and complex carbohydrates?",
    "ta": "எளிய கார்போஹைட்ரேட்டுகளுக்கும் சிக்கலான கார்போஹைட்ரேட்டுகளுக்கும் என்ன வித்தியாசம்?"
  },
  {
    "id": "carbs_03",
    "topic": "carbohydrates",
    "en": "How do traditional millets compare to polished white rice for carbohydrate digestion?",
    "ta": "செரிமானம் மற்றும் சர்க்கரை உறிஞ்சுதலில் வெள்ளை அரிசியை விட பாரம்பரிய சிறுதானியங்கள் எவ்வாறு உதவுகின்றன?"
  },
  {
    "id": "fiber_01",
    "topic": "fiber",
    "en": "How does dietary fiber help slow the absorption of glucose into the bloodstream?",
    "ta": "உணவில் உள்ள நார்ச்சத்து இரத்தத்தில் குளுக்கோஸ் உறிஞ்சப்படுவதை மெதுவாக்க எவ்வாறு உதவுகிறது?"
  },
  {
    "id": "fiber_02",
    "topic": "fiber",
    "en": "What are some fiber-rich local vegetables and legumes suitable for healthy meals?",
    "ta": "சீரான உணவுக்கு ஏற்ற நார்ச்சத்து மிகுந்த உள்ளூர் காய்கறிகள் மற்றும் பருப்பு வகைகள் யாவை?"
  },
  {
    "id": "hydration_01",
    "topic": "hydration",
    "en": "Why is staying well-hydrated important for maintaining healthy blood glucose levels?",
    "ta": "இரத்த சர்க்கரை அளவை சீராக பராமரிக்க போதுமான தண்ணீர் குடிப்பது ஏன் முக்கியம்?"
  },
  {
    "id": "hydration_02",
    "topic": "hydration",
    "en": "How do sugary beverages and sweetened sodas impact blood sugar compared to plain water?",
    "ta": "சாதாரண தண்ணீருடன் ஒப்பிடுகையில் சர்க்கரை கலந்த குளிர்பானங்கள் இரத்த சர்க்கரையை எவ்வாறு பாதிக்கின்றன?"
  },
  {
    "id": "activity_01",
    "topic": "activity",
    "en": "How does a 15-minute gentle walk after meals help muscles absorb glucose?",
    "ta": "உணவுக்குப் பின் 15 நிமிட நடைபயிற்சி தசைகள் சர்க்கரையை உறிஞ்ச எவ்வாறு உதவுகிறது?"
  },
  {
    "id": "activity_02",
    "topic": "activity",
    "en": "What are the general physical activity recommendations for adults managing diabetes?",
    "ta": "சர்க்கரை நோயை நிர்வகிக்கும் பெரியவர்களுக்கு பொதுவாக பரிந்துரைக்கப்படும் உடற்பயிற்சி நேரம் என்ன?"
  },
  {
    "id": "activity_03",
    "topic": "activity",
    "en": "Why is it advisable to stay hydrated and carry a glucose snack during workouts?",
    "ta": "உடற்பயிற்சி செய்யும்போது போதுமான நீர் அருந்துவதும் குளுக்கோஸ் சிற்றுண்டி வைத்திருப்பதும் ஏன் நல்லது?"
  },
  {
    "id": "sleep_01",
    "topic": "sleep",
    "en": "How does getting 7 to 8 hours of restful sleep influence insulin sensitivity?",
    "ta": "7 முதல் 8 மணி நேர ஆழ்ந்த தூக்கம் இன்சுலின் உணர்திறனை எவ்வாறு மேம்படுத்துகிறது?"
  },
  {
    "id": "sleep_02",
    "topic": "sleep",
    "en": "Can chronic sleep deprivation and irregular sleep cycles elevate morning glucose readings?",
    "ta": "தொடர் தூக்கமின்மை மற்றும் ஒழுங்கற்ற தூக்க நேரம் காலை சர்க்கரை அளவை உயர்த்தக்கூடுமா?"
  },
  {
    "id": "stress_01",
    "topic": "stress",
    "en": "How do stress hormones like cortisol and adrenaline affect blood glucose levels?",
    "ta": "கார்டிசோல் போன்ற மன அழுத்த ஹார்மோன்கள் இரத்த சர்க்கரை அளவை எவ்வாறு அதிகரிக்கின்றன?"
  },
  {
    "id": "stress_02",
    "topic": "stress",
    "en": "What simple relaxation habits, such as deep breathing, can help support stress management?",
    "ta": "ஆழ்ந்த மூச்சுப்பயிற்சி போன்ற எளிய பழக்கங்கள் மன அழுத்தத்தை நிர்வகிக்க எவ்வாறு உதவுகின்றன?"
  },
  {
    "id": "foot_care_01",
    "topic": "foot care",
    "en": "Why is daily foot inspection essential for individuals living with diabetes?",
    "ta": "சர்க்கரை நோய் உள்ளவர்கள் தினமும் பாதங்களை பரிசோதிப்பது ஏன் மிகவும் அவசியம்?"
  },
  {
    "id": "foot_care_02",
    "topic": "foot care",
    "en": "What footwear precautions help prevent blisters, cuts, and pressure sores on feet?",
    "ta": "பாதங்களில் கொப்புளங்கள் மற்றும் வெட்டுக்காயங்கள் ஏற்படுவதைத் தடுக்க என்ன காலணி முன்னெச்சரிக்கைகள் தேவை?"
  },
  {
    "id": "foot_care_03",
    "topic": "foot care",
    "en": "Why is it important to keep the skin between the toes clean and thoroughly dry?",
    "ta": "கால் விரல்களுக்கு இடைப்பட்ட பகுதியை சுத்தமாகவும் உலர்வாகவும் வைத்திருப்பது ஏன் முக்கியம்?"
  },
  {
    "id": "eye_health_01",
    "topic": "eye health",
    "en": "What is diabetic retinopathy and why are annual dilated eye examinations recommended?",
    "ta": "டயாபெடிக் ரெட்டினோபதி என்றால் என்ன, ஆண்டுதோறும் கண் பரிசோதனை செய்வது ஏன் பரிந்துரைக்கப்படுகிறது?"
  },
  {
    "id": "eye_health_02",
    "topic": "eye health",
    "en": "What early visual changes should prompt a visit to an eye care specialist?",
    "ta": "பார்வையில் என்ன மாற்றங்கள் ஏற்பட்டால் கண் மருத்துவரை உடனே அணுக வேண்டும்?"
  },
  {
    "id": "kidney_health_01",
    "topic": "kidney health",
    "en": "How does long-term blood glucose and blood pressure management protect kidney function?",
    "ta": "நீண்ட கால இரத்த சர்க்கரை மற்றும் இரத்த அழுத்த மேலாண்மை சிறுநீரக செயல்பாட்டை எவ்வாறு பாதுகாக்கிறது?"
  },
  {
    "id": "kidney_health_02",
    "topic": "kidney health",
    "en": "What routine tests, such as urine albumin and serum creatinine, check kidney health?",
    "ta": "சிறுநீரக ஆரோக்கியத்தை கண்காணிக்க உதவும் சிறுநீர் அல்புமின் மற்றும் கிரியேட்டினின் பரிசோதனைகள் யாவை?"
  },
  {
    "id": "blood_pressure_01",
    "topic": "blood pressure",
    "en": "Why is maintaining healthy blood pressure especially important alongside diabetes?",
    "ta": "சர்க்கரை நோயுடன் சேர்த்து இரத்த அழுத்தத்தையும் சீராக பராமரிப்பது ஏன் மிகவும் முக்கியம்?"
  },
  {
    "id": "blood_pressure_02",
    "topic": "blood pressure",
    "en": "How do reducing dietary salt and staying active support blood pressure wellness?",
    "ta": "உணவில் உப்பை குறைப்பதும் சுறுசுறுப்பாக இருப்பதும் இரத்த அழுத்தத்தை கட்டுக்குள் வைக்க எவ்வாறு உதவுகின்றன?"
  },
  {
    "id": "cholesterol_01",
    "topic": "cholesterol",
    "en": "What is the difference between LDL (bad cholesterol) and HDL (good cholesterol)?",
    "ta": "LDL (கெட்ட கொழுப்பு) மற்றும் HDL (நல்ல கொழுப்பு) இடையே உள்ள வேறுபாடு என்ன?"
  },
  {
    "id": "cholesterol_02",
    "topic": "cholesterol",
    "en": "Why is an annual lipid profile test recommended for cardiovascular wellness in diabetes?",
    "ta": "சர்க்கரை நோய் உள்ளவர்களுக்கு இதய நலனை பாதுகாக்க ஆண்டுதோறும் கொழுப்பு பரிசோதனை (Lipid Profile) ஏன் பரிந்துரைக்கப்படுகிறது?"
  },
  {
    "id": "doctor_visits_01",
    "topic": "doctor visits",
    "en": "What key questions and daily logs are helpful to prepare before a routine doctor appointment?",
    "ta": "வழக்கமான மருத்துவர் சந்திப்பிற்கு முன் என்ன குறிப்புகள் மற்றும் கேள்விகளை தயார் செய்து கொள்வது நல்லது?"
  },
  {
    "id": "doctor_visits_02",
    "topic": "doctor visits",
    "en": "How often should routine comprehensive diabetes reviews be scheduled with a physician?",
    "ta": "மருத்துவருடன் வழக்கமான விரிவான நீரிழிவு மறுஆய்வை எவ்வளவு காலத்திற்கு ஒருமுறை திட்டமிட வேண்டும்?"
  },
  {
    "id": "glucose_tracking_01",
    "topic": "glucose tracking",
    "en": "Why is recording glucose readings with notes on meals and activity useful over time?",
    "ta": "சர்க்கரை அளவுகளுடன் உணவு மற்றும் செயல்பாட்டுக் குறிப்புகளை பதிவு செய்வது ஏன் நீண்டகால பலன் தரும்?"
  },
  {
    "id": "glucose_tracking_02",
    "topic": "glucose tracking",
    "en": "How does tracking patterns across days help identify personal trends rather than single numbers?",
    "ta": "ஒற்றை எண்ணை விட பல நாள் போக்குகளை கண்காணிப்பது தனிப்பட்ட உடல் பழக்கங்களை புரிந்துகொள்ள எவ்வாறு உதவுகிறது?"
  },
  {
    "id": "myths_01",
    "topic": "myths",
    "en": "Is it true that eating extremely bitter foods like bitter gourd can cure diabetes?",
    "ta": "பாகற்காய் போன்ற கசப்பான உணவுகளை சாப்பிட்டால் சர்க்கரை நோய் முழுமையாக குணமாகிவிடும் என்பது உண்மையா?"
  },
  {
    "id": "myths_02",
    "topic": "myths",
    "en": "Is it a myth that people with diabetes must completely avoid all fresh fruits?",
    "ta": "சர்க்கரை நோய் உள்ளவர்கள் புதிய பழங்களை முற்றிலும் தவிர்க்க வேண்டும் என்பது உண்மையா?"
  },
  {
    "id": "myths_03",
    "topic": "myths",
    "en": "Can diabetes be caused simply by eating sweets on a single occasion?",
    "ta": "ஒரே ஒரு முறை அதிக இனிப்பு சாப்பிடுவதால் மட்டுமே சர்க்கரை நோய் வந்துவிடுமா?"
  },
  {
    "id": "seek_help_01",
    "topic": "when to seek help",
    "en": "What warning signs indicate that you should promptly contact your healthcare provider?",
    "ta": "எந்தெந்த எச்சரிக்கை அறிகுறிகள் தென்பட்டால் உடனடியாக மருத்துவரை தொடர்பு கொள்ள வேண்டும்?"
  },
  {
    "id": "seek_help_02",
    "topic": "when to seek help",
    "en": "When do persistent high glucose readings or unexplained weight loss warrant medical review?",
    "ta": "தொடர்ந்து அதிக சர்க்கரை அளவு அல்லது காரணமற்ற எடை இழப்பு ஏற்படும்போது எப்போது மருத்துவரை அணுக வேண்டும்?"
  },
  {
    "id": "seek_help_03",
    "topic": "when to seek help",
    "en": "What severe symptoms require immediate emergency medical care (such as calling 108)?",
    "ta": "உடனடி அவசர மருத்துவ உதவியை (108 அழைப்பு போன்றவை) கோரும் தீவிர அறிகுறிகள் யாவை?"
  }
];

const TOPIC_ICONS = {
    'basics': '🩺',
    'type 1': '🩺',
    'type 2': '🩺',
    'gestational': '🤰',
    'glucose': '🩸',
    'fasting': '⏱️',
    'post-meal': '🍽️',
    'hba1c': '📊',
    'hypoglycemia awareness': '⚠️',
    'hyperglycemia awareness': '📈',
    'healthy eating': '🥗',
    'carbohydrates': '🌾',
    'fiber': '🥬',
    'hydration': '💧',
    'activity': '🏃',
    'sleep': '🌙',
    'stress': '🧘',
    'foot care': '🦶',
    'eye health': '👁️',
    'kidney health': '🫘',
    'blood pressure': '💓',
    'cholesterol': '🫀',
    'doctor visits': '👨‍⚕️',
    'glucose tracking': '📝',
    'myths': '💡',
    'when to seek help': '🚨'
};

function getTopicIcon(topic) {
    if (!topic) return '💡';
    return TOPIC_ICONS[topic.toLowerCase()] || '💡';
}

function detectTopicFromText(text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    const pool = (questionsPool && questionsPool.length > 0) ? questionsPool : DEFAULT_QUESTIONS_POOL;
    for (const q of pool) {
        if (q.topic && lower.includes(q.topic.toLowerCase())) return q.topic;
    }
    if (lower.includes("fasting") || lower.includes("வெறும் வயிறு")) return "fasting";
    if (lower.includes("hba1c") || lower.includes("சராசரி")) return "HbA1c";
    if (lower.includes("food") || lower.includes("உணவு") || lower.includes("சாப்பாடு") || lower.includes("diet")) return "healthy eating";
    if (lower.includes("walk") || lower.includes("நடைபயிற்சி") || lower.includes("உடற்பயிற்சி") || lower.includes("exercise")) return "activity";
    if (lower.includes("hypo") || lower.includes("குறைந்த சர்க்கரை")) return "hypoglycemia awareness";
    if (lower.includes("hyper") || lower.includes("அதிக சர்க்கரை")) return "hyperglycemia awareness";
    if (lower.includes("foot") || lower.includes("பாதம்")) return "foot care";
    if (lower.includes("eye") || lower.includes("கண்")) return "eye health";
    if (lower.includes("kidney") || lower.includes("சிறுநீரகம்")) return "kidney health";
    if (lower.includes("pressure") || lower.includes("அழுத்தம்")) return "blood pressure";
    return null;
}

const QUESTION_CATEGORIES = [
    {
        id: 'all',
        icon: '🌟',
        en: 'All Topics',
        ta: 'அனைத்தும்',
        topics: null
    },
    {
        id: 'food',
        icon: '🥗',
        en: 'Food & Nutrition',
        ta: 'உணவு & ஊட்டச்சத்து',
        topics: ['healthy eating', 'carbohydrates', 'fiber', 'hydration']
    },
    {
        id: 'glucose',
        icon: '🩸',
        en: 'Blood Glucose & Insulin',
        ta: 'இரத்த சர்க்கரை & இன்சுலின்',
        topics: ['glucose', 'fasting', 'post-meal', 'HbA1c', 'hypoglycemia awareness', 'hyperglycemia awareness', 'glucose tracking']
    },
    {
        id: 'health',
        icon: '🏃',
        en: 'Health & Exercise',
        ta: 'உடல்நலம் & உடற்பயிற்சி',
        topics: ['activity', 'sleep', 'stress', 'foot care', 'eye health', 'kidney health', 'blood pressure', 'cholesterol', 'when to seek help']
    },
    {
        id: 'diabetes',
        icon: '🩺',
        en: 'About Diabetes',
        ta: 'சர்க்கரை நோய் பற்றி',
        topics: ['basics', 'type 1', 'type 2', 'gestational', 'myths', 'doctor visits']
    }
];

let activeQuestionCategoryId = 'all';

function getCategoryFilteredPool(categoryId) {
    const rawPool = (questionsPool && questionsPool.length > 0) ? questionsPool : DEFAULT_QUESTIONS_POOL;
    if (!rawPool || rawPool.length === 0) return [];
    if (!categoryId || categoryId === 'all') return rawPool;

    const catObj = QUESTION_CATEGORIES.find(c => c.id === categoryId);
    if (!catObj || !catObj.topics) return rawPool;

    const lowerTopics = catObj.topics.map(t => t.toLowerCase());
    const filtered = rawPool.filter(q => q.topic && lowerTopics.includes(q.topic.toLowerCase()));
    return filtered.length > 0 ? filtered : rawPool;
}

function pickFreshQuestion(excludeSlotIndex, categoryId = activeQuestionCategoryId) {
    const pool = getCategoryFilteredPool(categoryId);
    if (!pool || pool.length === 0) return null;

    // Collect IDs currently visible in the OTHER slots (guarantees no duplicates visible at same time)
    const visibleIds = new Set();
    for (let i = 0; i < displayedQuestions.length; i++) {
        if (i !== excludeSlotIndex && displayedQuestions[i]) {
            visibleIds.add(displayedQuestions[i].id);
        }
    }

    // Filter available pool: cannot duplicate currently visible, used, or recently shown
    let candidates = pool.filter(q =>
        !visibleIds.has(q.id) &&
        !usedQuestionIds.has(q.id) &&
        !recentlyShownIds.has(q.id)
    );

    // If pool is exhausted, safely reset session tracking for this category
    if (candidates.length === 0) {
        usedQuestionIds.clear();
        recentlyShownIds.clear();
        visibleIds.forEach(id => recentlyShownIds.add(id));
        candidates = pool.filter(q => !visibleIds.has(q.id));
        if (candidates.length === 0) {
            candidates = pool;
        }
    }

    // Prefer questions on the same topic as the last question/answer (dynamic evolution)
    let chosen = null;
    if (lastTopic) {
        const sameTopic = candidates.filter(q => q.topic && q.topic.toLowerCase() === lastTopic.toLowerCase());
        if (sameTopic.length > 0) {
            chosen = sameTopic[Math.floor(Math.random() * sameTopic.length)];
        }
    }

    // Otherwise random from candidates
    if (!chosen) {
        chosen = candidates[Math.floor(Math.random() * candidates.length)];
    }

    if (chosen) {
        recentlyShownIds.add(chosen.id);
        // Keep recentlyShownIds rolling window bounded
        if (recentlyShownIds.size > 30) {
            const arr = Array.from(recentlyShownIds);
            recentlyShownIds = new Set(arr.slice(arr.length - 20));
        }
    }

    return chosen;
}

function createQuestionCardElement(qObj, slotIndex) {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'question-card';
    card.setAttribute('data-slot', String(slotIndex));
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');

    const icon = getTopicIcon(qObj.topic);
    const qText = qObj[currentLang] || qObj.en || qObj.ta || '';

    card.setAttribute('aria-label', qText);
    card.innerHTML = `
        <span class="question-icon" aria-hidden="true">${icon}</span>
        <span class="question-text">${escapeHTML(qText)}</span>
    `;

    card.addEventListener('click', () => {
        handleSuggestionClick(slotIndex);
    });

    return card;
}

function handleSuggestionClick(slotIndex) {
    if (isProcessing) return;
    const clickedQ = displayedQuestions[slotIndex];
    if (!clickedQ) return;

    const qText = clickedQ[currentLang] || clickedQ.en || clickedQ.ta || '';

    // Send it to chat exactly as now
    lastInputWasVoice = false;
    userInput.value = qText;
    handleMessageSubmit();

    // Track displayed, used, and recently shown questions for the session
    usedQuestionIds.add(clickedQ.id);
    recentlyShownIds.add(clickedQ.id);
    if (clickedQ.topic) {
        lastTopic = clickedQ.topic;
    }

    // Pick fresh evolving question for ONLY this slot in the active category
    const freshQ = pickFreshQuestion(slotIndex, activeQuestionCategoryId);
    displayedQuestions[slotIndex] = freshQ;

    // Replace ONLY that slot in the DOM with dynamic evolution effect
    replaceSlotCardInDOM(slotIndex, freshQ);
}

function replaceSlotCardInDOM(slotIndex, freshQ) {
    if (!freshQ) return;
    const oldCard = questionCardsGrid.querySelector(`[data-slot="${slotIndex}"]`) || questionCardsGrid.children[slotIndex];
    const newCard = createQuestionCardElement(freshQ, slotIndex);
    newCard.classList.add('question-evolved');

    if (oldCard && oldCard.parentNode === questionCardsGrid) {
        questionCardsGrid.replaceChild(newCard, oldCard);
    } else {
        questionCardsGrid.appendChild(newCard);
    }
}

function renderCategoryTabs() {
    if (!categoryTabs) return;
    if (!suggestionsVisible) {
        categoryTabs.style.display = 'none';
        return;
    }
    categoryTabs.style.display = 'flex';
    categoryTabs.innerHTML = '';

    QUESTION_CATEGORIES.forEach(cat => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'category-tab-btn' + (cat.id === activeQuestionCategoryId ? ' active' : '');
        btn.setAttribute('role', 'tab');
        btn.setAttribute('aria-selected', cat.id === activeQuestionCategoryId ? 'true' : 'false');
        btn.setAttribute('data-category', cat.id);

        const labelText = cat[currentLang] || cat.en || cat.id;
        btn.innerHTML = `
            <span class="category-icon" aria-hidden="true">${cat.icon}</span>
            <span class="category-text">${escapeHTML(labelText)}</span>
        `;

        btn.addEventListener('click', () => {
            if (activeQuestionCategoryId === cat.id) return;
            switchQuestionCategory(cat.id);
        });

        categoryTabs.appendChild(btn);
    });
}

function switchQuestionCategory(categoryId) {
    activeQuestionCategoryId = categoryId;
    renderCategoryTabs();
    for (let slot = 0; slot < 3; slot++) {
        displayedQuestions[slot] = pickFreshQuestion(slot, activeQuestionCategoryId);
    }
    renderSuggestedQuestionsUI();
}

function initSuggestedQuestions() {
    renderCategoryTabs();
    for (let slot = 0; slot < 3; slot++) {
        if (!displayedQuestions[slot]) {
            displayedQuestions[slot] = pickFreshQuestion(slot, activeQuestionCategoryId);
        }
    }
    renderSuggestedQuestionsUI();
}

function renderSuggestedQuestionsUI() {
    if (!categoryTabs || !questionCardsGrid) return;
    if (suggestionsVisible) {
        categoryTabs.style.display = 'flex';
        questionCardsGrid.style.display = 'grid';
    } else {
        categoryTabs.style.display = 'none';
        questionCardsGrid.style.display = 'none';
        return;
    }

    questionCardsGrid.innerHTML = '';
    for (let slot = 0; slot < 3; slot++) {
        if (displayedQuestions[slot]) {
            const card = createQuestionCardElement(displayedQuestions[slot], slot);
            questionCardsGrid.appendChild(card);
        }
    }
}

function updateSuggestedQuestionsLanguage(lang) {
    renderCategoryTabs();
    for (let slot = 0; slot < 3; slot++) {
        const qObj = displayedQuestions[slot];
        if (!qObj) continue;
        const card = questionCardsGrid.querySelector(`[data-slot="${slot}"]`) || questionCardsGrid.children[slot];
        if (card) {
            const qText = qObj[lang] || qObj.en || qObj.ta || '';
            const textEl = card.querySelector('.question-text');
            if (textEl) {
                textEl.textContent = qText;
            }
            card.setAttribute('aria-label', qText);
        }
    }
}

function renderCategoriesAndQuestions() {
    renderCategoryTabs();
    if (!displayedQuestions[0] || !displayedQuestions[1] || !displayedQuestions[2]) {
        initSuggestedQuestions();
    } else {
        updateSuggestedQuestionsLanguage(currentLang);
    }
}

async function fetchSuggestedQuestionsPool() {
    try {
        const res = await fetch('/questions/suggested');
        if (res.ok) {
            const data = await res.json();
            if (data && Array.isArray(data.questions) && data.questions.length > 0) {
                questionsPool = data.questions;
                renderCategoriesAndQuestions();
            }
        }
    } catch (err) {
        // Silently fallback to DEFAULT_QUESTIONS_POOL
    }
}

function resetChat() {
    stopSpeech();
    conversationHistory = [];
    chatMessages.innerHTML = '';
    renderWelcomeCard();
}

async function handleMessageSubmit() {
    const message = userInput.value.trim();
    if (!message || isProcessing) return;

    // Track topic from message for subsequent suggestion preference
    const detectedTopic = detectTopicFromText(message);
    if (detectedTopic) {
        lastTopic = detectedTopic;
    }

    stopSpeech();

    if (isRecording && recognition) {
        recognition.stop();
    }

    const triggeredByVoice = lastInputWasVoice;
    lastInputWasVoice = false;

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

        if (response.ok && (data.status === 'success' || data.status === 'emergency' || data.status === 'insufficient_info' || data.status === 'medication_notice' || data.status === 'crisis_support')) {
            const isEmergency = data.status === 'emergency';
            const sources = data.sources || [];
            const speechBtn = appendMessage('assistant', data.reply, isEmergency, false, sources);

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
            const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
            let msg = I18N[currentLang].micPermissionDenied;
            if (!window.isSecureContext && !isLocalhost) {
                msg += (currentLang === 'ta'
                    ? "\n\n💡 குறிப்பு: உலாவி பாதுகாப்பு விதிகளின்படி, மைக்ரோஃபோன் இயங்க http://localhost:5000 முகவரியில் திறக்கவும்."
                    : "\n\n💡 Tip: Due to browser security restrictions on network IPs, please access the app at http://localhost:5000 to enable the microphone.");
            }
            appendMessage('assistant', msg, false, true);
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

    const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
    if (!window.isSecureContext && !isLocalhost) {
        const lanWarning = currentLang === 'ta'
            ? "⚠️ மைக்ரோஃபோனைப் பயன்படுத்த, உலாவியில் http://localhost:5000 முகவரியில் தளத்தைத் திறக்கவும் அல்லது உலாவி அமைப்புகளில் தள அனுமதியை இயக்கவும்."
            : "⚠️ Microphone access requires a secure context or localhost. Please open http://localhost:5000 in your browser or allow microphone access in site settings.";
        appendMessage('assistant', lanWarning, false, true);
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
            appendMessage('assistant', I18N[currentLang].micPermissionDenied, false, true);
        }
    }
}

// ============================================================================
// 8. Stage 4: Health Tracker & Dashboard Implementation
// ============================================================================
class HealthTracker {
    static getGlucoseReadings() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.GLUCOSE);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error("Error reading glucose logs from localStorage:", e);
            return [];
        }
    }

    static saveGlucoseReadings(readings) {
        try {
            localStorage.setItem(STORAGE_KEYS.GLUCOSE, JSON.stringify(readings));
        } catch (e) {
            console.error("Error saving glucose logs to localStorage:", e);
        }
    }

    static getWellnessLogs() {
        try {
            const raw = localStorage.getItem(STORAGE_KEYS.WELLNESS);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error("Error reading wellness logs from localStorage:", e);
            return [];
        }
    }

    static saveWellnessLogs(logs) {
        try {
            localStorage.setItem(STORAGE_KEYS.WELLNESS, JSON.stringify(logs));
        } catch (e) {
            console.error("Error saving wellness logs to localStorage:", e);
        }
    }

    static addGlucoseReading(value, type, date, time, notes) {
        const readings = this.getGlucoseReadings();
        const timestamp = new Date(`${date}T${time}`).getTime() || Date.now();
        const newEntry = {
            id: 'g_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            value: Number(value),
            type: type,
            date: date,
            time: time,
            notes: notes ? notes.trim() : '',
            timestamp: timestamp
        };
        readings.push(newEntry);
        // Sort newest first
        readings.sort((a, b) => b.timestamp - a.timestamp);
        this.saveGlucoseReadings(readings);
        return newEntry;
    }

    static deleteGlucoseReading(id) {
        let readings = this.getGlucoseReadings();
        readings = readings.filter(r => r.id !== id);
        this.saveGlucoseReadings(readings);
    }

    static addWellnessLog(walking, water, date, notes) {
        const logs = this.getWellnessLogs();
        const timestamp = new Date(`${date}T12:00`).getTime() || Date.now();
        const newEntry = {
            id: 'w_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            walking: Number(walking),
            water: Number(water),
            date: date,
            notes: notes ? notes.trim() : '',
            timestamp: timestamp
        };
        logs.push(newEntry);
        logs.sort((a, b) => b.timestamp - a.timestamp);
        this.saveWellnessLogs(logs);
        return newEntry;
    }

    static deleteWellnessLog(id) {
        let logs = this.getWellnessLogs();
        logs = logs.filter(l => l.id !== id);
        this.saveWellnessLogs(logs);
    }

    // Classify reading for UI color pill
    static getGlucoseStatus(value, type) {
        if (value < 70) return 'low';
        if (type === 'fasting' || type === 'before_meal') {
            if (value <= 130) return 'normal';
            return 'high';
        } else {
            // Post-meal or random
            if (value <= 180) return 'normal';
            return 'high';
        }
    }

    // Feature 5: Generate Educational Clinical Insights (Rule-based)
    static generateEducationalInsights(readings) {
        const t = I18N[currentLang];
        if (readings.length === 0) {
            return currentLang === 'ta'
                ? "உங்கள் இரத்த சர்க்கரை அளவை தொடர்ந்து பதிவு செய்து வந்தால், உங்கள் உணவு மற்றும் உடற்பயிற்சியின் தாக்கத்தை எளிதில் அறிந்து கொள்ள முடியும்."
                : "Recording your blood glucose consistently helps identify patterns related to meals, activity, and lifestyle.";
        }

        if (readings.length < 3) {
            return currentLang === 'ta'
                ? "நீங்கள் சில பதிவுகளை மட்டுமே செய்துள்ளீர்கள். நம்பகமான போக்கை (Trend) அறிய தொடர்ந்து சில நாட்கள் அளவுகளைப் பதிவு செய்யவும்."
                : "You have recorded only a few entries. A reliable pattern requires consistent logs over several days.";
        }

        // Calculate metrics
        const values = readings.map(r => r.value);
        const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;

        // Compare recent 3 readings vs earlier readings
        const recent3 = readings.slice(0, 3).map(r => r.value);
        const recentAvg = Math.round(recent3.reduce((a, b) => a + b, 0) / 3);

        if (avg > 180) {
            return currentLang === 'ta'
                ? `உங்கள் பதிவுகளின் ஒட்டுமொத்த சராசரி (${avg} mg/dL) பொது வழிகாட்டல் வரம்பை (180 mg/dL) விட அதிகமாக உள்ளது. தனிப்பயனாக்கப்பட்ட உணவு அல்லது சிகிச்சை மாற்றங்களுக்கு உங்கள் மருத்துவரை அணுகவும்.`
                : `Your overall average (${avg} mg/dL) is above the general reference threshold (180 mg/dL). Discuss persistent elevations and personalized targets with your physician.`;
        } else if (avg < 70) {
            return currentLang === 'ta'
                ? `உங்கள் பதிவுகளின் ஒட்டுமொத்த சராசரி (${avg} mg/dL) குறைவாக உள்ளது. தலைசுற்றல் அல்லது நடுக்கம் போன்ற குறைந்த சர்க்கரை அறிகுறிகள் இருந்தால் உடனடி கவனம் தேவை; உங்கள் மருத்துவரிடம் தெரிவிக்கவும்.`
                : `Your overall average (${avg} mg/dL) is below the typical reference range. Note low blood sugar symptoms (dizziness, trembling) and consult your doctor promptly.`;
        } else if (recentAvg > avg + 20) {
            return currentLang === 'ta'
                ? `உங்கள் சமீபத்திய 3 பதிவுகளின் சராசரி (${recentAvg} mg/dL) முந்தைய சராசரியை (${avg} mg/dL) விட அதிகமாக உள்ளது. உணவு நேரங்கள் அல்லது மன அழுத்த மாற்றங்களை கவனித்து, உங்கள் மருத்துவரிடம் விவாதிக்கவும்.`
                : `Your recent 3 readings average (${recentAvg} mg/dL) is higher than your overall average (${avg} mg/dL). Note any dietary or lifestyle changes and discuss persistent elevations with your doctor.`;
        } else if (range > 80) {
            return currentLang === 'ta'
                ? `உங்கள் பதிவுகளில் குறிப்பிடத்தக்க மாறுபாடுகள் (Variation: ${min} முதல் ${max} mg/dL வரை) காணப்படுகின்றன. சீரான உணவு மற்றும் மருந்து பழக்கத்தை பின்பற்றி, மருத்துவ ஆலோசனை பெறவும்.`
                : `Your recorded readings show noticeable variation (ranging from ${min} to ${max} mg/dL). Consistent meal timing and activity help stabilize readings; discuss fluctuations with your physician.`;
        } else {
            return currentLang === 'ta'
                ? `உங்கள் பதிவுகள் ஒப்பீட்டளவில் சீரான போக்கைக் காட்டுகின்றன (சராசரி: ${avg} mg/dL). ஆரோக்கியமான சமச்சீர் உணவு, தினசரி நடைபயிற்சி மற்றும் வழக்கமான மருத்துவ ஆலோசனையைத் தொடரவும்.`
                : `Your readings show a relatively consistent trend (average: ${avg} mg/dL). Continue your balanced nutrition, physical activity, and routine healthcare consultations.`;
        }
    }
}

// ============================================================================
// 9. Interactive SVG Glucose Line Chart Engine (Feature 3)
// ============================================================================
function renderGlucoseChart() {
    const rawReadings = HealthTracker.getGlucoseReadings();
    glucoseSvgChart.innerHTML = '';

    // Handle Empty Data Gracefully
    if (rawReadings.length === 0) {
        glucoseSvgChart.innerHTML = `
            <text x="325" y="115" class="svg-empty-text">
                📋 ${I18N[currentLang].chartEmptyMsg}
            </text>
            <text x="325" y="140" style="font-size: 11px; fill: #94a3b8; text-anchor: middle;">
                ${currentLang === 'ta' ? 'படிவத்தில் அளவை உள்ளிட்டு "அளவைச் சேர்க்கவும்" அழுத்தவும்.' : 'Enter a reading on the left to start tracking.'}
            </text>
        `;
        return;
    }

    // Sort chronologically for time-series display
    const readings = [...rawReadings].sort((a, b) => a.timestamp - b.timestamp);

    const W = 650;
    const H = 250;
    const pad = { top: 25, right: 30, bottom: 42, left: 55 };
    const chartW = W - pad.left - pad.right;
    const chartH = H - pad.top - pad.bottom;

    const values = readings.map(r => r.value);
    const minY = Math.max(20, Math.min(50, Math.min(...values) - 15));
    const maxY = Math.min(600, Math.max(240, Math.max(...values) + 20));

    const getY = (val) => pad.top + chartH - ((val - minY) / (maxY - minY)) * chartH;
    const getX = (idx) => {
        if (readings.length === 1) return pad.left + chartW / 2;
        return pad.left + (idx / (readings.length - 1)) * chartW;
    };

    // SVG Defs (Gradient)
    let svgContent = `
        <defs>
            <linearGradient id="glucoseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="#0f766e" stop-opacity="0.45" />
                <stop offset="100%" stop-color="#0f766e" stop-opacity="0.0" />
            </linearGradient>
        </defs>
    `;

    // 1. Target Reference Range Band (70 to 180 mg/dL)
    const yRef70 = Math.min(pad.top + chartH, Math.max(pad.top, getY(70)));
    const yRef180 = Math.min(pad.top + chartH, Math.max(pad.top, getY(180)));
    const bandHeight = Math.max(0, yRef70 - yRef180);

    svgContent += `
        <rect 
            x="${pad.left}" 
            y="${yRef180}" 
            width="${chartW}" 
            height="${bandHeight}" 
            class="svg-ref-band"
        />
        <text x="${W - pad.right - 6}" y="${yRef180 + 12}" text-anchor="end" style="font-size: 10px; fill: #059669; font-weight: 600;">
            180 mg/dL
        </text>
        <text x="${W - pad.right - 6}" y="${yRef70 - 4}" text-anchor="end" style="font-size: 10px; fill: #059669; font-weight: 600;">
            70 mg/dL
        </text>
    `;

    // 2. Y-Axis Grid Lines & Tick Labels
    const yTicks = [70, 100, 140, 180, 240].filter(t => t >= minY && t <= maxY);
    yTicks.forEach(tickVal => {
        const y = getY(tickVal);
        svgContent += `
            <line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" class="svg-grid-line" />
            <text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" class="svg-axis-text">${tickVal}</text>
        `;
    });

    // 3. Line & Area Points
    const points = readings.map((r, i) => ({
        x: getX(i),
        y: getY(r.value),
        reading: r
    }));

    if (points.length > 1) {
        const linePath = 'M ' + points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ');
        const areaPath = linePath + ` L ${points[points.length - 1].x.toFixed(1)},${pad.top + chartH} L ${points[0].x.toFixed(1)},${pad.top + chartH} Z`;

        svgContent += `
            <path d="${areaPath}" class="svg-trend-area" />
            <path d="${linePath}" class="svg-trend-line" />
        `;
    } else if (points.length === 1) {
        const p = points[0];
        svgContent += `
            <line x1="${p.x.toFixed(1)}" y1="${pad.top}" x2="${p.x.toFixed(1)}" y2="${pad.top + chartH}" stroke="#0d9488" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.6" />
            <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="12" fill="#0d9488" fill-opacity="0.16" />
        `;
    }

    // 4. Data Point Nodes & X-Axis Labels
    points.forEach((p, i) => {
        const r = p.reading;
        const typeLabel = I18N[currentLang].types[r.type] || r.type;
        const formattedDate = getFormattedDate(r.date);
        const tooltip = `${r.value} mg/dL • ${typeLabel} • ${formattedDate} ${r.time || ''} ${r.notes ? '(' + r.notes + ')' : ''}`;

        svgContent += `
            <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5.5" class="svg-data-dot" tabindex="0">
                <title>${escapeHTML(tooltip)}</title>
            </circle>
            <text x="${p.x.toFixed(1)}" y="${p.y - 10}" text-anchor="middle" style="font-size: 11px; font-weight: 700; fill: #0f766e;">
                ${r.value}
            </text>
        `;

        // Render X-axis date labels (spread out if many)
        if (points.length <= 8 || i % Math.ceil(points.length / 6) === 0 || i === points.length - 1) {
            svgContent += `
                <text x="${p.x.toFixed(1)}" y="${H - 12}" text-anchor="middle" class="svg-axis-text">
                    ${formattedDate}
                </text>
            `;
        }
    });

    glucoseSvgChart.innerHTML = svgContent;
}

// ============================================================================
// 10. History List & Educational Insights Rendering
// ============================================================================
function renderTrackerHistory() {
    const readings = HealthTracker.getGlucoseReadings();
    const wellnessLogs = HealthTracker.getWellnessLogs();

    // 1. Update Insight Box
    insightText.textContent = HealthTracker.generateEducationalInsights(readings);

    // 2. Filter list
    let displayItems = [];

    if (activeFilter === 'wellness') {
        displayItems = wellnessLogs.map(w => ({ ...w, _kind: 'wellness' }));
    } else {
        let filteredReadings = readings;
        if (activeFilter === 'fasting') {
            filteredReadings = readings.filter(r => r.type === 'fasting' || r.type === 'before_meal');
        } else if (activeFilter === 'after_meal') {
            filteredReadings = readings.filter(r => r.type === 'after_meal');
        }
        displayItems = filteredReadings.map(r => ({ ...r, _kind: 'glucose' }));
    }

    recordsCountBadge.textContent = I18N[currentLang].recordsCount(displayItems.length);
    historyRecordsList.innerHTML = '';

    // Empty State
    if (displayItems.length === 0) {
        historyRecordsList.innerHTML = `
            <div class="empty-state-box">
                <span class="empty-state-icon">📋</span>
                <h4>${I18N[currentLang].emptyHistoryTitle}</h4>
                <p>${I18N[currentLang].emptyHistoryDesc}</p>
            </div>
        `;
        return;
    }

    // Render cards
    displayItems.forEach(item => {
        const card = document.createElement('div');
        card.className = 'record-item';

        if (item._kind === 'glucose') {
            const statusClass = HealthTracker.getGlucoseStatus(item.value, item.type);
            const typeLabel = I18N[currentLang].types[item.type] || item.type;
            const dateStr = getFormattedDate(item.date);

            card.innerHTML = `
                <div class="record-left">
                    <div class="glucose-val-pill ${statusClass}">
                        ${item.value}
                        <span>mg/dL</span>
                    </div>
                    <div class="record-details">
                        <span class="record-type-badge">🏷️ ${typeLabel}</span>
                        <span class="record-timestamp">📅 ${dateStr} ${item.time ? '• ⏰ ' + item.time : ''}</span>
                        ${item.notes ? `<span class="record-notes">📝 ${escapeHTML(item.notes)}</span>` : ''}
                    </div>
                </div>
                <button type="button" class="btn-delete-record" title="${I18N[currentLang].btnDelete}" aria-label="Delete entry" data-id="${item.id}" data-kind="glucose">
                    ${TRASH_ICON_SVG}
                </button>
            `;
        } else {
            // Wellness entry
            const dateStr = getFormattedDate(item.date);
            card.innerHTML = `
                <div class="record-left">
                    <div class="glucose-val-pill normal">
                        ${item.walking}
                        <span>${I18N[currentLang].unitWalking}</span>
                    </div>
                    <div class="record-details">
                        <span class="record-type-badge">💧 ${item.water} ${I18N[currentLang].unitWater}</span>
                        <span class="record-timestamp">📅 ${dateStr}</span>
                        ${item.notes ? `<span class="record-notes">📝 ${escapeHTML(item.notes)}</span>` : ''}
                    </div>
                </div>
                <button type="button" class="btn-delete-record" title="${I18N[currentLang].btnDelete}" aria-label="Delete entry" data-id="${item.id}" data-kind="wellness">
                    ${TRASH_ICON_SVG}
                </button>
            `;
        }

        // Delete button listener
        const deleteBtn = card.querySelector('.btn-delete-record');
        deleteBtn.addEventListener('click', () => {
            promptDeleteConfirmation(item.id, item._kind);
        });

        historyRecordsList.appendChild(card);
    });
}

function promptDeleteConfirmation(id, kind) {
    pendingDeleteId = id;
    pendingDeleteType = kind;
    deleteModal.classList.remove('hidden');
}

function hideDeleteModal() {
    pendingDeleteId = null;
    deleteModal.classList.add('hidden');
}

function executeDeleteRecord() {
    if (!pendingDeleteId) return;

    if (pendingDeleteType === 'glucose') {
        HealthTracker.deleteGlucoseReading(pendingDeleteId);
    } else {
        HealthTracker.deleteWellnessLog(pendingDeleteId);
    }

    hideDeleteModal();
    renderGlucoseChart();
    renderTrackerHistory();
}

// ============================================================================
// 11. Primary View Navigation (Chat vs Health Tracker)
// ============================================================================
function switchPrimaryView(view) {
    currentActiveView = view;

    if (view === 'chat') {
        navBtnChat.classList.add('active');
        navBtnChat.setAttribute('aria-selected', 'true');
        navBtnTracker.classList.remove('active');
        navBtnTracker.setAttribute('aria-selected', 'false');

        viewChat.classList.remove('hidden');
        viewTracker.classList.add('hidden');
        clearChatBtn.style.display = 'inline-flex';
    } else {
        navBtnTracker.classList.add('active');
        navBtnTracker.setAttribute('aria-selected', 'true');
        navBtnChat.classList.remove('active');
        navBtnChat.setAttribute('aria-selected', 'false');

        viewTracker.classList.remove('hidden');
        viewChat.classList.add('hidden');
        clearChatBtn.style.display = 'none';

        // Re-render chart & history in active tracker view
        renderGlucoseChart();
        renderTrackerHistory();
    }
}

// ============================================================================
// 12. Language Toggle Handler
// ============================================================================
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

    navTextChat.textContent = t.navChat;
    navTextTracker.textContent = t.navTracker;

    // Stage 4 Tracker Localization
    trackerHeading.textContent = t.trackerHeading;
    trackerSubheading.textContent = t.trackerSubheading;
    trackerStorageNotice.textContent = t.trackerStorageNotice;
    chartTitle.textContent = t.chartTitle;
    chartLegendText.textContent = t.chartLegend;
    insightTitle.textContent = t.insightTitle;
    insightDisclaimer.textContent = t.insightDisclaimer;

    subtabTextGlucose.textContent = t.subtabGlucose;
    subtabTextWellness.textContent = t.subtabWellness;
    formGlucoseTitle.textContent = t.formGlucoseTitle;
    labelGlucoseVal.textContent = t.labelGlucoseVal;
    labelGlucoseType.textContent = t.labelGlucoseType;
    labelGlucoseDate.textContent = t.labelDate;
    labelGlucoseTime.textContent = t.labelTime;
    labelGlucoseNotes.textContent = t.labelNotes;
    btnTextAddGlucose.textContent = t.btnAddGlucose;

    // Module A3 feedback card
    if (glucoseResponseTitle) glucoseResponseTitle.textContent = t.glucoseFeedbackTitle;
    if (glucoseResponseDisclaimer) glucoseResponseDisclaimer.textContent = t.glucoseFeedbackDisclaimer;

    formWellnessTitle.textContent = t.formWellnessTitle;
    labelWellnessWalking.textContent = t.labelWalking;
    unitWalking.textContent = t.unitWalking;
    labelWellnessWater.textContent = t.labelWater;
    unitWater.textContent = t.unitWater;
    labelWellnessDate.textContent = t.labelDate;
    labelWellnessNotes.textContent = t.labelDailyNotes;
    btnTextAddWellness.textContent = t.btnAddWellness;

    historyTitle.textContent = t.historyTitle;
    filterAll.textContent = t.filterAll;
    filterFasting.textContent = t.filterFasting;
    filterAfterMeal.textContent = t.filterAfterMeal;
    filterWellness.textContent = t.filterWellness;

    modalTitle.textContent = t.deleteModalTitle;
    modalDesc.textContent = t.deleteModalDesc;
    btnModalCancel.textContent = t.btnCancel;
    btnModalConfirm.textContent = t.btnDelete;

    // Update Dropdown Options
    selectGlucoseType.innerHTML = `
        <option value="fasting">${t.types.fasting}</option>
        <option value="before_meal">${t.types.before_meal}</option>
        <option value="after_meal" selected>${t.types.after_meal}</option>
        <option value="random">${t.types.random}</option>
    `;

    if (btnScrollToChart) {
        btnScrollToChart.textContent = currentLang === 'ta' ? '📈 வரைபடம் (View Trend Chart)' : '📈 View Trend Chart';
    }
    inputGlucoseVal.placeholder = currentLang === 'ta' ? 'எ.கா. 120' : 'e.g. 120';
    inputGlucoseNotes.placeholder = currentLang === 'ta' ? 'எ.கா. இட்லி சாப்பிட்ட பின், நடைபயிற்சிக்கு முன்' : 'e.g. Post-breakfast, before walk';

    renderCategoriesAndQuestions();
    resetChat();

    renderGlucoseChart();
    renderTrackerHistory();

    if (recognition) {
        recognition.lang = currentLang === 'ta' ? 'ta-IN' : 'en-IN';
    }
}

// ============================================================================
// 13. Event Listeners Initialization
// ============================================================================
function initEventListeners() {
    // Primary View Switching
    navBtnChat.addEventListener('click', () => switchPrimaryView('chat'));
    navBtnTracker.addEventListener('click', () => switchPrimaryView('tracker'));

    if (btnScrollToChart) {
        btnScrollToChart.addEventListener('click', () => {
            const chartTarget = document.getElementById('chart-viewport') || document.querySelector('.chart-section');
            if (chartTarget) {
                chartTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
                chartTarget.classList.add('chart-highlighted');
                setTimeout(() => chartTarget.classList.remove('chart-highlighted'), 1400);
            }
        });
    }

    // Chat Form Submission
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
            if (categoryTabs) categoryTabs.style.display = 'flex';
            if (questionCardsGrid) questionCardsGrid.style.display = 'grid';
            toggleSuggestionsText.textContent = I18N[currentLang].hideSuggestions;
        } else {
            if (categoryTabs) categoryTabs.style.display = 'none';
            if (questionCardsGrid) questionCardsGrid.style.display = 'none';
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

    // Stage 4 Tracker Sub-tab Toggle (Glucose vs Wellness)
    subtabBtnGlucose.addEventListener('click', () => {
        subtabBtnGlucose.classList.add('active');
        subtabBtnWellness.classList.remove('active');
        glucoseEntryForm.classList.remove('hidden');
        wellnessEntryForm.classList.add('hidden');
    });

    subtabBtnWellness.addEventListener('click', () => {
        subtabBtnWellness.classList.add('active');
        subtabBtnGlucose.classList.remove('active');
        wellnessEntryForm.classList.remove('hidden');
        glucoseEntryForm.classList.add('hidden');
    });

    // Water Stepper Buttons
    btnWaterMinus.addEventListener('click', () => {
        const current = parseInt(inputWellnessWater.value) || 0;
        if (current > 0) inputWellnessWater.value = current - 1;
    });

    btnWaterPlus.addEventListener('click', () => {
        const current = parseInt(inputWellnessWater.value) || 0;
        if (current < 30) inputWellnessWater.value = current + 1;
    });

    // Blood Glucose Form Submission with Strict Numeric Range Validation
    glucoseEntryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const valStr = inputGlucoseVal.value.trim();
        const numVal = parseFloat(valStr);

        // Numeric Range Validation: 20 to 600 mg/dL
        if (isNaN(numVal) || numVal < 20 || numVal > 600) {
            glucoseErrorMsg.textContent = I18N[currentLang].errGlucoseRange;
            glucoseErrorMsg.classList.remove('hidden');
            inputGlucoseVal.focus();
            return;
        }

        glucoseErrorMsg.classList.add('hidden');
        const type = selectGlucoseType.value;
        const date = inputGlucoseDate.value || getLocalDateString();
        const time = inputGlucoseTime.value || getLocalTimeString();
        const notes = inputGlucoseNotes.value;

        HealthTracker.addGlucoseReading(numVal, type, date, time, notes);

        // Reset form & update UI
        inputGlucoseVal.value = '';
        inputGlucoseNotes.value = '';
        setHistoryFilter('all');
        renderGlucoseChart();
        renderTrackerHistory();

        // Immediate visual button feedback
        if (btnTextAddGlucose && btnAddGlucose) {
            const originalBtnText = btnTextAddGlucose.textContent;
            btnTextAddGlucose.textContent = currentLang === 'ta' ? '✅ பதிவு செய்யப்பட்டது! (Saved)' : '✅ Saved Successfully!';
            btnAddGlucose.style.backgroundColor = '#059669';
            setTimeout(() => {
                btnTextAddGlucose.textContent = originalBtnText;
                btnAddGlucose.style.backgroundColor = '';
            }, 2000);
        }

        // Smoothly scroll the screen up to the trend chart with highlight pulse
        const chartTarget = document.getElementById('chart-viewport') || document.querySelector('.chart-section');
        if (chartTarget) {
            chartTarget.scrollIntoView({ behavior: 'smooth', block: 'center' });
            chartTarget.classList.add('chart-highlighted');
            setTimeout(() => chartTarget.classList.remove('chart-highlighted'), 1400);
        }

        // Module A3: Request polite educational feedback from /glucose/respond
        if (glucoseResponseCard) {
            glucoseResponseCard.classList.remove('hidden');
            glucoseResponseCard.classList.remove('emergency');
            glucoseResponseIcon.textContent = '💡';
            glucoseResponseBody.innerHTML = `
                <div class="response-loading-row">
                    <span>⏳</span>
                    <span>${I18N[currentLang].glucoseFeedbackLoading}</span>
                </div>
            `;

            fetch('/glucose/respond', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    value: numVal,
                    measurement_type: type,
                    language: currentLang,
                    symptoms: notes
                })
            })
            .then(res => res.json())
            .then(data => {
                if (data && data.response) {
                    if (data.status === 'emergency') {
                        glucoseResponseCard.classList.add('emergency');
                        glucoseResponseIcon.textContent = '🚨';
                    } else {
                        glucoseResponseCard.classList.remove('emergency');
                        glucoseResponseIcon.textContent = '💡';
                    }
                    const safeHtml = escapeHTML(data.response)
                        .replace(/\n\n/g, '</p><p>')
                        .replace(/\n/g, '<br>');
                    glucoseResponseBody.innerHTML = `<p>${safeHtml}</p>`;
                } else {
                    glucoseResponseBody.innerHTML = `<p>${I18N[currentLang].glucoseFeedbackFallback}</p>`;
                }
            })
            .catch(err => {
                console.warn("Unable to fetch educational glucose response:", err);
                glucoseResponseBody.innerHTML = `<p>${I18N[currentLang].glucoseFeedbackFallback}</p>`;
            });
        }
    });

    // Daily Wellness Form Submission
    wellnessEntryForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const walking = parseInt(inputWellnessWalking.value) || 0;
        const water = parseInt(inputWellnessWater.value) || 0;
        const date = inputWellnessDate.value || getLocalDateString();
        const notes = inputWellnessNotes.value;

        if (walking < 0 || walking > 360) {
            alert(I18N[currentLang].errWalkingRange);
            return;
        }

        HealthTracker.addWellnessLog(walking, water, date, notes);

        // Reset form & update UI
        inputWellnessWalking.value = '';
        inputWellnessNotes.value = '';
        if (activeFilter === 'wellness') {
            renderTrackerHistory();
        } else {
            // Switch filter to wellness so user sees their saved log immediately
            setHistoryFilter('wellness');
        }
    });

    // History Filter Chips
    [filterAll, filterFasting, filterAfterMeal, filterWellness].forEach(chip => {
        chip.addEventListener('click', () => {
            const filter = chip.getAttribute('data-filter');
            setHistoryFilter(filter);
        });
    });

    // Delete Modal Actions
    btnModalCancel.addEventListener('click', hideDeleteModal);
    btnModalConfirm.addEventListener('click', executeDeleteRecord);
    deleteModal.addEventListener('click', (e) => {
        if (e.target === deleteModal) hideDeleteModal();
    });

    // Module A3: Close Feedback Card
    if (glucoseResponseClose) {
        glucoseResponseClose.addEventListener('click', () => {
            if (glucoseResponseCard) glucoseResponseCard.classList.add('hidden');
        });
    }
}

function setHistoryFilter(filter) {
    activeFilter = filter;
    document.querySelectorAll('.filter-chip').forEach(btn => {
        if (btn.getAttribute('data-filter') === filter) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    renderTrackerHistory();
}

function getLocalDateString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getLocalTimeString() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function setDefaultDateTimeInputs() {
    const today = getLocalDateString();
    const nowTime = getLocalTimeString();

    inputGlucoseDate.value = today;
    inputGlucoseTime.value = nowTime;
    inputWellnessDate.value = today;
}

// ============================================================================
// 14. Application Boot
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    setDefaultDateTimeInputs();
    setLanguage('ta');
    setupSpeechRecognition();
    loadVoices();
    renderGlucoseChart();
    renderTrackerHistory();
    fetchSuggestedQuestionsPool();
});
