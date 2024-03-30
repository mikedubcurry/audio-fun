import "./style.css";

const sequencerEl = document.querySelector("#sequencer");
const playButton = document.querySelector("#play-button");
const stopButton = document.querySelector("#stop-button");
const clearButton = document.querySelector('#clear');

const samples = {};

const notes = {
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

class Synth {
    constructor() {
        this.ctx = new AudioContext();
        this.oscs = {};
        this.preOut = new AnalyserNode(this.ctx);
        //this.osc = this.ctx.createOscillator();
        this.gain = this.ctx.createGain();
        //this.osc.connect(this.gain);
        this.preOut.connect(this.ctx.destination);
        this.gain.connect(this.preOut);
        //this.osc.start(0);
        //this.osc.type = "square";
        //this.osc.frequency.value = 440;
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
            this.oscs[note].osc.frequency.value = note / 2;
        } else {
            this.oscs[note].gain.gain.value = 0.8;
        }
        //if (note) {
        //    this.osc.frequency.value = note;
        //    this.gain.gain.value = 0.5;
        //}
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

let sequencer = null;
let synth = new Synth();

playButton.addEventListener("click", (e) => {
    if (!sequencer) sequencer = new Sequencer(samples);
    sequencer.play();
    if (sequencer.playing) {
        e.target.innerText = "Pause";
    } else {
        e.target.innerText = "Play";
    }
    draw();
    sequencerEl.innerHTML = renderList(
        sequencer.steps.map((step, i) => renderStep(step, i))
    );
});

stopButton.addEventListener("click", (e) => {
    if (sequencer) {
        sequencer.kill();
        sequencer = null;
        playButton.innerHTML = "Play";
    }
});

clearButton.addEventListener('click', e => {
    sequencerEl.innerHTML = renderList(
        Array.from(Array(16)).map(_ => {
            return { notes: [0, 0, 0, 0] }
        }).map(renderStep))
})

async function loadSamples() {
    const files = ["kick", "snare", "closed-hat", "open-hat"];
    files.forEach(async (file) => {
        const response = await fetch(`/samples/${file}.wav`);
        const ctx = new AudioContext();
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
        samples[file] = audioBuffer;
    });
}

loadSamples();

function renderStep(step, index) {
    return `
  <div class='step'>
    ${renderList(
        step.notes.map(
            (step) => `
      <input class='step' type='checkbox' data-step='${index}' ${step ? "checked" : ""} />
      `
        )
    )}
  </div>
  `;
}

function renderList(arr) {
    return arr.join("");
}

let keys = {}

window.addEventListener('keydown', e => {
    if (notes[e.key])
        keys[e.key] = true;
    playKeys();
})

window.addEventListener('keyup', e => {
    if (notes[e.key])
        keys[e.key] = false;
    playKeys();
})

function playKeys() {
    Object.keys(keys).map(k => {
        if (keys[k] && notes[k]) {
            synth.play(notes[k]);
        } else {
            synth.stop(notes[k]);
        }
    })
}

const canvas = document.getElementById("wave");
const ctx = canvas.getContext("2d");
let w = 500;
let h = 300;
canvas.width = w;
canvas.height = h;
ctx.fill = "#000000";
ctx.fillRect(0, 0, w, h);


const arraySeq = new Uint8Array(1024);
const arraySynth = new Uint8Array(1024);
const array = new Uint8Array(1024);

let frameId = null;

function draw() {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, w, h);
    synth.getWaveForm(arraySynth);
    if (sequencer && sequencer.playing) {
        sequencer.getWaveForm(arraySeq);
    }
    // average the two arrays
    array.forEach((t, i) => {
        array[i] = (arraySeq[i] + arraySynth[i]) / 2;
    });
    // if sequencer is not playing, tween the array to 0
    if (sequencer && !sequencer.playing) {
        array.forEach((t, i) => {
            array[i] = t * 0.9;
        });
    }
    array.forEach((t, i) => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect((i * w) / 1024, (t * (h / 2)) / 128, 2, 2);
    });

    frameId = requestAnimationFrame(draw);

}
