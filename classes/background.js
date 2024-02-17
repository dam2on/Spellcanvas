_video = null;

class Background {
    constructor(type, url) {
        this.type = type;
        this.url = url;
        Object.defineProperty(this, 'vb', {value: null, enumerable: false, writable: true});
    }

    apply() {
        if (_video instanceof VideoBackgrounds) {
            _video.destroy(_video.elements[0]);
        }
        switch (this.type) {

            case BackgroundType.Image:
                $('#canvas').css('background-image', `url(${this.url})`);
                break;
            case BackgroundType.Video:
                $('#canvas').css('background-image', '');
                $('#video').attr('data-vbg', this.url);
                _video = new VideoBackgrounds($('#video'));
                break;
            default:
                console.warn('background type not recognized: ' + this.type);
                break;

        }
    }

    getVidID() {
        if (this.type != BackgroundType.Video) return;
        if (this.url === undefined && this.url === null) return;
    
        this.re = {};
        this.re.YOUTUBE = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/ ]{11})/i;
        this.re.VIMEO = /(?:www\.|player\.)?vimeo.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|album\/(?:\d+)\/video\/|video\/|)(\d+)(?:[a-zA-Z0-9_\-]+)?/i;
        this.re.VIDEO = /\/([^\/]+\.(?:mp4|ogg|ogv|ogm|webm|avi))\s*$/i;
        
        for (let k in this.re) {
          const pts = this.url.match(this.re[k]);
    
          if (pts && pts.length) {
            this.re[k].lastIndex = 0;
            return {
              id: pts[1],
              type: k
            };
          }
        }
      
        return;
      }

    getPosterImgUrl() {

        if (this.type == BackgroundType.Video) {
            const vidData = this.getVidID();
            if (vidData.type == 'YOUTUBE') return `https://img.youtube.com/vi/${vidData.id}/hqdefault.jpg`;
            if (vidData.type == 'VIMEO') return `https://vumbnail.com/${vidData.id}.jpg`;
        }
        else if (this.type == BackgroundType.Image) {
            return this.url;
        }

        // fallback image
        return 'img/bg.png';
    }

    static fromObj(obj) {
        return new Background(obj.type, obj.url);
    }
}