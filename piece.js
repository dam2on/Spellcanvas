class Piece {
    constructor(guid, ownerId, name, img, size, x = 0.3, y = 0.3) {
        this.id = guid;
        this.owner = ownerId;
        this.name = name;
        this.size = Number(size);
        this.width = _gridSizeRatio * getCurrentCanvasWidth() * this.size;
        this.height = _gridSizeRatio * getCurrentCanvasWidth() * this.size;
        this.conditions = [];
        this.rotation = 0;
        this.x = x;
        this.y = y;
        this.dead = false;
        this.imageUpdated = false;
        this.updateImage(img);
    }

    updateConditions(statusListString) {
        if (statusListString == "") {
            this.conditions = [];
        }
        else {
            this.conditions = statusListString.split(',');
        }
    }

    updateSize(size = undefined) {
        if (size != null) {
            this.size = Number(size);
        }
        this.width = _gridSizeRatio * getCurrentCanvasWidth() * this.size;
        this.height = _gridSizeRatio * getCurrentCanvasWidth() * this.size;
    }

    updateImage(img) {
        return new Promise((resolve, reject) => {
            if (img instanceof File) {
                this.image = new Image();
                // load image
                let reader = new FileReader();
                reader.onload = (event) => {
                    this.image.src = event.target.result;
                    resolve(event.target.result);
                };

                reader.readAsDataURL(img);
            }
            else if (typeof (img) == 'string') {
                this.image = new Image();
                this.image.src = img;
                resolve(img);
            }
            else if (img instanceof Image) {
                // nothing to do
                this.image = img;
                resolve(img);
            }
        });
    }

    getX() {
        return this.x * getCurrentCanvasWidth();
    }

    getY() {
        return this.y * getCurrentCanvasHeight();
    }

    click() {
        document.getElementById('canvas').dispatchEvent(new MouseEvent('contextmenu', {
            view: window,
            buttons: 2,
            clientX: this.getX() + this.width / 2,
            clientY: this.getY() + this.height / 2
          }));
    }

    static async fromObj(obj) {
        let piece = new Piece(obj.id, obj.owner, obj.name, obj.image, obj.size, obj.x, obj.y);
        piece.dead = obj.dead;
        if (obj.conditions != null) {
            piece.conditions = obj.conditions;
        }

        return piece;
    }

    getTextDims(ctx, str) {
        const textDims = ctx.measureText(str);
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
                console.warn("piece size: " + pieceSize + " not recognized as standard size");
                break;
        }

        return fontSizes;
    }


    draw(ctx) {
        ctx.drawImage(this.image, this.getX(), this.getY(), this.width, this.height);

        // dead overlay
        if (this.dead) {
            ctx.globalAlpha = 0.5;
            ctx.drawImage(deadImage, this.getX(), this.getY(), this.width, this.height);
            ctx.globalAlpha = 1;
        }

        const fontSize = this.getFontSizeByPiece(this.size);

        // add name
        if (this.name) {
            ctx.font = fontSize.name + " Arial";
            let nameTextDims = this.getTextDims(ctx, this.name);
            ctx.fillStyle = "#36454F"; // charcoal
            ctx.beginPath();
            ctx.roundRect(this.getX() - _canvasTextMargin + (this.width - nameTextDims.width) / 2,
                this.getY() - _canvasTextMargin - nameTextDims.height,
                nameTextDims.width + 2 * _canvasTextMargin,
                nameTextDims.height + 2 * _canvasTextMargin,
                3);
            ctx.fill();
            ctx.fillStyle = "#f9f9f9"; // off white
            ctx.fillText(this.name, this.getX() + (this.width - nameTextDims.width) / 2, this.getY());
        }

        // add conditions
        if (this.conditions.length > 0) {
            ctx.font = fontSize.statuses + " Arial";
            const anyLetterHeight = this.getTextDims(ctx, "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ").height;
            let conX = this.getX();
            let conY = this.height + this.getY();
            for (var i = 0; i < this.conditions.length; i++) {
                let currentConDims = this.getTextDims(ctx, this.conditions[i]);
                if (i > 0 && (conX + currentConDims.width > this.getX() + this.width)) {
                    conY += anyLetterHeight + (3 * _canvasTextMargin);
                    conX = this.getX();
                }
                ctx.fillStyle = "#880808"; // blood red
                ctx.beginPath();
                ctx.roundRect(conX, conY, currentConDims.width + 2 * _canvasTextMargin, anyLetterHeight + 2 * _canvasTextMargin, 3);
                ctx.fill();
                ctx.fillStyle = "#f9f9f9"; // off white
                ctx.fillText(this.conditions[i], conX + _canvasTextMargin, conY + anyLetterHeight + _canvasTextMargin);
                conX += currentConDims.width + (3 * _canvasTextMargin);
            }
        }
    }
}