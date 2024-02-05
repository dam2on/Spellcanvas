
PIECES = [];
_connectedIds = [];
_bgImgUrl = null;
_bgVideo = null;
_peer = null;
_playerName = null;
_host = null;
_ctx = null;
_gridSizeRatio = 0.025;
_pieceInMenu = null;
_canvasTextMargin = 3;

const isHost = function () {
  return _host == null;
}

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
    let shapeX = shape.getX();
    let shapeY = shape.getY();
    xInts = x >= shapeX && x <= (shapeX + shape.width);
    if (xInts) {
      yInts = y >= shapeY && y <= (shapeY + shape.height);
      if (yInts)
        return shape;
    }
    xInts = false;
  }
  return null;
}

const getTextDims = function (str) {
  const textDims = _ctx.measureText(str);
  return {
    width: Math.ceil(textDims.width),
    top: textDims.actualBoundingBoxAscent,
    bottom: textDims.actualBoundingBoxDescent,
    height: Math.ceil(Math.abs(textDims.actualBoundingBoxAscent) + Math.abs(textDims.actualBoundingBoxDescent))
  }
}

const getFontSizeByPiece = function (pieceSize) {
  const fontSizes = { name: "18px", statuses: "12px" };
  switch (pieceSize) {
    case PieceSizes.Tiny:
      fontSizes.name = "9px";
      fontSizes.statuses = "9px";
      break;
    case PieceSizes.Small:
      fontSizes.name = "10px";
      fontSizes.statuses = "9px";
      break;
    case PieceSizes.Medium:
      fontSizes.name = "12px";
      fontSizes.statuses = "10px";
      break;
    case PieceSizes.Large:
      fontSizes.name = "14px";
      fontSizes.statuses = "11px";
      break;
    case PieceSizes.Huge:
      fontSizes.name = "16px";
      fontSizes.statuses = "12px";
      break;
    case PieceSizes.Gargantuan:
      break;
    default:
      console.warn("piece size: " + pieceSize + " not recognized as standard size");
      break;
  }

  return fontSizes;
}

const refreshCanvas = function () {

  _ctx.clearRect(0, 0, _ctx.canvas.width, _ctx.canvas.height);
  _ctx.textBaseline = "bottom";
  const deadImage = document.getElementById("image-dead");

  for (var piece of PIECES) {
    _ctx.drawImage(piece.image, piece.getX(), piece.getY(), piece.width, piece.height);

    // dead overlay
    if (piece.dead) {
      _ctx.globalAlpha = 0.5;
      _ctx.drawImage(deadImage, piece.getX(), piece.getY(), piece.width, piece.height);
      _ctx.globalAlpha = 1;
    }

    const fontSize = getFontSizeByPiece(piece.size);

    if (piece.name) {
      _ctx.font = fontSize.name + " Arial";
      let nameTextDims = getTextDims(piece.name);
      _ctx.fillStyle = "#36454F"; // charcoal
      _ctx.beginPath();
      _ctx.roundRect(piece.getX() - _canvasTextMargin + (piece.width - nameTextDims.width) / 2,
        piece.getY() - _canvasTextMargin - nameTextDims.height,
        nameTextDims.width + 2 * _canvasTextMargin,
        nameTextDims.height + 2 * _canvasTextMargin,
        3);
      _ctx.fill();
      _ctx.fillStyle = "#f9f9f9"; // off white
      _ctx.fillText(piece.name, piece.getX() + (piece.width - nameTextDims.width) / 2, piece.getY());
    }

    // add status conditions
    if (piece.statusConditions.length > 0) {
      _ctx.font = fontSize.statuses + " Arial";
      const anyLetterHeight = getTextDims("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ").height;
      let statusConX = piece.getX();
      let statusConY = piece.height + piece.getY();
      for (var i = 0; i < piece.statusConditions.length; i++) {
        let currentConDims = getTextDims(piece.statusConditions[i]);
        if (i > 0 && (statusConX + currentConDims.width > piece.getX() + piece.width)) {
          statusConY += anyLetterHeight + (3 * _canvasTextMargin);
          statusConX = piece.getX();
        }
        _ctx.fillStyle = "#880808"; // blood red
        _ctx.beginPath();
        _ctx.roundRect(statusConX, statusConY, currentConDims.width + 2 * _canvasTextMargin, anyLetterHeight + 2 * _canvasTextMargin, 3);
        _ctx.fill();
        _ctx.fillStyle = "#f9f9f9"; // off white
        _ctx.fillText(piece.statusConditions[i], statusConX + _canvasTextMargin, statusConY + anyLetterHeight + _canvasTextMargin);
        statusConX += currentConDims.width + (3 * _canvasTextMargin);
      }
    }
  }

}

