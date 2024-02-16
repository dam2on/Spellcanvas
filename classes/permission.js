class Permission {
    constructor(type, elementId, value) {
        this.type = type;
        this.elementId = elementId;
        this.value = value;
    }

    static fromObj(obj) {
        return new Permission(obj.type, obj.elementId, obj.value);
    }
}