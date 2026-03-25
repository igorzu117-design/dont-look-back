class AudioManager {
    constructor() {
        this.ctx = null;
        this.masterGain = null;
        this.isInitialized = false;
        this.droneOsc = null;
        this.melodyTimeout = null;
        this.menuOscs = [];
        this.menuTimeout = null;
        this.menuMelodyIndex = 0;
        this.extremeTimeout = null;
    }

    init() {
        if (this.isInitialized) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            this.masterGain = this.ctx.createGain();
            this.masterGain.connect(this.ctx.destination);
            this.isInitialized = true;
        } catch (e) {
            console.error("AudioContext not supported", e);
        }
    }

    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    setVolume(enabled) {
        if (this.masterGain) {
            this.masterGain.gain.setTargetAtTime(enabled ? 1 : 0, this.ctx.currentTime, 0.1);
        }
    }

    startBackgroundDrone() {
        if (!this.ctx) return;

        // Low horror drone
        const osc = this.ctx.createOscillator();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        const droneGain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.value = 55; // Low A

        lfo.frequency.value = 0.5;
        lfoGain.gain.value = 10;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        filter.type = 'lowpass';
        filter.frequency.value = 300;
        filter.Q.value = 10;

        droneGain.gain.value = 0.05;

        osc.connect(filter);
        filter.connect(droneGain);
        droneGain.connect(this.masterGain);

        osc.start();
        lfo.start();
        this.droneOsc = osc;
    }

    stopBackgroundDrone() {
        if (this.droneOsc) {
            this.droneOsc.stop();
            this.droneOsc = null;
        }
    }

    playFootstep() {
        if (!this.ctx || this.ctx.state !== 'running') return;

        const noise = this.ctx.createBufferSource();
        const bufferSize = this.ctx.sampleRate * 0.1;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 400;

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.02, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        noise.start();
    }

    startEerieMusic() {
        if (!this.ctx) return;

        const playNote = () => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            const reverb = this.ctx.createConvolver(); // Using simple delay for now as placeholder

            const freqs = [130.81, 138.59, 155.56, 174.61, 185.00]; // Dissonant notes
            osc.frequency.setValueAtTime(freqs[Math.floor(Math.random() * freqs.length)], this.ctx.currentTime);
            osc.type = 'sine';

            gain.gain.setValueAtTime(0, this.ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.1, this.ctx.currentTime + 1);
            gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 3);

            const delay = this.ctx.createDelay();
            delay.delayTime.value = 0.5;
            const feedback = this.ctx.createGain();
            feedback.gain.value = 0.4;

            osc.connect(gain);
            gain.connect(this.masterGain);

            // Simulating reverb with delay
            gain.connect(delay);
            delay.connect(feedback);
            feedback.connect(delay);
            delay.connect(this.masterGain);

            osc.start();
            osc.stop(this.ctx.currentTime + 4);

            this.melodyTimeout = setTimeout(() => playNote(), 2000);
        };

        playNote();
    }

    stopEerieMusic() {
        if (this.melodyTimeout) {
            clearTimeout(this.melodyTimeout);
            this.melodyTimeout = null;
        }
    }

    startMenuMusic() {
        if (!this.ctx || this.menuTimeout) return;

        const playAtmosphere = () => {
            // Layer 1: Deep ambient pulse
            const pulseOsc = this.ctx.createOscillator();
            const pulseGain = this.ctx.createGain();
            pulseOsc.type = 'sine';
            pulseOsc.frequency.setValueAtTime(40, this.ctx.currentTime); // Very low E

            pulseGain.gain.setValueAtTime(0, this.ctx.currentTime);
            pulseGain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 2);
            pulseGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 4);

            pulseOsc.connect(pulseGain);
            pulseGain.connect(this.masterGain);
            pulseOsc.start();
            pulseOsc.stop(this.ctx.currentTime + 4);

            // Layer 2: Wind-like noise
            const noise = this.ctx.createBufferSource();
            const bufferSize = this.ctx.sampleRate * 4;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
            noise.buffer = buffer;

            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'lowpass';
            noiseFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
            noiseFilter.Q.setValueAtTime(5, this.ctx.currentTime);

            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0, this.ctx.currentTime);
            noiseGain.gain.linearRampToValueAtTime(0.02, this.ctx.currentTime + 2);
            noiseGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 4);

            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.masterGain);
            noise.start();

            // Layer 3: Occasional metallic "ticking" or ping
            if (Math.random() > 0.7) {
                const ping = this.ctx.createOscillator();
                const pingGain = this.ctx.createGain();
                ping.type = 'sine';
                ping.frequency.setValueAtTime(200 + Math.random() * 100, this.ctx.currentTime);

                pingGain.gain.setValueAtTime(0, this.ctx.currentTime);
                pingGain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
                pingGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 2);

                const delay = this.ctx.createDelay();
                delay.delayTime.value = 0.4;
                ping.connect(pingGain);
                pingGain.connect(delay);
                delay.connect(this.masterGain);
                ping.start();
                ping.stop(this.ctx.currentTime + 2);
            }

            // Layer 4: Ghostly Melody
            const melodyFreqs = [110, 130.81, 155.56, 123.47]; // A2, C3, Eb3, B2
            const note = melodyFreqs[this.menuMelodyIndex % melodyFreqs.length];
            this.menuMelodyIndex++;

            const osc = this.ctx.createOscillator();
            const oscGain = this.ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note, this.ctx.currentTime);

            const vibrato = this.ctx.createOscillator();
            const vibratoGain = this.ctx.createGain();
            vibrato.frequency.value = 3;
            vibratoGain.gain.value = 2;
            vibrato.connect(vibratoGain);
            vibratoGain.connect(osc.frequency);
            vibrato.start();

            oscGain.gain.setValueAtTime(0, this.ctx.currentTime);
            oscGain.gain.linearRampToValueAtTime(0.06, this.ctx.currentTime + 1);
            oscGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 3);

            const mDelay = this.ctx.createDelay();
            mDelay.delayTime.value = 0.5;
            const mFeedback = this.ctx.createGain();
            mFeedback.gain.value = 0.3;

            osc.connect(oscGain);
            oscGain.connect(this.masterGain);
            oscGain.connect(mDelay);
            mDelay.connect(mFeedback);
            mFeedback.connect(mDelay);
            mDelay.connect(this.masterGain);

            osc.start();
            osc.stop(this.ctx.currentTime + 3);
            vibrato.stop(this.ctx.currentTime + 3);

            this.menuTimeout = setTimeout(() => playAtmosphere(), 3500);
        };

        playAtmosphere();
    }

    stopMenuMusic() {
        if (this.menuTimeout) {
            clearTimeout(this.menuTimeout);
            this.menuTimeout = null;
        }
    }

    playUISound() {
        if (!this.ctx || this.ctx.state !== 'running') return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.1);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.1);
    }

    startExtremeMusic(withBeat = false) {
        if (!this.ctx) return;
        this.stopExtremeMusic(); // Ensure old one is stopped

        const playLayer = (freq, startTime, duration, vol) => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, startTime);
            g.gain.setValueAtTime(0, startTime);
            g.gain.linearRampToValueAtTime(vol, startTime + 0.5);
            g.gain.linearRampToValueAtTime(0, startTime + duration);

            const filter = this.ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = 300;

            osc.connect(filter);
            filter.connect(g);
            g.connect(this.masterGain);
            osc.start(startTime);
            osc.stop(startTime + duration);
        };

        const sequence = () => {
            const now = this.ctx.currentTime;
            // Dissonant powerful chords
            playLayer(55, now, 2, 0.1); // A1
            playLayer(58.27, now + 0.5, 2, 0.1); // Bb1

            if (withBeat) {
                // Powerful industrial beat
                for (let i = 0; i < 4; i++) {
                    const beatTime = now + i * 0.5;
                    const kick = this.ctx.createOscillator();
                    const kG = this.ctx.createGain();
                    kick.frequency.setValueAtTime(100, beatTime);
                    kick.frequency.exponentialRampToValueAtTime(0.01, beatTime + 0.3);
                    kG.gain.setValueAtTime(0.4, beatTime);
                    kG.gain.exponentialRampToValueAtTime(0.01, beatTime + 0.3);
                    kick.connect(kG);
                    kG.connect(this.masterGain);
                    kick.start(beatTime);
                    kick.stop(beatTime + 0.3);
                }
            }
            this.extremeTimeout = setTimeout(() => sequence(), 2000);
        };
        sequence();
    }

    stopExtremeMusic() {
        if (this.extremeTimeout) {
            clearTimeout(this.extremeTimeout);
            this.extremeTimeout = null;
        }
    }

    playRoar() {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;
        [40, 60, 80].forEach(f => {
            const osc = this.ctx.createOscillator();
            const g = this.ctx.createGain();
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(f, now);
            osc.frequency.exponentialRampToValueAtTime(f / 2, now + 2);
            g.gain.setValueAtTime(0.3, now);
            g.gain.exponentialRampToValueAtTime(0.01, now + 2);
            osc.connect(g);
            g.connect(this.masterGain);
            osc.start();
            osc.stop(now + 2);
        });

        // Add noise for texture
        const noise = this.ctx.createBufferSource();
        const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        noise.buffer = buffer;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(0.1, now);
        ng.gain.exponentialRampToValueAtTime(0.01, now + 2);
        const nf = this.ctx.createBiquadFilter();
        nf.frequency.value = 1000;
        noise.connect(nf);
        nf.connect(ng);
        ng.connect(this.masterGain);
        noise.start();
    }
}

const audioManager = new AudioManager();
window.audioManager = audioManager;
