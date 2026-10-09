import { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { QUESTION_CATEGORIES } from '../../data/questions.js';
import { fetchSuggestedQuestions } from '../../lib/api.js';
import { getQuestionText } from '../../lib/questionPicker.js';

/**
 * Suggested questions. The full layout (category tabs + list) is shown on an empty chat;
 * `compact` shows a single row of chips above the composer during a conversation.
 * Asking a question replaces only that slot with a fresh one (preferring the same topic).
 */
export default function SuggestedQuestions({ t, lang, picker, disabled, onAsk, compact = false }) {
    const [categoryId, setCategoryId] = useState('all');
    const [slots, setSlots] = useState(() => picker.fillAll('all'));

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
        setSlots(picker.fillAll(id));
    };

    const handleClick = (slotIndex) => {
        if (disabled) return;
        const question = slots[slotIndex];
        if (!question) return;

        onAsk(getQuestionText(question, lang));
        picker.markUsed(question);

        const fresh = picker.pick(slotIndex, slots, categoryId);
        if (fresh) setSlots(prev => prev.map((q, i) => (i === slotIndex ? fresh : q)));
    };

    const visible = slots.map((q, i) => ({ q, i })).filter(({ q }) => q);

    if (compact) {
        return (
            <div className="chips" aria-label={t.suggestionsTitle}>
                {visible.map(({ q, i }) => (
                    <button
                        key={`${i}-${q.id}`}
                        type="button"
                        className="chip"
                        title={getQuestionText(q, lang)}
                        disabled={disabled}
                        onClick={() => handleClick(i)}
                    >
                        {getQuestionText(q, lang)}
                    </button>
                ))}
            </div>
        );
    }

    return (
        <section className="suggest" aria-label={t.suggestionsTitle}>
            <div className="suggest-label">{t.suggestionsTitle}</div>

            <div className="segmented-scroll">
                <div className="segmented" role="tablist">
                    {QUESTION_CATEGORIES.map(cat => (
                        <button
                            key={cat.id}
                            type="button"
                            role="tab"
                            aria-selected={cat.id === categoryId}
                            onClick={() => switchCategory(cat.id)}
                        >
                            {cat[lang] || cat.en || cat.id}
                        </button>
                    ))}
                </div>
            </div>

            <div className="panel question-list" role="tabpanel">
                {visible.map(({ q, i }) => (
                    <button
                        key={`${i}-${q.id}`}
                        type="button"
                        className="question-row"
                        disabled={disabled}
                        onClick={() => handleClick(i)}
                    >
                        <span>{getQuestionText(q, lang)}</span>
                        <ChevronRight aria-hidden="true" />
                    </button>
                ))}
            </div>
        </section>
    );
}
