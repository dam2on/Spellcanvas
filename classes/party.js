class Party {
    constructor(owner) {
        this.owner = owner;
        this.players = [];
        this.permissions = [];
        this.deletedPlayerIds = [];
    }

    static fromObj(obj) {
        const party = new Party(obj.owner);
        party.deletedPlayerIds = obj.deletedPlayerIds;
        for (var player of obj.players) {
            party.players.push(Player.fromObj(player));
        }

        for (var permission of obj.permissions) {
            party.permissions.push(Permission.fromObj(permission));
        }

        return party;
    }

    async save() {
        await localforage.setItem(`${StorageKeys.Party}-${this.owner}`, this);
    }

    getPlayer(id) {
        return this.players.find(p => p.id == id);
    }

    deletePlayer(id) {
        this.deletedPlayerIds.push(id);
        let index = this.players.indexOf(this.players.find(p => p.id == id));
        this.players.splice(index, 1);
    }

    addPlayer(player) {
        if (player instanceof Player) {
            this.players.push(player);
        }
        else if (player instanceof Object) {
            this.players.push(Player.fromObj(player))
        }
        else {
            console.warn('argument is not of correct type: ' + JSON.stringify(player));
        }
    }

    getPermissionValue(type) {
        return this.permissions.find(p => p.type == type)?.value
    }

    setPermission(type, elementId, value) {
        const existingPermission = this.permissions.find(p => p.type);
        if (existingPermission != null) {
            existingPermission.elementId = elementId;
            existingPermission.value = value;
        }
        else {
            this.permissions.push(new Permission(type, elementId, value));
        }
    }
}
