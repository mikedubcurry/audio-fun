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

        const sources = Object.values(this.sources);

        // take N arrays of 1024 and average them 
        sources.forEach((source) => {
            let arr = new Uint8Array(1024);
            if (source.isPlaying) {
                source.getWaveForm(arr);
            } else {
                arr.fill(128);
            }

            arr.forEach((t, i) => {
                if (t !== 0)
                    this.array[i] = (this.array[i] + t) / 2
            });
        })

        this.array.forEach((t, i) => {
            this.ctx.fillStyle = "green";
            this.ctx.fillRect((i * this.w) / 1024, (t * (this.h / 2)) / 128, 2, 2);
        });

        this.frameId = requestAnimationFrame(this.draw);

    }

}
