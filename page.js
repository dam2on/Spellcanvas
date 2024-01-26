
PIECES = [];
_connectedIds = [];
_peer = null;
_host = null;
_ctx = null;

const newGuid = function () {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

const toBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
});

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

const refreshCanvas = function () {

  _ctx.clearRect(0, 0, _ctx.canvas.width, _ctx.canvas.height);

  for (var piece of PIECES) {
    _ctx.drawImage(piece.image, piece.x, piece.y, piece.width, piece.height);
    _ctx.fillText(piece.name, piece.x + 10, piece.y);
  }

}

const changeBackground = function() {
  const bgImg = document.getElementById("input-bg-img").files[0];
  Promise.resolve(toBase64(bgImg)).then((result) => {
    document.getElementById("canvas").style['background-image'] = `url(${result})`;
    bootstrap.Modal.getInstance(document.getElementById('modal-bg')).hide();
    refreshCanvas();
  });
}

const drawImageScaled = function (img) {
  var canvas = _ctx.canvas ;
  var hRatio = canvas.width  / img.width    ;
  var vRatio =  canvas.height / img.height  ;
  var ratio  = Math.min ( hRatio, vRatio );
  var centerShift_x = ( canvas.width - img.width*ratio ) / 2;
  var centerShift_y = ( canvas.height - img.height*ratio ) / 2;  
  _ctx.clearRect(0,0,canvas.width, canvas.height);
  _ctx.drawImage(img, 0,0, img.width, img.height,
                     centerShift_x,centerShift_y,img.width*ratio, img.height*ratio);  
}

const addGamePiece = function() {
  const modalPieceInputs = document.getElementById('form-modal-piece').getElementsByTagName('input');
  const name = modalPieceInputs[0].value;
  const img = modalPieceInputs[1].files[0];
  const size = document.querySelector('input[name="radio-piece-size"]:checked').value;

  const piece = new Piece(newGuid(), _peer.id, name, img, size);
  piece.image.addEventListener('load', () => {
    _ctx.drawImage(piece.image, piece.x, piece.y, piece.width, piece.height);
    bootstrap.Modal.getInstance(document.getElementById('modal-piece')).hide();
    modalPieceInputs[0].value = null;
    modalPieceInputs[1].value = null;
  });

  PIECES.push(piece);

  debugger;
  if (_host != null) {
    emitAddPieceEvent(_host, piece);
  }
  else if (_connectedIds.length > 0) {
    for (var id of _connectedIds) {
      emitAddPieceEvent(id, piece);
    }
  }
}

const emitAddPieceEvent = function(peerId, piece) {
  var conn = _peer.connect(peerId);
  conn.on('open', function() {
    let pieceCopy = {...piece};
    pieceCopy.image = piece.image.src;
    conn.send({event: EventTypes.AddPiece, piece: pieceCopy});
  })
}

const emitMovePieceEvent = function(peerId, piece) {
  var conn = _peer.connect(peerId);
  conn.on('open', function() {
    conn.send({
      event: EventTypes.MovePiece, 
      movedPiece: {
        id: piece.id,
        x: piece.x,
        y: piece.y
      }
    });
  });
}

const emitDeletePieceEvent = function(peerId, id) {
  var conn = _peer.connect(peerId);
  conn.on('open', function() {
    conn.send({
      event: EventTypes.DeletePiece, 
      id: id
    });
  });
}

const emitRequestPieceEvent = function(peiceId) {
  if (_host == null) {
    console.warn("cannot request piece as host");
    return;
  }
  // fetch piece from host
  var conn = _peer.conn(_host);
  conn.on('open', function() {
    conn.send({
      event: EventTypes.RequestPiece,
      id: pieceId
    });
  });
}

const onAddPieceEvent = function(piece) {
  // new pieces need their image to load once
  var img = new Image();
  img.src = piece.image;
  document.createElement(img);
  let newPiece = Piece.fromObj(piece);
  PIECES.push(newPiece);
  refreshCanvas();
}

