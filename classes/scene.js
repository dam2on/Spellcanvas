class Scene {
    constructor(id, ownerId) {
        this.id = id;
        this.name = "My Scene";
        this.owner = ownerId;
        this.gridRatio = 0.025;
        this.pieces = [];
        this.background = new Background(BackgroundType.Image, 'img/bg.png');

        Object.defineProperty(this, 'canvas', {value: document.getElementById('canvas'), enumerable: false, writable: true});
        Object.defineProperty(this, 'ctx', {value: this.canvas.getContext('2d'), enumerable: false, writable: true});
    }

    static async load(partial) {
        if (partial == null) {
            console.warn("partial value must be provided to load scene");
            return null;
        }
        const scene = new Scene(partial.id, partial.owner);
        scene.name = partial.name;
        scene.thumbnail = partial.thumbnail;
        const piecePromises = [];
        const pieces = await localforage.getItem(`${StorageKeys.Pieces}-${scene.id}`)
        if (pieces != null) {
            for (var piece of pieces) {
                piecePromises.push(Piece.fromObj(piece));
            }
            await Promise.all(piecePromises).then((pieces) => {
                scene.pieces = pieces;
            });
        }

        const backgroundVal = await localforage.getItem(`${StorageKeys.Background}-${scene.id}`);
        if (backgroundVal != null) {
            scene.background = Background.fromObj(backgroundVal);
        }
        const gridVal = await localforage.getItem(`${StorageKeys.GridRatio}-${scene.id}`);
        if (gridVal != null) {
            scene.gridRatio = gridVal;
        }

        return scene;
    }

    static async fromObj(obj) {
        const scene = new Scene(obj.id, obj.owner);
        scene.name = obj.name;
        scene.gridRatio = obj.gridRatio;
        scene.thumbnail = obj.thumbnail;

        const piecePromises = [];
        for (var piece of obj.pieces) {
            piecePromises.push(Piece.fromObj(piece));
        }
        await Promise.all(piecePromises).then((pieces) => {
            scene.pieces = pieces;
        });

        scene.background = Background.fromObj(obj.background);
        return scene;
    }

    static updateOrCreateDom(scene) {
        const existingDom = $(`label[for="option-${scene.id}"]`);
        if (!!existingDom.length) {
            existingDom.find('div').css('background-image', `url(${scene.background.getPosterImgUrl()})`);
            existingDom.find('img').attr('src', scene.canvas.toDataURL());
            // existingDom.find('figcaption').html(scene.name);
        }
        else {
            return $(`
            <label class="col scene-label" for="option-${scene.id}">
                <input type="radio" class="btn-check" name="radio-scenes" id="option-${scene.id}">
                <div class="bg-img-cover" onclick="onChangeScene('${scene.id}')" style="background-image: url(${scene.thumbnail?.bg ?? scene.background.getPosterImgUrl()})">
                    <img style="height: 100%; width: 100%; position: relative; top: 0; left: 0;" src="${scene.thumbnail?.fg ?? scene.canvas.toDataURL()}">
                </div>
            </label>`);
        }
    }

    pureJson() {
        const piecesJson = [];
        for (var piece of this.pieces) {
            const pieceCopy = { ...piece };
            pieceCopy.image = piece.image.src;
            piecesJson.push(pieceCopy);
        }

        const sceneCopy = {
            ...this,
            pieces: piecesJson
        };

        return sceneCopy;
    }

    static async delete(id) {
        const deleteScenePartialPromise = new Promise(function (resolve, reject) {
            localforage.getItem(StorageKeys.Scenes).then(function (scenes) {
                scenes = scenes.filter(s => s.id != id);
                localforage.setItem(StorageKeys.Scenes, scenes).then(resolve);
            });
        });

        await Promise.all([deleteScenePartialPromise,
            localforage.removeItem(`${StorageKeys.Pieces}-${id}`),
            localforage.removeItem(`${StorageKeys.Pieces}-${id}`),
            localforage.removeItem(`${StorageKeys.Pieces}-${id}`)]);
    }

    async saveScene() {
        let scenes = await localforage.getItem(StorageKeys.Scenes);
        const objForSaving = {
            id: this.id,
            name: this.name,
            owner: this.owner,
            gridRatio: this.gridRatio,
            thumbnail: {
                fg: this.canvas.toDataURL(),
                bg: this.background.getPosterImgUrl()
            }
        };
        if (scenes == null) {
            scenes = [objForSaving];
        }
        else {
            let existingScene = scenes.find(s => s.id == this.id);
            if (existingScene == null) {
                scenes.push(objForSaving);
            }
            else {
                scenes.splice(scenes.indexOf(existingScene), 1, objForSaving);
            }
        }

        await localforage.setItem(StorageKeys.Scenes, scenes);
    }

    async save() {
        await Promise.all([this.saveScene(), this.saveBackground(), this.saveGrid(), this.savePieces()]);
    }

    async saveBackground() {
        Scene.updateOrCreateDom(this);
        await this.saveScene(); // update thumbnail in storage
        await localforage.setItem(`${StorageKeys.Background}-${this.id}`, this.background);
    }

    async saveGrid() {
        Scene.updateOrCreateDom(this);
        await this.saveScene(); // update thumbnail in storage
        await localforage.setItem(`${StorageKeys.GridRatio}-${this.id}`, this.gridRatio);
    }

    async savePieces() {
        Scene.updateOrCreateDom(this);
        await this.saveScene(); // update thumbnail in storage
        const piecesJson = [];
        for (var piece of this.pieces) {
            let pieceCopy = { ...piece };
            pieceCopy.image = piece.image.src;
            piecesJson.push(pieceCopy);
        }
        await localforage.setItem(`${StorageKeys.Pieces}-${this.id}`, piecesJson);
    }

    draw() {
        const pixelVal = this.gridRatio * this.canvas.width;
        $('#range-grid-size').val(pixelVal);
        $('label[for="range-grid-size"]').html(`<i class="fa-solid fa-border-none me-2"></i>Grid Size: ${pixelVal}`);
        this.drawBackground();
        this.drawPieces();
    }

    drawBackground() {
        return this.background.apply();
    }

    drawPieces() {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        for (var piece of this.pieces) {
            piece.draw();
        }
    }

    setBackground(obj) {
        if (obj instanceof Background) {
            this.background = obj;
            return this.background;
        }

        if (obj instanceof Object) {
            const newBg = Background.fromObj(obj);
            this.background = newBg;
            return newBg;
        }

        console.warn("bad argument: " + JSON.stringify(obj));
        return null;
    }

    async addPiece(piece) {
        if (piece instanceof Piece) {
            this.pieces.push(piece);
            return piece;
        }

        if (piece instanceof Object) {
            const newPiece = await Piece.fromObj(piece);
            this.pieces.push(newPiece);
            return newPiece;
        }

        console.warn("bad argument: " + JSON.stringify(piece));
        return null;
    }

    async updatePiece(piece) {
        let localPiece = this.getPieceById(piece.id);
        if (!piece.imageUpdated) {
            // use same image
            piece.image = localPiece.image;
        }
        localPiece = await Piece.fromObj(piece);
        const index = this.pieces.indexOf(localPiece);
        this.pieces.splice(index, 1, localPiece);

        return localPiece;
    }

    deletePiece(piece) {
        let index = this.pieces.indexOf(piece);
        this.pieces.splice(index, 1);
    }

    clearPieces() {
        this.pieces = [];
    }

    getPieceById(id) {
        return this.pieces.find(p => p.id == id);
    }
}
