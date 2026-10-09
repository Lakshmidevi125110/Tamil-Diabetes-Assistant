import { beforeEach, describe, expect, it } from 'vitest';
import { I18N } from '../i18n.js';
import { computeChartGeometry } from './chart.js';
import { getFormattedDate, normalizeDateToISO } from './dates.js';
import {
    STORAGE_KEYS,
    addGlucoseReading,
    addWellnessLog,
    deleteGlucoseReading,
    generateEducationalInsights,
    getGlucoseReadings,
    getGlucoseStatus,
    getWellnessLogs,
    summarizeReadings,
    validateGlucoseForm
} from './tracker.js';

class MemoryStorage {
    constructor() { this.data = new Map(); }
    getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
    setItem(key, value) { this.data.set(key, String(value)); }
    removeItem(key) { this.data.delete(key); }
    clear() { this.data.clear(); }
}

beforeEach(() => {
    globalThis.localStorage = new MemoryStorage();
});

describe('glucose readings storage', () => {
    it('loads an existing legacy reading (DD/MM/YYYY, no timestamp) with a valid timestamp', () => {
        localStorage.setItem(STORAGE_KEYS.GLUCOSE, JSON.stringify([
            { id: 'legacy', value: '156', type: 'after_meal', date: '05/10/2026', time: '09:30', notes: '' }
        ]));
        const readings = getGlucoseReadings();
        expect(readings).toHaveLength(1);
        expect(readings[0].value).toBe(156);
        expect(readings[0].timestamp).toBeGreaterThan(0);
    });

    it('saves immediately and lists newest first', () => {
        addGlucoseReading({ value: 156, type: 'after_meal', date: '2026-10-05', time: '09:30', notes: '' });
        addGlucoseReading({ value: 120, type: 'fasting', date: '2026-10-08', time: '07:00', notes: ' idli ' });

        const readings = getGlucoseReadings();
        expect(readings.map(r => r.value)).toEqual([120, 156]);
        expect(readings[0].notes).toBe('idli');
        expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.GLUCOSE))).toHaveLength(2);
    });

    it('deletes a reading by id', () => {
        const entry = addGlucoseReading({ value: 140, type: 'random', date: '2026-10-08', time: '12:00' });
        deleteGlucoseReading(entry.id);
        expect(getGlucoseReadings()).toHaveLength(0);
    });

    it('returns an empty list for corrupted storage', () => {
        localStorage.setItem(STORAGE_KEYS.GLUCOSE, '{not json');
        expect(getGlucoseReadings()).toEqual([]);
    });
});

describe('wellness logs storage', () => {
    it('saves wellness logs newest first', () => {
        addWellnessLog({ walking: 30, water: 8, date: '2026-10-07', notes: '' });
        addWellnessLog({ walking: 45, water: 10, date: '2026-10-08', notes: 'slept well' });
        expect(getWellnessLogs().map(l => l.walking)).toEqual([45, 30]);
    });
});

describe('validateGlucoseForm', () => {
    const valid = { value: '120', date: '2026-10-08', time: '08:00' };

    it.each([
        [{ ...valid, value: '' }, 'errGlucoseEmpty'],
        [{ ...valid, value: '601' }, 'errGlucoseRange'],
        [{ ...valid, value: '19' }, 'errGlucoseRange'],
        [{ ...valid, value: 'abc' }, 'errGlucoseRange'],
        [{ ...valid, date: '' }, 'errGlucoseDate'],
        [{ ...valid, time: '' }, 'errGlucoseTime']
    ])('rejects %o with %s', (input, errorKey) => {
        expect(validateGlucoseForm(input).errorKey).toBe(errorKey);
    });

    it('accepts boundary values 20 and 600', () => {
        expect(validateGlucoseForm({ ...valid, value: '20' })).toBeNull();
        expect(validateGlucoseForm({ ...valid, value: '600' })).toBeNull();
    });

    it('has localized messages for every error key', () => {
        for (const key of ['errGlucoseEmpty', 'errGlucoseRange', 'errGlucoseDate', 'errGlucoseTime']) {
            expect(I18N.en[key]).toBeTruthy();
            expect(I18N.ta[key]).toBeTruthy();
        }
        expect(I18N.en.errGlucoseEmpty).toContain('Please enter a blood glucose value');
        expect(I18N.ta.errGlucoseEmpty).toContain('சர்க்கரை அளவை உள்ளிடவும்');
    });
});

describe('classification and insights', () => {
    it('classifies glucose status by measurement type', () => {
        expect(getGlucoseStatus(65, 'fasting')).toBe('low');
        expect(getGlucoseStatus(130, 'fasting')).toBe('normal');
        expect(getGlucoseStatus(131, 'before_meal')).toBe('high');
        expect(getGlucoseStatus(180, 'after_meal')).toBe('normal');
        expect(getGlucoseStatus(181, 'random')).toBe('high');
    });

    it('asks for more data with fewer than 3 readings', () => {
        expect(generateEducationalInsights([{ value: 200 }], 'en')).toContain('only a few entries');
    });

    it('flags a high overall average', () => {
        const readings = [{ value: 200 }, { value: 210 }, { value: 190 }];
        expect(generateEducationalInsights(readings, 'en')).toContain('above the general reference threshold');
    });
});

describe('dates', () => {
    it('normalizes legacy formats to ISO', () => {
        expect(normalizeDateToISO('05/10/2026')).toBe('2026-10-05');
        expect(normalizeDateToISO('2026/10/5')).toBe('2026-10-05');
        expect(getFormattedDate('2026-10-05')).toBe('05/10/2026');
    });
});

describe('chart geometry', () => {
    it('plots readings in chronological order', () => {
        addGlucoseReading({ value: 120, type: 'fasting', date: '2026-10-08', time: '07:00' });
        addGlucoseReading({ value: 156, type: 'after_meal', date: '2026-10-05', time: '09:30' });
        const g = computeChartGeometry(getGlucoseReadings());
        expect(g.points.map(p => p.reading.value)).toEqual([156, 120]);
        expect(g.points[0].x).toBeLessThan(g.points[1].x);
        expect(g.linePath.startsWith('M ')).toBe(true);
        expect(g.band.height).toBeGreaterThan(0);
    });

    it('centers a single reading', () => {
        addGlucoseReading({ value: 140, type: 'random', date: '2026-10-08', time: '12:00' });
        const g = computeChartGeometry(getGlucoseReadings());
        expect(g.points).toHaveLength(1);
        expect(g.linePath).toBe('');
    });
});

describe('summarizeReadings', () => {
    it('returns empty figures with no readings', () => {
        expect(summarizeReadings([])).toEqual({ count: 0, latest: null, average: null, inRangePct: null });
    });

    it('computes latest, average and in-range share', () => {
        addGlucoseReading({ value: 120, type: 'fasting', date: '2026-10-06', time: '07:00' });   // normal
        addGlucoseReading({ value: 200, type: 'after_meal', date: '2026-10-07', time: '13:00' }); // high
        addGlucoseReading({ value: 160, type: 'after_meal', date: '2026-10-08', time: '13:00' }); // normal
        const s = summarizeReadings(getGlucoseReadings());
        expect(s.count).toBe(3);
        expect(s.latest.value).toBe(160);
        expect(s.average).toBe(160);
        expect(s.inRangePct).toBe(67);
    });
});
