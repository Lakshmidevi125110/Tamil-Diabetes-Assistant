import { ChartLine } from 'lucide-react';
import { computeChartGeometry, CHART_HEIGHT, CHART_WIDTH } from '../../lib/chart.js';
import { getFormattedDate, getShortDate } from '../../lib/dates.js';

// Value labels on every point get crowded; beyond this many readings only the latest is labelled
const MAX_VALUE_LABELS = 10;

export default function GlucoseChart({ t, readings }) {
    if (readings.length === 0) {
        return (
            <div className="chart-empty">
                <ChartLine aria-hidden="true" />
                <span>{t.chartEmptyMsg}</span>
            </div>
        );
    }

    const g = computeChartGeometry(readings);
    const right = g.width - g.pad.right;
    const lastIndex = g.points.length - 1;

    return (
        <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            aria-label={t.chartTitle}
        >
            <defs>
                <linearGradient id="glucoseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" style={{ stopColor: 'var(--accent)', stopOpacity: 0.18 }} />
                    <stop offset="100%" style={{ stopColor: 'var(--accent)', stopOpacity: 0 }} />
                </linearGradient>
            </defs>

            {/* Reference range band 70 - 180 mg/dL */}
            <rect x={g.pad.left} y={g.band.y} width={g.chartW} height={g.band.height} className="c-band" />
            <text x={right - 6} y={g.band.y180 + 13} textAnchor="end" className="c-band-label">180</text>
            <text x={right - 6} y={g.band.y70 - 5} textAnchor="end" className="c-band-label">70</text>

            {g.yTicks.map(tick => (
                <g key={tick.value}>
                    <line x1={g.pad.left} y1={tick.y} x2={right} y2={tick.y} className="c-grid" />
                    <text x={g.pad.left - 10} y={tick.y + 4} textAnchor="end" className="c-axis">{tick.value}</text>
                </g>
            ))}

            {g.points.length > 1 && (
                <>
                    <path d={g.areaPath} fill="url(#glucoseAreaGrad)" />
                    <path d={g.linePath} className="c-line" />
                </>
            )}
            {g.points.length === 1 && (
                <line x1={g.points[0].x} y1={g.pad.top} x2={g.points[0].x} y2={g.bottom} className="c-guide" />
            )}

            {g.points.map((p, i) => {
                const r = p.reading;
                const date = getFormattedDate(r.date);
                const tooltip = `${r.value} mg/dL · ${t.types[r.type] || r.type} · ${date} ${r.time || ''}${r.notes ? ` · ${r.notes}` : ''}`;
                const showValue = g.points.length <= MAX_VALUE_LABELS || i === lastIndex;
                return (
                    <g key={r.id}>
                        <circle cx={p.x} cy={p.y} r="4.5" className="c-dot" tabIndex={0}>
                            <title>{tooltip}</title>
                        </circle>
                        {showValue && (
                            <text x={p.x} y={p.y - 11} textAnchor="middle" className="c-value">{r.value}</text>
                        )}
                        {p.showDateLabel && (
                            <text x={p.x} y={g.height - 14} textAnchor="middle" className="c-axis">{getShortDate(r.date)}</text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}
