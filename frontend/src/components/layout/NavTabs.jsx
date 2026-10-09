export default function NavTabs({ t, view, onChange }) {
    const tabs = [
        { id: 'chat', icon: '💬', label: t.navChat },
        { id: 'tracker', icon: '📊', label: t.navTracker }
    ];

    return (
        <nav className="app-nav-tabs" role="tablist" aria-label="Main Application Views">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    type="button"
                    id={`nav-btn-${tab.id}`}
                    className={`nav-tab-btn${view === tab.id ? ' active' : ''}`}
                    role="tab"
                    aria-selected={view === tab.id}
                    aria-controls={`view-${tab.id}`}
                    onClick={() => onChange(tab.id)}
                >
                    <span className="tab-icon">{tab.icon}</span>
                    <span className="tab-label">{tab.label}</span>
                </button>
            ))}
        </nav>
    );
}
