/**
 * Bilingual UI strings (Tamil & English).
 * `disclaimer` is a list of text parts; { strong } parts are rendered bold.
 */
export const I18N = {
    ta: {
        noticeShort: "இது கல்வி தகவல் மட்டுமே; மருத்துவ ஆலோசனை அல்ல. அவசர நிலையில் 108 அழைக்கவும்.",
        statLatest: "சமீபத்தியது",
        statAverage: "சராசரி",
        statInRange: "வரம்பில்",
        statEntries: "பதிவுகள்",
        sourcesTitle: "ஆதாரங்கள்",
        you: "நீங்கள்",
        assistantName: "உதவியாளர்",
        addEntryTitle: "புதிய பதிவு",
        viewChart: "வரைபடம்",
        title: "தமிழ் குரல் சர்க்கரை நோய் வழிகாட்டி",
        subtitle: "Tamil Voice Diabetes Assistant • கல்வி வழிகாட்டி தளம்",
        eduBadge: "கல்வி விழிப்புணர்வு தளம்",
        disclaimer: [{ strong: "மருத்துவ எச்சரிக்கை:" }, " இது பொது விழிப்புணர்வு வழிகாட்டி மட்டுமே. மருத்துவ ஆலோசனை அல்ல. அவசர அறிகுறிகள் (மயக்கம், தீவிர நடுக்கம், நெஞ்சு வலி) ஏற்பட்டால் உடனடியாக ", { strong: "108" }, " அவசர சிகிச்சையை அழைக்கவும்."],
        placeholder: "உங்கள் கேள்வியை இங்கே தட்டச்சு செய்யவும் அல்லது மைக் அழுத்தவும்...",
        privacyNote: "மருத்துவ ஆலோசனைக்கு உங்கள் மருத்துவரை அணுகவும் • பொது விழிப்புணர்வு வழிகாட்டி",
        clearChat: "அழிக்க",
        clearChatTooltip: "அரட்டையை அழிக்க (Clear Chat)",
        navChat: "உதவியாளர்",
        navTracker: "கண்காணிப்பு",

        // Chat Suggestions & Welcome
        suggestionsTitle: "வழிகாட்டல் தலைப்புகள்",
        hideSuggestions: "மறைக்க (Hide)",
        showSuggestions: "காட்டுக (Show)",
        welcomeTitle: "வணக்கம்! உங்கள் நீரிழிவு விழிப்புணர்வு வழிகாட்டிக்கு நல்வரவு.",
        welcomeSubtitle: "உணவு முறை, உடற்பயிற்சி மற்றும் வாழ்க்கை முறை குறித்த சந்தேகங்களை கேட்கலாம்.",
        welcomeDesc: "இந்த தளம் நீரிழிவு நோய் மேலாண்மை குறித்த மருத்துவ ரீதியாக சரிபார்க்கப்பட்ட பொது கல்வித் தகவல்களை குரல் மற்றும் உரை வடிவில் வழங்குகிறது. கீழேயுள்ள வழிகாட்டல் தலைப்புகளை தேர்வு செய்யலாம் அல்லது மைக் மூலம் பேசலாம்.",
        pillars: [
            { icon: "", text: "சமச்சீர் உணவு & காய்கறிகள்" },
            { icon: "", text: "தினசரி உடற்பயிற்சி நெறிமுறைகள்" },
            { icon: "", text: "சர்க்கரை அளவுகள் விழிப்புணர்வு" },
            { icon: "", text: "108 அவசர கால பாதுகாப்பு" }
        ],
        errorMsg: "மன்னிக்கவும்! சர்வரை தொடர்பு கொள்ள முடியவில்லை. உங்கள் இணைய இணைப்பை சரிபார்க்கவும்.",
        thinking: "பதில் தயாராகிறது…",
        listening: "கேட்கிறது…",
        speechNotSupported: "உங்கள் உலாவியில் குரல் அறிதல் (Speech Recognition) வசதி ஆதரிக்கப்படவில்லை. சிறந்த அனுபவத்திற்கு Google Chrome அல்லது Microsoft Edge-ஐப் பயன்படுத்தவும்.",
        micPermissionDenied: "மைக்ரோஃபோன் அணுகல் மறுக்கப்பட்டது. உலாவியின் அமைப்புகளில் மைக் அனுமதியை வழங்கவும்.",
        micTooltipActive: "பேசுவதை நிறுத்த அழுத்தவும் (Click to stop)",
        micTooltipIdle: "குரல் மூலம் பேச (Speak)",
        playAudio: "குரலில் கேட்க (Listen)",
        stopAudio: "ஒலிப்பதை நிறுத்த (Stop audio)",
        preparingAudio: "ஆடியோ தயாராகிறது...",
        ttsErrorMsg: "மன்னிக்கவும்! குரல் ஒலியை உருவாக்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.",
        copyText: "நகலெடுக்க (Copy)",
        copiedText: "நகலெடுக்கப்பட்டது! (Copied)",
        emergencyBadge: "அவசர மருத்துவ எச்சரிக்கை (EMERGENCY 108)",

        // Stage 4 Tracker Strings
        trackerHeading: "இரத்த சர்க்கரை & நல்வாழ்வு கண்காணிப்பு",
        trackerSubheading: "அளவுகளைப் பதிவு செய்து, உங்கள் வரலாற்றுப் போக்குகளை எளிதில் தெரிந்து கொள்ளுங்கள்.",
        trackerStorageNotice: "உங்கள் சாதனத்தில் மட்டுமே பாதுகாப்பாக சேமிக்கப்படுகிறது",
        chartTitle: "இரத்த சர்க்கரை போக்கு வரைபடம்",
        chartLegend: "பொது வழிகாட்டல் வரம்பு (70 - 180 mg/dL)",
        chartEmptyMsg: "வரைபடம் காட்ட குறைந்தபட்சம் 1 பதிவு தேவை.",
        insightTitle: "கல்வி அவதானிப்பு",
        insightDisclaimer: "இது பொதுவான கல்வி அவதானிப்பு மட்டுமே. தனிப்பயனாக்கப்பட்ட மருத்துவ இலக்குகளுக்கு உங்கள் மருத்துவரை அணுகவும்.",
        
        // Form Labels
        subtabGlucose: "சர்க்கரை பதிவு",
        subtabWellness: "தினசரி நல்வாழ்வு",
        formGlucoseTitle: "புதிய சர்க்கரை அளவைச் சேர்க்கவும்",
        labelGlucoseVal: "சர்க்கரை அளவு",
        labelGlucoseType: "பரிசோதனை வகை",
        labelDate: "தேதி",
        labelTime: "நேரம்",
        labelNotes: "குறிப்புகள்",
        btnAddGlucose: "அளவைச் சேர்க்கவும்",
        formWellnessTitle: "தினசரி நல்வாழ்வுப் பதிவு",
        labelWalking: "நடைபயிற்சி / உடற்பயிற்சி",
        unitWalking: "நிமிடங்கள் (Mins)",
        labelWater: "குடித்த தண்ணீர்",
        unitWater: "டம்ளர்கள் (Glasses)",
        labelDailyNotes: "நல்வாழ்வு குறிப்புகள்",
        btnAddWellness: "நல்வாழ்வைப் பதிவு செய்க",
        
        // Validation Errors
        errGlucoseRange: "தயவுசெய்து 20 முதல் 600 mg/dL-க்குள் சரியான எண்ணை உள்ளிடவும்.",
        errGlucoseEmpty: "தயவுசெய்து சர்க்கரை அளவை உள்ளிடவும் (20 முதல் 600 mg/dL).",
        errGlucoseDate: "தயவுசெய்து சரியான தேதியைத் தேர்ந்தெடுக்கவும்.",
        errGlucoseTime: "தயவுசெய்து சரியான நேரத்தைத் தேர்ந்தெடுக்கவும்.",
        glucoseSavedSuccess: "சர்க்கரை அளவு வெற்றிகரமாகப் பதிவு செய்யப்பட்டது!",
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
        historyTitle: "பதிவு செய்யப்பட்ட வரலாறு",
        filterAll: "அனைத்தும்",
        filterFasting: "வெறும் வயிற்றில்",
        filterAfterMeal: "உணவுக்குப் பின்",
        filterWellness: "நல்வாழ்வு",
        emptyHistoryTitle: "பதிவுகள் எதுவும் இல்லை",
        emptyHistoryDesc: "உங்கள் முதல் இரத்த சர்க்கரை அளவை மேலே உள்ள படிவத்தில் பதிவு செய்யவும்.",
        recordsCount: (n) => `${n} பதிவுகள்`,

        // Delete Modal
        deleteModalTitle: "பதிவை நீக்கவா?",
        deleteModalDesc: "இந்தப் பதிவை நிரந்தரமாக நீக்க விரும்புகிறீர்களா? இந்த செயலை மாற்றியமைக்க முடியாது.",
        btnCancel: "ரத்து",
        btnDelete: "நீக்கு",

        // Module A3: Glucose Feedback Strings
        glucoseFeedbackTitle: "கல்வி வழிகாட்டல்",
        glucoseFeedbackDisclaimer: "இது பொதுவான கல்வி விழிப்புணர்வு தகவல் மட்டுமே, நோய் கண்டறிதல் அல்ல.",
        glucoseFeedbackLoading: "கல்வி வழிகாட்டல் விளக்கத்தைப் பெறுகிறது...",
        glucoseFeedbackFallback: "கல்வி வழிகாட்டல் தகவலை தற்போது பெற முடியவில்லை. உங்கள் அளவு உங்கள் சாதனத்தில் பாதுகாப்பாக பதிவு செய்யப்பட்டுள்ளது."
    },

    en: {
        noticeShort: "Educational information only, not medical advice. In an emergency, call 108.",
        statLatest: "Latest",
        statAverage: "Average",
        statInRange: "In range",
        statEntries: "Readings",
        sourcesTitle: "Sources",
        you: "You",
        assistantName: "Assistant",
        addEntryTitle: "Add entry",
        viewChart: "View chart",
        title: "Tamil Voice Diabetes Assistant",
        subtitle: "Bilingual Health Awareness & Voice-Enabled Education Platform",
        eduBadge: "Educational Awareness Platform",
        disclaimer: [{ strong: "Medical Notice:" }, " This assistant provides general educational awareness only, not medical advice. If experiencing emergencies (severe shakiness, fainting, chest pain), call ", { strong: "108 / Emergency Services" }, " immediately."],
        placeholder: "Type your diabetes question here or click the mic...",
        privacyNote: "Always consult your licensed physician for medical advice • General Educational Guide",
        clearChat: "New chat",
        clearChatTooltip: "Clear chat history",
        navChat: "Assistant",
        navTracker: "Tracker",

        // Chat Suggestions & Welcome
        suggestionsTitle: "Suggested questions",
        hideSuggestions: "Hide",
        showSuggestions: "Show",
        welcomeTitle: "Ask anything about diabetes care",
        welcomeSubtitle: "Ask dietary questions, exercise guidelines, and blood sugar awareness.",
        welcomeDesc: "Answers are grounded in WHO and CDC guidance. Type your question or tap the microphone to speak, in Tamil or English.",
        pillars: [
            { icon: "", text: "Balanced Diet & Low-GI Foods" },
            { icon: "", text: "Daily Physical Activity Tips" },
            { icon: "", text: "Blood Glucose Awareness" },
            { icon: "", text: "108 Urgent Emergency Safety" }
        ],
        errorMsg: "Sorry! Unable to reach the server. Please check your connection.",
        thinking: "Thinking…",
        listening: "Listening…",
        speechNotSupported: "Speech recognition is not supported in this browser. For the best experience, please use Google Chrome or Microsoft Edge.",
        micPermissionDenied: "Microphone access was denied. Please allow microphone permission in your browser settings.",
        micTooltipActive: "Click to stop listening",
        micTooltipIdle: "Speak your question",
        playAudio: "Listen to reply",
        stopAudio: "Stop audio",
        preparingAudio: "Preparing audio...",
        ttsErrorMsg: "Sorry! Unable to generate voice audio. Please try again.",
        copyText: "Copy",
        copiedText: "Copied!",
        emergencyBadge: "Medical emergency — call 108",

        // Stage 4 Tracker Strings
        trackerHeading: "Glucose & wellness tracker",
        trackerSubheading: "Log readings and daily habits to see how your levels change over time.",
        trackerStorageNotice: "Saved only on this device",
        chartTitle: "Glucose trend",
        chartLegend: "Reference range 70–180 mg/dL",
        chartEmptyMsg: "Add at least one reading to view the trend chart.",
        insightTitle: "Educational insight",
        insightDisclaimer: "General educational observation only. Please consult your physician for individualized medical targets.",

        // Form Labels
        subtabGlucose: "Glucose",
        subtabWellness: "Wellness",
        formGlucoseTitle: "Add New Glucose Reading",
        labelGlucoseVal: "Blood glucose",
        labelGlucoseType: "Measurement",
        labelDate: "Date",
        labelTime: "Time",
        labelNotes: "Notes (optional)",
        btnAddGlucose: "Save reading",
        formWellnessTitle: "Daily Wellness Entry",
        labelWalking: "Activity",
        unitWalking: "Minutes",
        labelWater: "Water",
        unitWater: "Glasses",
        labelDailyNotes: "Notes (optional)",
        btnAddWellness: "Save entry",

        // Validation Errors
        errGlucoseRange: "Please enter a valid glucose number between 20 and 600 mg/dL.",
        errGlucoseEmpty: "Please enter a blood glucose value (20 to 600 mg/dL).",
        errGlucoseDate: "Please select a valid date.",
        errGlucoseTime: "Please select a valid time.",
        glucoseSavedSuccess: "Reading saved.",
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
        historyTitle: "History",
        filterAll: "All",
        filterFasting: "Fasting",
        filterAfterMeal: "Post-Meal",
        filterWellness: "Wellness",
        emptyHistoryTitle: "No readings recorded yet",
        emptyHistoryDesc: "Your saved readings will appear here.",
        recordsCount: (n) => `${n} records`,

        // Delete Modal
        deleteModalTitle: "Delete this entry?",
        deleteModalDesc: "Are you sure you want to permanently delete this entry? This action cannot be undone.",
        btnCancel: "Cancel",
        btnDelete: "Delete",

        // Module A3: Glucose Feedback Strings
        glucoseFeedbackTitle: "Educational Feedback",
        glucoseFeedbackDisclaimer: "This is general educational information, not a diagnosis.",
        glucoseFeedbackLoading: "Getting educational guidance...",
        glucoseFeedbackFallback: "Unable to retrieve automated educational feedback right now. Your reading has been safely saved on your device."
    }
};
