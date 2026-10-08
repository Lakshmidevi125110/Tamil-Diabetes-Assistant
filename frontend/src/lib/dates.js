export function getCurrentTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function getLocalDateString(now = new Date()) {
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function getLocalTimeString(now = new Date()) {
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

/** Normalizes legacy "DD/MM/YYYY" or "YYYY/MM/DD" dates to ISO "YYYY-MM-DD". */
export function normalizeDateToISO(dateStr) {
    if (!dateStr) return getLocalDateString();
    const str = String(dateStr).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
        return str;
    }
    const slashParts = str.split('/');
    if (slashParts.length === 3) {
        const [p1, p2, p3] = slashParts;
        if (p3.length === 4) {
            let day = parseInt(p1, 10);
            let month = parseInt(p2, 10);
            if (month > 12 && day <= 12) {
                [day, month] = [month, day];
            }
            return `${p3}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        }
        if (p1.length === 4) {
            return `${p1}-${String(parseInt(p2, 10)).padStart(2, '0')}-${String(parseInt(p3, 10)).padStart(2, '0')}`;
        }
    }
    return str;
}

export function parseToTimestamp(dateStr, timeStr) {
    const isoDate = normalizeDateToISO(dateStr);
    const cleanTime = (timeStr && String(timeStr).trim()) ? String(timeStr).trim() : '12:00';
    const ts = new Date(`${isoDate}T${cleanTime}`).getTime();
    if (!isNaN(ts)) return ts;
    const fallback = new Date(isoDate).getTime();
    return !isNaN(fallback) ? fallback : Date.now();
}

export function getRecordTimestamp(item) {
    if (item && typeof item.timestamp === 'number' && !isNaN(item.timestamp) && item.timestamp > 0) {
        return item.timestamp;
    }
    return parseToTimestamp(item ? item.date : '', item ? item.time : '');
}

/** "YYYY-MM-DD" -> "DD/MM/YYYY" for display. */
export function getFormattedDate(dateStr) {
    if (!dateStr) return '';
    const parts = normalizeDateToISO(dateStr).split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
}
