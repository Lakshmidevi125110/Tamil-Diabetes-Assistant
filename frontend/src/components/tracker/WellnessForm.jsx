import { useState } from 'react';
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
        <form className="tracker-form" autoComplete="off" noValidate onSubmit={handleSubmit}>
            <h4 className="form-title">{t.formWellnessTitle}</h4>

            <div className="form-group">
                <label htmlFor="input-wellness-walking">{t.labelWalking}</label>
                <div className="input-with-unit">
                    <input
                        type="number"
                        id="input-wellness-walking"
                        className="form-control"
                        min="0"
                        max="360"
                        step="5"
                        placeholder={lang === 'ta' ? 'எ.கா. 30' : 'e.g. 30'}
                        value={form.walking}
                        onChange={setField('walking')}
                    />
                    <span className="input-unit">{t.unitWalking}</span>
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="input-wellness-water">{t.labelWater}</label>
                <div className="stepper-counter-row">
                    <button type="button" className="stepper-btn" aria-label="Decrease water glasses" onClick={() => stepWater(-1)}>-</button>
                    <div className="stepper-val-box">
                        <input
                            type="number"
                            id="input-wellness-water"
                            className="stepper-input"
                            min="0"
                            max="30"
                            value={form.water}
                            onChange={setField('water')}
                        />
                        <span className="stepper-unit">{t.unitWater}</span>
                    </div>
                    <button type="button" className="stepper-btn" aria-label="Increase water glasses" onClick={() => stepWater(1)}>+</button>
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="input-wellness-date">{t.labelDate}</label>
                <input type="date" id="input-wellness-date" className="form-control" value={form.date} onChange={setField('date')} />
            </div>

            <div className="form-group">
                <label htmlFor="input-wellness-notes">{t.labelDailyNotes}</label>
                <input
                    type="text"
                    id="input-wellness-notes"
                    className="form-control"
                    placeholder={lang === 'ta' ? 'எ.கா. நல்ல தூக்கம், புத்துணர்ச்சி' : 'e.g. Slept well, feeling fresh'}
                    maxLength={120}
                    value={form.notes}
                    onChange={setField('notes')}
                />
                {error && <span className="form-error">{error}</span>}
            </div>

            <button type="submit" className="btn-primary-action">
                <span>💾</span> <span>{t.btnAddWellness}</span>
            </button>
        </form>
    );
}
