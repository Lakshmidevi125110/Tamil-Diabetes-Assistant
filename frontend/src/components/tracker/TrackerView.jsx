import { useCallback, useEffect, useRef, useState } from 'react';
import { Lock } from 'lucide-react';
import { fetchGlucoseFeedback } from '../../lib/api.js';
import {
    addGlucoseReading,
    addWellnessLog,
    deleteGlucoseReading,
    deleteWellnessLog,
    generateEducationalInsights,
    getGlucoseReadings,
    getGlucoseStatus,
    getWellnessLogs,
    summarizeReadings
} from '../../lib/tracker.js';
import DeleteModal from './DeleteModal.jsx';
import GlucoseChart from './GlucoseChart.jsx';
import GlucoseFeedbackCard from './GlucoseFeedbackCard.jsx';
import GlucoseForm from './GlucoseForm.jsx';
import HistoryList from './HistoryList.jsx';
import WellnessForm from './WellnessForm.jsx';

function Stats({ t, readings }) {
    const s = summarizeReadings(readings);
    const dash = '—';
    return (
        <div className="panel stats">
            <div className="stat">
                <div className="stat-label">{t.statLatest}</div>
                <div className="stat-value">
                    {s.latest && <span className={`dot dot-${getGlucoseStatus(s.latest.value, s.latest.type)}`} aria-hidden="true"></span>}
                    {s.latest ? s.latest.value : dash}
                    {s.latest && <span className="stat-unit">mg/dL</span>}
                </div>
            </div>
            <div className="stat">
                <div className="stat-label">{t.statAverage}</div>
                <div className="stat-value">
                    {s.average ?? dash}
                    {s.average !== null && <span className="stat-unit">mg/dL</span>}
                </div>
            </div>
            <div className="stat">
                <div className="stat-label">{t.statInRange}</div>
                <div className="stat-value">{s.inRangePct === null ? dash : `${s.inRangePct}%`}</div>
            </div>
            <div className="stat">
                <div className="stat-label">{t.statEntries}</div>
                <div className="stat-value">{s.count}</div>
            </div>
        </div>
    );
}

export default function TrackerView({ t, lang }) {
    const [readings, setReadings] = useState(getGlucoseReadings);
    const [wellnessLogs, setWellnessLogs] = useState(getWellnessLogs);
    const [entryType, setEntryType] = useState('glucose');
    const [filter, setFilter] = useState('all');
    const [pendingDelete, setPendingDelete] = useState(null); // { id, kind }
    const [feedback, setFeedback] = useState(null);
    const [chartHighlighted, setChartHighlighted] = useState(false);

    const highlightTimerRef = useRef(null);
    const feedbackRequestRef = useRef(0);

    useEffect(() => () => clearTimeout(highlightTimerRef.current), []);

    const highlightChart = () => {
        setChartHighlighted(true);
        clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = setTimeout(() => setChartHighlighted(false), 1200);
    };

    const handleSaveGlucose = (entry) => {
        // Save locally first: feedback from the server never blocks or cancels saving
        addGlucoseReading(entry);
        setReadings(getGlucoseReadings());
        setFilter('all');
        highlightChart();

        const request = ++feedbackRequestRef.current;
        setFeedback({ state: 'loading' });
        fetchGlucoseFeedback({
            value: entry.value,
            measurementType: entry.type,
            language: lang,
            symptoms: entry.notes
        })
            .then(data => {
                if (request !== feedbackRequestRef.current) return;
                setFeedback(data && data.response
                    ? { state: 'ready', text: data.response, emergency: data.status === 'emergency' }
                    : { state: 'failed' });
            })
            .catch(err => {
                console.warn('Unable to fetch educational glucose response:', err);
                if (request === feedbackRequestRef.current) setFeedback({ state: 'failed' });
            });
    };

    const handleSaveWellness = (entry) => {
        addWellnessLog(entry);
        setWellnessLogs(getWellnessLogs());
        // Switch to the wellness filter so the saved log is visible immediately
        setFilter('wellness');
    };

    const confirmDelete = () => {
        if (!pendingDelete) return;
        if (pendingDelete.kind === 'glucose') {
            deleteGlucoseReading(pendingDelete.id);
            setReadings(getGlucoseReadings());
        } else {
            deleteWellnessLog(pendingDelete.id);
            setWellnessLogs(getWellnessLogs());
        }
        setPendingDelete(null);
    };

    const cancelDelete = useCallback(() => setPendingDelete(null), []);

    return (
        <main className="page">
            <div className="page-head">
                <div>
                    <h1 className="page-title">{t.trackerHeading}</h1>
                    <p className="page-desc">{t.trackerSubheading}</p>
                </div>
                <span className="storage-note">
                    <Lock aria-hidden="true" />
                    {t.trackerStorageNotice}
                </span>
            </div>

            <Stats t={t} readings={readings} />

            <section className="chart-section" aria-labelledby="chart-title">
                <div className="section-head">
                    <h2 id="chart-title" className="section-title">{t.chartTitle}</h2>
                    <span className="legend">
                        <span className="legend-swatch" aria-hidden="true"></span>
                        {t.chartLegend}
                    </span>
                </div>
                <div className={`panel chart-panel${chartHighlighted ? ' is-highlighted' : ''}`}>
                    <GlucoseChart t={t} readings={readings} />
                </div>
                <div className="insight">
                    <div className="insight-title">{t.insightTitle}</div>
                    <p>{generateEducationalInsights(readings, lang)}</p>
                    <small>{t.insightDisclaimer}</small>
                </div>
            </section>

            <div className="tracker-grid">
                <section aria-labelledby="entry-title">
                    <div className="section-head">
                        <h2 id="entry-title" className="section-title">{t.addEntryTitle}</h2>
                        <div className="segmented-scroll">
                        <div className="segmented" role="tablist">
                            <button type="button" role="tab" aria-selected={entryType === 'glucose'} onClick={() => setEntryType('glucose')}>
                                {t.subtabGlucose}
                            </button>
                            <button type="button" role="tab" aria-selected={entryType === 'wellness'} onClick={() => setEntryType('wellness')}>
                                {t.subtabWellness}
                            </button>
                        </div>
                        </div>
                    </div>

                    {entryType === 'glucose' ? (
                        <>
                            <GlucoseForm t={t} lang={lang} onSave={handleSaveGlucose} />
                            {feedback && (
                                <GlucoseFeedbackCard t={t} feedback={feedback} onClose={() => setFeedback(null)} />
                            )}
                        </>
                    ) : (
                        <WellnessForm t={t} lang={lang} onSave={handleSaveWellness} />
                    )}
                </section>

                <HistoryList
                    t={t}
                    filter={filter}
                    onFilterChange={setFilter}
                    readings={readings}
                    wellnessLogs={wellnessLogs}
                    onDelete={(id, kind) => setPendingDelete({ id, kind })}
                />
            </div>

            {pendingDelete && <DeleteModal t={t} onCancel={cancelDelete} onConfirm={confirmDelete} />}
        </main>
    );
}
