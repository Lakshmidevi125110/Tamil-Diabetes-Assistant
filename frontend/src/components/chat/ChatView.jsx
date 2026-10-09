import { useCallback, useEffect, useRef, useState } from 'react';
import { sendChatMessage } from '../../lib/api.js';
import { getCurrentTime } from '../../lib/dates.js';
import { QuestionPicker, detectTopicFromText } from '../../lib/questionPicker.js';
import { useSpeechPlayback } from '../../hooks/useSpeechPlayback.js';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition.js';
import { ArrowUp, Mic, Square } from 'lucide-react';
import MessageBubble from './MessageBubble.jsx';
import SuggestedQuestions from './SuggestedQuestions.jsx';
import TypingIndicator from './TypingIndicator.jsx';

const MAX_INPUT_LENGTH = 500;
const REPLY_STATUSES = new Set(['success', 'emergency', 'insufficient_info', 'medication_notice', 'crisis_support']);

const isLocalhost = () => ['localhost', '127.0.0.1'].includes(window.location.hostname);

let nextMessageId = 1;

export default function ChatView({ t, lang, resetToken }) {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [transcript, setTranscript] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const inputRef = useRef(null);
    const endRef = useRef(null);
    const inputValueRef = useRef('');
    const historyRef = useRef([]);
    const processingRef = useRef(false);
    const voiceInputRef = useRef(false);
    // Bumped on every reset so replies to an abandoned conversation are dropped
    const conversationRef = useRef(0);
    const pickerRef = useRef(null);
    if (!pickerRef.current) pickerRef.current = new QuestionPicker();

    const updateInput = (value) => {
        inputValueRef.current = value;
        setInput(value);
    };

    const appendMessage = useCallback((message) => {
        const id = nextMessageId++;
        setMessages(prev => [...prev, { id, time: getCurrentTime(), sources: [], ...message }]);
        return id;
    }, []);

    const appendError = useCallback((text) => {
        appendMessage({ sender: 'assistant', text, isError: true });
    }, [appendMessage]);

    const playback = useSpeechPlayback({ onError: () => appendError(t.ttsErrorMsg) });
    const stopPlayback = playback.stop;

    // Language change or "Clear" starts a fresh conversation
    useEffect(() => {
        conversationRef.current++;
        stopPlayback();
        historyRef.current = [];
        processingRef.current = false;
        setIsProcessing(false);
        setMessages([]);
    }, [lang, resetToken, stopPlayback]);

    useEffect(() => {
        if (messages.length > 0 || isProcessing) {
            endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    }, [messages.length, isProcessing]);

    const submitMessage = async (rawText, { viaVoice = false } = {}) => {
        const message = rawText.trim();
        if (!message || processingRef.current) return;

        const picker = pickerRef.current;
        const topic = detectTopicFromText(message, picker.pool);
        if (topic) picker.lastTopic = topic;

        playback.stop();
        if (recognition.isRecording) recognition.stop();

        appendMessage({ sender: 'user', text: message });
        updateInput('');
        inputRef.current?.focus();

        const conversation = conversationRef.current;
        processingRef.current = true;
        setIsProcessing(true);

        try {
            const { ok, data } = await sendChatMessage({
                message,
                language: lang,
                history: historyRef.current.slice(-6)
            });
            if (conversation !== conversationRef.current) return;

            if (ok && REPLY_STATUSES.has(data.status)) {
                const replyId = appendMessage({
                    sender: 'assistant',
                    text: data.reply,
                    isEmergency: data.status === 'emergency',
                    sources: data.sources || []
                });
                historyRef.current = [
                    ...historyRef.current,
                    { role: 'user', text: message },
                    { role: 'assistant', text: data.reply }
                ].slice(-10);

                if (viaVoice) playback.speak(replyId, data.reply, lang);
            } else {
                appendError(data.error || t.errorMsg);
            }
        } catch (err) {
            if (conversation !== conversationRef.current) return;
            console.error('Network Error:', err);
            appendError(t.errorMsg);
        } finally {
            if (conversation === conversationRef.current) {
                processingRef.current = false;
                setIsProcessing(false);
            }
        }
    };

    const recognition = useSpeechRecognition({
        lang,
        onStart: () => {
            voiceInputRef.current = true;
            playback.stop();
            setTranscript('');
        },
        onTranscript: (text) => {
            updateInput(text);
            setTranscript(text);
        },
        onEnd: () => {
            const spokenText = inputValueRef.current.trim();
            if (spokenText && !processingRef.current) {
                submitMessage(spokenText, { viaVoice: voiceInputRef.current });
            }
            voiceInputRef.current = false;
        },
        onError: (error) => {
            voiceInputRef.current = false;
            if (error === 'not-allowed' || error === 'start-failed') {
                let msg = t.micPermissionDenied;
                if (error === 'not-allowed' && !window.isSecureContext && !isLocalhost()) {
                    msg += lang === 'ta'
                        ? '\n\nகுறிப்பு: உலாவி பாதுகாப்பு விதிகளின்படி, மைக்ரோஃபோன் இயங்க HTTPS அல்லது localhost முகவரியில் திறக்கவும்.'
                        : '\n\nTip: Browsers only allow the microphone on HTTPS or localhost. Please open the app over HTTPS or on localhost.';
                }
                appendError(msg);
            } else if (error === 'network') {
                appendError(t.errorMsg);
            }
        }
    });

    const handleMicClick = () => {
        if (!recognition.isSupported) {
            appendError(t.speechNotSupported);
            inputRef.current?.focus();
            return;
        }
        if (!window.isSecureContext && !isLocalhost()) {
            appendError(lang === 'ta'
                ? 'மைக்ரோஃபோனைப் பயன்படுத்த, HTTPS அல்லது localhost முகவரியில் தளத்தைத் திறக்கவும் அல்லது உலாவி அமைப்புகளில் தள அனுமதியை இயக்கவும்.'
                : 'Microphone access requires a secure context (HTTPS) or localhost. Please open the app over HTTPS or allow microphone access in site settings.');
            inputRef.current?.focus();
            return;
        }
        if (processingRef.current) return;

        if (recognition.isRecording) {
            recognition.stop();
        } else {
            updateInput('');
            recognition.start();
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        voiceInputRef.current = false;
        submitMessage(input);
    };

    const micTitle = !recognition.isSupported ? t.speechNotSupported
        : recognition.isRecording ? t.micTooltipActive
        : t.micTooltipIdle;
    const askSuggested = (text) => {
        voiceInputRef.current = false;
        submitMessage(text);
    };
    const hasConversation = messages.length > 0 || isProcessing;
    const nearLimit = input.length >= MAX_INPUT_LENGTH - 100;

    return (
        <div className="chat">
            <main className="thread" role="log" aria-live="polite">
                {!hasConversation && (
                    <>
                        <div className="welcome">
                            <h1 className="welcome-title">{t.welcomeTitle}</h1>
                            <p className="welcome-desc">{t.welcomeDesc}</p>
                        </div>
                        <SuggestedQuestions
                            t={t}
                            lang={lang}
                            picker={pickerRef.current}
                            disabled={isProcessing}
                            onAsk={askSuggested}
                        />
                    </>
                )}

                {messages.map(message => (
                    <MessageBubble
                        key={message.id}
                        message={message}
                        t={t}
                        speechStatus={playback.activeId === message.id ? playback.status : null}
                        onToggleSpeech={() => playback.speak(message.id, message.text, lang)}
                    />
                ))}
                {isProcessing && <TypingIndicator t={t} />}
                <div ref={endRef} />
            </main>

            <div className="composer-wrap">
                {hasConversation && !recognition.isRecording && (
                    <SuggestedQuestions
                        compact
                        t={t}
                        lang={lang}
                        picker={pickerRef.current}
                        disabled={isProcessing}
                        onAsk={askSuggested}
                    />
                )}

                {recognition.isRecording && (
                    <div className="listening" aria-live="assertive">
                        <span className="listening-dot" aria-hidden="true"></span>
                        <span className="listening-label">{t.listening}</span>
                        <span className="listening-text">{transcript}</span>
                    </div>
                )}

                <form className="composer" autoComplete="off" onSubmit={handleSubmit}>
                    <button
                        type="button"
                        className={`btn btn-ghost btn-icon${recognition.isRecording ? ' mic-active' : ''}`}
                        title={micTitle}
                        aria-label={micTitle}
                        aria-pressed={recognition.isRecording}
                        onClick={handleMicClick}
                    >
                        {recognition.isRecording ? <Square /> : <Mic />}
                    </button>

                    <input
                        ref={inputRef}
                        type="text"
                        placeholder={t.placeholder}
                        aria-label={t.placeholder}
                        maxLength={MAX_INPUT_LENGTH}
                        required
                        value={input}
                        onChange={(e) => updateInput(e.target.value)}
                    />

                    {nearLimit && (
                        <span className={`char-count${input.length >= MAX_INPUT_LENGTH ? ' is-limit' : ''}`}>
                            {input.length}/{MAX_INPUT_LENGTH}
                        </span>
                    )}

                    <button
                        type="submit"
                        className="btn btn-primary btn-icon"
                        aria-label="Send"
                        title="Send"
                        disabled={isProcessing || !input.trim()}
                    >
                        <ArrowUp />
                    </button>
                </form>
            </div>
        </div>
    );
}
