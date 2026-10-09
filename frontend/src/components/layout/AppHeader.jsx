import { BrandIcon, TrashIcon } from '../icons.jsx';

const LANGUAGES = [
    { code: 'ta', label: 'தமிழ்' },
    { code: 'en', label: 'English' }
];

export default function AppHeader({ t, lang, onLanguageChange, showClearChat, onClearChat }) {
    return (
        <header className="app-header">
            <div className="header-main">
                <div className="header-brand">
                    <div className="brand-avatar" aria-hidden="true">
                        <BrandIcon />
                    </div>
                    <div className="brand-text">
                        <div className="brand-title-row">
                            <h1>{t.title}</h1>
                            <span className="edu-badge">
                                <span className="badge-dot" aria-hidden="true"></span>
                                <span>{t.eduBadge}</span>
                            </span>
                        </div>
                        <p>{t.subtitle}</p>
                    </div>
                </div>

                <div className="header-actions">
                    {showClearChat && (
                        <button
                            type="button"
                            className="header-action-btn"
                            title={t.clearChatTooltip}
                            aria-label="Clear chat history"
                            onClick={onClearChat}
                        >
                            <TrashIcon />
                            <span className="action-btn-text">{t.clearChat}</span>
                        </button>
                    )}

                    <div className="language-switch-container">
                        <div className="toggle-pill" role="group" aria-label="Language selection">
                            {LANGUAGES.map(({ code, label }) => (
                                <button
                                    key={code}
                                    type="button"
                                    className={`lang-btn${lang === code ? ' active' : ''}`}
                                    aria-pressed={lang === code}
                                    onClick={() => lang !== code && onLanguageChange(code)}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
