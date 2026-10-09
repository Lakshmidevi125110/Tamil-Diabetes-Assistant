import { Stethoscope } from 'lucide-react';

export default function TypingIndicator({ t }) {
    return (
        <div className="msg" aria-live="polite">
            <div className="msg-avatar" aria-hidden="true"><Stethoscope /></div>
            <div className="typing">
                <div className="typing-dots" aria-hidden="true">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
                <span>{t.thinking}</span>
            </div>
        </div>
    );
}
