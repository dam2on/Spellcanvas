class Player {
    constructor(id, name, isHost = false) {
        this.id = id;
        this.name = name ?? "New Player";
        this.isHost = isHost;
        this.status = PlayerStatus.Pending;
    }

    static fromObj(obj) {
        return new Player(obj.id, obj.name, obj.isHost);
    }

    updateOrCreateDom(pieces = null) {
        $("#empty-party-msg").hide();

        let pieceHtml = "";

        if (pieces != null) {
            for (var piece of pieces.filter(p => p.owner == this.id && p.objectType == "Piece")) {
                const imgSrc = piece.image instanceof HTMLImageElement ? piece.image.src : piece.image;
                pieceHtml += `<img style="margin-right: 0.5em; width: 1em;" title="${piece.name}" src=${imgSrc}>`;
            }
        }

        const existingDom = $('#player-' + this.id);
        if (!!existingDom.length) {
            $('#player-status-' + this.id).removeClass();
            $('#player-status-' + this.id).addClass(this.statusIconClassList());
            $('#player-pieces-' + this.id).html(pieceHtml);
        }
        else {
            return $(`<li class="list-group-item" id="player-${this.id}">
                <span class="col-1"><i id="player-status-${this.id}" class="${this.statusIconClassList()}"></i></span>
                <span class="col-4">${this.name}</span>
                <span id="player-pieces-${this.id}" class="col-7">${pieceHtml}</span>
            </li>`);
        }
    }

    statusIconClassList() {
        let classList = "fa-solid fa-sm";
        switch (this.status) {
            case PlayerStatus.Pending:
                classList += " text-primary fa-user";
                break;
            case PlayerStatus.Connected:
                classList += " text-success fa-user-check";
                break;
            case PlayerStatus.Disconnected:
                classList += " text-danger fa-user-xmark";
                break;
            default:
                console.warn('unrecognized player status: ' + this.status);
                break;
        }

        return classList;
    }
}