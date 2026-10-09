import { describe, expect, it } from 'vitest';
import { DEFAULT_QUESTIONS_POOL } from '../data/questions.js';
import { QuestionPicker, SLOT_COUNT, detectTopicFromText, getTopicIcon } from './questionPicker.js';
import { cleanDisplayText, cleanTextForSpeech, splitIntoSentences } from './speechText.js';

describe('QuestionPicker', () => {
    it('fills all slots without duplicates', () => {
        const slots = new QuestionPicker().fillAll('all');
        expect(slots).toHaveLength(SLOT_COUNT);
        expect(new Set(slots.map(q => q.id)).size).toBe(SLOT_COUNT);
    });

    it('restricts questions to the selected category', () => {
        const slots = new QuestionPicker().fillAll('food');
        const foodTopics = ['healthy eating', 'carbohydrates', 'fiber', 'hydration'];
        for (const q of slots) expect(foodTopics).toContain(q.topic);
    });

    it('prefers the last asked topic and never repeats a used question', () => {
        const picker = new QuestionPicker();
        const slots = picker.fillAll('all');
        const asked = DEFAULT_QUESTIONS_POOL.find(q => q.topic === 'foot care');
        picker.markUsed(asked);
        const fresh = picker.pick(0, slots, 'all');
        expect(fresh.topic).toBe('foot care');
        expect(fresh.id).not.toBe(asked.id);
    });

    it('keeps working after the pool is exhausted', () => {
        const pool = DEFAULT_QUESTIONS_POOL.slice(0, 4);
        const picker = new QuestionPicker(pool);
        let slots = picker.fillAll('all');
        for (let i = 0; i < 20; i++) {
            picker.markUsed(slots[0]);
            slots = [picker.pick(0, slots, 'all'), slots[1], slots[2]];
            expect(slots[0]).toBeTruthy();
            expect(new Set(slots.map(q => q.id)).size).toBe(SLOT_COUNT);
        }
    });
});

describe('topic helpers', () => {
    it('detects topics in English and Tamil', () => {
        expect(detectTopicFromText('How should I do foot care?')).toBe('foot care');
        expect(detectTopicFromText('நடைபயிற்சி எவ்வளவு?')).toBe('activity');
        expect(detectTopicFromText('hello')).toBeNull();
    });

    it('falls back to a default icon', () => {
        expect(getTopicIcon('HbA1c')).toBe('📊');
        expect(getTopicIcon('unknown')).toBe('💡');
    });
});

describe('speech text', () => {
    it('strips markdown, links, and emoji', () => {
        expect(cleanTextForSpeech('**வணக்கம்** ⚠️ [x] https://who.int 🚨 நன்றி')).toBe('வணக்கம் நன்றி');
    });

    it('removes emoji for display but keeps the wording and line breaks', () => {
        expect(cleanDisplayText('🚨 CRITICAL MEDICAL EMERGENCY:\nCall 108.\n\n⚠️ Disclaimer: educational only.'))
            .toBe('CRITICAL MEDICAL EMERGENCY:\nCall 108.\n\nDisclaimer: educational only.');
    });

    it('splits into sentences', () => {
        expect(splitIntoSentences('First sentence. Second one! Third?')).toEqual(['First sentence.', 'Second one!', 'Third?']);
    });
});
