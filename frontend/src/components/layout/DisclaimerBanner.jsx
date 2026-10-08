export default function DisclaimerBanner({ t }) {
    return (
        <aside className="disclaimer-banner" role="alert" aria-label="Medical Disclaimer">
            <div className="disclaimer-content">
                <span className="alert-icon" aria-hidden="true">⚠️</span>
                <p>
                    {t.disclaimer.map((part, i) =>
                        typeof part === 'string' ? part : <strong key={i}>{part.strong}</strong>
                    )}
                </p>
            </div>
        </aside>
    );
}
