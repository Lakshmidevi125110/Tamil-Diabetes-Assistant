import { useEffect, useState } from 'react';
import { I18N } from './i18n.js';
import DisclaimerBanner from './components/layout/DisclaimerBanner.jsx';
import AppHeader from './components/layout/AppHeader.jsx';
import NavTabs from './components/layout/NavTabs.jsx';
import ChatView from './components/chat/ChatView.jsx';
import TrackerView from './components/tracker/TrackerView.jsx';

export default function App() {
    const [lang, setLang] = useState('ta');
    const [view, setView] = useState('chat');
    // Incrementing this clears the conversation (Clear button)
    const [chatResetToken, setChatResetToken] = useState(0);
    const t = I18N[lang];

    useEffect(() => {
        document.documentElement.lang = lang;
    }, [lang]);

    return (
        <div className="app-layout">
            <DisclaimerBanner t={t} />
            <AppHeader
                t={t}
                lang={lang}
                onLanguageChange={setLang}
                showClearChat={view === 'chat'}
                onClearChat={() => setChatResetToken(n => n + 1)}
            />
            <NavTabs t={t} view={view} onChange={setView} />

            {/* Chat stays mounted while the tracker is open so the conversation is kept */}
            <div
                id="view-chat"
                className={`view-panel${view === 'chat' ? ' active' : ' hidden'}`}
                role="tabpanel"
                aria-labelledby="nav-btn-chat"
            >
                <ChatView t={t} lang={lang} resetToken={chatResetToken} />
            </div>

            {view === 'tracker' && (
                <div id="view-tracker" className="view-panel active" role="tabpanel" aria-labelledby="nav-btn-tracker">
                    <TrackerView t={t} lang={lang} />
                </div>
            )}
        </div>
    );
}
