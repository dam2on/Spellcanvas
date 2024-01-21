
PIECES = [];
_playerId = null;
_peer = null;
_partyId = null;

const newGuid = function () {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

const shapeIntersects = function (x, y) {
  let xInts = false;
  let yInts = false;

  for (var shape of this.PIECES) {
    xInts = x >= shape.x && x <= (shape.x + shape.width);
    if (xInts) {
      yInts = y >= shape.y && y <= (shape.y + shape.height);
      if (yInts)
        return shape;
    }
    xInts = false;
  }
  return null;
}

const refreshCanvas = function (ctx) {

  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  for (var piece of PIECES) {
    ctx.drawImage(piece.image, piece.x, piece.y, piece.width, piece.height);
    ctx.fillText(piece.name, piece.x + 10, piece.y);
  }

}

const drawImageScaled = function (img, ctx) {
  var canvas = ctx.canvas ;
  var hRatio = canvas.width  / img.width    ;
  var vRatio =  canvas.height / img.height  ;
  var ratio  = Math.min ( hRatio, vRatio );
  var centerShift_x = ( canvas.width - img.width*ratio ) / 2;
  var centerShift_y = ( canvas.height - img.height*ratio ) / 2;  
  ctx.clearRect(0,0,canvas.width, canvas.height);
  ctx.drawImage(img, 0,0, img.width, img.height,
                     centerShift_x,centerShift_y,img.width*ratio, img.height*ratio);  
}

const addGamePiece = function(ctx) {
  const modalPieceInputs = document.getElementById('form-modal-piece').getElementsByTagName('input');
  const name = modalPieceInputs[0].value;
  const img = modalPieceInputs[1].files[0];
  const size = document.querySelector('input[name="radio-piece-size"]:checked').value;

  const piece = new Piece(newGuid(), playerId, name, img, size);
  piece.image.addEventListener('load', () => {
    ctx.drawImage(piece.image, piece.x, piece.y, piece.width, piece.height);
    bootstrap.Modal.getInstance(document.getElementById('modal-piece')).hide();
    modalPieceInputs[0].value = null;
    modalPieceInputs[1].value = null;
  });

  PIECES.push(piece);

  debugger;
  var conn = _peer.connect(_partyId);
  conn.on('open', function() {
    conn.send('Added a new piece ' + JSON.stringify(piece));
  })
}

const changeBackground = function(ctx) {
  const bgImg = document.getElementById("input-bg-img").files[0];
  Promise.resolve(toBase64(bgImg)).then((result) => {
    document.getElementById("canvas").style['background-image'] = `url(${result})`;
    bootstrap.Modal.getInstance(document.getElementById('modal-bg')).hide();
    refreshCanvas(ctx);
  });
}

const initParty = function() {
  let mode = Number(document.querySelector('input[name="radio-party"]:checked').value);
  if (mode == 1) {
    _peer = new Peer(document.getElementById("input-party-id").value);
  }
  else {
    _peer = new Peer();
  }

  _peer.on('open', function(id) {
    console.log('My peer ID is: ' + id);
    _partyId = id;
  });

  _peer.on('connection', function(conn) {
    debugger;
  });

  bootstrap.Modal.getInstance(document.getElementById('modal-party')).hide();
}

const toBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
});

window.onload = function () {
  bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-party')).show(); 

  playerId = newGuid();
  var can = document.getElementById('canvas');
  var ctx = can.getContext('2d');
  can.width = window.innerWidth;

  can.height = window.innerHeight;

  document.getElementById('btn-modal-piece-ok').addEventListener('click', () => addGamePiece(ctx));
  document.getElementById('btn-modal-bg-ok').addEventListener('click', () => changeBackground(ctx));
  document.getElementById('btn-modal-party-ok').addEventListener('click', () => initParty());

  var dragging = null;
  can.addEventListener('mousedown', function (args) {
    dragging = shapeIntersects(args.clientX, args.clientY);
  });
  can.addEventListener('mousemove', function (args) {
    if (dragging != null) {
      dragging.x = args.layerX - parseInt(dragging.width / 2);
      dragging.y = args.layerY - parseInt(dragging.height / 2);
      refreshCanvas(ctx);

    }
  });
  can.addEventListener('mouseup', () => dragging = null);

  can.addEventListener('contextmenu', (e) => {
    debugger;
    e.preventDefault();
    let piece = shapeIntersects(e.clientX, e.clientY);
    if (piece) {
      if (confirm("Delete piece: " + piece.name + "?")) {
        let index = PIECES.indexOf(piece);
        PIECES.splice(index, 1);
        refreshCanvas(ctx);
      }
    }

  })
}