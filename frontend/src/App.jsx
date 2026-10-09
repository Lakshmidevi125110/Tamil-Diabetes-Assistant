import { useEffect, useState } from 'react';
import { I18N } from './i18n.js';
import DisclaimerBanner from './components/layout/DisclaimerBanner.jsx';
import AppHeader from './components/layout/AppHeader.jsx';
import ChatView from './components/chat/ChatView.jsx';
import TrackerView from './components/tracker/TrackerView.jsx';

const VIEWS = ['chat', 'tracker'];

// The URL hash (#tracker) keeps the open view across reloads and makes it linkable
const viewFromHash = () => {
    const hash = window.location.hash.replace('#', '');
    return VIEWS.includes(hash) ? hash : 'chat';
};

export default function App() {
    const [lang, setLang] = useState('ta');
    const [view, setView] = useState(viewFromHash);
    // Incrementing this starts a new conversation
    const [chatResetToken, setChatResetToken] = useState(0);
    const t = I18N[lang];

    useEffect(() => {
        document.documentElement.lang = lang;
    }, [lang]);

    useEffect(() => {
        const onHashChange = () => setView(viewFromHash());
        window.addEventListener('hashchange', onHashChange);
        return () => window.removeEventListener('hashchange', onHashChange);
    }, []);

    const changeView = (next) => {
        setView(next);
        const hash = next === 'chat' ? '' : `#${next}`;
        if (window.location.hash !== hash) {
            window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
        }
        window.scrollTo(0, 0);
    };

    return (
        <div className="app">
            <AppHeader
                t={t}
                lang={lang}
                onLanguageChange={setLang}
                view={view}
                onViewChange={changeView}
                onNewChat={() => setChatResetToken(n => n + 1)}
            />
            <DisclaimerBanner t={t} />

            {/* Chat stays mounted while the tracker is open so the conversation is kept */}
            <div id="view-chat" className="view" role="tabpanel" aria-labelledby="nav-chat" hidden={view !== 'chat'}>
                <ChatView t={t} lang={lang} resetToken={chatResetToken} />
            </div>

            {view === 'tracker' && (
                <div id="view-tracker" className="view" role="tabpanel" aria-labelledby="nav-tracker">
                    <TrackerView t={t} lang={lang} />
                </div>
            )}
        </div>
    );
}
