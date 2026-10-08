import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchGlucoseFeedback } from '../../lib/api.js';
import {
    addGlucoseReading,
    addWellnessLog,
    deleteGlucoseReading,
    deleteWellnessLog,
    generateEducationalInsights,
    getGlucoseReadings,
    getWellnessLogs
} from '../../lib/tracker.js';
import DeleteModal from './DeleteModal.jsx';
import GlucoseChart from './GlucoseChart.jsx';
import GlucoseFeedbackCard from './GlucoseFeedbackCard.jsx';
import GlucoseForm from './GlucoseForm.jsx';
import HistoryList from './HistoryList.jsx';
import WellnessForm from './WellnessForm.jsx';

export default function TrackerView({ t, lang }) {
    const [readings, setReadings] = useState(getGlucoseReadings);
    const [wellnessLogs, setWellnessLogs] = useState(getWellnessLogs);
    const [subtab, setSubtab] = useState('glucose');
    const [filter, setFilter] = useState('all');
    const [pendingDelete, setPendingDelete] = useState(null); // { id, kind }
    const [feedback, setFeedback] = useState(null);
    const [chartHighlighted, setChartHighlighted] = useState(false);

    const chartRef = useRef(null);
    const highlightTimerRef = useRef(null);
    const feedbackRequestRef = useRef(0);

    useEffect(() => () => clearTimeout(highlightTimerRef.current), []);

    const highlightChart = (scroll) => {
        if (scroll) chartRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        setChartHighlighted(true);
        clearTimeout(highlightTimerRef.current);
        highlightTimerRef.current = setTimeout(() => setChartHighlighted(false), 1400);
    };

    const handleSaveGlucose = (entry) => {
        // Save locally first: feedback from the server never blocks or cancels saving
        addGlucoseReading(entry);
        setReadings(getGlucoseReadings());
        setFilter('all');
        highlightChart(false);

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
        <main className="tracker-main">
            <div className="tracker-hero-card">
                <div className="tracker-hero-content">
                    <div className="tracker-badge-group">
                        <span className="tracker-icon-badge" aria-hidden="true">📊</span>
                        <div>
                            <h2>{t.trackerHeading}</h2>
                            <p>{t.trackerSubheading}</p>
                        </div>
                    </div>
                    <div className="storage-notice-badge">
                        <span className="storage-icon">🔒</span>
                        <span>{t.trackerStorageNotice}</span>
                    </div>
                </div>
            </div>

            <section className="tracker-card chart-section" aria-label="Glucose Trend Chart">
                <div className="card-header-row">
                    <div className="card-title-group">
                        <span className="card-title-icon">📈</span>
                        <h3>{t.chartTitle}</h3>
                    </div>
                    <div className="chart-legend-zone">
                        <span className="legend-indicator"></span>
                        <span>{t.chartLegend}</span>
                    </div>
                </div>

                <div ref={chartRef} className={`chart-viewport${chartHighlighted ? ' chart-highlighted' : ''}`}>
                    <GlucoseChart t={t} lang={lang} readings={readings} />
                </div>

                <div className="educational-insight-box">
                    <div className="insight-header">
                        <span className="insight-icon" aria-hidden="true">💡</span>
                        <strong>{t.insightTitle}</strong>
                    </div>
                    <p>{generateEducationalInsights(readings, lang)}</p>
                    <span className="insight-disclaimer">{t.insightDisclaimer}</span>
                </div>
            </section>

            <div className="tracker-grid">
                <div className="tracker-forms-col">
                    <div className="sub-tab-pill" role="tablist">
                        <button
                            type="button"
                            className={`subtab-btn${subtab === 'glucose' ? ' active' : ''}`}
                            role="tab"
                            aria-selected={subtab === 'glucose'}
                            onClick={() => setSubtab('glucose')}
                        >
                            <span>🩸</span> <span>{t.subtabGlucose}</span>
                        </button>
                        <button
                            type="button"
                            className={`subtab-btn${subtab === 'wellness' ? ' active' : ''}`}
                            role="tab"
                            aria-selected={subtab === 'wellness'}
                            onClick={() => setSubtab('wellness')}
                        >
                            <span>🏃</span> <span>{t.subtabWellness}</span>
                        </button>
                    </div>

                    {subtab === 'glucose' ? (
                        <>
                            <GlucoseForm t={t} lang={lang} onSave={handleSaveGlucose} onViewChart={() => highlightChart(true)} />
                            {feedback && (
                                <GlucoseFeedbackCard t={t} feedback={feedback} onClose={() => setFeedback(null)} />
                            )}
                        </>
                    ) : (
                        <WellnessForm t={t} lang={lang} onSave={handleSaveWellness} />
                    )}
                </div>

                <div className="tracker-history-col">
                    <HistoryList
                        t={t}
                        filter={filter}
                        onFilterChange={setFilter}
                        readings={readings}
                        wellnessLogs={wellnessLogs}
                        onDelete={(id, kind) => setPendingDelete({ id, kind })}
                    />
                </div>
            </div>

            {pendingDelete && <DeleteModal t={t} onCancel={cancelDelete} onConfirm={confirmDelete} />}
        </main>
    );
}
