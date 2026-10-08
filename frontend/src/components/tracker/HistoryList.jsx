import { getFormattedDate } from '../../lib/dates.js';
import { getGlucoseStatus } from '../../lib/tracker.js';
import { TrashIcon } from '../icons.jsx';

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

function DeleteButton({ t, onClick }) {
    return (
        <button type="button" className="btn-delete-record" title={t.btnDelete} aria-label="Delete entry" onClick={onClick}>
            <TrashIcon />
        </button>
    );
}

export default function HistoryList({ t, filter, onFilterChange, readings, wellnessLogs, onDelete }) {
    const items = filterItems(filter, readings, wellnessLogs);

    return (
        <div className="tracker-card history-card">
            <div className="card-header-row">
                <div className="card-title-group">
                    <span className="card-title-icon">📋</span>
                    <h3>{t.historyTitle}</h3>
                </div>
                <span className="records-count-badge">{t.recordsCount(items.length)}</span>
            </div>

            <div className="history-filter-bar" role="tablist">
                {HISTORY_FILTERS.map(f => (
                    <button
                        key={f}
                        type="button"
                        className={`filter-chip${filter === f ? ' active' : ''}`}
                        onClick={() => onFilterChange(f)}
                    >
                        {t[FILTER_LABEL_KEYS[f]]}
                    </button>
                ))}
            </div>

            <div className="history-records-list">
                {items.length === 0 ? (
                    <div className="empty-state-box">
                        <span className="empty-state-icon">📋</span>
                        <h4>{t.emptyHistoryTitle}</h4>
                        <p>{t.emptyHistoryDesc}</p>
                    </div>
                ) : items.map(item => (
                    <div className="record-item" key={item.id}>
                        {item.kind === 'glucose' ? (
                            <div className="record-left">
                                <div className={`glucose-val-pill ${getGlucoseStatus(item.value, item.type)}`}>
                                    {item.value}
                                    <span>mg/dL</span>
                                </div>
                                <div className="record-details">
                                    <span className="record-type-badge">🏷️ {t.types[item.type] || item.type}</span>
                                    <span className="record-timestamp">
                                        📅 {getFormattedDate(item.date)} {item.time ? `• ⏰ ${item.time}` : ''}
                                    </span>
                                    {item.notes && <span className="record-notes">📝 {item.notes}</span>}
                                </div>
                            </div>
                        ) : (
                            <div className="record-left">
                                <div className="glucose-val-pill normal">
                                    {item.walking}
                                    <span>{t.unitWalking}</span>
                                </div>
                                <div className="record-details">
                                    <span className="record-type-badge">💧 {item.water} {t.unitWater}</span>
                                    <span className="record-timestamp">📅 {getFormattedDate(item.date)}</span>
                                    {item.notes && <span className="record-notes">📝 {item.notes}</span>}
                                </div>
                            </div>
                        )}
                        <DeleteButton t={t} onClick={() => onDelete(item.id, item.kind)} />
                    </div>
                ))}
            </div>
        </div>
    );
}
