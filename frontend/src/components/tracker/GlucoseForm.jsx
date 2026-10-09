import { useEffect, useRef, useState } from 'react';
import { getLocalDateString, getLocalTimeString } from '../../lib/dates.js';
import { validateGlucoseForm } from '../../lib/tracker.js';

const MEASUREMENT_TYPES = ['fasting', 'before_meal', 'after_meal', 'random'];

const emptyForm = () => ({
    value: '',
    type: 'after_meal',
    date: getLocalDateString(),
    time: getLocalTimeString(),
    notes: ''
});

/** Blood glucose entry form. Calls onSave({ value, type, date, time, notes }) when valid. */
export default function GlucoseForm({ t, lang, onSave }) {
    const [form, setForm] = useState(emptyForm);
    const [notice, setNotice] = useState(null); // { kind: 'error' | 'success', field?, text }
    const fieldRefs = { value: useRef(null), date: useRef(null), time: useRef(null) };
    const timerRef = useRef(null);

    useEffect(() => () => clearTimeout(timerRef.current), []);

    const setField = (name) => (e) => setForm(prev => ({ ...prev, [name]: e.target.value }));

    const handleSubmit = (e) => {
        e.preventDefault();
        const problem = validateGlucoseForm(form);
        if (problem) {
            setNotice({ kind: 'error', field: problem.field, text: t[problem.errorKey] });
            fieldRefs[problem.field].current?.focus();
            return;
        }

        onSave({ ...form, value: parseFloat(form.value) });

        setForm(prev => ({ ...emptyForm(), type: prev.type }));
        setNotice({ kind: 'success', text: t.glucoseSavedSuccess });
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => setNotice(n => (n && n.kind === 'success' ? null : n)), 3000);
    };

    const invalid = (field) => (notice?.kind === 'error' && notice.field === field ? true : undefined);

    return (
        <form className="panel form" autoComplete="off" noValidate onSubmit={handleSubmit}>
            <div className="field">
                <label htmlFor="glucose-value">{t.labelGlucoseVal}</label>
                <div className="input-group">
                    <input
                        ref={fieldRefs.value}
                        id="glucose-value"
                        className="input"
                        type="number"
                        inputMode="numeric"
                        min="20"
                        max="600"
                        step="1"
                        placeholder={lang === 'ta' ? 'எ.கா. 120' : 'e.g. 120'}
                        aria-invalid={invalid('value')}
                        aria-describedby="glucose-msg"
                        value={form.value}
                        onChange={setField('value')}
                    />
                    <span className="input-suffix">mg/dL</span>
                </div>
            </div>

            <div className="field">
                <label htmlFor="glucose-type">{t.labelGlucoseType}</label>
                <select id="glucose-type" className="input" value={form.type} onChange={setField('type')}>
                    {MEASUREMENT_TYPES.map(type => (
                        <option key={type} value={type}>{t.types[type]}</option>
                    ))}
                </select>
            </div>

            <div className="field-row">
                <div className="field">
                    <label htmlFor="glucose-date">{t.labelDate}</label>
                    <input ref={fieldRefs.date} id="glucose-date" className="input" type="date" aria-invalid={invalid('date')} value={form.date} onChange={setField('date')} />
                </div>
                <div className="field">
                    <label htmlFor="glucose-time">{t.labelTime}</label>
                    <input ref={fieldRefs.time} id="glucose-time" className="input" type="time" aria-invalid={invalid('time')} value={form.time} onChange={setField('time')} />
                </div>
            </div>

            <div className="field">
                <label htmlFor="glucose-notes">{t.labelNotes}</label>
                <input
                    id="glucose-notes"
                    className="input"
                    type="text"
                    maxLength={120}
                    placeholder={lang === 'ta' ? 'எ.கா. இட்லி சாப்பிட்ட பின்' : 'e.g. After breakfast'}
                    value={form.notes}
                    onChange={setField('notes')}
                />
            </div>

            <div className="field">
                <button type="submit" className="btn btn-primary btn-block">{t.btnAddGlucose}</button>
                <span id="glucose-msg" className={`field-msg${notice ? ` is-${notice.kind}` : ''}`} aria-live="polite">
                    {notice?.text}
                </span>
            </div>
        </form>
    );
}
