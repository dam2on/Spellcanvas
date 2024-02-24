_video = null;

class Background {
    constructor(type, url) {
        this.type = type;
        this.url = url;
        Object.defineProperty(this, 're', { value: null, enumerable: false, writable: true });
    }

    apply() {
        if (_video instanceof VideoBackgrounds) {
            _video.destroy(_video.elements[0]);
        }
        switch (this.type) {

            case BackgroundType.Image:
                // $('#canvas').css('background-image', `url(${this.url})`);
                $('#background-image').attr('src', this.url);
                $('#background-image').show();
                break;
            case BackgroundType.Video:
                $('#canvas').css('background-image', '');
                $('#background-image').attr('src', '');
                $('#background-image').hide();
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

    async getContrastColor() {
        if (this.contrastedColor != undefined) {
            return this.contrastedColor;
        }


        await this.getAverageRGB().then((v) => {
            this.contrastedColor = invertColor(v);
        }).catch((e) => {
            this.contrastedColor = "#ffeeaa";
        });

        return this.contrastedColor;
    }

    async getAverageRGB() {
        var imgEl = new Image;
        const currentBg = this;
        const imgLoadPromise = new Promise(async function (resolve, reject) {
            let imgUrl = currentBg.getPosterImgUrl();
            if (currentBg.type == BackgroundType.Video) {
                imgUrl = await convertLinkToDataURL(imgUrl);
                if (imgUrl == null){
                    reject();
                    return;
                }
            }
            imgEl.src = imgUrl;
            imgEl.onload = function () {
                resolve();
            };
        });

        await imgLoadPromise.catch((e) => {
            throw e;
        });

        var blockSize = 5, // only visit every 5 pixels
            defaultRGB = { r: 0, g: 0, b: 0 }, // for non-supporting envs
            canvas = document.createElement('canvas'),
            context = canvas.getContext && canvas.getContext('2d'),
            data, width, height,
            i = -4,
            length,
            rgb = { r: 0, g: 0, b: 0 },
            count = 0;

        if (!context) {
            return defaultRGB;
        }

        height = canvas.height = imgEl.naturalHeight || imgEl.offsetHeight || imgEl.height;
        width = canvas.width = imgEl.naturalWidth || imgEl.offsetWidth || imgEl.width;

        context.drawImage(imgEl, 0, 0);

        try {
            data = context.getImageData(0, 0, width, height);
        } catch (e) {
            /* security error, img on diff domain */
            return defaultRGB;
        }

        length = data.data.length;

        while ((i += blockSize * 4) < length) {
            ++count;
            rgb.r += data.data[i];
            rgb.g += data.data[i + 1];
            rgb.b += data.data[i + 2];
        }

        // ~~ used to floor values
        rgb.r = ~~(rgb.r / count);
        rgb.g = ~~(rgb.g / count);
        rgb.b = ~~(rgb.b / count);

        const hexStr = '#' + rgb.r.toString(16) + rgb.g.toString(16) + rgb.b.toString(16);
        return hexStr;
    }

    static fromObj(obj) {
        return new Background(obj.type, obj.url);
    }
}