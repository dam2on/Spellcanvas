class Area extends Piece {
    constructor(id, owner, type, size, x = 0, y = 0) {
        super(id, owner, "", null, size, x, y);
        this.id = id;
        this.owner = owner;
        this.type = type;
        this.x = x;
        this.y = y;
        this.rotation = 0;
        this.color = "#ffeeaa";
        this.opacity = 180;
        Object.defineProperty(this, 'path', { value: null, enumerable: false, writable: true });
    }

    static fromObj(obj) {
        const area = new Area(obj.id, obj.owner, obj.type, obj.size, obj.x, obj.y);
        area.rotation = obj.rotation;
        area.color = obj.color;
        area.opacity = obj.opacity;
        area.origin = obj.origin;
        return area;
    }

    intersects(x,y) {
        return this.ctx.isPointInPath(this.path, x, y);
    }

    draw(trailColor = null) {
        this.updateSize();
        const currentFillStyle = this.ctx.fillStyle;
        const currentStrokeStyle = this.ctx.strokeStyle;
        this.path = new Path2D();
        this.ctx.fillStyle = this.color + Number(this.opacity).toString(16);
        this.ctx.strokeStyle = this.ctx.fillStyle;
        const coords = {
            x: this.getX(),
            y: this.getY()
        }

        switch (this.type) {
            case AreaType.Line:
                // is actually a rectangle with a thickness of 1 grid, center is middle of short side
                this.path.moveTo(coords.x, coords.y);
                this.path.lineTo(coords.x + this.height * -Math.sin(this.rotation) / 2, coords.y + this.height * Math.cos(this.rotation) / 2);
                this.path.lineTo(coords.x + this.height * -Math.sin(this.rotation) / 2 + this.width * Math.cos(this.rotation), coords.y + this.height * Math.cos(this.rotation) / 2 + this.width * Math.sin(this.rotation));
                this.path.lineTo(coords.x - this.height * -Math.sin(this.rotation) / 2 + this.width * Math.cos(this.rotation), coords.y - this.height * Math.cos(this.rotation) / 2 + this.width * Math.sin(this.rotation));
                this.path.lineTo(coords.x - this.height * -Math.sin(this.rotation) / 2, coords.y - this.height * Math.cos(this.rotation) / 2);
                this.path.lineTo(coords.x, coords.y);
                break;
            case AreaType.Circle:
                // you can rotate this by adding this.rotation, but i dont think it actually makes sense to do that
                this.path.ellipse(coords.x, coords.y, this.width, this.height, 0, 0, 2 * Math.PI);
                break;
            case AreaType.Cone:
                const coneAngle = (1 - Math.abs((1 - CURRENT_SCENE.gridRatio.y / CURRENT_SCENE.gridRatio.x) * Math.cos(this.rotation))) * Math.PI * 1 / 3.39622641509; // <= 53 degrees

                this.path.moveTo(coords.x, coords.y);
                this.path.arc(coords.x, coords.y, this.width, this.rotation - coneAngle / 2, this.rotation + coneAngle / 2);
                this.path.lineTo(coords.x, coords.y);

                this.ctx.stroke(this.path);
                break;
            case AreaType.Square:
                this.path.rect(coords.x - (this.width / 2), coords.y - (this.height / 2), this.width, this.height);
                break;
            default:
                console.warn("area type not recognized: " + type);
                break;
        }
        this.ctx.fill(this.path);

        if (trailColor != null && this.origin != undefined) {
            const prevWidth = this.ctx.lineWidth;
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = trailColor;
            this.ctx.fillStyle = trailColor;
            this.ctx.beginPath();
            this.ctx.moveTo(this.getX(), this.getY());
            this.ctx.lineTo(this.getOriginX(), this.getOriginY());
            this.ctx.stroke();
            this.ctx.beginPath();
            const trailHeadRadius = Math.max(3, this.canvas.width * 0.0045);
            this.ctx.arc(this.getOriginX(), this.getOriginY(), trailHeadRadius, 0, 2 * Math.PI);
            this.ctx.fill();
            this.ctx.lineWidth = prevWidth;
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
                this.height = this.width; // only for intersection logic
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