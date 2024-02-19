class Area {
    constructor(type, size) {
        this.type = type;
        this.x = 0;
        this.y = 0;
        this.rotation = 0;
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.updateSize(size);
    }

    draw() {
        this.updateSize();
        const currentFillStyle = this.ctx.fillStyle;
        const currentStrokeStyle = this.ctx.strokeStyle;
        this.ctx.fillStyle = "#ffeeaaA5";
        this.ctx.strokeStyle = "#ffeeaaC8";
        const hr = 0.75;

        switch (this.type) {
            case AreaType.Line:
                // is actually a rectangle with a thickness of 1 grid, center is middle of short side
                this.ctx.beginPath();
                this.ctx.moveTo(this.x, this.y);
                this.ctx.lineTo(this.x + this.height * -Math.sin(this.rotation) / 2, this.y + this.height * Math.cos(this.rotation) / 2);
                this.ctx.lineTo(this.x + this.height * -Math.sin(this.rotation) / 2 + this.width * Math.cos(this.rotation), this.y + this.height * Math.cos(this.rotation) / 2 + this.width * Math.sin(this.rotation));
                this.ctx.lineTo(this.x - this.height * -Math.sin(this.rotation) / 2 + this.width * Math.cos(this.rotation), this.y - this.height * Math.cos(this.rotation) / 2 + this.width * Math.sin(this.rotation));
                this.ctx.lineTo(this.x - this.height * -Math.sin(this.rotation) / 2, this.y - this.height * Math.cos(this.rotation) / 2);
                this.ctx.lineTo(this.x, this.y);
                this.ctx.fill();
                break;
            case AreaType.Circle:
                const circle = new Path2D();
                circle.arc(this.x, this.y, this.width * 2, 0, 2 * Math.PI);
                this.ctx.fill(circle);
                break;
            case AreaType.Cone:
                const coneAngle = Math.PI * 1 / 3.39622641509; // ~ 53 degrees

                this.ctx.beginPath();
                this.ctx.moveTo(this.x, this.y);
                this.ctx.arc(this.x, this.y, this.width, this.rotation - coneAngle / 2, this.rotation + coneAngle / 2);
                this.ctx.lineTo(this.x, this.y);
                this.ctx.stroke();
                
                // Fill
                this.ctx.fill();
                break;
            case AreaType.Square:
                this.ctx.fillRect(this.x - (this.width / 2), this.y - (this.height / 2), this.width, this.height);
                break;
            default:
                console.warn("area type not recognized: " + type);
                break;
        }
        this.ctx.fillStyle = currentFillStyle;
        this.ctx.strokeStyle = currentStrokeStyle;
    }

    updateSize(size = undefined) {
        if (size != undefined)
            this.size = Number(size);
        switch (this.type) {
            case AreaType.Line:
                // 3/4 is height : width grid ratio
                this.width = CURRENT_SCENE.gridRatio * this.canvas.width * this.size;
                this.height = this.width / this.size;
                this.width = this.width * (1 - Math.abs((1-3/4) * Math.sin(this.rotation)));
                this.height = this.height * (1 - Math.abs((1-3/4) * Math.cos(this.rotation)));
                break;
            case AreaType.Circle:
                this.width = CURRENT_SCENE.gridRatio * this.canvas.width * this.size / 2;
                break;
            case AreaType.Cone:
                this.width = CURRENT_SCENE.gridRatio * this.canvas.width * this.size;
                this.width = this.width * (1 - Math.abs((1-3/4) * Math.sin(this.rotation)));
                break;
            case AreaType.Square:
                this.width = CURRENT_SCENE.gridRatio * this.canvas.width * this.size;
                this.height = CURRENT_SCENE.gridRatio * this.canvas.width * this.size;
                break;
            default:
                console.warn("area type not recognized: " + type);
                break;
        }
    }
}