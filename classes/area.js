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
        this.contrastColor = invertColor(this.color);
        this.opacity = 180;
        Object.defineProperty(this, 'path', { value: null, enumerable: false, writable: true });
    }

    static fromObj(obj) {
        const area = new Area(obj.id, obj.owner, obj.type, obj.size, obj.x, obj.y);
        area.rotation = obj.rotation;
        area.color = obj.color;
        area.contrastColor = obj.contrastColor;
        area.opacity = obj.opacity;
        area.origin = obj.origin;
        return area;
    }

    intersects(x, y) {
        return this.ctx.isPointInPath(this.path, x, y);
    }

    draw(options = {}) {
        if (options.width == null && options.height == null) {
            this.updateSize();
        }
        else {
            this.width = options.width;
            this.height = options.height;
        }
        const currentFillStyle = this.ctx.fillStyle;
        const currentStrokeStyle = this.ctx.strokeStyle;
        const currentLineWidth = this.ctx.lineWidth;

        if (options.backdrop) {
            this.ctx.fillStyle = options.backdrop;
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }

        this.path = new Path2D();
        this.ctx.fillStyle = this.color + Number(this.opacity).toString(16);
        this.ctx.strokeStyle = options.strokeStyle ?? this.ctx.fillStyle;
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
                const ratio = (CURRENT_SCENE.gridRatio.x * this.canvas.width) / (CURRENT_SCENE.gridRatio.y * this.canvas.height);
                const horizontalAngle = (.9236) / ratio // weighted 53 degree angle
                const verticalAngle = (.9236) * ratio;
                const halfway = Math.abs(verticalAngle - horizontalAngle) / 2;
                const coneAngle = (horizontalAngle + halfway) - halfway * Math.cos(2 * this.rotation)
                this.path.moveTo(coords.x, coords.y);
                this.path.arc(coords.x, coords.y, this.width, this.rotation - coneAngle / 2, this.rotation + coneAngle / 2);
                this.path.lineTo(coords.x, coords.y);
                break;
            case AreaType.Square:
                this.path.rect(coords.x - (this.width / 2), coords.y - (this.height / 2), this.width, this.height);
                break;
            default:
                console.warn("area type not recognized: " + type);
                break;
        }
        this.ctx.fill(this.path);

        if (options.border) {
            this.ctx.strokeStyle = options.border;
            if (!!options.borderWidth) {
                this.ctx.lineWidth = options.borderWidth;
            }
            this.ctx.stroke(this.path);
        }

        if (options.trailColor != null && this.origin != undefined) {
            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = options.trailColor;
            this.ctx.fillStyle = options.trailColor;
            this.ctx.beginPath();
            this.ctx.moveTo(this.getX(), this.getY());
            this.ctx.lineTo(this.getOriginX(), this.getOriginY());
            this.ctx.stroke();
            this.ctx.beginPath();
            const trailHeadRadius = Math.max(3, this.canvas.width * 0.004);
            this.ctx.arc(this.getOriginX(), this.getOriginY(), trailHeadRadius, 0, 2 * Math.PI);
            this.ctx.fill();
        }

        this.ctx.lineWidth = currentLineWidth;
        this.ctx.fillStyle = currentFillStyle;
        this.ctx.strokeStyle = currentStrokeStyle;
    }

    updateSize(size = undefined) {
        if (size != undefined) {
            this.size = Number(size);
        }
        const baseWidth = CURRENT_SCENE.gridRatio.x * this.canvas.width;
        const widthHeightDiff = (baseWidth - CURRENT_SCENE.gridRatio.y * this.canvas.height) / 2;
        switch (this.type) {
            case AreaType.Line:
                this.width = CURRENT_SCENE.gridRatio.x * this.canvas.width * this.size / CURRENT_SCENE.gridRatio.feetPerGrid;
                this.height = CURRENT_SCENE.gridRatio.y * this.canvas.height;
                if (widthHeightDiff != 0) {
                    this.width = (this.size / CURRENT_SCENE.gridRatio.feetPerGrid) * ((baseWidth - widthHeightDiff) + widthHeightDiff * Math.cos(2 * this.rotation));
                    this.height = (baseWidth - widthHeightDiff) - widthHeightDiff * Math.cos(2 * this.rotation);
                }
                break;
            case AreaType.Circle:
                this.width = CURRENT_SCENE.gridRatio.x * this.canvas.width * this.size / (2 * CURRENT_SCENE.gridRatio.feetPerGrid);
                this.height = CURRENT_SCENE.gridRatio.y * this.canvas.height * this.size / (2 * CURRENT_SCENE.gridRatio.feetPerGrid);
                break;
            case AreaType.Cone:
                this.width = CURRENT_SCENE.gridRatio.x * this.canvas.width * this.size / CURRENT_SCENE.gridRatio.feetPerGrid;
                if (widthHeightDiff != 0) {
                    this.width = (this.size / CURRENT_SCENE.gridRatio.feetPerGrid) * ((baseWidth - widthHeightDiff) + widthHeightDiff * Math.cos(2 * this.rotation));
                }
                this.height = this.width; // only for intersection logic
                break;
            case AreaType.Square:
                this.width = CURRENT_SCENE.gridRatio.x * this.canvas.width * this.size / CURRENT_SCENE.gridRatio.feetPerGrid;
                this.height = CURRENT_SCENE.gridRatio.y * this.canvas.height * this.size / CURRENT_SCENE.gridRatio.feetPerGrid;
                break;
            default:
                console.warn("area type not recognized: " + type);
                break;
        }
    }
}