const onBackgroundTypeChange = function() {
  const bgType = Number(document.querySelector('input[type="radio"][name="radio-bg-type"]:checked').value);
  if (bgType == 1) {
    document.getElementById("input-bg-image").parentNode.setAttribute("style", "display: none;");
    document.getElementById("input-bg-video").parentNode.removeAttribute("style");
  }
  else {
    document.getElementById("input-bg-video").parentNode.setAttribute("style", "display: none;");
    document.getElementById("input-bg-image").parentNode.removeAttribute("style");
  }
}

const onChangeBackgroundSubmit = function () {
  if (!isHost()) {
    console.warn("only host can change bg");
    return;
  }

  const bgType = Number(document.querySelector('input[type="radio"][name="radio-bg-type"]:checked').value);

  if (bgType == 1) {
    // video
    const videoUrl = document.getElementById('input-bg-video').value;
    onChangeBackgroundEvent(videoUrl, true);
    for (var id of _connectedIds) {
      emitChangeBackgroundEvent(id, videoUrl, true);
    }
  }
  else {
    // image
    const bgImg = document.getElementById("input-bg-image").files[0];
    Promise.resolve(toBase64(bgImg)).then((dataUrl) => {
      onChangeBackgroundEvent(dataUrl);
      for (var id of _connectedIds) {
        emitChangeBackgroundEvent(id, dataUrl);
      }
    });
  }

  bootstrap.Modal.getInstance(document.getElementById('modal-bg')).hide();
}

const drawImageScaled = function (img) {
  var canvas = _ctx.canvas;
  var hRatio = canvas.width / img.width;
  var vRatio = canvas.height / img.height;
  var ratio = Math.min(hRatio, vRatio);
  var centerShift_x = (canvas.width - img.width * ratio) / 2;
  var centerShift_y = (canvas.height - img.height * ratio) / 2;
  _ctx.clearRect(0, 0, canvas.width, canvas.height);
  _ctx.drawImage(img, 0, 0, img.width, img.height,
    centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);
}

const onAddPieceSubmit = function () {
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

  if (_host != null) {
    emitAddPieceEvent(_host, piece);
  }
  else if (_connectedIds.length > 0) {
    for (var id of _connectedIds) {
      emitAddPieceEvent(id, piece);
    }
  }
}

const onUpdatePieceSubmit = async function () {
  if (_pieceInMenu == null) return;
  const name = document.getElementById("piece-menu-name").value;
  const size = document.querySelector('input[name="radio-piece-menu-size"]:checked').value;
  const statusConds = document.getElementById("piece-menu-status-conditions").value;
  const dead = document.getElementById("piece-menu-dead").checked;
  const image = document.getElementById("piece-menu-image-input").files[0];
  _pieceInMenu.name = name;
  _pieceInMenu.dead = dead;
  _pieceInMenu.updateSize(size);
  _pieceInMenu.updateStatusConditions(statusConds);
  if (image != null) {
    await _pieceInMenu.updateImage(image);
    _pieceInMenu.imageUpdated = true;
  }

  if (isHost()) {
    for (var id of _connectedIds) {
      emitUpdatePieceEvent(id, _pieceInMenu);
    }
  }
  else {
    emitUpdatePieceEvent(_host, _pieceInMenu);
  }

  refreshCanvas();
  bootstrap.Offcanvas.getInstance(document.getElementById('piece-menu')).hide();
}

const onDeletePieceSubmit = function () {
  if (_pieceInMenu == null) return;
  if (confirm("Delete piece: " + _pieceInMenu.name + "?")) {
    let index = PIECES.indexOf(_pieceInMenu);
    PIECES.splice(index, 1);
    refreshCanvas();

    if (_host != null) {
      emitDeletePieceEvent(_host, _pieceInMenu.id);
    }
    else if (_connectedIds.length > 0) {
      for (var id of _connectedIds) {
        emitDeletePieceEvent(id, _pieceInMenu.id);
      }
    }

    bootstrap.Offcanvas.getInstance(document.getElementById('piece-menu')).hide();
  }
}

