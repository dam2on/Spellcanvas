
_pieces = [];
_party = [];
_permissions = [];
_gridSizeRatio = 0.025;
_background = null;

_player = null;
_spellRuler = null;
_peer = null;
_host = null;
_ctx = null;
_pieceInMenu = null;
_draggedPiece = null;

_canvasTextMargin = 3;


const isHost = function () {
  return _peer.id == _host;
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

const getPermissionValue = function(type) {
  return _permissions.find(p => p.type == type)?.value
}

const shapeIntersects = function (x, y) {
  let xInts = false;
  let yInts = false;

  for (var piece of _pieces) {
    let shapeX = piece.getX();
    let shapeY = piece.getY();
    xInts = x >= shapeX && x <= (shapeX + piece.width);
    if (xInts) {
      yInts = y >= shapeY && y <= (shapeY + piece.height);
      if (yInts) {
        // check permission
        if (!isHost() && piece.owner != _player.id) {
          if (getPermissionValue(PermissionType.OnlyMoveOwnedPieces)) continue;
        }
        return piece;
      }
    }
    xInts = false;
  }
  return null;
}

const refreshCanvas = function () {

  _ctx.clearRect(0, 0, _ctx.canvas.width, _ctx.canvas.height);
  _ctx.textBaseline = "bottom";

  for (var piece of _pieces) {
    piece.draw(_ctx);
  }

  if (_spellRuler instanceof Area) {
    _spellRuler.draw(_ctx);
  }
}

const savePieces = async function () {
  const piecesJson = [];
  for (var piece of _pieces) {
    let pieceCopy = { ...piece };
    pieceCopy.image = piece.image.src;
    piecesJson.push(pieceCopy);
  }

  await localforage.setItem(StorageKeys.Pieces, piecesJson);
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

const onBackgroundTypeChange = function () {
  const bgType = document.querySelector('input[type="radio"][name="radio-bg-type"]:checked').value;
  switch (bgType) {
    case BackgroundType.Image:
      document.getElementById("input-bg-video").parentNode.setAttribute("style", "display: none;");
      document.getElementById("input-bg-image").parentNode.removeAttribute("style");
      break;
    case BackgroundType.Video:
      document.getElementById("input-bg-image").parentNode.setAttribute("style", "display: none;");
      document.getElementById("input-bg-video").parentNode.removeAttribute("style");
      break;
    default:
      console.warn("background type not recognized: " + bgType);
      break;
  }
}

const onChangeBackgroundSubmit = function () {
  if (!isHost()) {
    console.warn("only host can change bg");
    return;
  }

  const bgType = document.querySelector('input[type="radio"][name="radio-bg-type"]:checked').value;

  switch (bgType) {
    case BackgroundType.Image:
      const bgImg = document.getElementById('input-bg-image').files[0];
      Promise.resolve(toBase64(bgImg)).then((dataUrl) => {
        _background = new Background(BackgroundType.Image, dataUrl);
        onChangeBackgroundEvent();
        for (var player of _party) {
          emitChangeBackgroundEvent(player.id);
        }
      });
      break;
    case BackgroundType.Video:
      const videoUrl = document.getElementById('input-bg-video').value;
      _background = new Background(BackgroundType.Video, videoUrl);
      onChangeBackgroundEvent();
      for (var player of _party) {
        emitChangeBackgroundEvent(player.id);
      }
      break;
    default:
      console.warn("background type not recognized: " + bgType);
      break;
  }

  bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-bg')).hide();
}

const onSpellRulerToggle = function (args) {
  const type = $(this).val();
  const sizeInput = $('#input-spell-size');
  const sizeLabel = $('label[for="input-spell-size"]');

  if (_spellRuler != null && type == _spellRuler.type) {
    _spellRuler = null;
    sizeInput.hide();
    sizeLabel.hide();
    $(this).blur();
    $(this).focusout();

    // need to clear out existing image
    refreshCanvas();
  }
  else {
    _spellRuler = new Area(type, $('#input-spell-size').val() / 5);
    sizeInput.show();
    sizeLabel.show();
    switch (type) {
      case AreaType.Circle:
        sizeLabel.html("ft (radius)");
        break;
      default:
        sizeLabel.html("ft");
        break;
    }

    for (var at of $('#spell-ruler').find('input.btn-check')) {
      if (at != this) {
        $(at).prop('checked', false);
      }
    }
  }
}

const onSpellSizeChange = function (args) {
  if (_spellRuler == null) return;

  // a typical tabletop grid is 5 ft
  _spellRuler.updateSize(Number($(this).val()) / 5);
}

const onAddPieceSubmit = async function () {
  const modalPieceInputs = document.getElementById('form-modal-piece').getElementsByTagName('input');
  const name = modalPieceInputs[0].value;
  const img = modalPieceInputs[1].files[0];
  const size = document.querySelector('input[name="radio-piece-size"]:checked').value;

  const piece = new Piece(newGuid(), _peer.id, name, img, size);
  piece.image.addEventListener('load', async () => {
    piece.draw(_ctx);
    await savePieces();
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-piece')).hide();
    initGamePieceTour(piece);
    modalPieceInputs[0].value = null;
    modalPieceInputs[1].value = null;
    modalPieceInputs[1].type = "text";
    modalPieceInputs[1].type = "file";
  });

  _pieces.push(piece);

  if (isHost()) {
    for (var player of _party) {
      emitAddPieceEvent(player.id, piece);
    }
  }
  else {
    emitAddPieceEvent(_host, piece);
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
  _pieceInMenu.updateConditions(statusConds);
  if (image != null) {
    await _pieceInMenu.updateImage(image);
    _pieceInMenu.imageUpdated = true;
  }

  if (isHost()) {
    await savePieces();

    for (var player of _party) {
      emitUpdatePieceEvent(player.id, _pieceInMenu);
    }
  }
  else {
    emitUpdatePieceEvent(_host, _pieceInMenu);
  }

  refreshCanvas();
  bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('piece-menu')).hide();
}

const onDeletePieceSubmit = function () {
  if (_pieceInMenu == null) return;
  if (confirm("Delete piece: " + _pieceInMenu.name + "?")) {
    let index = _pieces.indexOf(_pieceInMenu);
    _pieces.splice(index, 1);
    refreshCanvas();

    if (isHost()) {
      for (var player of _party) {
        emitDeletePieceEvent(player.id, _pieceInMenu.id);
      }
    }
    else {
      emitDeletePieceEvent(_host, _pieceInMenu.id);
    }

    bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('piece-menu')).hide();
  }
}

const onResetPiecesSubmit = async function () {
  if (!isHost()) return;
  if (confirm("Are you sure you want to remove all pieces from the board?")) {
    onResetPiecesEvent();
    await savePieces();
  }
}

const onResetPiecesEvent = function () {
  _pieces = [];
  refreshCanvas();

  if (isHost()) {
    for (var player of _party) {
      emitResetPiecesEvent(player.id);
    }
  }
}

const onConnectedToHostEvent = function (host) {
  if (isHost()) {
    console.warn("only non-host can recieve this 'connected to host' event");
    return;
  }

  alert(`Successfully connected to ${host}'s party!`);
}

const onPermissionsUpdateEvent = function(permissions) {
  _permissions = permissions;
}

const emitChangeBackgroundEvent = function (peerId) {
  if (_background == null) return;

  var conn = _peer.connect(peerId);
  conn.on('open', function () {
    conn.send({ event: EventTypes.ChangeBackground, background: _background });
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

const emitResetPiecesEvent = function (peerId) {
  var conn = _peer.connect(peerId);
  conn.on('open', function () {
    conn.send({
      event: EventTypes.ResetPieces
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
      host: "host"
    });
  });
}

const onPermissionsChange = async function() {
  if (!isHost()) return;

  _permissions = [
    {
      type: PermissionType.OnlyMoveOwnedPieces,
      elementId: 'permissions-own-pieces',
      value: $('#permissions-own-pieces').prop('checked')
    }
  ]

  await localforage.setItem(StorageKeys.Permissions, _permissions);


  for (player of _party) {
    emitPermissionsChangeEvent(player.id)
  }
}

const emitPermissionsChangeEvent = function (peerId) {
  var conn = _peer.connect(peerId);
  conn.on('open', function () {
    conn.send({
      event: EventTypes.PermissionsUpdate,
      permissions: _permissions
    });
  });
}

const onChangeBackgroundEvent = async function (obj = null) {
  if (obj != null) {
    _background = Background.fromObj(obj);
  }

  _background.apply();

  if (isHost()) {
    await localforage.setItem(StorageKeys.Background, _background);
  }
}

const onAddPieceEvent = async function (piece) {
  if (_pieces.find(p => p.id == piece.id) != null) {
    // redundant piece
    return;
  }

  let newPiece = await Piece.fromObj(piece);
  _pieces.push(newPiece);

  if (isHost()) {
    updatePlayerDetails({ id: piece.owner }, piece);

    for (var player of _party) {
      emitAddPieceEvent(player.id, newPiece);
    }
    await savePieces();
  }

  refreshCanvas();
}

const onMovePieceEvent = async function (movedPiece) {
  let pieceToMove = _pieces.find(p => p.id == movedPiece.id);
  if (pieceToMove == null) {
    emitRequestPieceEvent(movedPiece.id);
    return;
  }
  pieceToMove.x = movedPiece.x;
  pieceToMove.y = movedPiece.y;

  if (isHost()) {
    for (var player of _party) {
      emitMovePieceEvent(player.id, pieceToMove);
    }

    await savePieces();
  }

  refreshCanvas();
}

const onDeletePieceEvent = async function (id) {
  let piece = _pieces.find(p => p.id == id);
  if (piece == null) return;

  let index = _pieces.indexOf(piece);
  _pieces.splice(index, 1);
  if (isHost()) {
    piece.deleteMe = true;
    updatePlayerDetails({ id: piece.owner }, piece);

    for (var player of _party) {
      emitDeletePieceEvent(player.id, id);
    }

    await savePieces();
  }
  refreshCanvas();
}

const onRequestPieceEvent = function (peerId, id) {
  let piece = _pieces.find(p => p.id == id);
  emitAddPieceEvent(peerId, piece);
}

const onUpdatePieceEvent = async function (piece) {
  let localPiece = _pieces.find(p => p.id == piece.id);
  const index = _pieces.indexOf(localPiece);
  if (!piece.imageUpdated) {
    // use same image
    piece.image = localPiece.image;
  }
  localPiece = await Piece.fromObj(piece);
  _pieces.splice(index, 1, localPiece);

  if (isHost()) {
    updatePlayerDetails({ id: piece.owner }, piece);

    for (var player of _party) {
      emitUpdatePieceEvent(player.id, localPiece);
    }

    await savePieces();
  }

  refreshCanvas();
}

const onGridChangeEvent = async function (gridSize) {
  _gridSizeRatio = gridSize;
  if (isHost()) {
    await localforage.setItem(StorageKeys.GridRatio, _gridSizeRatio);
  }
  for (var piece of _pieces) {
    piece.updateSize();
  }
  if (_spellRuler instanceof Area) {
    _spellRuler.updateSize();
  }
  refreshCanvas();
}

const onNewPlayerEvent = async function (player, isReconnect = false) {
  if (!isHost()) {
    console.warn("only host should receive new player events");
    return;
  }

  player = Player.fromObj(player);

  if (!isReconnect) {
    _party.push(player);
    await localforage.setItem(StorageKeys.Party, _party);
  }

  updatePlayerDetails(player);
  emitPermissionsChangeEvent(player.id);
  emitConnectedToHostEvent(player.id);
  emitChangeBackgroundEvent(player.id);
  await emitGridSizeChangeEvent(player.id);
  for (var piece of _pieces) {
    emitAddPieceEvent(player.id, piece);
  }
}

const updatePlayerDetails = async function (player, piece = null) {
  let playerDiv = $(`#player-${player.id}`);
  if (!playerDiv.length) {
    $("#empty-party-msg").html('Members');
    $("#list-connected-party-members").append(
      `<li class="list-group-item d-flex justify-content-between align-items-center" id=player-${player.id}>
      <i class="text-success fa-solid fa-circle fa-sm"></i>
      ${player.name}
    </li>`);
    playerDiv = $(`#player-${player.id}`);
    for (var p of _pieces) {
      if (p.owner == player.id) {
        if (playerDiv.children().length >= 10) return;
        playerDiv.html(playerDiv.html() + `<img id="piece-icon-${p.id}" title="${p.name}" style="width: 15px; object-fit: contain" src="${p.image instanceof HTMLImageElement ? p.image.src : p.image}"></img>`)
      }
    }
  }
  else if (piece != null) {
    const pieceIcon = $('#piece-icon-' + piece.id);
    if (pieceIcon.length) {
      if (piece.deleteMe) {
        pieceIcon.remove();
      }
      else {
        pieceIcon.attr('src', piece.image instanceof HTMLImageElement ? piece.image.src : piece.image);
        pieceIcon.attr('title', piece.name);
      }
    }
    else {
      if (playerDiv.children().length >= 10) return;
      playerDiv.html(playerDiv.html() + `<img id="piece-icon-${p.id}" title=${piece.name} style="width: 15px; object-fit: contain" src="${piece.image instanceof HTMLImageElement ? piece.image.src : piece.image}"></img>`)
    }
  }
}

const initInviteLink = function () {
  $('#input-invite-link').val(window.location.origin + window.location.pathname.replace(/\/+$/, '') + `?host=${encodeURI(_host)}`);
  $("#btn-copy-invite-link").click(async function () {
    var popover = bootstrap.Popover.getOrCreateInstance(this);
    await navigator.clipboard.writeText($('#input-invite-link').val());
    popover.show();
  });

  $("#btn-copy-invite-link").on('blur focusout', function () {
    var popover = bootstrap.Popover.getOrCreateInstance(this);
    popover.hide();
  });
}

const initPeerEvents = function () {
  _peer.on('disconnected', function (a, e, i) {
    debugger;
  });

  _peer.on('error', function (a, e, i) {
    debugger;
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
        case EventTypes.ResetPieces:
          onResetPiecesEvent();
          break;
        case EventTypes.RequestPiece:
          onRequestPieceEvent(conn.peer, data.id);
          break;
        case EventTypes.NewPlayer:
          onNewPlayerEvent(data.player);
          break;
        case EventTypes.PlayerReconnected:
          onNewPlayerEvent(data.player, true);
          break;
        case EventTypes.ChangeBackground:
          onChangeBackgroundEvent(data.background);
          break;
        case EventTypes.GridChange:
          onGridChangeEvent(data.gridSize);
          break;
        case EventTypes.ConnectedToHost:
          onConnectedToHostEvent(data.host);
          break;
        case EventTypes.PermissionsUpdate:
          onPermissionsUpdateEvent(data.permissions);
          break;
        default:
          console.log("unrecognized event type: " + data.event);
          break;
      }
    });
  });

  _peer.on('close', function (e, a) {
    console.log('peer closed');
    debugger;
  });

  _peer.on('disconnect', function (e, a) {
    console.log('peer disconnect');
    debugger;
  });
}

const restoreHostSession = async function () {

  const val = await localforage.getItem(StorageKeys.Pieces);
  if (val != null) {
    for (var peice of val) {
      _pieces.push(await Piece.fromObj(peice));
    }
  }

  const restoreGridPromise = new Promise(async function (resolve, reject) {
    const val = await localforage.getItem(StorageKeys.GridRatio);
    if (val != null) {
      _gridSizeRatio = val;
      const pixelVal = _gridSizeRatio * getCurrentCanvasWidth();
      $('#range-grid-size').val(pixelVal);
      $('label[for="range-grid-size"]').html(`<i class="fa-solid fa-border-none me-2"></i>Grid Size: ${pixelVal}`);
    }
    resolve();
  });
  const restoreBackgroundPromise = new Promise(async function (resolve, reject) {
    const val = await localforage.getItem(StorageKeys.Background);
    if (val != null) {
      await onChangeBackgroundEvent(val);
    }
    resolve();
  });
  const restorePartyPromise = new Promise(async function (resolve, reject) {
    const val = await localforage.getItem(StorageKeys.Party);
    if (val != null) {
      for (var player of val) {
        _party.push(Player.fromObj(player));
        updatePlayerDetails(player);
      }
    }
    resolve();
  });
  const restorePermissionsPromise = new Promise(async function(resolve, reject) {
    const val = await localforage.getItem(StorageKeys.Permissions);
    if (val != null) {
      _permissions = val;
      for (var p of _permissions) {
        document.getElementById(p.elementId).checked = p.value;
      }
    }
    resolve();
  })

  await Promise.all([restorePartyPromise, restoreBackgroundPromise, restorePermissionsPromise, restoreGridPromise]).then(() => refreshCanvas());
}

const initParty = async function () {
  let hostQueryParam = new URLSearchParams(window.location.search).get("host");
  const existingHostId = await localforage.getItem(StorageKeys.HostId);

  if (hostQueryParam == null) {
    // host mode

    if (existingHostId != null) {
      _peer = new Peer(existingHostId);
      _peer.reconnect();
    }
    else {
      _peer = new Peer();
    }

    _peer.on('open', async function (id) {
      _host = id;
      await localforage.setItem(StorageKeys.HostId, _host);
      if (existingHostId != null) {
        await restoreHostSession();
      }
      initInviteLink();
      initPeerEvents();
      initMainMenuTour();
    });
  }
  else {
    // player mode
    const existingPlayer = await localforage.getItem(StorageKeys.Player);
    if (existingHostId != null && existingHostId == hostQueryParam && existingPlayer != null) {
      _player = existingPlayer;
      _peer = new Peer(_player.id);
    }
    else {
      _peer = new Peer();
      await localforage.setItem(StorageKeys.HostId, hostQueryParam);
    }

    _host = hostQueryParam;
    initInviteLink();

    // hide buttons for players
    var btnChangeBg = document.getElementById("btn-change-bg");
    btnChangeBg.setAttribute("style", "display: none");
    btnChangeBg.setAttribute("disabled", "disabled");

    var rangeGridSize = document.getElementById("range-grid-size");
    rangeGridSize.parentNode.setAttribute("style", "display: none");
    rangeGridSize.setAttribute("disabled", "disabled");

    var btnResetPieces = document.getElementById("btn-reset-pieces");
    btnResetPieces.parentNode.setAttribute("style", "display: none");
    btnResetPieces.setAttribute("disabled", "disabled");

    var listPartyMembers = document.getElementById("list-connected-party-members");
    listPartyMembers.parentNode.setAttribute("style", "display: none");

    // initial peer open
    _peer.on('open', function (id) {
      console.log('My peer ID is: ' + id);
      initPeerEvents();
      if (_player != null) {
        var conn = _peer.connect(_host);
        conn.on('open', function () {
          conn.send({
            event: EventTypes.PlayerReconnected,
            player: _player
          });
        });
      }
      else {
        var playerModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-player'));
        playerModal.show();

        $("#modal-player").on('hidden.bs.modal', async function () {
          const playerName = $("#input-player-name").val();
          initMainMenuTour(false);

          _player = new Player(id, playerName);
          await localforage.setItem(StorageKeys.Player, _player);

          var conn = _peer.connect(_host);
          conn.on('open', function () {
            conn.send({
              event: EventTypes.NewPlayer,
              player: _player
            });
          });
        });
      }
    });
  }
}

const onGridSizeInput = function () {
  if (!isHost()) return;
  const input = document.getElementById('range-grid-size');
  const label = document.querySelector('label[for="range-grid-size"]');
  const value = input.value;

  $('.grid-indicator').show();
  $('.grid-indicator').css('width', value + 'px');
  $('.grid-indicator').css('height', value + 'px');
  label.innerHTML = `<i class="fa-solid fa-border-none me-2"></i>Grid Size: ${value}`
}

const getCurrentCanvasWidth = function () {
  return Number(getComputedStyle(document.getElementById("canvas")).width.replace("px", ""));
}

const getCurrentCanvasHeight = function () {
  return Number(getComputedStyle(document.getElementById("canvas")).height.replace("px", ""));
}

const onGridSizeChange = function () {
  if (!isHost()) return;
  $('.grid-indicator').hide();
  const input = document.getElementById('range-grid-size');
  let newGridSize = Number(input.value) / getCurrentCanvasWidth();
  onGridChangeEvent(newGridSize);

  // broadcast grid change
  for (var player of _party) {
    emitGridSizeChangeEvent(player.id);
  }
}

window.onload = async function () {
  await initParty();

  var can = document.getElementById('canvas');
  can.width = window.innerWidth;
  can.height = window.innerHeight;
  _ctx = can.getContext('2d');

  var ro = new ResizeObserver(e => {
    _ctx.canvas.width = window.innerWidth;
    _ctx.canvas.height = window.innerHeight;

    refreshCanvas();
  });

  // Observe one or multiple elements
  ro.observe(document.body);

  let menuToggleTimeout;
  $('.menu-toggle').on('mouseover', function () {
    if (_draggedPiece == null)
      menuToggleTimeout = setTimeout(() => {
        bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('main-menu')).show();
      }, 450);
  });
  $('.menu-toggle').on('mouseout', function () {
    clearTimeout(menuToggleTimeout);
  });
  document.getElementById("piece-menu").addEventListener("hide.bs.offcanvas", () => {
    // reset piece form
    _pieceInMenu = null;
    $("#piece-menu-status-conditions").tagsinput('removeAll')
    const imgInput = document.getElementById("piece-menu-image-input");
    imgInput.value = null;
    imgInput.type = "text";
    imgInput.type = "file";
  });

  $('#spell-ruler').find('input.btn-check').on('click', onSpellRulerToggle);
  $('#input-spell-size').on('change', onSpellSizeChange);
  document.getElementById('permissions-own-pieces').addEventListener('change', onPermissionsChange)
  document.getElementById('btn-modal-piece-ok').addEventListener('click', onAddPieceSubmit);
  document.getElementById('btn-modal-bg-ok').addEventListener('click', onChangeBackgroundSubmit);
  document.getElementById('btn-update-piece').addEventListener('click', onUpdatePieceSubmit);
  document.getElementById('range-grid-size').addEventListener('input', onGridSizeInput);
  document.getElementById('range-grid-size').addEventListener('change', onGridSizeChange);
  document.getElementById('btn-delete-piece').addEventListener("click", onDeletePieceSubmit);
  document.getElementById('btn-reset-pieces').addEventListener("click", onResetPiecesSubmit);
  $('input[type="radio"][name="radio-bg-type"]').on('change', onBackgroundTypeChange);
  document.getElementById("modal-piece").addEventListener('shown.bs.modal', function () {
    // TODO: Clear image input
    bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('main-menu')).hide();
  });
  document.getElementById("modal-bg").addEventListener('shown.bs.modal', function () {
    // TODO: Clear image input
    bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('main-menu')).hide();
  });

  // _spellRuler = new Area(AreaType.Cone, 12);
  can.addEventListener('mousedown', function (args) {
    if (args.button == 0) // left click
      _draggedPiece = shapeIntersects(args.x, args.y);
  });
  can.addEventListener('mousemove', function (args) {
    if (_draggedPiece != null) {
      $('.menu-toggle').hide(); // disable invisible menu toggle
      _draggedPiece.x = (args.x - parseInt(_draggedPiece.width / 2)) / getCurrentCanvasWidth();
      _draggedPiece.y = (args.y - parseInt(_draggedPiece.height / 2)) / getCurrentCanvasHeight();
      refreshCanvas();
    }
    else if (_spellRuler != null) {
      _spellRuler.x = args.x;
      _spellRuler.y = args.y;
      refreshCanvas();
    }
  });
  can.addEventListener('wheel', function (args) {
    if (_spellRuler != null) {
      _spellRuler.rotation += (Math.PI / 32 * (args.deltaY < 0 ? -1 : 1));
      refreshCanvas();
    }
    else if (_draggedPiece != null) {
      _draggedPiece.rotation += (Math.PI / 32 * (args.deltaY < 0 ? -1 : 1));
      refreshCanvas();
    }
  });
  can.addEventListener('mouseup', async function () {
    $('.menu-toggle').show(); // enable invisible menu toggle

    if (_draggedPiece == null) return;
    let movedPiece = { ..._draggedPiece };

    if (isHost()) {
      for (var player of _party) {
        emitMovePieceEvent(player.id, movedPiece);
      }

      await savePieces();
    }
    else {
      emitMovePieceEvent(_host, movedPiece);
    }

    _draggedPiece = null;
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
      $('input[name="radio-piece-menu-size"]').prop('checked', false);
      $(`input[name='radio-piece-menu-size'][value='${_pieceInMenu.size}']`).prop("checked", true);
      $("#piece-menu-status-conditions").tagsinput('removeAll')
      for (var cond of _pieceInMenu.conditions) {
        $("#piece-menu-status-conditions").tagsinput('add', cond);
      }
    }
  });
}