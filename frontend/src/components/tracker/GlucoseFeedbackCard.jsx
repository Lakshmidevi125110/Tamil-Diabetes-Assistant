import { Lightbulb, LoaderCircle, TriangleAlert, X } from 'lucide-react';

/**
 * Educational feedback for the latest reading (POST /glucose/respond).
 * feedback: { state: 'loading' | 'ready' | 'failed', text?, emergency? }
 */
export default function GlucoseFeedbackCard({ t, feedback, onClose }) {
    const isEmergency = feedback.state === 'ready' && feedback.emergency;
    const paragraphs = feedback.state === 'ready'
        ? feedback.text.split(/\n\n+/)
        : [t.glucoseFeedbackFallback];
    const Icon = isEmergency ? TriangleAlert : Lightbulb;

    return (
        <div className={`panel feedback${isEmergency ? ' is-emergency' : ''}`} aria-live="polite">
            <div className="feedback-head">
                <Icon aria-hidden="true" />
                <span>{t.glucoseFeedbackTitle}</span>
                <button type="button" className="btn btn-ghost btn-sm btn-icon" aria-label="Close" onClick={onClose}>
                    <X />
                </button>
            </div>
            {feedback.state === 'loading' ? (
                <div className="feedback-body is-loading">
                    <LoaderCircle className="spin" width={16} height={16} aria-hidden="true" />
                    <span>{t.glucoseFeedbackLoading}</span>
                </div>
            ) : (
                <div className="feedback-body">
                    {paragraphs.map((p, i) => <p key={i}>{p}</p>)}
                </div>
            )}
            <small>{t.glucoseFeedbackDisclaimer}</small>
        </div>
    );
}
