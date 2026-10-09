/**
 * Geometry for the glucose trend SVG chart (viewBox 960 x 300).
 * Pure function so the layout is testable without a DOM.
 */
export const CHART_WIDTH = 960;
export const CHART_HEIGHT = 300;
const PAD = { top: 28, right: 24, bottom: 40, left: 48 };

export function computeChartGeometry(rawReadings) {
    // Chronological order for time-series display
    const readings = [...rawReadings].sort((a, b) => a.timestamp - b.timestamp);
    const W = CHART_WIDTH;
    const H = CHART_HEIGHT;
    const chartW = W - PAD.left - PAD.right;
    const chartH = H - PAD.top - PAD.bottom;
    const bottom = PAD.top + chartH;

    const values = readings.map(r => r.value);
    const minY = Math.max(20, Math.min(50, Math.min(...values) - 15));
    const maxY = Math.min(600, Math.max(240, Math.max(...values) + 20));

    const getY = (val) => PAD.top + chartH - ((val - minY) / (maxY - minY)) * chartH;
    const getX = (idx) => readings.length === 1
        ? PAD.left + chartW / 2
        : PAD.left + (idx / (readings.length - 1)) * chartW;
    const clampY = (y) => Math.min(bottom, Math.max(PAD.top, y));

    // Reference band 70 - 180 mg/dL
    const y70 = clampY(getY(70));
    const y180 = clampY(getY(180));

    const yTicks = [70, 100, 140, 180, 240]
        .filter(t => t >= minY && t <= maxY)
        .map(value => ({ value, y: getY(value) }));

    const labelEvery = Math.ceil(readings.length / 6);
    const points = readings.map((reading, i) => ({
        x: getX(i),
        y: getY(reading.value),
        reading,
        showDateLabel: readings.length <= 8 || i % labelEvery === 0 || i === readings.length - 1
    }));

    let linePath = '';
    let areaPath = '';
    if (points.length > 1) {
        linePath = 'M ' + points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L ');
        areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(1)},${bottom} L ${points[0].x.toFixed(1)},${bottom} Z`;
    }

    return {
        width: W,
        height: H,
        pad: PAD,
        chartW,
        bottom,
        band: { y: y180, height: Math.max(0, y70 - y180), y70, y180 },
        yTicks,
        points,
        linePath,
        areaPath
    };
}
