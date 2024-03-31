export class Synth {
    constructor() {
        this.ctx = new AudioContext();
        this.oscs = {};
        this.preOut = new AnalyserNode(this.ctx);
        this.gain = this.ctx.createGain();
        this.preOut.connect(this.ctx.destination);
        this.gain.connect(this.preOut);
        this.gain.gain.value = 1;
        this.isPlaying = false;
    }

    play(note) {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        if (!this.oscs[note]) {
            this.oscs[note] = {}
            this.oscs[note].osc = this.ctx.createOscillator();
            this.oscs[note].gain = this.ctx.createGain();
            this.oscs[note].filter = this.ctx.createBiquadFilter({
                type: "lowpass",
                frequency: 1000,
            });
            this.oscs[note].gain.gain.value = 0.8;
            this.oscs[note].gain.connect(this.gain);
            this.oscs[note].osc.connect(this.oscs[note].filter);
            this.oscs[note].filter.connect(this.oscs[note].gain);
            this.oscs[note].osc.start(0);
            this.oscs[note].osc.type = "sawtooth";
            this.oscs[note].osc.frequency.value = note / 4;
        } else {
            this.oscs[note].gain.gain.value = 0.6;
        }
        this.isPlaying = true;
    }

    stop(note) {
        if (this.oscs[note]) {
            this.oscs[note].gain.gain.value = 0;
        }
        if(Object.values(this.oscs).every(osc => osc.gain.gain.value === 0)) {
            this.isPlaying = false;
        }
    }

    getWaveForm(arr) {
        return this.preOut.getByteTimeDomainData(arr);
    }
}
