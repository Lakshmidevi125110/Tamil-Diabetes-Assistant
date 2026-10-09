export default function TypingIndicator({ t }) {
    return (
        <div className="message-row assistant">
            <div className="msg-avatar">🩺</div>
            <div className="bubble">
                <div className="typing-bubble" aria-label={t.thinking}>
                    <span className="typing-status-text">{t.thinking}</span>
                    <div className="typing-dots">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                    </div>
                </div>
            </div>
        </div>
    );
}
