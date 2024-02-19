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
                // you can rotate this by adding this.rotation, but i dont think it actually makes sense to do that
                circle.ellipse(this.x, this.y, this.width, this.height, 0, 0, 2 * Math.PI);
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
        if (size != undefined) {
            this.size = Number(size);
        }

        const heightWidthRatio = CURRENT_SCENE.gridRatio.y / CURRENT_SCENE.gridRatio.x;
        switch (this.type) {
            case AreaType.Line:
                this.width = CURRENT_SCENE.gridRatio.x * this.canvas.width * this.size;
                this.height = this.width / this.size;
                if (heightWidthRatio != 1) {
                    this.width = this.width * (1 - Math.abs((1 - heightWidthRatio) * Math.sin(this.rotation)));
                    this.height = this.height * (1 - Math.abs((1 - heightWidthRatio) * Math.cos(this.rotation)));
                }
                break;
            case AreaType.Circle:
                this.width = CURRENT_SCENE.gridRatio.x * this.canvas.width * this.size / 2;
                this.height = CURRENT_SCENE.gridRatio.y * this.canvas.width * this.size / 2;
                break;
            case AreaType.Cone:
                this.width = CURRENT_SCENE.gridRatio.x * this.canvas.width * this.size;
                if (heightWidthRatio != 1) {
                    this.width = this.width * (1 - Math.abs((1 - heightWidthRatio) * Math.sin(this.rotation)));
                }
                break;
            case AreaType.Square:
                this.width = CURRENT_SCENE.gridRatio.x * this.canvas.width * this.size;
                this.height = CURRENT_SCENE.gridRatio.y * this.canvas.width * this.size;
                break;
            default:
                console.warn("area type not recognized: " + type);
                break;
        }
    }
}