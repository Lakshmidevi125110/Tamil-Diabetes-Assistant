/**
 * Dynamic suggested-questions engine: keeps three visible slots fresh, never shows
 * duplicates side by side, avoids repeats within a session, and prefers questions
 * on the topic the user last asked about.
 */
import { DEFAULT_QUESTIONS_POOL, QUESTION_CATEGORIES, TOPIC_ICONS } from '../data/questions.js';

export const SLOT_COUNT = 3;

export function getTopicIcon(topic) {
    if (!topic) return '💡';
    return TOPIC_ICONS[topic.toLowerCase()] || '💡';
}

export function getQuestionText(question, lang) {
    return question[lang] || question.en || question.ta || '';
}

export function detectTopicFromText(text, pool = DEFAULT_QUESTIONS_POOL) {
    if (!text) return null;
    const lower = text.toLowerCase();
    for (const q of pool) {
        if (q.topic && lower.includes(q.topic.toLowerCase())) return q.topic;
    }
    if (lower.includes("fasting") || lower.includes("வெறும் வயிறு")) return "fasting";
    if (lower.includes("hba1c") || lower.includes("சராசரி")) return "HbA1c";
    if (lower.includes("food") || lower.includes("உணவு") || lower.includes("சாப்பாடு") || lower.includes("diet")) return "healthy eating";
    if (lower.includes("walk") || lower.includes("நடைபயிற்சி") || lower.includes("உடற்பயிற்சி") || lower.includes("exercise")) return "activity";
    if (lower.includes("hypo") || lower.includes("குறைந்த சர்க்கரை")) return "hypoglycemia awareness";
    if (lower.includes("hyper") || lower.includes("அதிக சர்க்கரை")) return "hyperglycemia awareness";
    if (lower.includes("foot") || lower.includes("பாதம்")) return "foot care";
    if (lower.includes("eye") || lower.includes("கண்")) return "eye health";
    if (lower.includes("kidney") || lower.includes("சிறுநீரகம்")) return "kidney health";
    if (lower.includes("pressure") || lower.includes("அழுத்தம்")) return "blood pressure";
    return null;
}

export class QuestionPicker {
    constructor(pool = DEFAULT_QUESTIONS_POOL, random = Math.random) {
        this.pool = pool;
        this.random = random;
        this.usedIds = new Set();
        this.recentlyShownIds = new Set();
        this.lastTopic = null;
    }

    setPool(pool) {
        if (Array.isArray(pool) && pool.length > 0) this.pool = pool;
    }

    filteredPool(categoryId) {
        if (!categoryId || categoryId === 'all') return this.pool;
        const category = QUESTION_CATEGORIES.find(c => c.id === categoryId);
        if (!category || !category.topics) return this.pool;
        const topics = category.topics.map(t => t.toLowerCase());
        const filtered = this.pool.filter(q => q.topic && topics.includes(q.topic.toLowerCase()));
        return filtered.length > 0 ? filtered : this.pool;
    }

    /** Picks a question for `slotIndex`, given the questions currently in all slots. */
    pick(slotIndex, slots, categoryId) {
        const pool = this.filteredPool(categoryId);
        if (pool.length === 0) return null;

        const visibleIds = new Set(
            slots.filter((q, i) => i !== slotIndex && q).map(q => q.id)
        );

        let candidates = pool.filter(q =>
            !visibleIds.has(q.id) && !this.usedIds.has(q.id) && !this.recentlyShownIds.has(q.id)
        );

        // Pool exhausted: reset session tracking for this category
        if (candidates.length === 0) {
            this.usedIds.clear();
            this.recentlyShownIds = new Set(visibleIds);
            candidates = pool.filter(q => !visibleIds.has(q.id));
            if (candidates.length === 0) candidates = pool;
        }

        const randomFrom = (list) => list[Math.floor(this.random() * list.length)];

        let chosen = null;
        if (this.lastTopic) {
            const sameTopic = candidates.filter(q => q.topic && q.topic.toLowerCase() === this.lastTopic.toLowerCase());
            if (sameTopic.length > 0) chosen = randomFrom(sameTopic);
        }
        if (!chosen) chosen = randomFrom(candidates);

        if (chosen) {
            this.recentlyShownIds.add(chosen.id);
            if (this.recentlyShownIds.size > 30) {
                this.recentlyShownIds = new Set(Array.from(this.recentlyShownIds).slice(-20));
            }
        }
        return chosen;
    }

    /** Fills every slot for a category. */
    fillAll(categoryId) {
        const slots = new Array(SLOT_COUNT).fill(null);
        for (let i = 0; i < SLOT_COUNT; i++) {
            slots[i] = this.pick(i, slots, categoryId);
        }
        return slots;
    }

    markUsed(question) {
        this.usedIds.add(question.id);
        this.recentlyShownIds.add(question.id);
        if (question.topic) this.lastTopic = question.topic;
    }
}
