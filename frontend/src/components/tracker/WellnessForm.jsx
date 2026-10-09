import { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { getLocalDateString } from '../../lib/dates.js';

const emptyForm = () => ({ walking: '', water: 8, date: getLocalDateString(), notes: '' });

/** Daily wellness entry (activity minutes, water glasses). Calls onSave({ walking, water, date, notes }). */
export default function WellnessForm({ t, lang, onSave }) {
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');

    const setField = (name) => (e) => setForm(prev => ({ ...prev, [name]: e.target.value }));
    const stepWater = (delta) => setForm(prev => {
        const current = parseInt(prev.water, 10) || 0;
        return { ...prev, water: Math.min(30, Math.max(0, current + delta)) };
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        const walking = parseInt(form.walking, 10) || 0;
        const water = parseInt(form.water, 10) || 0;

        if (walking < 0 || walking > 360) {
            setError(t.errWalkingRange);
            return;
        }
        if (water < 0 || water > 30) {
            setError(t.errWaterRange);
            return;
        }
        setError('');
        onSave({ walking, water, date: form.date || getLocalDateString(), notes: form.notes });
        setForm(prev => ({ ...emptyForm(), water: prev.water, date: prev.date }));
    };

    return (
        <form className="panel form" autoComplete="off" noValidate onSubmit={handleSubmit}>
            <div className="field">
                <label htmlFor="wellness-walking">{t.labelWalking}</label>
                <div className="input-group">
                    <input
                        id="wellness-walking"
                        className="input"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        max="360"
                        step="5"
                        placeholder={lang === 'ta' ? 'எ.கா. 30' : 'e.g. 30'}
                        value={form.walking}
                        onChange={setField('walking')}
                    />
                    <span className="input-suffix">{t.unitWalking}</span>
                </div>
            </div>

            <div className="field">
                <label htmlFor="wellness-water">{t.labelWater}</label>
                <div className="stepper">
                    <button type="button" className="btn btn-outline btn-icon" aria-label="Decrease" onClick={() => stepWater(-1)}>
                        <Minus />
                    </button>
                    <input
                        id="wellness-water"
                        className="input"
                        type="number"
                        min="0"
                        max="30"
                        value={form.water}
                        onChange={setField('water')}
                    />
                    <button type="button" className="btn btn-outline btn-icon" aria-label="Increase" onClick={() => stepWater(1)}>
                        <Plus />
                    </button>
                    <span className="stepper-unit">{t.unitWater}</span>
                </div>
            </div>

            <div className="field">
                <label htmlFor="wellness-date">{t.labelDate}</label>
                <input id="wellness-date" className="input" type="date" value={form.date} onChange={setField('date')} />
            </div>

            <div className="field">
                <label htmlFor="wellness-notes">{t.labelDailyNotes}</label>
                <input
                    id="wellness-notes"
                    className="input"
                    type="text"
                    maxLength={120}
                    placeholder={lang === 'ta' ? 'எ.கா. நல்ல தூக்கம்' : 'e.g. Slept well'}
                    value={form.notes}
                    onChange={setField('notes')}
                />
            </div>

            <div className="field">
                <button type="submit" className="btn btn-primary btn-block">{t.btnAddWellness}</button>
                {error && <span className="field-msg is-error" aria-live="polite">{error}</span>}
            </div>
        </form>
    );
}
