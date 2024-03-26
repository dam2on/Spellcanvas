const isLocal = function () {
    return window.location.host == '127.0.0.1:5500'
}

const disablePeer = function() { 
    const disablePeerLocally = false;
    return isLocal() && disablePeerLocally;
}

const isHost = function () {
    if (_peer == null) {
        return _host != null;
    }
    return _peer.id == _host;
}

const refreshPage = function (includePath = true) {
    window.location.href = window.location.origin + includePath ? window.location.pathname : '';
}

const downloadObjectAsJson = function (exportObj, exportName) {
    var dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj));
    var downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", exportName + ".json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

const opacityToHexStr = function(opacity) {
    let value = Number(opacity).toString(16);
    if (value.length == 1)
        value = "0" + value;
    return value;
}

const resizeImage2 = async function (file, targetWidth) {
    // not as efficient?
    return new Promise(function (resolve, reject) {
        new Compressor(file, {
            quality: 0.6,
            width: targetWidth,
            success(result) {
                resolve(URL.createObjectURL(result));
            },
            error: reject
        });
    })
}

const resizeImage = async function (file, targetWidth) {
    return new Promise(function (resolve, reject) {
        const imgEl = new Image();
        const reader = new FileReader();
        reader.onload = (event) => {
            imgEl.onload = function () {
                if (imgEl.width < targetWidth) {
                    resolve(imgEl.src);
                    return;
                }
                var canvas = document.createElement('canvas'),
                    ctx = canvas.getContext("2d"),
                    oc = document.createElement('canvas'),
                    octx = oc.getContext('2d');

                canvas.width = targetWidth; // destination canvas size
                canvas.height = canvas.width * imgEl.height / imgEl.width;

                var cur = {
                    width: Math.floor(imgEl.width * 0.5),
                    height: Math.floor(imgEl.height * 0.5)
                }

                oc.width = cur.width;
                oc.height = cur.height;

                octx.drawImage(imgEl, 0, 0, cur.width, cur.height);

                while (cur.width * 0.5 > targetWidth) {
                    cur = {
                        width: Math.floor(cur.width * 0.5),
                        height: Math.floor(cur.height * 0.5)
                    };
                    octx.drawImage(oc, 0, 0, cur.width * 2, cur.height * 2, 0, 0, cur.width, cur.height);
                }

                ctx.drawImage(oc, 0, 0, cur.width, cur.height, 0, 0, canvas.width, canvas.height);

                resolve(canvas.toDataURL());
            }
            imgEl.src = event.target.result;
        }

        reader.readAsDataURL(file);
    });
}

const convertLinkToDataURL = async function (link) {
    let blob = await fetch(link).then(r => r.blob()).catch(() => { });
    if (blob == undefined) return blob;
    return await new Promise((resolve, reject) => {
        let reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

const newGuid = function () {
    return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

const loading = function (state) {
    if (state) {
        $('.loader').show();
    }
    else {
        $('.loader').hide();
    }
}

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
});

const invertColor = function (hex) {
    if (hex.indexOf('#') === 0) {
        hex = hex.slice(1);
    }
    // convert 3-digit hex to 6-digits.
    if (hex.length === 3) {
        hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
    }
    if (hex.length !== 6) {
        throw new Error('Invalid HEX color.');
    }
    // invert color components
    var r = (255 - parseInt(hex.slice(0, 2), 16)).toString(16),
        g = (255 - parseInt(hex.slice(2, 4), 16)).toString(16),
        b = (255 - parseInt(hex.slice(4, 6), 16)).toString(16);
    // pad each with zeros and return
    return '#' + padZero(r) + padZero(g) + padZero(b);
}

const padZero = function (str, len) {
    len = len || 2;
    var zeros = new Array(len).join('0');
    return (zeros + str).slice(-len);
}

const initFormValidation = function () {
    'use strict'

    // Fetch all the forms we want to apply custom Bootstrap validation styles to
    var forms = document.querySelectorAll('.needs-validation')

    // Loop over them and prevent submission
    Array.prototype.slice.call(forms)
        .forEach(function (form) {
            form.addEventListener('submit', function (event) {
                event.preventDefault(); // never refresh page
                if (!form.checkValidity()) {

                    event.stopPropagation()
                }
            }, false)
        });
}

const detectBrowserCompatibility = function () {
    const ua = navigator.userAgent;
    let tem;
    let matches = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if (/trident/i.test(matches[1])) {
        tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
        return 'IE ' + (tem[1] || '');
    }
    if (matches[1] === 'Chrome') {
        tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
        if (tem != null) return tem.slice(1).join(' ').replace('OPR', 'Opera');
    }
    matches = matches[2] ? [matches[1], matches[2]] : [navigator.appName, navigator.appVersion, '-?'];
    if ((tem = ua.match(/version\/(\d+)/i)) != null) matches.splice(1, 1, tem[1]);

    const browser = matches[0].toLocaleLowerCase();
    const version = Number(matches[1]);
    let incompatible = false;

    if (Number.isNaN(version)) {
        console.warn('version is NaN: ' + matches[1]);
    }
    else {

        switch (browser) {
            case 'safari':
                if (version < 14)
                    incompatible = true;
                break;
            case 'chrome':
            case 'edge':
                if (version < 85)
                    incompatible = true;
                break;
            case 'firefox':
                if (version < 79)
                    incompatible = true;
                break;
            case 'opera':
                if (version < 71)
                    incompatible = true;
                break;
            default:
                incompatible = true;
                break;
        }
    }

    if (incompatible) {
        alert(`${browser} ${version} is out-of-date and not fully supported by Spellcanvas. Please update to the latest version or you may experience limited functionality.`);
    }
}