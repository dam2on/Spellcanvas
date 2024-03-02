class Piece {
    constructor(guid, ownerId, name, img, size, x = 0.3, y = 0.3) {
        this.id = guid;
        this.owner = ownerId;
        this.name = name;
        this.size = Number(size);
        this.width = this.size;
        this.height = this.size;
        this.conditions = [];
        this.rotation = 0;
        this.x = x;
        this.y = y;
        this.dead = false;
        this.imageUpdated = false;
        this.aura = null;
        this.objectType = this.constructor.name;
        this.lock = false;
        Object.defineProperty(this, 'canvas', { value: document.getElementById('canvas'), enumerable: false, writable: true });
        Object.defineProperty(this, 'ctx', { value: this.canvas.getContext('2d'), enumerable: false, writable: true });
        Object.defineProperty(this, 'imageEl', { value: null, enumerable: false, writable: true });
        this.updateImage(img);
    }

    static async fromObj(obj) {
        let piece = new Piece(obj.id, obj.owner, obj.name, obj.image, obj.size, obj.x, obj.y);
        piece.dead = obj.dead;
        piece.hideShadow = obj.hideShadow;
        piece.origin = obj.origin;
        piece.lock = obj.lock;
        if (obj.conditions != null) {
            piece.conditions = obj.conditions;
        }
        if (obj.aura != null) {
            piece.aura = Area.fromObj(obj.aura);
        }

        return piece;
    }

    updateConditions(conditionListStr) {
        if (conditionListStr == "") {
            this.conditions = [];
        }
        else {
            this.conditions = conditionListStr.split(',');
        }
    }

    updateSize(size = undefined) {
        if (size != null) {
            this.size = Number(size);
        }
        this.width = CURRENT_SCENE.gridRatio.x * this.canvas.width * this.size;
        this.height = CURRENT_SCENE.gridRatio.y * this.canvas.height * this.size;
    }

    updateImage(img) {
        if (img == null) return;

        return new Promise(async (resolve, reject) => {
            this.imageEl = new Image();
            if (img instanceof File) {
                this.image = await resizeImage(img, this.imageEl, 1000);
            }
            else if (typeof (img) == 'string') {
                this.image = img;
                this.imageEl.src = img;
                resolve(img);
            }
            else {
                reject();
            }
        });
    }

    getX() {
        return this.x * this.canvas.width;
    }

    getY() {
        return this.y * this.canvas.height;
    }

    getOriginX() {
        return this.origin?.x * this.canvas.width;
    }

    getOriginY() {
        return this.origin?.y * this.canvas.height;
    }

    intersects(x, y) {
        let xInts = false;
        let yInts = false;
        const shapeX = this.getX();
        const shapeY = this.getY();

        xInts = x >= shapeX && x <= (shapeX + this.width);
        if (xInts) {
            yInts = y >= shapeY && y <= (shapeY + this.height);
        }

        return xInts && yInts;
    }

    click() {
        document.getElementById('canvas').dispatchEvent(new MouseEvent('contextmenu', {
            view: window,
            buttons: 2,
            clientX: this.getX() + this.width / 2,
            clientY: this.getY() + this.height / 2
        }));
    }

    getTextDims(str) {
        const textDims = this.ctx.measureText(str);
        return {
            width: Math.ceil(textDims.width),
            top: textDims.actualBoundingBoxAscent,
            bottom: textDims.actualBoundingBoxDescent,
            height: Math.ceil(Math.abs(textDims.actualBoundingBoxAscent) + Math.abs(textDims.actualBoundingBoxDescent))
        }
    }

    getFontSizeByPiece(pieceSize) {
        const fontSizes = { name: "18px", statuses: "12px" };
        switch (pieceSize) {
            case PieceSizes.Tiny:
                fontSizes.name = "9px";
                fontSizes.statuses = "9px";
                break;
            case PieceSizes.Small:
                fontSizes.name = "10px";
                fontSizes.statuses = "9px";
                break;
            case PieceSizes.Medium:
                fontSizes.name = "12px";
                fontSizes.statuses = "10px";
                break;
            case PieceSizes.Large:
                fontSizes.name = "14px";
                fontSizes.statuses = "11px";
                break;
            case PieceSizes.Huge:
                fontSizes.name = "16px";
                fontSizes.statuses = "12px";
                break;
            case PieceSizes.Gargantuan:
                break;
            default:
                console.warn("piece size: " + pieceSize + " not recognized");
                break;
        }

        return fontSizes;
    }


    draw(options = {}) {
        this.updateSize();
        const textMargin = 3;
        const deadImage = document.getElementById("image-dead");
        const fontSize = this.getFontSizeByPiece(this.size);
        const prevStroke = this.ctx.strokeStyle;
        const prevFill = this.ctx.fillStyle;
        const prevWidth = this.ctx.lineWidth;

        if (this.aura instanceof Area) {
            this.aura.x = this.x + (this.width / (2 * this.canvas.width));
            this.aura.y = this.y + (this.height / (2 * this.canvas.height));
            this.aura.draw();
        }

        // global shadow size (color is set individually)
        this.ctx.shadowOffsetX = 3;
        this.ctx.shadowOffsetY = 3;
        this.ctx.shadowColor = this.hideShadow ? "transparent" : "#000000a0";
        this.ctx.drawImage(this.imageEl, this.getX(), this.getY(), this.width, this.height);
        this.ctx.shadowColor = "transparent";

        // dead overlay
        if (this.dead) {
            this.ctx.globalAlpha = 0.5;
            this.ctx.drawImage(deadImage, this.getX(), this.getY(), this.width, this.height);
            this.ctx.globalAlpha = 1;
        }

        this.ctx.textBaseline = "bottom";

        // add name
        if (this.name) {
            this.ctx.font = fontSize.name + " Arial";
            let nameTextDims = this.getTextDims(this.name);
            this.ctx.fillStyle = "#36454F"; // charcoal
            this.ctx.beginPath();
            this.ctx.roundRect(this.getX() - textMargin + (this.width - nameTextDims.width) / 2,
                this.getY() - textMargin - nameTextDims.height,
                nameTextDims.width + 2 * textMargin,
                nameTextDims.height + 2 * textMargin,
                3);
            this.ctx.fill();
            this.ctx.fillStyle = "#f9f9f9"; // off white
            this.ctx.fillText(this.name, this.getX() + (this.width - nameTextDims.width) / 2, this.getY());
        }

        // add conditions
        if (this.conditions.length > 0) {
            // text settings
            this.ctx.font = fontSize.statuses + " Arial";
            // use anyLetterHeight instead of this.getTextDims().height for a consistent height
            const anyLetterHeight = this.getTextDims("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ").height;

            let conditionWidths = this.conditions.map(c => {
                return {
                    text: c,
                    width: this.getTextDims(c).width + 2 * textMargin
                }
            });
            let conditionRows = [];
            let currentRow = {
                conditions: [],
                width: 0
            }
            
            // prepare a list of objects to display multiple status's per row, centered
            for (var i = 0; i < conditionWidths.length; i++) {
                if (currentRow.conditions.length > 1 && currentRow.width + conditionWidths[i].width + textMargin > this.width) {
                    conditionRows.push(currentRow);
                    currentRow = {
                        conditions: [],
                        width: 0
                    }
                }

                currentRow.conditions.push(conditionWidths[i].text);
                currentRow.width += conditionWidths[i].width;
                if (currentRow.conditions.length > 1) {
                    currentRow.width += textMargin;
                }
            }
            conditionRows.push(currentRow);

            let conX = 0;
            let conY = this.height + this.getY();
            for (var row of conditionRows) {
                conX = this.getX() + (this.width / 2) - (row.width / 2);
                for (var c of row.conditions) {
                    let currentConDims = this.getTextDims(c);
                    this.ctx.fillStyle = "#880808"; // blood red
                    this.ctx.beginPath();
                    this.ctx.roundRect(conX, conY, currentConDims.width + 2 * textMargin, anyLetterHeight + 2 * textMargin, 3);
                    this.ctx.fill();
                    this.ctx.fillStyle = "#f9f9f9"; // off white
                    this.ctx.fillText(c, conX + textMargin, conY + anyLetterHeight + textMargin);
                    conX += currentConDims.width + (3 * textMargin);
                }

                conY += anyLetterHeight + (3 * textMargin);
            }
        }

        // add trail
        if (options.trailColor != null && this.origin != undefined) {
            // use inverted aura color for trail color
            if (this.aura?.contrastColor != null) {
                options.trailColor = this.aura.contrastColor;
            }

            this.ctx.lineWidth = 2;
            this.ctx.strokeStyle = options.trailColor;
            this.ctx.fillStyle = options.trailColor;
            this.ctx.beginPath();
            this.ctx.moveTo(this.getX() + this.width / 2, this.getY() + this.height / 2);
            this.ctx.lineTo(this.getOriginX() + this.width / 2, this.getOriginY() + this.height / 2);
            this.ctx.stroke();
            this.ctx.beginPath();
            const trailHeadRadius = Math.max(3, this.canvas.width * 0.004);
            this.ctx.arc(this.getOriginX() + this.width / 2, this.getOriginY() + this.height / 2, trailHeadRadius, 0, 2 * Math.PI);
            this.ctx.fill();

        }

        // add border
        if (options.border) {
            this.ctx.lineWidth = 4;
            this.ctx.strokeStyle = "#FFEA00";
            this.ctx.beginPath();
            this.ctx.moveTo(this.getX(), this.getY());
            this.ctx.lineTo(this.getX() + this.width, this.getY());
            this.ctx.lineTo(this.getX() + this.width, this.getY() + this.height);
            this.ctx.lineTo(this.getX(), this.getY() + this.height);
            this.ctx.lineTo(this.getX(), this.getY());
            this.ctx.lineTo(this.getX() + this.width, this.getY());
            this.ctx.stroke();
        }

        this.ctx.strokeStyle = prevStroke;
        this.ctx.fillStyle = prevFill;
        this.ctx.lineWidth = prevWidth;
    }
}