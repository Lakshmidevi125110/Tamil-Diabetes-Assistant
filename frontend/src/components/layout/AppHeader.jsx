import { SquarePen, Stethoscope } from 'lucide-react';

const LANGUAGES = [
    { code: 'ta', label: 'தமிழ்' },
    { code: 'en', label: 'English' }
];

export default function AppHeader({ t, lang, onLanguageChange, view, onViewChange, onNewChat }) {
    const tabs = [
        { id: 'chat', label: t.navChat },
        { id: 'tracker', label: t.navTracker }
    ];

    return (
        <header className="topbar">
            <div className="topbar-inner">
                <div className="brand">
                    <span className="brand-mark" aria-hidden="true"><Stethoscope /></span>
                    <span className="brand-name">{t.title}</span>
                </div>

                <nav className="nav" role="tablist" aria-label="Main views">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            type="button"
                            id={`nav-${tab.id}`}
                            className="nav-link"
                            role="tab"
                            aria-selected={view === tab.id}
                            aria-controls={`view-${tab.id}`}
                            onClick={() => onViewChange(tab.id)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div className="topbar-actions">
                    {view === 'chat' && (
                        <button
                            type="button"
                            className="btn btn-ghost"
                            title={t.clearChatTooltip}
                            aria-label={t.clearChatTooltip}
                            onClick={onNewChat}
                        >
                            <SquarePen />
                            <span className="hide-mobile">{t.clearChat}</span>
                        </button>
                    )}
                    <div className="segmented" role="group" aria-label="Language">
                        {LANGUAGES.map(({ code, label }) => (
                            <button
                                key={code}
                                type="button"
                                aria-pressed={lang === code}
                                onClick={() => lang !== code && onLanguageChange(code)}
                            >
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </header>
    );
}
