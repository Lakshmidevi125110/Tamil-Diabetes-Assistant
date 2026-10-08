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

/** Splits cleaned text into sentences for low-latency, sentence-by-sentence TTS playback. */
export function splitIntoSentences(text) {
    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) return [];
    return cleaned
        .split(/(?<=[.!?\n])\s+/)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !/^[\s.,!?-]+$/.test(s));
}
