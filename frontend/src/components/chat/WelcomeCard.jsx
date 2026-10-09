export default function WelcomeCard({ t }) {
    return (
        <div className="welcome-card">
            <div className="welcome-header">
                <div className="welcome-icon-box" aria-hidden="true">🩺</div>
                <div className="welcome-title-group">
                    <h2>{t.welcomeTitle}</h2>
                    <p>{t.welcomeSubtitle}</p>
                </div>
            </div>
            <p className="welcome-desc">{t.welcomeDesc}</p>
            <div className="welcome-pillars">
                {t.pillars.map(p => (
                    <div className="pillar-item" key={p.text}>
                        <span className="pillar-emoji">{p.icon}</span>
                        <span>{p.text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
