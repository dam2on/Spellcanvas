class Piece {
    constructor(guid, ownerId, name, img, size, x = 0, y = 0) {
        this.id = guid;
        this.owner = ownerId;
        this.name = name;
        this.size = Number(size);
        this.width = _gridSizeRatio * getCurrentCanvasWidth() * this.size;
        this.height = _gridSizeRatio * getCurrentCanvasWidth() * this.size;
        this.statusConditions = [];
        this.x = x;
        this.y = y;
        this.dead = false;
        this.imageUpdated = false;
        this.image = new Image();

        if (img instanceof File) {
            // load image
            let reader = new FileReader();
            reader.onload = (event) => {
                this.image.src = event.target.result;
            };
          
            reader.readAsDataURL(img);
        }
        else if (typeof(img) == 'string') {
            this.image.src = img;
        }
    }

    updateStatusConditions(statusListString) {
        this.statusConditions = statusListString.split(',');
    }

    updateSize(size = undefined) {
        if (size != null) {
            this.size = size;
        }
        this.width = _gridSizeRatio * getCurrentCanvasWidth() * this.size;
        this.height = _gridSizeRatio * getCurrentCanvasWidth() * this.size;
    }

    getX() {
        return this.x * getCurrentCanvasWidth();
    }

    getY() {
        return this.y * getCurrentCanvasHeight();
    }

    static fromObj(obj) {
        let piece = new Piece(obj.id, obj.owner, obj.name, obj.image, obj.size, obj.x, obj.y);
        piece.dead = obj.dead;
        if (obj.statusConditions != null) {
            piece.statusConditions = obj.statusConditions;
        }
        return new Promise(function(resolve, reject) {
            piece.image.onload = () => resolve(piece);
        });
    }
}