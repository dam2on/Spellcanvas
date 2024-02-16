_video = null;

class Background {
    constructor(type, url) {
        this.type = type;
        this.url = url;
    }

    apply() {
        switch (this.type) {
            case BackgroundType.Image:
                if (_video instanceof VideoBackgrounds) {
                    _video.destroy(_video.elements[0]);
                }
                $('#canvas').css('background-image', `url(${this.url})`);
                break;
            case BackgroundType.Video:
                $('#canvas').css('background-image', '');
                $('#video').attr('data-vbg', this.url);
                _video = new VideoBackgrounds('[data-vbg]');
                break;
            default:
                console.warn('background type not recognized: ' + this.type);
                break;

        }
    }

    static fromObj(obj) {
        return new Background(obj.type, obj.url);
    }
}