class Piece {
    constructor(guid, ownerId, name, img, size) {
        this.id = guid;
        this.owner = ownerId;
        this.name = name;
        this.width = Number(size);
        this.height = Number(size);
        this.x = 0;
        this.y = 0;
        this.image = new Image();

        // load image
        let reader = new FileReader();
        reader.onload = (event) => {
            this.image.src = event.target.result;
        };
      
        reader.readAsDataURL(img);
    }
}