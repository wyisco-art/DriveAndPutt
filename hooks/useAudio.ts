import { useRef, useCallback, useEffect } from 'react';
import { GameState } from '../types';

export const useAudio = (gameState: GameState) => {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const engineOscillatorRef = useRef<OscillatorNode | null>(null);
    const engineGainRef = useRef<GainNode | null>(null);

    const initAudio = useCallback(() => {
        if (!audioCtxRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioCtxRef.current = new AudioContextClass();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    }, []);

    const startEngineSound = useCallback(() => {
        if (!audioCtxRef.current) return;

        // Stop existing engine if any
        if (engineOscillatorRef.current) {
            try { engineOscillatorRef.current.stop(); } catch (e) { }
            engineOscillatorRef.current.disconnect();
        }

        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.value = 60; // Idle rumble

        filter.type = 'lowpass';
        filter.frequency.value = 400; // Muffle the harsh sawtooth

        gain.gain.value = 0.05; // Quiet idle

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        engineOscillatorRef.current = osc;
        engineGainRef.current = gain;
    }, []);

    const stopEngineSound = useCallback(() => {
        if (engineOscillatorRef.current) {
            try {
                const now = audioCtxRef.current?.currentTime || 0;
                engineGainRef.current?.gain.setTargetAtTime(0, now, 0.1);
                engineOscillatorRef.current.stop(now + 0.2);
            } catch (e) { }
            engineOscillatorRef.current = null;
        }
    }, []);

    const playSound = useCallback((type: 'hit-wall' | 'hit-ball' | 'splash' | 'win' | 'putt') => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        const t = ctx.currentTime;

        if (type === 'hit-wall') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.type = 'square';
            osc.frequency.setValueAtTime(80, t);
            osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);

            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

            osc.start(t);
            osc.stop(t + 0.16);
        }
        else if (type === 'hit-ball') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            // "Wood block" style sound
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, t);
            osc.frequency.exponentialRampToValueAtTime(400, t + 0.05);

            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

            osc.start(t);
            osc.stop(t + 0.06);
        }
        else if (type === 'splash') {
            const bufferSize = ctx.sampleRate * 0.5; // 0.5 sec buffer
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, t);
            filter.frequency.linearRampToValueAtTime(200, t + 0.4);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            noise.start(t);
        }
        else if (type === 'win') {
            // Simple Arpeggio
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);

                const startTime = t + i * 0.1;
                osc.type = 'triangle';
                osc.frequency.value = freq;

                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

                osc.start(startTime);
                osc.stop(startTime + 0.5);
            });
        }
    }, []);

    const updateEngineSound = useCallback((speedRatio: number) => {
        if (engineOscillatorRef.current && engineGainRef.current && audioCtxRef.current) {
            const now = audioCtxRef.current.currentTime;
            // Modulate pitch: 60Hz idle -> 180Hz max
            const targetFreq = 60 + (speedRatio * 120);
            engineOscillatorRef.current.frequency.setTargetAtTime(targetFreq, now, 0.1);

            // Modulate volume: louder when fast
            const targetGain = 0.05 + (speedRatio * 0.05);
            engineGainRef.current.gain.setTargetAtTime(targetGain, now, 0.1);
        }
    }, []);

    // Lifecycle management
    useEffect(() => {
        if (gameState === GameState.PLAYING) {
            initAudio();
            startEngineSound();
        } else {
            stopEngineSound();
        }
        return () => stopEngineSound();
    }, [gameState, initAudio, startEngineSound, stopEngineSound]);

    return {
        playSound,
        updateEngineSound
    };
};
