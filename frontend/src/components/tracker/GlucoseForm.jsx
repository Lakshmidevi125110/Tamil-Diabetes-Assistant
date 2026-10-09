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
export default function GlucoseForm({ t, lang, onSave, onViewChart }) {
    const [form, setForm] = useState(emptyForm);
    const [notice, setNotice] = useState(null); // { kind: 'error' | 'success', text }
    const [justSaved, setJustSaved] = useState(false);
    const fieldRefs = { value: useRef(null), date: useRef(null), time: useRef(null) };
    const timersRef = useRef([]);

    useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

    const setField = (name) => (e) => setForm(prev => ({ ...prev, [name]: e.target.value }));
    const later = (fn, ms) => timersRef.current.push(setTimeout(fn, ms));

    const handleSubmit = (e) => {
        e.preventDefault();
        const problem = validateGlucoseForm(form);
        if (problem) {
            setNotice({ kind: 'error', text: t[problem.errorKey] });
            fieldRefs[problem.field].current?.focus();
            return;
        }

        onSave({ ...form, value: parseFloat(form.value) });

        setForm(prev => ({ ...emptyForm(), type: prev.type }));
        setNotice({ kind: 'success', text: t.glucoseSavedSuccess });
        setJustSaved(true);
        later(() => setNotice(n => (n && n.kind === 'success' ? null : n)), 3500);
        later(() => setJustSaved(false), 2000);
    };

    return (
        <form className="tracker-form" autoComplete="off" noValidate onSubmit={handleSubmit}>
            <div className="form-header-row">
                <h4 className="form-title">{t.formGlucoseTitle}</h4>
                <button type="button" className="btn-link-chart" onClick={onViewChart}>
                    {lang === 'ta' ? '📈 வரைபடம் (View Trend Chart)' : '📈 View Trend Chart'}
                </button>
            </div>

            <div className="form-group">
                <label htmlFor="input-glucose-val">{t.labelGlucoseVal}</label>
                <div className="input-with-unit">
                    <input
                        ref={fieldRefs.value}
                        type="number"
                        id="input-glucose-val"
                        className="form-control"
                        min="20"
                        max="600"
                        step="1"
                        placeholder={lang === 'ta' ? 'எ.கா. 120' : 'e.g. 120'}
                        aria-describedby="glucose-error-msg"
                        value={form.value}
                        onChange={setField('value')}
                    />
                    <span className="input-unit">mg/dL</span>
                </div>
                {notice && (
                    <span className={notice.kind === 'error' ? 'form-error' : 'form-success'} id="glucose-error-msg">
                        {notice.text}
                    </span>
                )}
            </div>

            <div className="form-group">
                <label htmlFor="select-glucose-type">{t.labelGlucoseType}</label>
                <select id="select-glucose-type" className="form-control" value={form.type} onChange={setField('type')}>
                    {MEASUREMENT_TYPES.map(type => (
                        <option key={type} value={type}>{t.types[type]}</option>
                    ))}
                </select>
            </div>

            <div className="form-row-2">
                <div className="form-group">
                    <label htmlFor="input-glucose-date">{t.labelDate}</label>
                    <input ref={fieldRefs.date} type="date" id="input-glucose-date" className="form-control" value={form.date} onChange={setField('date')} />
                </div>
                <div className="form-group">
                    <label htmlFor="input-glucose-time">{t.labelTime}</label>
                    <input ref={fieldRefs.time} type="time" id="input-glucose-time" className="form-control" value={form.time} onChange={setField('time')} />
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="input-glucose-notes">{t.labelNotes}</label>
                <input
                    type="text"
                    id="input-glucose-notes"
                    className="form-control"
                    placeholder={lang === 'ta' ? 'எ.கா. இட்லி சாப்பிட்ட பின், நடைபயிற்சிக்கு முன்' : 'e.g. Post-breakfast, before walk'}
                    maxLength={120}
                    value={form.notes}
                    onChange={setField('notes')}
                />
            </div>

            <button
                type="submit"
                className="btn-primary-action"
                style={justSaved ? { backgroundColor: '#059669' } : undefined}
            >
                <span>➕</span>{' '}
                <span>{justSaved ? (lang === 'ta' ? '✅ பதிவு செய்யப்பட்டது!' : '✅ Saved Successfully!') : t.btnAddGlucose}</span>
            </button>
        </form>
    );
}
