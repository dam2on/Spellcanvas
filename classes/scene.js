class Scene {
    constructor(id, ownerId) {
        this.id = id;
        this.name = "My Scene";
        this.owner = ownerId;
        this.gridRatio = {
            x: 0.022,
            y: 0.041,
            feetPerGrid: 5
        };
        this.pieces = [];
        this.unloadedPieces = [];
        this.background = new Background(BackgroundType.Image, 'img/bg.jpg');

        Object.defineProperty(this, 'canvas', { value: document.getElementById('canvas'), enumerable: false, writable: true });
        Object.defineProperty(this, 'ctx', { value: this.canvas.getContext('2d'), enumerable: false, writable: true });
    }

    static async load(partial) {
        if (partial == null) {
            console.warn("partial value must be provided to load scene");
            return null;
        }
        const scene = new Scene(partial.id, partial.owner);
        scene.name = partial.name;
        scene.thumbnail = partial.thumbnail;
        const pieces = await localforage.getItem(`${StorageKeys.Pieces}-${scene.id}`)
        const pieceImgPromises = [];
        if (pieces != null) {
            for (var piece of pieces) {
                if (piece.objectType == 'Area') {
                    scene.pieces.push(Area.fromObj(piece))
                }
                else {
                    const constructedPiece = Piece.fromObj(piece);
                    pieceImgPromises.push(constructedPiece.updateImage());
                    scene.pieces.push(constructedPiece);
                }
            }
        }

        await Promise.all(pieceImgPromises);

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

        const pieceImgPromises = [];
        for (var piece of obj.pieces) {
            if (typeof(piece) == 'string') {
                // guids detected, let's bail and wait for pieces
                scene.unloadedPieces = obj.pieces;
                break;
            }
            else if (piece.objectType == 'Area') {
                scene.pieces.push(Area.fromObj(piece));
            }
            else {
                const constructedPiece = Piece.fromObj(piece);
                pieceImgPromises.push(constructedPiece.updateImage());
                scene.pieces.push(constructedPiece);
            }
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
        }
        else {
            return $(`
            <div class="dropdown">
                <label class="col scene-label dropdown-toggle" onclick="onChangeScene('${scene.id}')" oncontextmenu="onSceneMenu(event, '${scene.id}')" for="option-${scene.id}">
                    <input type="radio" class="btn-check" name="radio-scenes" id="option-${scene.id}">
                    <div class="bg-img-cover" style="background-image: url(${scene.thumbnail?.bg ?? scene.background.getPosterImgUrl()})">
                        <img style="aspect-ratio: 1.75; height: 100%; width: 100%; position: relative; top: 0; left: 0;" src="${scene.thumbnail?.fg ?? scene.canvas.toDataURL()}">
                    </div>
                </label>
                <ul class="dropdown-menu" role="menu">
                    <!-- <li><a class="dropdown-item" onclick="onChangeScene('${scene.id}')" href="javascript:void(0)">Select</a></li> -->
                    <li><a class="dropdown-item" onclick="onDeleteScene('${scene.id}')" href="javascript:void(0)">Delete Scene</a></li>
                </ul>
            </div>`);
        }
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
            localforage.removeItem(`${StorageKeys.Background}-${id}`),
            localforage.removeItem(`${StorageKeys.GridRatio}-${id}`)]);
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

    getGridAspectRatio() {
        return this.gridRatio.x * this.canvas.width / (this.gridRatio.y * this.canvas.height);
    }

    getSizeMB() {
        return new Blob([JSON.stringify(this)]).size / Math.pow(10, 6);
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
        await localforage.setItem(`${StorageKeys.Pieces}-${this.id}`, this.pieces);

        // store session pieces for recently added menu
        let sessionPieces = await localforage.getItem(StorageKeys.SessionPieces);
        if (sessionPieces == null) {
            sessionPieces = [];
        }
        for (var piece of this.pieces) {
            if (piece.isDuplicate) continue;
            const sessionPiece = sessionPieces.find(p => p.id == piece.id);
            if (sessionPiece != null) {
                sessionPiece.image = piece.image
            }
            else {
                sessionPieces.push(piece);
            }
        }
        await localforage.setItem(StorageKeys.SessionPieces, sessionPieces);
    }

    bringPieceToFront(piece) {
        // makes piece appear on top of other pieces by moving to end of pieces array
        const currentIndex = this.pieces.indexOf(piece);
        this.pieces.push(this.pieces.splice(currentIndex, 1)[0]);
    }

    draw() {
        this.drawGridSetting();
        this.drawBackground();
        this.drawPieces();
    }

    drawGridSetting() {
        const valX = parseInt(this.gridRatio.x * this.canvas.width);
        const valY = parseInt(this.gridRatio.y * this.canvas.height);
        
        $('#input-feet-per-grid').val(this.gridRatio.feetPerGrid);
        $('#input-grid-width').val(this.gridRatio.x);
        $('#input-grid-height').val(this.gridRatio.y);
        $('#grid-width-display').html(parseInt(valX) + 'px');
        $('#grid-height-display').html(parseInt(valY) + 'px');
      
        $('#grid-indicator-end-buffer').css('margin-right', `calc(50% - 3.5rem - ${valX / 2}px)`);
        $('.grid-indicator').css('width', valX + 'px');
        $('.grid-indicator').css('height', valY + 'px');

        $('label[for="range-grid-size-x"]').html(`<i class="fa-solid fa-border-none me-2"></i>Grid Size: ${valX} x ${valY}`);
    }

    drawBackground() {
        return this.background.apply();
    }

    async drawPieces(addTrail = false) {
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);

        let trailColor = null;
        if (addTrail || document.getElementById('checkbox-route-toggle').checked) {
            trailColor = await this.background.getContrastColor();
        }

        for (var piece of this.pieces) {
            piece.draw({trailColor});
        }
    }

    setBackground(obj) {
        if (obj instanceof Background) {
            this.background = obj;
        }
        else if (obj instanceof Object) {
            const newBg = Background.fromObj(obj);
            this.background = newBg;
        }
        else {
            console.warn("bad argument: " + JSON.stringify(obj));
        }
    }

    addPiece(piece) {
        let unloadedIndex = this.unloadedPieces.indexOf(piece.id);
        if (unloadedIndex >= 0) {
            this.unloadedPieces.splice(unloadedIndex, 1);
        }
      
        if (piece instanceof Piece) {
            this.pieces.push(piece);
            return piece;
        }

        if (piece instanceof Object) {
            let newPiece = null;

            if (piece.objectType == "Area") {
                newPiece = Area.fromObj(piece);
            }
            else {
                newPiece = Piece.fromObj(piece);
            }
            this.pieces.push(newPiece);
            return newPiece;
        }

        console.warn("bad argument: " + JSON.stringify(piece));
        return null;
    }

    updatePiece(piece) {
        let localPiece = this.getPieceById(piece.id);
        if (localPiece instanceof Area) {
            localPiece = Area.fromObj(piece);
        }
        else {
            if (!piece.imageUpdated) {
                // use same image
                piece.image = localPiece.image;
            }
            localPiece = Piece.fromObj(piece);
        }

        const index = this.pieces.findIndex(p => p.id == localPiece.id);
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
