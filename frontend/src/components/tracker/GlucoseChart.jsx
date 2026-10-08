import { computeChartGeometry, CHART_HEIGHT, CHART_WIDTH } from '../../lib/chart.js';
import { getFormattedDate } from '../../lib/dates.js';

export default function GlucoseChart({ t, lang, readings }) {
    const viewBox = `0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`;

    if (readings.length === 0) {
        return (
            <svg id="glucose-svg-chart" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Interactive blood sugar chart">
                <text x="325" y="115" className="svg-empty-text">📋 {t.chartEmptyMsg}</text>
                <text x="325" y="140" style={{ fontSize: 11, fill: '#94a3b8', textAnchor: 'middle' }}>
                    {lang === 'ta' ? 'படிவத்தில் அளவை உள்ளிட்டு "அளவைச் சேர்க்கவும்" அழுத்தவும்.' : 'Enter a reading on the left to start tracking.'}
                </text>
            </svg>
        );
    }

    const g = computeChartGeometry(readings);
    const right = g.width - g.pad.right;
    const bandLabel = { fontSize: 10, fill: '#059669', fontWeight: 600 };

    return (
        <svg id="glucose-svg-chart" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Interactive blood sugar chart">
            <defs>
                <linearGradient id="glucoseAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0f766e" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#0f766e" stopOpacity="0.0" />
                </linearGradient>
            </defs>

            {/* Reference range band 70 - 180 mg/dL */}
            <rect x={g.pad.left} y={g.band.y} width={g.chartW} height={g.band.height} className="svg-ref-band" />
            <text x={right - 6} y={g.band.y180 + 12} textAnchor="end" style={bandLabel}>180 mg/dL</text>
            <text x={right - 6} y={g.band.y70 - 4} textAnchor="end" style={bandLabel}>70 mg/dL</text>

            {g.yTicks.map(tick => (
                <g key={tick.value}>
                    <line x1={g.pad.left} y1={tick.y} x2={right} y2={tick.y} className="svg-grid-line" />
                    <text x={g.pad.left - 8} y={tick.y + 4} textAnchor="end" className="svg-axis-text">{tick.value}</text>
                </g>
            ))}

            {g.points.length > 1 && (
                <>
                    <path d={g.areaPath} className="svg-trend-area" />
                    <path d={g.linePath} className="svg-trend-line" />
                </>
            )}
            {g.points.length === 1 && (
                <>
                    <line
                        x1={g.points[0].x} y1={g.pad.top} x2={g.points[0].x} y2={g.bottom}
                        stroke="#0d9488" strokeWidth="1.5" strokeDasharray="4 4" opacity="0.6"
                    />
                    <circle cx={g.points[0].x} cy={g.points[0].y} r="12" fill="#0d9488" fillOpacity="0.16" />
                </>
            )}

            {g.points.map(p => {
                const r = p.reading;
                const date = getFormattedDate(r.date);
                const tooltip = `${r.value} mg/dL • ${t.types[r.type] || r.type} • ${date} ${r.time || ''} ${r.notes ? `(${r.notes})` : ''}`;
                return (
                    <g key={r.id}>
                        <circle cx={p.x} cy={p.y} r="5.5" className="svg-data-dot" tabIndex={0}>
                            <title>{tooltip}</title>
                        </circle>
                        <text x={p.x} y={p.y - 10} textAnchor="middle" style={{ fontSize: 11, fontWeight: 700, fill: '#0f766e' }}>
                            {r.value}
                        </text>
                        {p.showDateLabel && (
                            <text x={p.x} y={g.height - 12} textAnchor="middle" className="svg-axis-text">{date}</text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}
