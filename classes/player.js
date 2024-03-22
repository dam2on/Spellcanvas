class Player {
    constructor(id, name, isHost = false) {
        this.id = id;
        this.name = name ?? "New Player";
        this.isHost = isHost;
        this.status = PlayerStatus.Pending;
        this.rolls = [];
    }

    static fromObj(obj) {
        const player = new Player(obj.id, obj.name, obj.isHost);
        player.rolls = obj.rolls;
        return player;
    }

    updateOrCreateDom(content = {}) {
        $("#empty-party-msg").hide();
        $("#section-permissions").show();

        let pieceHtml = "";
        let rollHtml = "";

        if (content.pieces != null) {
            for (var piece of content.pieces.filter(p => p.owner == this.id && p.objectType == "Piece")) {
                const imgSrc = piece.image instanceof HTMLImageElement ? piece.image.src : piece.image;
                pieceHtml += `<img style="margin-right: 0.5em; width: 1em;" title="${piece.name}" src=${imgSrc}>`;
            }
        }

        if (this.rolls.length > 0) {
            for (var roll of this.rolls) {
                let rollDesc = `${roll.numDice}d${roll.diceSides}`;
                if (roll.diceMod != 0)
                    rollDesc += `+${roll.diceMod}`;

                rollDesc += `; rolls: ${roll.rolls.join(",")}`;
                rollHtml += `<span class="badge bg-secondary me-1" data-bs-toggle="tooltip" data-bs-placement="top" title="${rollDesc}">${roll.total}</span>`;
            }
        }

        const existingDom = $('#player-' + this.id);
        if (!!existingDom.length) {
            $('#player-status-' + this.id).removeClass();
            $('#player-status-' + this.id).addClass(this.statusIconClassList());
            $('#player-rolls-' + this.id).html(rollHtml);
            if (content.pieces != null)
                $('#player-pieces-' + this.id).html(pieceHtml);
        }
        else {
            return $(`
            <div class="dropdown">
                <li class="list-group-item player-label" id="player-${this.id}" ontouchstart="onPlayerMenu(event, '${this.id}')" oncontextmenu="onPlayerMenu(event, '${this.id}')">
                    <span class="col-1"><i id="player-status-${this.id}" class="${this.statusIconClassList()}"></i></span>
                    <span class="col-4">${this.name}</span>
                    <span id="player-pieces-${this.id}" class="col-4">${pieceHtml}</span>
                    <span id="player-rolls-${this.id}" class="col-3">${rollHtml}</span>
                </li>
                <ul class="dropdown-menu" role="menu">
                    <li><a class="dropdown-item" onclick="onDeletePlayer('${this.id}')" href="javascript:void(0)">Delete ${this.name}</a></li>
                </ul>
            </div>`);

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
            case PlayerStatus.Loading:
                classList += " text-primary fa-spinner";
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

    addRoll(rolls) {
        for (var roll of rolls) {
            this.rolls.unshift(roll);
        }
        this.rolls = this.rolls.slice(0, 3); // only keep 3 latest rolls
        this.updateOrCreateDom();
    }
}