const onMovePieceEvent = function(movedPiece) {
  let pieceToMove = PIECES.find(p => p.id == movedPiece.id);
  if (pieceToMove == null) {
    requestPieceData(movedPiece.id);
    return;
  }
  pieceToMove.x = movedPiece.x;
  pieceToMove.y = movedPiece.y;
  refreshCanvas();
}

const onDeletePieceEvent = function(id) {
  let piece = PIECES.find(p => p.id == id);
  let index = PIECES.indexOf(piece);
  PIECES.splice(index, 1);
  refreshCanvas();
}

const onRequestPieceEvent = function(peerId, id) {
  let piece = PIECES.find(p => p.id == id);
  emitAddPieceEvent(peerId, piece);
}

const initParty = function() {
  let mode = Number(document.querySelector('input[name="radio-party"]:checked').value);
  let partyId = document.getElementById("input-party-id").value;

  // create party
  if (mode == 0) {
    _peer = new Peer(partyId);
  }
  // join party
  else if (mode == 1) {
    _host = partyId;
    _peer = new Peer();
  }

  _peer.on('open', function(id) {
    console.log('My peer ID is: ' + id);
  });

  _peer.on('connection', function(conn) {
    debugger;
    if (!_host && _connectedIds.indexOf(conn.peer) < 0) {
      _connectedIds.push(conn.peer);
    }
    conn.on('data', function(data) {
      switch (data.event) {
        case EventTypes.AddPiece:
          onAddPieceEvent(data.piece);
          break;
        case EventTypes.MovePiece:
          onMovePieceEvent(data.movedPiece);
          break;
        case EventTypes.DeletePiece:
          onDeletePieceEvent(data.id);
          break;
        case EventTypes.RequestPiece:
          onRequestPieceEvent(conn.peer, data.id);
        default:
          console.log("unrecognized event type: " + data.event);
          break;
      }
    });
  });

  bootstrap.Modal.getInstance(document.getElementById('modal-party')).hide();
}

window.onload = function () {
  bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-party')).show(); 

  var can = document.getElementById('canvas');
  _ctx = can.getContext('2d');
  can.width = window.innerWidth;

  can.height = window.innerHeight;

  document.getElementById('btn-modal-piece-ok').addEventListener('click', () => addGamePiece());
  document.getElementById('btn-modal-bg-ok').addEventListener('click', () => changeBackground());
  document.getElementById('btn-modal-party-ok').addEventListener('click', () => initParty());

  var draggedPiece = null;
  can.addEventListener('mousedown', function (args) {
    draggedPiece = shapeIntersects(args.clientX, args.clientY);
  });
  can.addEventListener('mousemove', function (args) {
    if (draggedPiece != null) {
      draggedPiece.x = args.layerX - parseInt(draggedPiece.width / 2);
      draggedPiece.y = args.layerY - parseInt(draggedPiece.height / 2);
      refreshCanvas();
    }
  });
  can.addEventListener('mouseup', function () {
    if (draggedPiece == null) return;
    let movedPiece = {...draggedPiece};

    if (_host != null) {
      emitMovePieceEvent(_host, movedPiece);
    }
    else if (_connectedIds.length > 0) {
      for (var id of _connectedIds) {
        emitMovePieceEvent(id, movedPiece);
      }
    }

    draggedPiece = null;
  });

  can.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    let piece = shapeIntersects(e.clientX, e.clientY);
    if (piece) {
      if (confirm("Delete piece: " + piece.name + "?")) {
        let index = PIECES.indexOf(piece);
        PIECES.splice(index, 1);
        refreshCanvas();

        if (_host != null) {
          emitDeletePieceEvent(_host, piece.id);
        }
        else if (_connectedIds.length > 0) {
          for (var id of _connectedIds) {
            emitDeletePieceEvent(id, piece.id);
          }
        }
      }
    }

  })
}