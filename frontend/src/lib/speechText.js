/** Strips emojis, markdown, links, and bullets so synthesized speech sounds natural. */
export function cleanTextForSpeech(text) {
    return text
        .replace(/⚠️/g, '')
        .replace(/[\u{1F300}-\u{1FAFF}]/gu, '')
        .replace(/[🚨ℹ️👉🩺👤🎙️🔊⏹️📋📊📈]/gu, '')
        .replace(/[*_#`~]/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/https?:\/\/\S+/g, '')
        .replace(/^\s*[-•]\s*/gm, '')
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Removes emoji from server replies for a calmer display. Wording is unchanged,
 * so safety messages keep their full text.
 */
export function cleanDisplayText(text) {
    return String(text ?? '')
        .replace(/[\p{Extended_Pictographic}‍️]/gu, '')
        .replace(/^[ \t]+/gm, '')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
}

/** Splits cleaned text into sentences for low-latency, sentence-by-sentence TTS playback. */
export function splitIntoSentences(text) {
    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) return [];
    return cleaned
        .split(/(?<=[.!?\n])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !/^[\s.,!?-]+$/.test(s));
}
