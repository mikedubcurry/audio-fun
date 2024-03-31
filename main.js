import "./style.css";

class App {
    constructor() {
        this.sequencer = null;
        this.synth = new Synth();
        this.samples = {};
        this.canvas = document.getElementById("wave");
        this.ctx = this.canvas.getContext('2d')
        this.w = 500;
        this.h = 300;
        this.canvas.width = this.w;
        this.canvas.height = this.h;
        this.ctx.fill = "#000000";
        this.ctx.fillRect(0, 0, this.w, this.h);
        this.frameId = null
        this.keys = {}
        this.notes = {
            z: 261.63,
            s: 277.18,
            x: 293.66,
            d: 311.13,
            c: 329.63,
            v: 349.23,
            g: 369.99,
            b: 392.00,
            h: 415.30,
            n: 440.00,
            j: 466.16,
            m: 493.88,
            ",": 523.25,
        }
        this.arraySeq = new Uint8Array(1024);
        this.arraySynth = new Uint8Array(1024);
        this.array = new Uint8Array(1024);

        const playButton = document.querySelector("#play-button");
        const sequencerEl = document.querySelector("#sequencer");
        const stopButton = document.querySelector("#stop-button");
        const clearButton = document.querySelector('#clear');

        this.draw = this.draw.bind(this)

        playButton.addEventListener("click", (e) => {
            if (!this.sequencer) this.sequencer = new Sequencer(this.samples);
            this.sequencer.play();
            if (this.sequencer.playing) {
                e.target.innerText = "Pause";
            } else {
                e.target.innerText = "Play";
            }
            this.draw();
            sequencerEl.innerHTML = this.renderList(
                this.sequencer.steps.map((step, i) => this.renderStep(step, i))
            );
        });

        stopButton.addEventListener("click", (e) => {
            if (this.sequencer) {
                this.sequencer.kill();
                this.sequencer = null;
                playButton.innerHTML = "Play";
            }
        });

        clearButton.addEventListener('click', e => {
            sequencerEl.innerHTML = this.renderList(
                Array.from(Array(16)).map(_ => {
                    return { notes: [0, 0, 0, 0] }
                }).map(renderStep))
        })

        window.addEventListener('keydown', e => {
            if (this.notes[e.key])
                this.keys[e.key] = true;
            this.playKeys();
        })

        window.addEventListener('keyup', e => {
            if (this.notes[e.key])
                this.keys[e.key] = false;
            this.playKeys();
        })

        this.loadSamples().then(() => {
            this.sequencer = new Sequencer(this.samples)
        })
    }

    async loadSamples() {
        const files = ["kick", "snare", "closed-hat", "open-hat"];
        files.forEach(async (file) => {
            const response = await fetch(`/samples/${file}.wav`);
            const ctx = new AudioContext();
            const arrayBuffer = await response.arrayBuffer();
            const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

            this.samples[file] = audioBuffer;
        });
    }

    renderStep(step, index) {
        return `
            <div class='step'>
            ${this.renderList(
            step.notes.map((step) => `<input class='step' type='checkbox' data-step='${index}' ${step ? "checked" : ""} />`))}
            </div>
            `;
    }

    renderList(arr) {
        return arr.join("");
    }

    draw() {
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(0, 0, this.w, this.h);
        this.synth.getWaveForm(this.arraySynth);
        if (this.sequencer && this.sequencer.playing) {
            this.sequencer.getWaveForm(this.arraySeq);
        }
        // average the two arrays
        this.array.forEach((t, i) => {
            this.array[i] = (this.arraySeq[i] + this.arraySynth[i]) / 2;
        });
        // if sequencer is not playing, tween the array to 0
        if (this.sequencer && !this.sequencer.playing) {
            this.array.forEach((t, i) => {
                this.array[i] = t * 0.9;
            });
        }
        this.array.forEach((t, i) => {
            this.ctx.fillStyle = "#ffffff";
            this.ctx.fillRect((i * this.w) / 1024, (t * (this.h / 2)) / 128, 2, 2);
        });

        this.frameId = requestAnimationFrame(this.draw);

    }
    playKeys() {
        Object.keys(this.keys).map(k => {
            if (this.keys[k] && this.notes[k]) {
                this.synth.play(this.notes[k]);
            } else {
                this.synth.stop(this.notes[k]);
            }
        })
    }
}

class Synth {
    constructor() {
        this.ctx = new AudioContext();
        this.oscs = {};
        this.preOut = new AnalyserNode(this.ctx);
        this.gain = this.ctx.createGain();
        this.preOut.connect(this.ctx.destination);
        this.gain.connect(this.preOut);
        this.gain.gain.value = 1;
    }

