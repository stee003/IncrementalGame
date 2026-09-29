/**
 * Astral Foundry - Procedural Audio Synthesizer
 * Uses Web Audio API to generate high quality, atmospheric cosmic-industrial
 * sounds without requiring external copyrighted audio assets.
 * Silently fails or falls back if AudioContext is unavailable or blocked.
 */

class AudioSynthesizer {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.muted = false;
        this.volume = 0.5;
        this.initialized = false;
    }

    /**
     * Lazily initialize Web Audio context on first user interaction
     */
    init() {
        if (this.initialized) return;
        try {
            if (typeof window === 'undefined') return;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (AudioContext) {
                this.ctx = new AudioContext();
                this.masterGain = this.ctx.createGain();
                this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
                this.masterGain.connect(this.ctx.destination);
                this.initialized = true;
            }
        } catch (e) {
            console.warn('AudioContext not supported or blocked:', e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume().catch(() => {});
        }
    }

    setMuted(muted) {
        this.muted = muted;
        if (this.masterGain && this.ctx) {
            this.masterGain.gain.setValueAtTime(this.muted ? 0 : this.volume, this.ctx.currentTime);
        }
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        if (this.masterGain && this.ctx && !this.muted) {
            this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
        }
    }

    /**
     * Play a soft crystalline chime when harvesting/clicking the Aether Core
     */
    playClickSound() {
        if (this.muted) return;
        this.init();
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        // Pentatonic frequencies for pleasant melodic variety
        const pitches = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
        const freq = pitches[Math.floor(Math.random() * pitches.length)];

        // Sine oscillator for pure crystal tone
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.exponentialRampToValueAtTime(freq * 1.05, now + 0.12);

        // Envelope
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.25);
    }

    /**
     * Play a deep metallic/industrial resonance sound on building purchase
     */
    playBuildingSound() {
        if (this.muted) return;
        this.init();
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Sub bass oscillator
        const oscBass = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        oscBass.type = 'triangle';
        oscBass.frequency.setValueAtTime(130, now);
        oscBass.frequency.exponentialRampToValueAtTime(45, now + 0.35);

        bassGain.gain.setValueAtTime(0.25, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

        oscBass.connect(bassGain);
        bassGain.connect(this.masterGain);

        // Metallic ring
        const oscRing = this.ctx.createOscillator();
        const ringGain = this.ctx.createGain();
        oscRing.type = 'sine';
        oscRing.frequency.setValueAtTime(440, now);
        oscRing.frequency.exponentialRampToValueAtTime(220, now + 0.2);

        ringGain.gain.setValueAtTime(0.12, now);
        ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        oscRing.connect(ringGain);
        ringGain.connect(this.masterGain);

        oscBass.start(now);
        oscBass.stop(now + 0.38);
        oscRing.start(now);
        oscRing.stop(now + 0.22);
    }

    /**
     * Play an ascending crystalline triad on upgrade purchase
     */
    playUpgradeSound() {
        if (this.muted) return;
        this.init();
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [440, 554.37, 659.25]; // A major triad

        notes.forEach((freq, idx) => {
            const startTime = now + idx * 0.06;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0.001, startTime);
            gain.gain.linearRampToValueAtTime(0.14, startTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.35);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc.stop(startTime + 0.38);
        });
    }

    /**
     * Play an ethereal celestial bell on research completion
     */
    playResearchSound() {
        if (this.muted) return;
        this.init();
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const notes = [587.33, 739.99, 880.00, 1174.66]; // D maj7 arpeggio

        notes.forEach((freq, idx) => {
            const startTime = now + idx * 0.08;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, startTime);

            gain.gain.setValueAtTime(0.001, startTime);
            gain.gain.linearRampToValueAtTime(0.16, startTime + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.55);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(startTime);
            osc.stop(startTime + 0.6);
        });
    }

    /**
     * Play a triumphant resonant chord on milestone achievement
     */
    playMilestoneSound() {
        if (this.muted) return;
        this.init();
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const chord = [261.63, 392.00, 523.25, 659.25, 783.99]; // C major 9th spread

        chord.forEach(freq => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(freq, now);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.12, now + 0.06);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);

            osc.connect(gain);
            gain.connect(this.masterGain);

            osc.start(now);
            osc.stop(now + 1.25);
        });
    }

    /**
     * Play a cosmic swell / deep gong on Ascension
     */
    playAscensionSound() {
        if (this.muted) return;
        this.init();
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;

        // Deep drone
        const bass = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bass.type = 'sawtooth';
        bass.frequency.setValueAtTime(65.41, now); // C2
        bass.frequency.exponentialRampToValueAtTime(130.81, now + 2.0);

        bassGain.gain.setValueAtTime(0.001, now);
        bassGain.gain.linearRampToValueAtTime(0.2, now + 0.5);
        bassGain.gain.exponentialRampToValueAtTime(0.0001, now + 3.0);

        // Low pass filter for warm cosmic rumble
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(300, now);
        filter.frequency.exponentialRampToValueAtTime(1200, now + 1.8);

        bass.connect(filter);
        filter.connect(bassGain);
        bassGain.connect(this.masterGain);

        bass.start(now);
        bass.stop(now + 3.2);

        // High ethereal shimmer chord
        [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, idx) => {
            const startTime = now + 0.4 + idx * 0.15;
            const shimmer = this.ctx.createOscillator();
            const sGain = this.ctx.createGain();
            shimmer.type = 'sine';
            shimmer.frequency.setValueAtTime(freq, startTime);

            sGain.gain.setValueAtTime(0.001, startTime);
            sGain.gain.linearRampToValueAtTime(0.15, startTime + 0.1);
            sGain.gain.exponentialRampToValueAtTime(0.0001, startTime + 2.5);

            shimmer.connect(sGain);
            sGain.connect(this.masterGain);

            shimmer.start(startTime);
            shimmer.stop(startTime + 2.6);
        });
    }

    /**
     * Play quick surge sound
     */
    playSurgeSound() {
        if (this.muted) return;
        this.init();
        this.resume();
        if (!this.ctx) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.3);

        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start(now);
        osc.stop(now + 0.5);
    }
}

export const audio = new AudioSynthesizer();
