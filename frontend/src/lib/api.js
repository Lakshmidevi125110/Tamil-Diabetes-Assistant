/**
 * Thin client for the FastAPI backend. The base URL comes from VITE_API_BASE_URL
 * (frontend/.env.local locally, Vercel project settings in production).
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

export function apiUrl(path) {
    return `${API_BASE_URL}${path}`;
}

async function postJson(path, body, signal) {
    return fetch(apiUrl(path), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal
    });
}

/** POST /chat — resolves to { ok, data } so callers can show the server's error message. */
export async function sendChatMessage({ message, language, history }) {
    const response = await postJson('/chat', { message, language, history });
    const data = await response.json();
    return { ok: response.ok, data };
}

/** GET /questions/suggested — resolves to the question list, or [] on any failure. */
export async function fetchSuggestedQuestions() {
    try {
        const response = await fetch(apiUrl('/questions/suggested'));
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data?.questions) ? data.questions : [];
    } catch {
        return [];
    }
}

/** POST /glucose/respond — educational feedback for a single reading. */
export async function fetchGlucoseFeedback({ value, measurementType, language, symptoms }) {
    const response = await postJson('/glucose/respond', {
        value,
        measurement_type: measurementType,
        language,
        symptoms
    });
    if (!response.ok) throw new Error(`HTTP error ${response.status}`);
    return response.json();
}

/** POST /tts — returns an object URL for the MP3 of one sentence. Caller must revoke it. */
export async function fetchSentenceAudioUrl(sentence, language, signal) {
    const response = await postJson('/tts', { text: sentence, language }, signal);
    if (!response.ok) throw new Error(`TTS server error (${response.status})`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}