    play(note) {
        if (this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
        if (!this.oscs[note]) {
            this.oscs[note] = {}
            this.oscs[note].osc = this.ctx.createOscillator();
            this.oscs[note].gain = this.ctx.createGain();
            this.oscs[note].gain.gain.value = 0.8;
            this.oscs[note].gain.connect(this.gain);
            this.oscs[note].osc.connect(this.oscs[note].gain);
            this.oscs[note].osc.start(0);
            this.oscs[note].osc.type = "triangle";
            this.oscs[note].osc.frequency.value = note / 1;
        } else {
            this.oscs[note].gain.gain.value = 0.8;
        }
    }

    stop(note) {
        if (this.oscs[note]) {
            this.oscs[note].gain.gain.value = 0;
        }
    }

    getWaveForm(arr) {
        return this.preOut.getByteTimeDomainData(arr);
    }
}

class Sequencer {
    constructor(samples) {
        this.ctx = new AudioContext();
        this.currentNote = 0;
        this.nextNoteTime = 0.0;
        this.timerId = null;
        this.preOut = new AnalyserNode(this.ctx);
        this.preOut.connect(this.ctx.destination);
        this.sampleMap = ["kick", "snare", "closed-hat", "open-hat"];

        this.samples = samples;

        this.steps = [
            // 1
            {
                notes: [1, 0, 0, 1],
            },
            {
                notes: [0, 0, 1, 0],
            },
            {
                notes: [0, 0, 1, 0],
            },
            {
                notes: [0, 0, 1, 0],
            },
            // 2
            {
                notes: [0, 1, 0, 0],
            },
            {
                notes: [0, 0, 1, 0],
            },
            {
                notes: [0, 0, 1, 0],
            },
            {
                notes: [1, 0, 0, 0],
            },
            // 3
            {
                notes: [0, 0, 1, 0],
            },
            {
                notes: [1, 0, 0, 0],
            },
            {
                notes: [0, 0, 1, 0],
            },
            {
                notes: [0, 0, 1, 0],
            },
            // 4
            {
                notes: [0, 1, 0, 0],
            },
            {
                notes: [0, 0, 1, 0],
            },
            {
                notes: [0, 0, 1, 0],
            },
            {
                notes: [0, 0, 1, 0],
            },
        ];

        this.tempo = 170;

        this.playing = false;

        this.lookahead = 25;

        this.scheduleAheadTime = 0.1;
        this.scheduler = this.scheduler.bind(this);
    }

    play() {
        if (this.playing) {
            this.playing = false;
            this.ctx.close();
        } else {
            this.playing = true;
            this.ctx = new AudioContext();
            this.preOut = new AnalyserNode(this.ctx);
            this.preOut.connect(this.ctx.destination);
            this.nextNoteTime = 0.0;
            this.currentNote = this.currentNote === 0 ? 0 : this.currentNote - 1;
            this.scheduler();
        }
    }

    kill() {
        this.ctx.close();
    }

    playStep(time) {
        const currentStep = this.steps[this.currentNote];
        currentStep.notes.forEach((isOn, sample) => {
            if (isOn) {
                let buf = this.samples[this.sampleMap[sample]];
                const bufferNode = new AudioBufferSourceNode(this.ctx, {
                    buffer: buf,
                });
                bufferNode.connect(this.preOut);
                bufferNode.start(time);
            }
        });
    }

    getWaveForm(arr) {
        return this.preOut.getByteTimeDomainData(arr);
    }

    nextNote() {
        const secondsPerBeat = 60.0 / this.tempo / 2;

        this.nextNoteTime += secondsPerBeat;
        this.currentNote = (this.currentNote + 1) % 16;
        if (this.currentNote === 0) {
            // reload sequencer
            this.reloadSequencer();
        }
    }

    scheduleNote(beatNumber, time) {
        this.playStep(time);
    }

    scheduler() {
        while (this.nextNoteTime < this.ctx.currentTime + this.scheduleAheadTime) {
            this.scheduleNote(this.currentNote, this.nextNoteTime);
            this.nextNote();
        }
        if (this.playing) this.timerId = setTimeout(this.scheduler, this.lookahead);
    }

    reloadSequencer() {
        const steps = Array.from(document.querySelectorAll('input.step'))

            .reduce((steps, stepSample) => {
                let dataStep = stepSample.getAttribute('data-step');
                if (!steps[dataStep]) {
                    steps[dataStep] = [stepSample.checked ? 1 : 0];
                } else {
                    steps[dataStep].push(stepSample.checked ? 1 : 0);
                }
                return steps;
            }, [])
            .map(step => {
                return { notes: step }
            })
        this.steps = steps.slice()
    }
}

const app = new App()
