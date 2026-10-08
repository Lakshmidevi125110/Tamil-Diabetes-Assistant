import { useCallback, useEffect, useRef, useState } from 'react';
import { sendChatMessage } from '../../lib/api.js';
import { getCurrentTime } from '../../lib/dates.js';
import { QuestionPicker, detectTopicFromText } from '../../lib/questionPicker.js';
import { useSpeechPlayback } from '../../hooks/useSpeechPlayback.js';
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition.js';
import { MicIcon, SendIcon, StopSquareIcon } from '../icons.jsx';
import MessageBubble from './MessageBubble.jsx';
import SuggestedQuestions from './SuggestedQuestions.jsx';
import TypingIndicator from './TypingIndicator.jsx';
import WelcomeCard from './WelcomeCard.jsx';

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
                appendError(`⚠️ ${data.error || t.errorMsg}`);
            }
        } catch (err) {
            if (conversation !== conversationRef.current) return;
            console.error('Network Error:', err);
            appendError(`⚠️ ${t.errorMsg}`);
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
                        ? '\n\n💡 குறிப்பு: உலாவி பாதுகாப்பு விதிகளின்படி, மைக்ரோஃபோன் இயங்க HTTPS அல்லது localhost முகவரியில் திறக்கவும்.'
                        : '\n\n💡 Tip: Browsers only allow the microphone on HTTPS or localhost. Please open the app over HTTPS or on localhost.';
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
                ? '⚠️ மைக்ரோஃபோனைப் பயன்படுத்த, HTTPS அல்லது localhost முகவரியில் தளத்தைத் திறக்கவும் அல்லது உலாவி அமைப்புகளில் தள அனுமதியை இயக்கவும்.'
                : '⚠️ Microphone access requires a secure context (HTTPS) or localhost. Please open the app over HTTPS or allow microphone access in site settings.');
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

    const micClass = `icon-btn mic-btn${recognition.isRecording ? ' recording' : ''}${recognition.isSupported ? '' : ' disabled'}`;
    const micTitle = !recognition.isSupported ? t.speechNotSupported
        : recognition.isRecording ? t.micTooltipActive
        : t.micTooltipIdle;

    return (
        <>
            <main className="chat-main">
                <div className="chat-messages" role="log" aria-live="polite">
                    <WelcomeCard t={t} />
                    {messages.map(message => (
                        <MessageBubble
                            key={message.id}
                            message={message}
                            t={t}
                            lang={lang}
                            speechStatus={playback.activeId === message.id ? playback.status : null}
                            onToggleSpeech={() => playback.speak(message.id, message.text, lang)}
                        />
                    ))}
                    {isProcessing && <TypingIndicator t={t} />}
                    <div ref={endRef} />
                </div>
            </main>

            <SuggestedQuestions
                t={t}
                lang={lang}
                picker={pickerRef.current}
                disabled={isProcessing}
                onAsk={(text) => {
                    voiceInputRef.current = false;
                    submitMessage(text);
                }}
            />

            {recognition.isRecording && (
                <div className="voice-preview-bar" aria-live="assertive">
                    <div className="voice-wave-indicator" aria-hidden="true">
                        <span className="wave-bar"></span>
                        <span className="wave-bar"></span>
                        <span className="wave-bar"></span>
                        <span className="wave-bar"></span>
                    </div>
                    <div className="voice-preview-content">
                        <span className="voice-preview-status">{t.listening}</span>
                        <span className="voice-live-transcript">{transcript || '...'}</span>
                    </div>
                    <button
                        type="button"
                        className="stop-recording-btn"
                        title="நிறுத்து (Stop recording)"
                        aria-label="Stop recording"
                        onClick={recognition.stop}
                    >
                        <StopSquareIcon />
                    </button>
                </div>
            )}

            <footer className="app-footer">
                <form className="chat-form" autoComplete="off" onSubmit={handleSubmit}>
                    <div className="input-bar">
                        <button
                            type="button"
                            className={micClass}
                            title={micTitle}
                            aria-label="Start voice speech recognition"
                            onClick={handleMicClick}
                        >
                            <MicIcon />
                        </button>

                        <input
                            ref={inputRef}
                            type="text"
                            className="chat-input"
                            placeholder={t.placeholder}
                            aria-label="Type your diabetes question"
                            maxLength={MAX_INPUT_LENGTH}
                            required
                            value={input}
                            onChange={(e) => updateInput(e.target.value)}
                        />

                        <span className="char-counter" aria-hidden="true">{input.length}/{MAX_INPUT_LENGTH}</span>

                        <button
                            type="submit"
                            className="icon-btn send-btn"
                            title="அனுப்ப (Send)"
                            aria-label="Send message"
                            disabled={isProcessing}
                        >
                            <SendIcon />
                        </button>
                    </div>
                </form>
                <div className="footer-privacy-note">
                    <span>{t.privacyNote}</span>
                </div>
            </footer>
        </>
    );
}
