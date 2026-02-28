/**
 * Audio Controller
 * Handles all sound effects using Web Audio API
 */

const AudioController = {
    ctx: null,
    enabled: false,
    beeps: true,
    initialized: false,

    /**
     * Initialize audio context on first user interaction
     */
    init() {
        const startAudio = () => {
            if (!this.ctx) {
                this.ctx = new (window.AudioContext || window.webkitAudioContext)();
            }
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            this.initialized = true;
        };

        // Wait for user interaction to start audio context
        document.addEventListener('click', startAudio, { once: true });
        document.addEventListener('keydown', startAudio, { once: true });
    },

    /**
     * Play a tone with given frequency and duration
     */
    playTone(frequency = 800, duration = 0.08, type = 'sine') {
        if (!this.enabled || !this.ctx) return;

        try {
            const oscillator = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();

            oscillator.type = type;
            oscillator.frequency.value = frequency;

            gainNode.gain.value = 0.1;
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + duration);

            oscillator.connect(gainNode);
            gainNode.connect(this.ctx.destination);

            oscillator.start();
            oscillator.stop(this.ctx.currentTime + duration);
        } catch (e) {
            console.warn('Audio play failed:', e);
        }
    },

    /**
     * Standard terminal beep
     */
    beep() {
        if (!this.beeps) return;
        this.playTone(800, 0.08);
    },

    /**
     * Error sound - lower pitch, longer
     */
    error() {
        if (!this.enabled) return;
        this.playTone(300, 0.2, 'sawtooth');
    },

    /**
     * Success sound - ascending tones
     */
    success() {
        if (!this.enabled) return;
        this.playTone(600, 0.08);
        setTimeout(() => this.playTone(900, 0.15), 80);
    },

    /**
     * Alert sound - double beep
     */
    alert() {
        if (!this.enabled) return;
        this.playTone(1200, 0.1);
        setTimeout(() => this.playTone(1200, 0.1), 150);
    },

    /**
     * Critical alert - urgent low tones
     */
    critical() {
        if (!this.enabled) return;
        for (let i = 0; i < 3; i++) {
            setTimeout(() => this.playTone(200, 0.3, 'sawtooth'), i * 200);
        }
    },

    /**
     * Toggle audio on/off
     */
    toggle() {
        this.enabled = !this.enabled;
        if (this.enabled && this.ctx) {
            this.success();
        }
        return this.enabled;
    },

    /**
     * Set audio state explicitly
     */
    setEnabled(state) {
        this.enabled = state;
    }
};

// Auto-initialize when script loads
AudioController.init();
