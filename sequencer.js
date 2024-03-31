export class Sequencer {
    constructor(samples, steps) {
        this.ctx = new AudioContext();
        this.currentNote = 0;
        this.nextNoteTime = 0.0;
        this.timerId = null;
        this.preOut = new AnalyserNode(this.ctx);
        this.preOut.connect(this.ctx.destination);
        this.sampleMap = ["kick", "snare", "closed-hat", "open-hat"];
        this.sampleMap = ["open-hat", "closed-hat", "snare", "kick"];

        this.samples = samples;

        // should consider making steps a class, to control the sample, volume and pitch
        this.steps = steps ? steps : [
            // 1
            {
                notes: [1, 0, 0, 1],
            },
            {
                notes: [0, 1, 0, 0],
            },
            {
                notes: [0, 1, 0, 0],
            },
            {
                notes: [0, 1, 0, 0],
            },
            // 2
            {
                notes: [0, 0, 1, 0],
            },
            {
                notes: [0, 1, 0, 0],
            },
            {
                notes: [0, 1, 0, 0],
            },
            {
                notes: [0, 0, 0, 1],
            },
            // 3
            {
                notes: [0, 1, 0, 0],
            },
            {
                notes: [0, 0, 0, 1],
            },
            {
                notes: [0, 1, 0, 0],
            },
            {
                notes: [0, 1, 0, 0],
            },
            // 4
            {
                notes: [0, 0, 1, 0],
            },
            {
                notes: [0, 1, 0, 0],
            },
            {
                notes: [0, 1, 0, 0],
            },
            {
                notes: [0, 1, 0, 0],
            },
        ];

        this.tempo = 170;

        this.isPlaying = false;

        this.lookahead = 25;

        this.scheduleAheadTime = 0.1;
        this.scheduler = this.scheduler.bind(this);
    }

    handleStepChange() {
        document.querySelectorAll('input.step-btn').forEach((step) => {
            step.addEventListener('click', e => {
                this.reloadSequencer();
            })
        })
    }


    play() {
        if (this.isPlaying) {
            this.isPlaying = false;
            this.ctx.close();
        } else {
            this.isPlaying = true;
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
        if (this.isPlaying) this.timerId = setTimeout(this.scheduler, this.lookahead);
    }

    reloadSequencer() {
        const steps = Array.from(document.querySelectorAll('input.step-btn'))

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

