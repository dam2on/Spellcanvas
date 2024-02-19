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
        Object.defineProperty(this, 'canvas', {value: document.getElementById('canvas'), enumerable: false, writable: true});
        Object.defineProperty(this, 'ctx', {value: this.canvas.getContext('2d'), enumerable: false, writable: true});
        Object.defineProperty(this, 'imageEl', {value: null, enumerable: false, writable: true});
        this.updateImage(img);
    }

    static async fromObj(obj) {
        let piece = new Piece(obj.id, obj.owner, obj.name, obj.image, obj.size, obj.x, obj.y);
        piece.dead = obj.dead;
        if (obj.conditions != null) {
            piece.conditions = obj.conditions;
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
        this.height = CURRENT_SCENE.gridRatio.y * this.canvas.width * this.size;
    }

    updateImage(img) {
        return new Promise((resolve, reject) => {
            if (img instanceof File) {
                this.imageEl = new Image();
                // load image
                let reader = new FileReader();
                reader.onload = (event) => {
                    this.image = event.target.result;
                    this.imageEl.src = event.target.result;
                    resolve(event.target.result);
                };

                reader.readAsDataURL(img);
            }
            else if (typeof (img) == 'string') {
                this.image = img;
                this.imageEl = new Image();
                this.imageEl.src = img;
                resolve(img);
            }
            else if (img instanceof Image) {
                debugger;
                // nothing to do
                this.image = img;
                this.imageEl = img;
                resolve(img);
            }
        });
    }

    getX() {
        return this.x * this.canvas.width;
    }

    getY() {
        return this.y * this.canvas.height;
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


    draw() {
        this.updateSize();
        const textMargin = 3;
        const deadImage = document.getElementById("image-dead");
        const fontSize = this.getFontSizeByPiece(this.size);

        this.ctx.drawImage(this.imageEl, this.getX(), this.getY(), this.width, this.height);

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
            this.ctx.font = fontSize.statuses + " Arial";
            const anyLetterHeight = this.getTextDims("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ").height;
            let conX = this.getX();
            let conY = this.height + this.getY();
            for (var i = 0; i < this.conditions.length; i++) {
                let currentConDims = this.getTextDims(this.conditions[i]);
                if (i > 0 && (conX + currentConDims.width > this.getX() + this.width)) {
                    conY += anyLetterHeight + (3 * textMargin);
                    conX = this.getX();
                }
                this.ctx.fillStyle = "#880808"; // blood red
                this.ctx.beginPath();
                this.ctx.roundRect(conX, conY, currentConDims.width + 2 * textMargin, anyLetterHeight + 2 * textMargin, 3);
                this.ctx.fill();
                this.ctx.fillStyle = "#f9f9f9"; // off white
                this.ctx.fillText(this.conditions[i], conX + textMargin, conY + anyLetterHeight + textMargin);
                conX += currentConDims.width + (3 * textMargin);
            }
        }
    }
}