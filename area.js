class Area {
    constructor(type, size) {
        this.type = type;
        this.x = 0;
        this.y = 0;
        this.rotation = 0;
        this.updateSize(size);
    }

    draw(ctx) {
        const currentFillStyle = ctx.fillStyle;
        const currentStrokeStyle = ctx.strokeStyle;
        ctx.fillStyle = "#ffeeaaC8";
        ctx.strokeStyle = "#ffeeaaC8";

        switch (this.type) {
            case AreaType.Line:
                // is actually a rectangle with a thickness of 1 grid, center is middle of short side
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x + this.height * -Math.sin(this.rotation) / 2, this.y + this.height * Math.cos(this.rotation) / 2);
                ctx.lineTo(this.x + this.height * -Math.sin(this.rotation) / 2 + this.width * Math.cos(this.rotation), this.y + this.height * Math.cos(this.rotation) / 2 + this.width * Math.sin(this.rotation));
                ctx.lineTo(this.x - this.height * -Math.sin(this.rotation) / 2 + this.width * Math.cos(this.rotation), this.y - this.height * Math.cos(this.rotation) / 2 + this.width * Math.sin(this.rotation));
                ctx.lineTo(this.x - this.height * -Math.sin(this.rotation) / 2, this.y - this.height * Math.cos(this.rotation) / 2);
                ctx.lineTo(this.x, this.y);
                ctx.fill();
                break;
            case AreaType.Circle:
                const circle = new Path2D();
                circle.arc(this.x, this.y, this.width * 2, 0, 2 * Math.PI);
                ctx.fill(circle);
                break;
            case AreaType.Cone:
                const coneAngle = Math.PI * 1 / 3.39622641509;

                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.arc(this.x, this.y, this.width, this.rotation, this.rotation + coneAngle);
                ctx.lineTo(this.x, this.y);
                ctx.stroke();
                
                // Fill
                ctx.fill();
                break;
            case AreaType.Square:
                ctx.fillRect(this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                break;
            default:
                console.warn("area type not recognized: " + type);
                break;
        }
        ctx.fillStyle = currentFillStyle;
        ctx.strokeStyle = currentStrokeStyle;
    }

    updateSize(size = undefined) {
        if (size != undefined)
            this.size = Number(size);
        switch (this.type) {
            case AreaType.Line:
                this.width = _gridSizeRatio * getCurrentCanvasWidth() * this.size;
                this.height = this.width / size;
                break;
            case AreaType.Circle:
                this.width = _gridSizeRatio * getCurrentCanvasWidth() * this.size / 2;
                break;
            case AreaType.Cone:
                this.width = _gridSizeRatio * getCurrentCanvasWidth() * this.size;
                break;
            case AreaType.Square:
                this.width = _gridSizeRatio * getCurrentCanvasWidth() * this.size;
                this.height = _gridSizeRatio * getCurrentCanvasWidth() * this.size;
                break;
            default:
                console.warn("area type not recognized: " + type);
                break;
        }
    }
}