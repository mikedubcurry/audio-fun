export class Visualizer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = this.canvas.getContext('2d');
        this.w = 500;
        this.h = 300;
        this.canvas.width = this.w;
        this.canvas.height = this.h;
        this.ctx.fill = "#000000";
        this.ctx.fillRect(0, 0, this.w, this.h);
        this.frameId = null;
        this.sources = {};
        this.array = new Uint8Array(1024);

        this.draw = this.draw.bind(this);
    }

    addSource(name, source) {
        this.sources[name] = source;
    }


    draw() {
        this.ctx.fillStyle = "#000000";
        this.ctx.fillRect(0, 0, this.w, this.h);

        //        this.synth.getWaveForm(this.arraySynth);
        //
        //        if (this.sequencer) {
        //            this.sequencer.getWaveForm(this.arraySeq);
        //        }
        // average the two arrays
        //        this.array.forEach((_, i) => {
        //            this.array[i] = (this.arraySeq[i] + this.arraySynth[i]) / 2;
        //        });

        //        if (this.sequencer && !this.sequencer.playing) {
        //            this.array.forEach((t, i) => {
        //                if (t > 127) {
        //                    this.array[i] = t - 1;
        //                }
        //                if (t < 127) {
        //                    this.array[i] = t + 1;
        //                }
        //            });
        //        }
        const sources = Object.values(this.sources);

        // take N arrays of 1024 and average them 
        sources.forEach((source) => {
            let arr = new Uint8Array(1024);
            let noSignal = false;
            if (source.isPlaying)
                source.getWaveForm(arr);
            else
                noSignal = true;
            arr.forEach((t, i) => {
                if (noSignal) {
                    this.array[i] = 127
                } else
                    this.array[i] = (this.array[i] + t) / 2
            });
        })

        // take values of this.array and tween them to 127
        //this.array.forEach((t, i) => {
        //    if (t > 127) {
        //        this.array[i] = t - 1;
        //    } else if (t < 127) {
        //        this.array[i] = t + 1;
        //    }
        //})



        this.array.forEach((t, i) => {
            this.ctx.fillStyle = "#ffffff";
            this.ctx.fillRect((i * this.w) / 1024, (t * (this.h / 2)) / 128, 2, 2);
        });

        this.frameId = requestAnimationFrame(this.draw);

    }

}
