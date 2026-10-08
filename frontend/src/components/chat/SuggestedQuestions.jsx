import { useEffect, useState } from 'react';
import { QUESTION_CATEGORIES } from '../../data/questions.js';
import { fetchSuggestedQuestions } from '../../lib/api.js';
import { getQuestionText, getTopicIcon } from '../../lib/questionPicker.js';
import { HelpIcon } from '../icons.jsx';

/**
 * Category tabs plus three question cards. Clicking a card asks it and replaces only
 * that card with a fresh question (preferring the same topic).
 */
export default function SuggestedQuestions({ t, lang, picker, disabled, onAsk }) {
    const [visible, setVisible] = useState(true);
    const [categoryId, setCategoryId] = useState('all');
    const [slots, setSlots] = useState(() => picker.fillAll('all'));
    const [evolvedSlot, setEvolvedSlot] = useState(null);

    // Load the server's question pool; until then the bundled fallback pool is used
    useEffect(() => {
        let cancelled = false;
        fetchSuggestedQuestions().then(pool => {
            if (!cancelled) picker.setPool(pool);
        });
        return () => { cancelled = true; };
    }, [picker]);

    const switchCategory = (id) => {
        if (id === categoryId) return;
        setCategoryId(id);
        setEvolvedSlot(null);
        setSlots(picker.fillAll(id));
    };

    const handleClick = (slotIndex) => {
        if (disabled) return;
        const question = slots[slotIndex];
        if (!question) return;

        onAsk(getQuestionText(question, lang));
        picker.markUsed(question);

        const fresh = picker.pick(slotIndex, slots, categoryId);
        if (!fresh) return;
        setSlots(prev => prev.map((q, i) => (i === slotIndex ? fresh : q)));
        setEvolvedSlot(slotIndex);
    };

    return (
        <section className="suggestions-section" aria-label="Suggested questions">
            <div className="suggestions-header">
                <span className="suggestions-label">
                    <HelpIcon />
                    <span>{t.suggestionsTitle}</span>
                </span>
                <button
                    type="button"
                    className="toggle-suggestions-btn"
                    aria-expanded={visible}
                    onClick={() => setVisible(v => !v)}
                >
                    <span>{visible ? t.hideSuggestions : t.showSuggestions}</span>
                </button>
            </div>

            {visible && (
                <>
                    <div className="category-tabs" role="tablist">
                        {QUESTION_CATEGORIES.map(cat => (
                            <button
                                key={cat.id}
                                type="button"
                                className={`category-tab-btn${cat.id === categoryId ? ' active' : ''}`}
                                role="tab"
                                aria-selected={cat.id === categoryId}
                                onClick={() => switchCategory(cat.id)}
                            >
                                <span className="category-icon" aria-hidden="true">{cat.icon}</span>
                                <span className="category-text">{cat[lang] || cat.en || cat.id}</span>
                            </button>
                        ))}
                    </div>

                    <div className="question-cards-grid" role="tabpanel">
                        {slots.map((q, slotIndex) => q && (
                            <button
                                key={`${slotIndex}-${q.id}`}
                                type="button"
                                className={`question-card${evolvedSlot === slotIndex ? ' question-evolved' : ''}`}
                                aria-label={getQuestionText(q, lang)}
                                onClick={() => handleClick(slotIndex)}
                            >
                                <span className="question-icon" aria-hidden="true">{getTopicIcon(q.topic)}</span>
                                <span className="question-text">{getQuestionText(q, lang)}</span>
                            </button>
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}
