import { useCallback, useEffect, useRef, useState } from 'react';

const getRecognitionClass = () =>
    typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : undefined;

/**
 * Browser Web Speech API voice input with live interim transcripts.
 *
 * Callbacks (always read from the latest render):
 * - onStart()
 * - onTranscript(text)   interim/final transcript while speaking
 * - onEnd()              recognition finished (submit the transcript here)
 * - onError(errorCode)   e.g. 'not-allowed', 'network', 'start-failed'
 */
export function useSpeechRecognition({ lang, onStart, onTranscript, onEnd, onError }) {
    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef(null);
    const callbacksRef = useRef({});
    callbacksRef.current = { onStart, onTranscript, onEnd, onError };

    const isSupported = Boolean(getRecognitionClass());
    const speechLang = lang === 'ta' ? 'ta-IN' : 'en-IN';

    const getRecognition = useCallback(() => {
        if (recognitionRef.current) return recognitionRef.current;
        const Recognition = getRecognitionClass();
        if (!Recognition) return null;

        const recognition = new Recognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsRecording(true);
            callbacksRef.current.onStart?.();
        };
        recognition.onresult = (event) => {
            let transcript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                transcript += event.results[i][0].transcript;
            }
            callbacksRef.current.onTranscript?.(transcript);
        };
        recognition.onend = () => {
            setIsRecording(false);
            callbacksRef.current.onEnd?.();
        };
        recognition.onerror = (event) => {
            console.warn('Speech recognition error:', event.error);
            setIsRecording(false);
            callbacksRef.current.onError?.(event.error);
        };

        recognitionRef.current = recognition;
        return recognition;
    }, []);

    useEffect(() => {
        if (recognitionRef.current) recognitionRef.current.lang = speechLang;
    }, [speechLang]);

    useEffect(() => () => recognitionRef.current?.abort(), []);

    const start = useCallback(() => {
        const recognition = getRecognition();
        if (!recognition) return;
        recognition.lang = speechLang;
        try {
            recognition.start();
        } catch (err) {
            console.error('Error starting speech recognition:', err);
            callbacksRef.current.onError?.('start-failed');
        }
    }, [getRecognition, speechLang]);

    const stop = useCallback(() => {
        recognitionRef.current?.stop();
    }, []);

    return { isSupported, isRecording, start, stop };
}
