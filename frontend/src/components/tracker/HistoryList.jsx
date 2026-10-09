import { Droplet, Footprints, Trash2 } from 'lucide-react';
import { getFormattedDate } from '../../lib/dates.js';
import { getGlucoseStatus } from '../../lib/tracker.js';

export const HISTORY_FILTERS = ['all', 'fasting', 'after_meal', 'wellness'];

const FILTER_LABEL_KEYS = {
    all: 'filterAll',
    fasting: 'filterFasting',
    after_meal: 'filterAfterMeal',
    wellness: 'filterWellness'
};

function filterItems(filter, readings, wellnessLogs) {
    if (filter === 'wellness') return wellnessLogs.map(w => ({ ...w, kind: 'wellness' }));
    let list = readings;
    if (filter === 'fasting') list = readings.filter(r => r.type === 'fasting' || r.type === 'before_meal');
    else if (filter === 'after_meal') list = readings.filter(r => r.type === 'after_meal');
    return list.map(r => ({ ...r, kind: 'glucose' }));
}

export default function HistoryList({ t, filter, onFilterChange, readings, wellnessLogs, onDelete }) {
    const items = filterItems(filter, readings, wellnessLogs);

    return (
        <section aria-labelledby="history-title">
            <div className="section-head">
                <h2 id="history-title" className="section-title">
                    {t.historyTitle}
                    <span className="history-count">{items.length}</span>
                </h2>
                <div className="segmented-scroll">
                    <div className="segmented" role="tablist">
                        {HISTORY_FILTERS.map(f => (
                            <button key={f} type="button" role="tab" aria-selected={filter === f} onClick={() => onFilterChange(f)}>
                                {t[FILTER_LABEL_KEYS[f]]}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="panel history-list">
                {items.length === 0 ? (
                    <div className="empty">
                        <h3>{t.emptyHistoryTitle}</h3>
                        <p>{t.emptyHistoryDesc}</p>
                    </div>
                ) : items.map(item => (
                    <div className="history-row" key={item.id}>
                        {item.kind === 'glucose' ? (
                            <>
                                <div className="history-value">
                                    <span className={`dot dot-${getGlucoseStatus(item.value, item.type)}`} aria-hidden="true"></span>
                                    {item.value}
                                    <small>mg/dL</small>
                                </div>
                                <div className="history-details">
                                    <div className="history-type">{t.types[item.type] || item.type}</div>
                                    <div className="history-meta">
                                        {getFormattedDate(item.date)}{item.time ? ` · ${item.time}` : ''}
                                    </div>
                                    {item.notes && <div className="history-notes">{item.notes}</div>}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="history-wellness">
                                    <span><Footprints aria-hidden="true" />{item.walking} {t.unitWalking}</span>
                                    <span><Droplet aria-hidden="true" />{item.water} {t.unitWater}</span>
                                </div>
                                <div className="history-details">
                                    <div className="history-meta">{getFormattedDate(item.date)}</div>
                                    {item.notes && <div className="history-notes">{item.notes}</div>}
                                </div>
                            </>
                        )}
                        <button
                            type="button"
                            className="btn btn-ghost btn-icon"
                            title={t.btnDelete}
                            aria-label={t.btnDelete}
                            onClick={() => onDelete(item.id, item.kind)}
                        >
                            <Trash2 width={16} height={16} />
                        </button>
                    </div>
                ))}
            </div>
        </section>
    );
}
