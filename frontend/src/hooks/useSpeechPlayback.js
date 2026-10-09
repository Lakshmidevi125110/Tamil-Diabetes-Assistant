import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchSentenceAudioUrl } from '../lib/api.js';
import { cleanTextForSpeech, splitIntoSentences } from '../lib/speechText.js';

const hasSynthesis = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

function findMatchingBrowserVoice(voices, lang) {
    if (lang === 'ta') {
        return voices.find(v =>
            v.lang === 'ta-IN' ||
            v.lang.toLowerCase().startsWith('ta') ||
            v.name.toLowerCase().includes('tamil') ||
            v.name.toLowerCase().includes('valluvar') ||
            v.name.toLowerCase().includes('pallavi')
        ) || null;
    }
    return voices.find(v => v.lang === 'en-IN' || v.name.toLowerCase().includes('neerja')) ||
        voices.find(v => v.lang.startsWith('en')) || null;
}

/**
 * Plays assistant replies aloud. Uses a native browser voice for the language when
 * available, otherwise streams server-side TTS (edge-tts / gTTS) sentence by sentence.
 *
 * Returns { activeId, status, speak(id, text, lang), stop() } where status is
 * 'loading' | 'speaking' | null for the message identified by activeId.
 */
export function useSpeechPlayback({ onError } = {}) {
    const [activeId, setActiveId] = useState(null);
    const [status, setStatus] = useState(null);

    const voicesRef = useRef([]);
    const sessionRef = useRef(0);
    const audioRef = useRef(null);
    const audioUrlsRef = useRef([]);
    const abortRef = useRef(null);
    const activeIdRef = useRef(null);
    const onErrorRef = useRef(onError);
    onErrorRef.current = onError;

    useEffect(() => {
        if (!hasSynthesis()) return undefined;
        const load = () => { voicesRef.current = window.speechSynthesis.getVoices(); };
        load();
        window.speechSynthesis.addEventListener('voiceschanged', load);
        return () => window.speechSynthesis.removeEventListener('voiceschanged', load);
    }, []);

    const stop = useCallback(() => {
        if (hasSynthesis()) window.speechSynthesis.cancel();
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        sessionRef.current++;

        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
        audioUrlsRef.current.forEach(url => {
            try { URL.revokeObjectURL(url); } catch { /* already revoked */ }
        });
        audioUrlsRef.current = [];

        activeIdRef.current = null;
        setActiveId(null);
        setStatus(null);
    }, []);

    // Stop any playback when the component using this hook unmounts
    useEffect(() => stop, [stop]);

    const speak = useCallback(async (id, text, lang) => {
        if (activeIdRef.current === id) {
            stop();
            return;
        }
        stop();

        if (!cleanTextForSpeech(text)) return;

        const session = ++sessionRef.current;
        activeIdRef.current = id;
        setActiveId(id);
        setStatus('loading');

        if (hasSynthesis() && voicesRef.current.length === 0) {
            voicesRef.current = window.speechSynthesis.getVoices();
        }
        const voice = hasSynthesis() ? findMatchingBrowserVoice(voicesRef.current, lang) : null;

        if (voice) {
            setStatus('speaking');
            const utterance = new SpeechSynthesisUtterance(cleanTextForSpeech(text));
            utterance.voice = voice;
            utterance.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
            utterance.rate = lang === 'ta' ? 0.95 : 1.0;
            utterance.onend = () => { if (sessionRef.current === session) stop(); };
            utterance.onerror = (e) => {
                console.warn('Speech synthesis error:', e);
                if (sessionRef.current === session) stop();
            };
            window.speechSynthesis.speak(utterance);
            return;
        }

        const sentences = splitIntoSentences(text);
        if (sentences.length === 0) {
            stop();
            return;
        }

        const controller = new AbortController();
        abortRef.current = controller;
        const fail = (err) => {
            if (sessionRef.current !== session) return;
            console.error('TTS playback error:', err);
            stop();
            onErrorRef.current?.();
        };

        // Request all sentences in parallel; play them in order as they arrive
        const audioPromises = sentences.map(sentence =>
            fetchSentenceAudioUrl(sentence, lang, controller.signal).then(url => {
                // Audio that arrives after playback was stopped is released immediately
                if (sessionRef.current === session) audioUrlsRef.current.push(url);
                else URL.revokeObjectURL(url);
                return url;
            })
        );
        audioPromises.forEach(p => p.catch(() => { /* handled when awaited in order */ }));

        let index = 0;
        const playNext = async () => {
            if (sessionRef.current !== session) return;
            if (index >= sentences.length) {
                stop();
                return;
            }
            try {
                const url = await audioPromises[index];
                if (sessionRef.current !== session) return;
                setStatus('speaking');
                const audio = new Audio(url);
                audioRef.current = audio;
                audio.onended = () => {
                    index++;
                    playNext();
                };
                audio.onerror = fail;
                await audio.play();
            } catch (err) {
                fail(err);
            }
        };
        playNext();
    }, [stop]);

    return { activeId, status, speak, stop };
}
