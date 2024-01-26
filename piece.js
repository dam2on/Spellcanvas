class Piece {
    constructor(guid, ownerId, name, img, size) {
        this.id = guid;
        this.owner = ownerId;
        this.name = name;
        this.size = Number(size);
        this.width = Number(size);
        this.height = Number(size);
        this.x = 0;
        this.y = 0;
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

    static fromObj(obj) {
        return new Piece(obj.guid, obj.ownerId, obj.name, obj.imgSrc, obj.size);
    }
}