const onConnectedToHostEvent = function(host) {
  if (isHost()) {
    console.warn("only non-host can recieve this 'connected to host' event");
    return;
  }

  alert(`Successfully connected to ${host}'s party!`);
}

const emitChangeBackgroundEvent = function (peerId, data, isVideo = false) {
  if (data == null) return;
  var conn = _peer.connect(peerId);
  conn.on('open', function () {
    conn.send({ event: EventTypes.ChangeBackground, url: data, isVideo: isVideo });
  });
}


const emitAddPieceEvent = function (peerId, piece) {
  var conn = _peer.connect(peerId);
  conn.on('open', function () {
    let pieceCopy = { ...piece };
    pieceCopy.image = piece.image.src;
    conn.send({ event: EventTypes.AddPiece, piece: pieceCopy });
  })
}

const emitMovePieceEvent = function (peerId, piece) {
  var conn = _peer.connect(peerId);
  conn.on('open', function () {
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

const emitDeletePieceEvent = function (peerId, id) {
  var conn = _peer.connect(peerId);
  conn.on('open', function () {
    conn.send({
      event: EventTypes.DeletePiece,
      id: id
    });
  });
}

const emitUpdatePieceEvent = function (peerId, piece) {
  let pieceCopy = { ...piece };
  if (!pieceCopy.imageUpdated) {
    // dont send image
    pieceCopy.image = undefined;
  }
  else {
    pieceCopy.image = piece.image.src;
  }
  var conn = _peer.connect(peerId);
  conn.on('open', function () {
    conn.send({
      event: EventTypes.UpdatePiece,
      piece: pieceCopy
    });
  });
}

const emitGridSizeChangeEvent = function (peerId) {
  return new Promise(function (resolve, reject) {
    var conn = _peer.connect(peerId);
    conn.on('open', function () {
      conn.send({
        event: EventTypes.GridChange,
        gridSize: _gridSizeRatio
      });
      resolve();
    });
  })
}

const emitRequestPieceEvent = function (pieceId) {
  if (isHost()) {
    console.warn("cannot request piece as host");
    return;
  }
  // fetch piece from host
  var conn = _peer.connect(_host);
  conn.on('open', function () {
    conn.send({
      event: EventTypes.RequestPiece,
      id: pieceId
    });
  });
}

const emitConnectedToHostEvent = function (peerId) {
  if (!isHost()) {
    console.warn("only host can send 'connected to host' event");
    return;
  }

  var conn = _peer.connect(peerId);
  conn.on('open', function () {
    conn.send({
      event: EventTypes.ConnectedToHost,
      host: _playerName
    });
  });
}

const onChangeBackgroundEvent = function (data, isVideo = false) {
  if (isVideo) {
    $("#canvas").css("background-image", "");
    $("#video").attr("data-vbg", data);
    _bgVideo = new VideoBackgrounds('[data-vbg]');
  }
  else {
    _bgImgUrl = data;
    _bgVideo?.destroy(_bgVideo.elements[0]);
    $("#canvas").css('background-image', `url(${_bgImgUrl})`);
  }

  refreshCanvas();
}

const onAddPieceEvent = async function (piece) {
  if (PIECES.find(p => p.id == piece.id) != null) {
    // redundant piece
    return;
  }
  let newPiece = await Piece.fromObj(piece);
  PIECES.push(newPiece);

  if (isHost()) {
    for (var id of _connectedIds) {
      emitAddPieceEvent(id, newPiece);
    }
  }

  refreshCanvas();
}

const onMovePieceEvent = function (movedPiece) {
  let pieceToMove = PIECES.find(p => p.id == movedPiece.id);
  if (pieceToMove == null) {
    emitRequestPieceEvent(movedPiece.id);
    return;
  }
  pieceToMove.x = movedPiece.x;
  pieceToMove.y = movedPiece.y;

  if (isHost()) {
    for (var id of _connectedIds) {
      emitMovePieceEvent(id, pieceToMove);
    }
  }

  refreshCanvas();
}

const onDeletePieceEvent = function (id) {
  let piece = PIECES.find(p => p.id == id);
  if (piece == null) return;

  let index = PIECES.indexOf(piece);
  PIECES.splice(index, 1);
  if (isHost()) {
    for (var peerId of _connectedIds) {
      emitDeletePieceEvent(peerId, id);
    }
  }
  refreshCanvas();
}

const onRequestPieceEvent = function (peerId, id) {
  let piece = PIECES.find(p => p.id == id);
  emitAddPieceEvent(peerId, piece);
}

const onUpdatePieceEvent = async function (piece) {
  let localPiece = PIECES.find(p => p.id == piece.id);
  const index = PIECES.indexOf(localPiece);
  if (!piece.imageUpdated) {
    // use same image
    piece.image = localPiece.image;
  }
  localPiece = await Piece.fromObj(piece);
  PIECES.splice(index, 1, localPiece);

  if (isHost()) {
    for (var id of _connectedIds) {
      emitUpdatePieceEvent(id, localPiece);
    }
  }

  refreshCanvas();
}

const onNewPlayerEvent = async function (peerId, player) {
  if (!isHost()) {
    console.warn("only host should receive new player events");
    return;
  }
  _connectedIds.push(peerId);
  $("#list-connected-party-members").append(
    `<li class="list-group-item d-flex justify-content-between align-items-center">${player}
    <i class="text-success fa-solid fa-circle fa-sm"></i>
  </li>`)

  emitConnectedToHostEvent(peerId);
  emitChangeBackgroundEvent(peerId, _bgImgUrl);
  await emitGridSizeChangeEvent(peerId);
  for (var piece of PIECES) {
    emitAddPieceEvent(peerId, piece);
  }
}

const onGridChangeEvent = function (gridSize) {
  _gridSizeRatio = gridSize;
  for (var piece of PIECES) {
    piece.updateSize();
  }
  refreshCanvas();
}

const initParty = function () {
  let mode = Number(document.querySelector('input[name="radio-party"]:checked').value);
  let partyId = document.getElementById("input-party-id").value;
  _playerName = document.getElementById("input-player-name").value;

  if (mode == 0) {
    // host mode
    _peer = new Peer(partyId);
  }
  else if (mode == 1) {
    // player mode
    _host = partyId;
    _peer = new Peer();

    // hide buttons for players
    var btnChangeBg = document.getElementById("btn-change-bg");
    btnChangeBg.setAttribute("style", "display: none");
    btnChangeBg.setAttribute("disabled", "disabled");

    var rangeGridSize = document.getElementById("range-grid-size");
    rangeGridSize.parentNode.setAttribute("style", "display: none");
    rangeGridSize.setAttribute("disabled", "disabled");

    var listPartyMembers = document.getElementById("list-connected-party-members");
    listPartyMembers.parentNode.setAttribute("style", "display: none");
  }

  _peer.on('open', function (id) {
    console.log('My peer ID is: ' + id);
    if (!isHost()) {
      // say hello to host
      var conn = _peer.connect(_host);
      conn.on('open', function () {
        conn.send({
          event: EventTypes.NewPlayer,
          player: _playerName
        });
      });
    }
  });

  _peer.on('connection', function (conn) {
    conn.on('data', function (data) {
      switch (data.event) {
        case EventTypes.AddPiece:
          onAddPieceEvent(data.piece);
          break;
        case EventTypes.MovePiece:
          onMovePieceEvent(data.movedPiece);
          break;
        case EventTypes.UpdatePiece:
          onUpdatePieceEvent(data.piece);
          break;
        case EventTypes.DeletePiece:
          onDeletePieceEvent(data.id);
          break;
        case EventTypes.RequestPiece:
          onRequestPieceEvent(conn.peer, data.id);
          break;
        case EventTypes.NewPlayer:
          onNewPlayerEvent(conn.peer, data.player);
          break;
        case EventTypes.ChangeBackground:
          onChangeBackgroundEvent(data.url, data.isVideo);
          break;
        case EventTypes.GridChange:
          onGridChangeEvent(data.gridSize);
          break;
        case EventTypes.ConnectedToHost:
          onConnectedToHostEvent(data.host);
          break;
        default:
          console.log("unrecognized event type: " + data.event);
          break;
      }
    });
  });

  bootstrap.Modal.getInstance(document.getElementById('modal-party')).hide();
}

const onGridSizeInput = function () {
  if (!isHost()) return;
  const input = document.getElementById('range-grid-size');
  const label = document.querySelector('label[for="range-grid-size"]');
  const value = input.value;

  label.innerHTML = `Grid Size: ${value}</span>`
}

const getCurrentCanvasWidth = function () {
  return Number(getComputedStyle(document.getElementById("canvas")).width.replace("px", ""));
}

const getCurrentCanvasHeight = function () {
  return Number(getComputedStyle(document.getElementById("canvas")).height.replace("px", ""));
}

const onGridSizeChange = function () {
  if (!isHost()) return;
  const input = document.getElementById('range-grid-size');
  let newGridSize = Number(input.value) / getCurrentCanvasWidth();
  onGridChangeEvent(newGridSize);

  // broadcast grid change
  for (var id of _connectedIds) {
    emitGridSizeChangeEvent(id);
  }
}

window.onload = function () {
  bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-party')).show();

  var can = document.getElementById('canvas');
  can.width = window.innerWidth;
  can.height = window.innerHeight;
  _ctx = can.getContext('2d');

  var ro = new ResizeObserver(e => {
    let previousWidth = _ctx.canvas.width;

    _ctx.canvas.width = window.innerWidth;
    _ctx.canvas.height = window.innerHeight;
    refreshCanvas();
  });
  
  // Observe one or multiple elements
  ro.observe(document.body);

  document.getElementById("piece-menu").addEventListener("hide.bs.offcanvas", () => {
    // reset piece form
    _pieceInMenu = null;
    $("#piece-menu-status-conditions").tagsinput("removeAll");
    const imgInput = document.getElementById("piece-menu-image-input");
    imgInput.value = null;
    imgInput.type = "text";
    imgInput.type = "file";
  });
  document.getElementById('btn-modal-piece-ok').addEventListener('click', () => onAddPieceSubmit());
  document.getElementById('btn-modal-bg-ok').addEventListener('click', () => onChangeBackgroundSubmit());
  document.getElementById("btn-update-piece").addEventListener("click", () => onUpdatePieceSubmit());
  document.getElementById('btn-modal-party-ok').addEventListener('click', () => initParty());
  document.getElementById('range-grid-size').addEventListener('input', () => onGridSizeInput());
  document.getElementById('range-grid-size').addEventListener('change', () => onGridSizeChange());
  document.getElementById('btn-delete-piece').addEventListener("click", () => onDeletePieceSubmit());
  $('input[type="radio"][name="radio-bg-type"]').on('change', () => onBackgroundTypeChange());
  document.getElementById("modal-piece").addEventListener('shown.bs.modal', function () {
    bootstrap.Offcanvas.getInstance(document.getElementById('main-menu')).hide();
  });
  document.getElementById("modal-bg").addEventListener('shown.bs.modal', function () {
    bootstrap.Offcanvas.getInstance(document.getElementById('main-menu')).hide();
  });

  var draggedPiece = null;
  can.addEventListener('mousedown', function (args) {
    if (args.button == 0) // left click
      draggedPiece = shapeIntersects(args.x, args.y);
  });
  can.addEventListener('mousemove', function (args) {
    if (draggedPiece != null) {
      draggedPiece.x = (args.x - parseInt(draggedPiece.width / 2)) / getCurrentCanvasWidth();
      draggedPiece.y = (args.y - parseInt(draggedPiece.height / 2)) / getCurrentCanvasHeight();
      refreshCanvas();
    }
  });
  can.addEventListener('mouseup', function () {
    if (draggedPiece == null) return;
    let movedPiece = { ...draggedPiece };

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
    _pieceInMenu = shapeIntersects(e.clientX, e.clientY);
    if (_pieceInMenu) {
      // open piece submenu
      const pieceMenu = new bootstrap.Offcanvas(document.getElementById("piece-menu"));
      pieceMenu.show();
      document.getElementById("piece-menu-name").value = _pieceInMenu.name;
      document.getElementById("piece-menu-image").src = _pieceInMenu.image.src;
      document.getElementById("piece-menu-dead").checked = _pieceInMenu.dead;
      document.querySelectorAll("input[name='radio-piece-menu-size']").forEach(x => x.removeAttribute("checked"));
      document.querySelector(`input[name='radio-piece-menu-size'][value='${_pieceInMenu.size}']`).setAttribute("checked", "checked");
      $("#piece-menu-status-conditions").tagsinput('removeAll');
      for (var cond of _pieceInMenu.statusConditions) {
        $("#piece-menu-status-conditions").tagsinput('add', cond);
      }
    }
  });
}