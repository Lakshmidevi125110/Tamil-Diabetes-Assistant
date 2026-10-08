/**
 * Educational feedback for the latest reading (POST /glucose/respond).
 * feedback: { state: 'loading' | 'ready' | 'failed', text?, emergency? }
 */
export default function GlucoseFeedbackCard({ t, feedback, onClose }) {
    const isEmergency = feedback.state === 'ready' && feedback.emergency;
    const paragraphs = feedback.state === 'ready'
        ? feedback.text.split(/\n\n+/)
        : [t.glucoseFeedbackFallback];

    return (
        <div className={`glucose-response-card${isEmergency ? ' emergency' : ''}`} aria-live="polite">
            <div className="response-card-header">
                <div className="response-header-left">
                    <span className="response-card-icon">{isEmergency ? '🚨' : '💡'}</span>
                    <strong>{t.glucoseFeedbackTitle}</strong>
                </div>
                <button type="button" className="response-close-btn" title="மூடுக (Close)" aria-label="Close feedback" onClick={onClose}>✕</button>
            </div>
            <div className="response-card-body">
                {feedback.state === 'loading' ? (
                    <div className="response-loading-row">
                        <span>⏳</span>
                        <span>{t.glucoseFeedbackLoading}</span>
                    </div>
                ) : (
                    paragraphs.map((p, i) => <p key={i} style={{ whiteSpace: 'pre-line' }}>{p}</p>)
                )}
            </div>
            <div className="response-card-disclaimer">{t.glucoseFeedbackDisclaimer}</div>
        </div>
    );
}
