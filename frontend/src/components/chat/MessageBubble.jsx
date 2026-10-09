import { useEffect, useRef, useState } from 'react';
import { CheckIcon, CopyIcon, LoadingIcon, PlayIcon, StopIcon } from '../icons.jsx';

function fallbackCopyText(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.setAttribute('readonly', '');
    Object.assign(textArea.style, { position: 'fixed', top: '0', left: '0', opacity: '0' });
    document.body.appendChild(textArea);
    textArea.select();
    let copied = false;
    try {
        copied = document.execCommand('copy');
    } catch {
        copied = false;
    }
    document.body.removeChild(textArea);
    return copied;
}

async function copyText(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch { /* fall through to legacy copy */ }
    return fallbackCopyText(text);
}

function SourcesBox({ sources, lang }) {
    return (
        <div className="rag-sources-box">
            <div className="rag-sources-title">
                <span className="rag-sources-icon" aria-hidden="true">📚</span>
                <span>{lang === 'ta' ? 'மருத்துவ ஆதாரங்கள் (Trusted Sources):' : 'Trusted Sources:'}</span>
            </div>
            <ul className="rag-sources-list">
                {sources.map((s, i) => (
                    <li key={i}>
                        <span className="rag-source-item-title">{s.title || 'Guideline'}</span>{' '}
                        <span className="rag-source-item-org">({s.source || ''})</span>{' '}
                        {s.url && /^https?:\/\//i.test(s.url) && (
                            <a href={s.url} target="_blank" rel="noopener noreferrer" className="rag-source-link">
                                🔗 {lang === 'ta' ? 'பார்வை' : 'View'}
                            </a>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function MessageBubble({ message, t, lang, speechStatus, onToggleSpeech }) {
    const { sender, text, isEmergency, isError, sources, time } = message;
    const [copied, setCopied] = useState(false);
    const copyTimerRef = useRef(null);

    useEffect(() => () => clearTimeout(copyTimerRef.current), []);

    const handleCopy = async () => {
        await copyText(text);
        setCopied(true);
        clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    };

    const senderLabel = sender === 'user'
        ? (lang === 'ta' ? 'நீங்கள் (You)' : 'You')
        : (isEmergency ? '108 Emergency Protocol' : 'Health Assistant');

    const showActions = sender === 'assistant' && !isError;
    const speechLabel = speechStatus === 'loading' ? t.preparingAudio
        : speechStatus === 'speaking' ? t.stopAudio
        : t.playAudio;
    const SpeechIcon = speechStatus === 'loading' ? LoadingIcon
        : speechStatus === 'speaking' ? StopIcon
        : PlayIcon;

    return (
        <div className={`message-row ${sender}${isEmergency ? ' emergency' : ''}`}>
            <div className="msg-avatar">{sender === 'user' ? '👤' : (isEmergency ? '🚨' : '🩺')}</div>
            <div className="bubble" style={isError ? { borderColor: '#f87171' } : undefined}>
                {isEmergency && <div className="emergency-tag">{t.emergencyBadge}</div>}

                <div className="bubble-content" style={{ whiteSpace: 'pre-line' }}>{text}</div>

                {sources && sources.length > 0 && <SourcesBox sources={sources} lang={lang} />}

                <div className="bubble-meta">
                    {showActions ? (
                        <>
                            <span>{senderLabel} • {time}</span>
                            <div className="bubble-actions">
                                <button
                                    type="button"
                                    className={`bubble-btn copy-btn${copied ? ' copied' : ''}`}
                                    title={t.copyText}
                                    aria-label="Copy message text"
                                    onClick={handleCopy}
                                >
                                    {copied ? <CheckIcon /> : <CopyIcon />}{' '}
                                    <span>{copied ? t.copiedText : t.copyText}</span>
                                </button>
                                <button
                                    type="button"
                                    className={`bubble-btn speech-btn${speechStatus ? ` ${speechStatus}` : ''}`}
                                    title={speechLabel}
                                    aria-label="Play reply aloud"
                                    onClick={onToggleSpeech}
                                >
                                    <SpeechIcon /> <span>{speechLabel}</span>
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <span>{senderLabel}</span>
                            <span>{time}</span>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
