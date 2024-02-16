class Player {
    constructor (id, name, isHost = false) {
        this.id = id;
        this.name = name ?? "New Player";
        this.isHost = isHost;
    }

    static fromObj(obj) {
        return new Player(obj.id, obj.name, obj.isHost)
    }
}