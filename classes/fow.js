class FogOfWar {
    constructor(state) {
        this.segments = [];
        this.currentSegment = null;
        this.enable = state;
        this.nextSegmentNegative = false;
    }

    static fromObj(obj) {
        const fow = new FogOfWar(obj.enable);
        fow.segments = obj.segments.map(s => FogOfWarSegment.fromObj(s));
        if (obj.currentSegment) {
            fow.currentSegment = FogOfWarSegment.fromObj(obj.currentSegment);
        }
        return fow;
    }

    toggle(state) {
        this.enable = state;
    }

    toggleEraseMode(state) {
        this.nextSegmentNegative = state;
    }

    addRawPosition(x, y) {
        if (this.currentSegment) {
            this.currentSegment.addRawPosition(x, y);
        }
    }

    addSegment(x, y) {
        this.currentSegment = new FogOfWarSegment(this.nextSegmentNegative);
        this.currentSegment.addRawPosition(x, y);
        this.segments.push(this.currentSegment);
    }

    draw(options = {}) {
        if (!this.enable) return;

        for (const s of this.segments) {
            s.draw(options);
        }
    }
}

class FogOfWarSegment {
    constructor(negative) {
        this.normalizedPositions = [];
        this.negative = negative;
        Object.defineProperty(this, 'canvas', { value: document.getElementById('canvas'), enumerable: false, writable: true });
        Object.defineProperty(this, 'ctx', { value: this.canvas.getContext('2d'), enumerable: false, writable: true });
    }
    static fromObj(obj) {
        const segment = new FogOfWarSegment(obj.negative);
        segment.normalizedPositions = obj.normalizedPositions;
        return segment;
    }

    addRawPosition(x, y) {
        this.normalizedPositions.push({
            x: x / this.canvas.width,
            y: y / this.canvas.height
        });
    }

    draw(options = {}) {
        const positions = this.#denormalizePositions();
        if (positions.length <= 1) return;
        this.ctx.beginPath();
        this.ctx.moveTo(positions[0].x, positions[0].y);

        if (this.negative) {
            // TODO: figure out how to make erase mode not erase pieces, just other fog of war (maybe separate canvas?)
            const prevLineWidth = this.ctx.lineWidth;
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.lineWidth = 60;
            for (let i = 1; i < positions.length; i++) {
                this.ctx.lineTo(positions[i].x, positions[i].y);
                this.ctx.stroke();
            }
            this.ctx.lineTo(positions[0].x, positions[0].y);
            this.ctx.closePath();
            this.ctx.lineWidth = prevLineWidth;
        } else {
            for (let i = 1; i < positions.length; i++) {
                this.ctx.lineTo(positions[i].x, positions[i].y);
            }
            // wrap around to first point
            this.ctx.lineTo(positions[0].x, positions[0].y);
            this.ctx.closePath();
            const previousFillStyle = this.ctx.fillStyle;
            this.ctx.filter = 'blur(8px)';
            this.ctx.fillStyle = options.opacity ? '#000000d0' : '#000000';
            this.ctx.fill();
            this.ctx.fillStyle = previousFillStyle;
            this.ctx.filter = 'none';
        }

        this.ctx.globalCompositeOperation = 'source-over';
    }

    #denormalizePositions() {
        const positions = [];
        for (const p of this.normalizedPositions) {
            positions.push({
                x: p.x * this.canvas.width,
                y: p.y * this.canvas.height
            })
        }
        return positions;
    }
}