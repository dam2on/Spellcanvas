class Scene {
    constructor(id, ownerId) {
        this.id = id;
        this.name = "New Scene";
        this.owner = ownerId;
        this.gridRatio = 0.025;
        this.pieces = [];
        this.background = null;
    }

    static async load(partial) {
        if (partial == null) {
            console.warn("partial value must be provided to load scene");
            return null;
        }
        const scene = new Scene(partial.id, partial.owner);
        scene.name = partial.name;
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

    pureJson() {
        const piecesJson = [];
        for (var piece of this.pieces) {
            const pieceCopy = {...piece};
            pieceCopy.image = piece.image.src;
            piecesJson.push(pieceCopy);
        }

        const sceneCopy = {
            ...this,
            pieces: piecesJson
        };

        return sceneCopy;
    }

    async saveScene() {
        let scenes = await localforage.getItem(StorageKeys.Scenes);
        const objForSaving = {
            id: this.id,
            name: this.name,
            owner: this.owner,
            gridRatio: this.gridRatio
        };
        if (scenes == null) {
            scenes = [objForSaving];
        }
        else {
            const existingScene = scenes.find(s => s.id == this.id);
            if (existingScene == null) {
                scenes.push(objForSaving);
            }
            else {
                existingScene = objForSaving;
            }
        }

        await localforage.setItem(StorageKeys.Scenes, scenes);
    }

    async save() {
        await Promise.all([this.saveScene(), this.saveBackground(), this.saveGrid(), this.savePieces()]);
    }

    async saveBackground() {
        await localforage.setItem(`${StorageKeys.Background}-${this.id}`, this.background);
    }

    async saveGrid() { 
        await localforage.setItem(`${StorageKeys.GridRatio}-${this.id}`, this.gridRatio);
    }

    async savePieces() {
        const piecesJson = [];
        for (var piece of this.pieces) {
          let pieceCopy = { ...piece };
          pieceCopy.image = piece.image.src;
          piecesJson.push(pieceCopy);
        }
        await localforage.setItem(`${StorageKeys.Pieces}-${this.id}`, piecesJson);
    }

    draw(ctx) {
        for (var piece of this.pieces) {
            piece.draw(ctx);
        }
    }

    updateBackground(obj) {
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

    applyBackground() { 
        return this.background?.apply();
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
