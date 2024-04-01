import "./style.css";
import { Sequencer } from "./sequencer";
import { Synth } from "./synth";
import { Visualizer } from "./visualizer";

class App {
    constructor() {
        this.visualizer = new Visualizer(document.getElementById("wave"));
        this.sequencer = null;
        this.synth = new Synth();
        this.samples = {};
        //this.canvas = document.getElementById("wave");
        //this.ctx = this.canvas.getContext('2d')
        //this.w = 500;
        //this.h = 300;
        //this.canvas.width = this.w;
        //this.canvas.height = this.h;
        //this.ctx.fill = "#000000";
        //this.ctx.fillRect(0, 0, this.w, this.h);
        //this.frameId = null
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
        this.visualizerActive = false;
        this.arraySeq = new Uint8Array(1024);
        this.arraySynth = new Uint8Array(1024);
        this.array = new Uint8Array(1024);
        this.visualizer.addSource('synth', this.synth);

        const playButton = document.querySelector("#play-button");
        const stopButton = document.querySelector("#stop-button");
        const clearButton = document.querySelector('#clear');

        this.draw = this.draw.bind(this)
        this.renderStep = this.renderStep.bind(this)

        playButton.addEventListener("click", (e) => {
            if (!this.sequencer) {
                const steps = Array.from(document.querySelectorAll('input.step-btn'))
                    .map(step => step.checked)
                    .reduce((steps, step, i) => {
                        if (i % 4 === 0) {
                            steps.push([step])
                        } else {
                            steps[steps.length - 1].push(step)
                        }
                        return steps
                    }, [])
                    .map(step => {
                        return { notes: step }
                    })

                this.sequencer = new Sequencer(this.samples, steps);
                this.visualizer.addSource('seq', this.sequencer);
                this.sequencer.handleStepChange();
            }
            this.sequencer.play();
            if (this.sequencer.isPlaying) {
                e.target.innerText = "Pause";
            } else {
                e.target.innerText = "Play";
            }
            if (!this.visualizerActive) {
                this.visualizer.draw();
                this.visualizerActive = true;
            }
        });

        stopButton.addEventListener("click", (e) => {
            if (this.sequencer) {
                this.sequencer.kill();
                this.sequencer = null;

                playButton.innerHTML = "Play";
            }
        });

        clearButton.addEventListener('click', e => {
            this.renderSequencer(true);
        })

        window.addEventListener('keydown', e => {
            if (this.notes[e.key])
                this.keys[e.key] = true;
            this.playKeys();
            if (!this.visualizerActive) {
                this.visualizer.draw();
                this.visualizerActive = true;
            }
        })

        window.addEventListener('keyup', e => {
            if (this.notes[e.key])
                this.keys[e.key] = false;
            this.playKeys();
        })

        this.loadSamples().then(() => {
            this.sequencer = new Sequencer(this.samples)
            this.visualizer.addSource('seq', this.sequencer);
            this.renderSequencer();
            this.sequencer.handleStepChange();
            if (!this.visualizerActive) {
                this.visualizer.draw();
                this.visualizerActive = true;
            }


        })
    }

    renderSequencer(clear) {
        const sequencerEl = document.querySelector("#sequencer");
        sequencerEl.innerHTML = this.renderList(
            clear ?
                Array.from(Array(16)).map(_ => {
                    return { notes: [0, 0, 0, 0] }
                }).map(this.renderStep)
                : this.sequencer.steps.map((step, i) => this.renderStep(step, i))
        );
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
            step.notes.map((step) => `<input class='step-btn' type='checkbox' data-step='${index}' ${step ? "checked" : ""} />`))}
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

        if (this.sequencer) {
            this.sequencer.getWaveForm(this.arraySeq);
        }
        // average the two arrays
        this.array.forEach((_, i) => {
            this.array[i] = (this.arraySeq[i] + this.arraySynth[i]) / 2;
        });

        if (this.sequencer && !this.sequencer.playing) {
            this.array.forEach((t, i) => {
                if (t > 127) {
                    this.array[i] = t - 2;
                }
                if (t < 127) {
                    this.array[i] = t + 2;
                }
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



const app = new App()
