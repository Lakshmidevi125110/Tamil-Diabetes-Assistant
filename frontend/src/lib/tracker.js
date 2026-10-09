/**
 * Health tracker persistence (device-local localStorage), validation,
 * status classification, and rule-based educational insights.
 */
import { getLocalTimeString, getRecordTimestamp, normalizeDateToISO, parseToTimestamp } from './dates.js';

export const STORAGE_KEYS = {
    GLUCOSE: 'diabetes_assistant_glucose_readings',
    WELLNESS: 'diabetes_assistant_wellness_logs'
};

export const GLUCOSE_MIN = 20;
export const GLUCOSE_MAX = 600;

function readList(key) {
    try {
        const raw = globalThis.localStorage.getItem(key);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch (e) {
        console.error(`Error reading ${key} from localStorage:`, e);
        return [];
    }
}

function writeList(key, list) {
    try {
        globalThis.localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {
        console.error(`Error saving ${key} to localStorage:`, e);
    }
}

function newId(prefix) {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

const newestFirst = (a, b) => (b.timestamp || 0) - (a.timestamp || 0);

export function getGlucoseReadings() {
    return readList(STORAGE_KEYS.GLUCOSE).map(item => ({
        ...item,
        value: Number(item.value),
        timestamp: getRecordTimestamp(item)
    }));
}

export function addGlucoseReading({ value, type, date, time, notes }) {
    const readings = getGlucoseReadings();
    const isoDate = normalizeDateToISO(date);
    const entry = {
        id: newId('g'),
        value: Number(value),
        type: type || 'after_meal',
        date: isoDate,
        time: (time && String(time).trim()) ? String(time).trim() : getLocalTimeString(),
        notes: notes ? String(notes).trim() : '',
        timestamp: parseToTimestamp(isoDate, time)
    };
    readings.push(entry);
    readings.sort(newestFirst);
    writeList(STORAGE_KEYS.GLUCOSE, readings);
    return entry;
}

export function deleteGlucoseReading(id) {
    writeList(STORAGE_KEYS.GLUCOSE, getGlucoseReadings().filter(r => r.id !== id));
}

export function getWellnessLogs() {
    return readList(STORAGE_KEYS.WELLNESS).map(item => ({
        ...item,
        timestamp: getRecordTimestamp(item)
    }));
}

export function addWellnessLog({ walking, water, date, notes }) {
    const logs = getWellnessLogs();
    const isoDate = normalizeDateToISO(date);
    const entry = {
        id: newId('w'),
        walking: Number(walking),
        water: Number(water),
        date: isoDate,
        notes: notes ? String(notes).trim() : '',
        timestamp: parseToTimestamp(isoDate, '12:00')
    };
    logs.push(entry);
    logs.sort(newestFirst);
    writeList(STORAGE_KEYS.WELLNESS, logs);
    return entry;
}

export function deleteWellnessLog(id) {
    writeList(STORAGE_KEYS.WELLNESS, getWellnessLogs().filter(l => l.id !== id));
}

/**
 * Validates the glucose form. Returns { field, errorKey } for the first problem
 * (errorKey indexes I18N), or null when the input is valid.
 */
export function validateGlucoseForm({ value, date, time }) {
    const valStr = String(value ?? '').trim();
    if (!valStr) return { field: 'value', errorKey: 'errGlucoseEmpty' };
    const numVal = parseFloat(valStr);
    if (isNaN(numVal) || numVal < GLUCOSE_MIN || numVal > GLUCOSE_MAX) {
        return { field: 'value', errorKey: 'errGlucoseRange' };
    }
    if (!String(date ?? '').trim()) return { field: 'date', errorKey: 'errGlucoseDate' };
    if (!String(time ?? '').trim()) return { field: 'time', errorKey: 'errGlucoseTime' };
    return null;
}

/** Classifies a reading for the colored value pill: 'low' | 'normal' | 'high'. */
export function getGlucoseStatus(value, type) {
    if (value < 70) return 'low';
    const upper = (type === 'fasting' || type === 'before_meal') ? 130 : 180;
    return value <= upper ? 'normal' : 'high';
}

/** Rule-based educational observation over readings (newest first). */
export function generateEducationalInsights(readings, lang) {
    const ta = lang === 'ta';
    if (readings.length === 0) {
        return ta
            ? "உங்கள் இரத்த சர்க்கரை அளவை தொடர்ந்து பதிவு செய்து வந்தால், உங்கள் உணவு மற்றும் உடற்பயிற்சியின் தாக்கத்தை எளிதில் அறிந்து கொள்ள முடியும்."
            : "Recording your blood glucose consistently helps identify patterns related to meals, activity, and lifestyle.";
    }

    if (readings.length < 3) {
        return ta
            ? "நீங்கள் சில பதிவுகளை மட்டுமே செய்துள்ளீர்கள். நம்பகமான போக்கை (Trend) அறிய தொடர்ந்து சில நாட்கள் அளவுகளைப் பதிவு செய்யவும்."
            : "You have recorded only a few entries. A reliable pattern requires consistent logs over several days.";
    }

    const values = readings.map(r => r.value);
    const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const recentAvg = Math.round(values.slice(0, 3).reduce((a, b) => a + b, 0) / 3);

    if (avg > 180) {
        return ta
            ? `உங்கள் பதிவுகளின் ஒட்டுமொத்த சராசரி (${avg} mg/dL) பொது வழிகாட்டல் வரம்பை (180 mg/dL) விட அதிகமாக உள்ளது. தனிப்பயனாக்கப்பட்ட உணவு அல்லது சிகிச்சை மாற்றங்களுக்கு உங்கள் மருத்துவரை அணுகவும்.`
            : `Your overall average (${avg} mg/dL) is above the general reference threshold (180 mg/dL). Discuss persistent elevations and personalized targets with your physician.`;
    }
    if (avg < 70) {
        return ta
            ? `உங்கள் பதிவுகளின் ஒட்டுமொத்த சராசரி (${avg} mg/dL) குறைவாக உள்ளது. தலைசுற்றல் அல்லது நடுக்கம் போன்ற குறைந்த சர்க்கரை அறிகுறிகள் இருந்தால் உடனடி கவனம் தேவை; உங்கள் மருத்துவரிடம் தெரிவிக்கவும்.`
            : `Your overall average (${avg} mg/dL) is below the typical reference range. Note low blood sugar symptoms (dizziness, trembling) and consult your doctor promptly.`;
    }
    if (recentAvg > avg + 20) {
        return ta
            ? `உங்கள் சமீபத்திய 3 பதிவுகளின் சராசரி (${recentAvg} mg/dL) முந்தைய சராசரியை (${avg} mg/dL) விட அதிகமாக உள்ளது. உணவு நேரங்கள் அல்லது மன அழுத்த மாற்றங்களை கவனித்து, உங்கள் மருத்துவரிடம் விவாதிக்கவும்.`
            : `Your recent 3 readings average (${recentAvg} mg/dL) is higher than your overall average (${avg} mg/dL). Note any dietary or lifestyle changes and discuss persistent elevations with your doctor.`;
    }
    if (range > 80) {
        return ta
            ? `உங்கள் பதிவுகளில் குறிப்பிடத்தக்க மாறுபாடுகள் (Variation: ${min} முதல் ${max} mg/dL வரை) காணப்படுகின்றன. சீரான உணவு மற்றும் மருந்து பழக்கத்தை பின்பற்றி, மருத்துவ ஆலோசனை பெறவும்.`
            : `Your recorded readings show noticeable variation (ranging from ${min} to ${max} mg/dL). Consistent meal timing and activity help stabilize readings; discuss fluctuations with your physician.`;
    }
    return ta
        ? `உங்கள் பதிவுகள் ஒப்பீட்டளவில் சீரான போக்கைக் காட்டுகின்றன (சராசரி: ${avg} mg/dL). ஆரோக்கியமான சமச்சீர் உணவு, தினசரி நடைபயிற்சி மற்றும் வழக்கமான மருத்துவ ஆலோசனையைத் தொடரவும்.`
        : `Your readings show a relatively consistent trend (average: ${avg} mg/dL). Continue your balanced nutrition, physical activity, and routine healthcare consultations.`;
}

/** Summary figures for the tracker header (readings in any order). */
export function summarizeReadings(readings) {
    if (readings.length === 0) {
        return { count: 0, latest: null, average: null, inRangePct: null };
    }
    const latest = readings.reduce((a, b) => (b.timestamp > a.timestamp ? b : a));
    const average = Math.round(readings.reduce((sum, r) => sum + r.value, 0) / readings.length);
    const inRange = readings.filter(r => getGlucoseStatus(r.value, r.type) === 'normal').length;
    return {
        count: readings.length,
        latest,
        average,
        inRangePct: Math.round((inRange / readings.length) * 100)
    };
}
