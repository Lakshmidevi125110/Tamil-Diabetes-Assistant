import { useEffect, useRef, useState } from 'react';
import { Check, CircleAlert, Copy, ExternalLink, LoaderCircle, Square, Stethoscope, TriangleAlert, Volume2 } from 'lucide-react';
import { cleanDisplayText } from '../../lib/speechText.js';

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

function Sources({ sources, t }) {
    return (
        <div className="sources">
            <div className="sources-title">{t.sourcesTitle}</div>
            <ol>
                {sources.map((s, i) => (
                    <li key={i}>
                        {s.title || 'Guideline'}
                        {s.source && <span> · {s.source}</span>}
                        {s.url && /^https?:\/\//i.test(s.url) && (
                            <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${s.title || 'source'}`}>
                                <ExternalLink />
                            </a>
                        )}
                    </li>
                ))}
            </ol>
        </div>
    );
}

export default function MessageBubble({ message, t, speechStatus, onToggleSpeech }) {
    const { sender, isEmergency, isError, sources, time } = message;
    const text = sender === 'user' ? message.text : cleanDisplayText(message.text);
    const [copied, setCopied] = useState(false);
    const copyTimerRef = useRef(null);

    useEffect(() => () => clearTimeout(copyTimerRef.current), []);

    if (sender === 'user') {
        return (
            <div className="msg msg-user">
                <div className="msg-bubble">{text}</div>
            </div>
        );
    }

    const handleCopy = async () => {
        await copyText(text);
        setCopied(true);
        clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    };

    const speechLabel = speechStatus === 'loading' ? t.preparingAudio
        : speechStatus === 'speaking' ? t.stopAudio
        : t.playAudio;
    const SpeechIcon = speechStatus === 'loading' ? LoaderCircle
        : speechStatus === 'speaking' ? Square
        : Volume2;

    const variant = isEmergency ? ' msg-emergency' : isError ? ' msg-error' : '';
    const AvatarIcon = isEmergency ? TriangleAlert : isError ? CircleAlert : Stethoscope;

    return (
        <div className={`msg${variant}`}>
            <div className="msg-avatar" aria-hidden="true"><AvatarIcon /></div>
            <div className="msg-body">
                <div className="msg-meta">
                    <strong>{t.assistantName}</strong> · {time}
                </div>
                <div className="msg-content">
                    {isEmergency && (
                        <div className="alert-label">
                            <TriangleAlert aria-hidden="true" />
                            {t.emergencyBadge}
                        </div>
                    )}
                    <div className="msg-text">{text}</div>
                </div>

                {sources && sources.length > 0 && <Sources sources={sources} t={t} />}

                {!isError && (
                    <div className="msg-actions">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={handleCopy}>
                            {copied ? <Check /> : <Copy />}
                            {copied ? t.copiedText : t.copyText}
                        </button>
                        <button
                            type="button"
                            className={`btn btn-ghost btn-sm${speechStatus ? ' is-active' : ''}`}
                            onClick={onToggleSpeech}
                        >
                            <SpeechIcon className={speechStatus === 'loading' ? 'spin' : undefined} />
                            {speechLabel}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
