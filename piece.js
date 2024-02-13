class Piece {
    constructor(guid, ownerId, name, img, size, x = 0, y = 0) {
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
        return new Promise((resolve,reject) => {
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
            else if (typeof(img) == 'string') {
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

    static async fromObj(obj) {
        let piece = new Piece(obj.id, obj.owner, obj.name, obj.image, obj.size, obj.x, obj.y);
        piece.dead = obj.dead;
        if (obj.conditions != null) {
            piece.conditions = obj.conditions;
        }

        return piece;
    }
}