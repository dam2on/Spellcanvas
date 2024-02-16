PARTY = null;
CURRENT_SCENE = null;

_player = null;
_peer = null;
_host = null;

_pieceInMenu = null;
_spellRuler = null;
_draggedPiece = null;

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

const shapeIntersects = function (x, y) {
  let xInts = false;
  let yInts = false;

  for (var piece of CURRENT_SCENE.pieces) {
    let shapeX = piece.getX();
    let shapeY = piece.getY();
    xInts = x >= shapeX && x <= (shapeX + piece.width);
    if (xInts) {
      yInts = y >= shapeY && y <= (shapeY + piece.height);
      if (yInts) {
        // check permission
        if (!isHost() && piece.owner != _player.id) {
          if (PARTY.getPermissionValue(PermissionType.OnlyMoveOwnedPieces)) continue;
        }
        return piece;
      }
    }
    xInts = false;
  }
  return null;
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
        CURRENT_SCENE.setBackground(new Background(BackgroundType.Image, dataUrl));
        onChangeBackgroundEvent();
        for (var player of PARTY.players) {
          emitChangeBackgroundEvent(player.id);
        }
      });
      break;
    case BackgroundType.Video:
      const videoUrl = document.getElementById('input-bg-video').value;
      CURRENT_SCENE.setBackground(new Background(BackgroundType.Video, videoUrl));
      onChangeBackgroundEvent();
      for (var player of PARTY.players) {
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

    // erase ruler from canvas
    CURRENT_SCENE.drawPieces();
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

const onQuickAdd = function (args) {
  const piece = new Piece(newGuid(), _peer.id, "orc", $(this).find('img')[0].src, PieceSizes.Medium);
  CURRENT_SCENE.addPiece(piece);

  piece.image.addEventListener('load', async () => {
    piece.draw();
    await CURRENT_SCENE.savePieces();
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-piece')).hide();
    initGamePieceTour(piece);
  });


  if (isHost()) {
    for (var player of PARTY.players) {
      emitAddPieceEvent(player.id, piece);
    }
  }
  else {
    emitAddPieceEvent(_host, piece);
  }
}

const onAddPieceSubmit = async function () {
  const modalPieceInputs = document.getElementById('form-modal-piece').getElementsByTagName('input');
  const name = modalPieceInputs[0].value;
  const img = modalPieceInputs[1].files[0];
  const size = document.querySelector('input[name="radio-piece-size"]:checked').value;

  const piece = new Piece(newGuid(), _peer.id, name, img, size);
  CURRENT_SCENE.addPiece(piece);

  piece.image.addEventListener('load', async () => {
    piece.draw();
    await CURRENT_SCENE.savePieces();
    initGamePieceTour(piece);
    modalPieceInputs[0].value = null;
    modalPieceInputs[1].value = null;
    modalPieceInputs[1].type = "text";
    modalPieceInputs[1].type = "file";

    if (isHost()) {
      for (var player of PARTY.players) {
        emitAddPieceEvent(player.id, piece);
      }
    }
    else {
      emitAddPieceEvent(_host, piece);
    }
    bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-piece')).hide();
  });
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
    await CURRENT_SCENE.savePieces();

    for (var player of PARTY.players) {
      emitUpdatePieceEvent(player.id, _pieceInMenu);
    }
  }
  else {
    emitUpdatePieceEvent(_host, _pieceInMenu);
  }

  CURRENT_SCENE.drawPieces();
  bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('piece-menu')).hide();
}

const onDeletePieceSubmit = function () {
  if (_pieceInMenu == null) return;
  if (confirm("Delete piece: " + _pieceInMenu.name + "?")) {
    CURRENT_SCENE.deletePiece(_pieceInMenu);
    CURRENT_SCENE.drawPieces();

    if (isHost()) {
      for (var player of PARTY.players) {
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
    await CURRENT_SCENE.savePieces();
  }
}

const onResetPiecesEvent = function () {
  CURRENT_SCENE.clearPieces();
  CURRENT_SCENE.drawPieces();

  if (isHost()) {
    for (var player of PARTY.players) {
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

const onPermissionsUpdateEvent = function (permissions) {
  PARTY.permissions = permissions;
}

const onLoadSceneEvent = async function (scene) {
  CURRENT_SCENE = await Scene.fromObj(scene);
  CURRENT_SCENE.draw();
}

const emitLoadSceneEvent = function (peerId) {
  var conn = _peer.connect(peerId);
  conn.on('open', function () {
    conn.send({
      event: EventTypes.LoadScene,
      scene: CURRENT_SCENE.pureJson()
    });
  });
}

const emitChangeBackgroundEvent = function (peerId) {
  var conn = _peer.connect(peerId);
  conn.on('open', function () {
    conn.send({ event: EventTypes.ChangeBackground, background: CURRENT_SCENE.background });
  });
}

const emitAddPieceEvent = function (peerId, piece) {
  var conn = _peer.connect(peerId);
  let pieceCopy = { ...piece };
  pieceCopy.image = piece.image.src;
  pieceCopy.canvas = undefined;
  pieceCopy.ctx = undefined;
  conn.on('open', function () {
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
        gridSize: CURRENT_SCENE.gridRatio
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

const emitPermissionsChangeEvent = function (peerId) {
  var conn = _peer.connect(peerId);
  conn.on('open', function () {
    conn.send({
      event: EventTypes.PermissionsUpdate,
      permissions: PARTY.permissions
    });
  });
}

const onPermissionsChange = async function () {
  if (!isHost()) return;

  PARTY.setPermission(PermissionType.OnlyMoveOwnedPieces, 'permissions-own-pieces', $('#permissions-own-pieces').prop('checked'));
  await PARTY.save();

  for (player of PARTY.players) {
    emitPermissionsChangeEvent(player.id)
  }
}

const onChangeBackgroundEvent = async function (obj = null) {
  if (obj != null) {
    CURRENT_SCENE.setBackground(obj);
  }

  CURRENT_SCENE.drawBackground();

  if (isHost()) {
    await CURRENT_SCENE.saveBackground();
  }
}

const onAddPieceEvent = async function (piece) {
  if (CURRENT_SCENE.getPieceById(piece.id) != null) {
    // redundant piece
    return;
  }

  const newPiece = await CURRENT_SCENE.addPiece(piece);

  if (isHost()) {
    updatePlayerDetails({ id: piece.owner }, newPiece);

    for (var player of PARTY.players) {
      emitAddPieceEvent(player.id, newPiece);
    }
    await CURRENT_SCENE.savePieces();
  }

  CURRENT_SCENE.drawPieces();
}

const onMovePieceEvent = async function (movedPiece) {
  let pieceToMove = CURRENT_SCENE.getPieceById(movedPiece.id);
  if (pieceToMove == null) {
    emitRequestPieceEvent(movedPiece.id);
    return;
  }
  pieceToMove.x = movedPiece.x;
  pieceToMove.y = movedPiece.y;

  if (isHost()) {
    for (var player of PARTY.players) {
      emitMovePieceEvent(player.id, pieceToMove);
    }

    await CURRENT_SCENE.savePieces();
  }

  CURRENT_SCENE.drawPieces();
}

const onDeletePieceEvent = async function (id) {
  let piece = CURRENT_SCENE.getPieceById(id);
  if (piece == null) return;

  CURRENT_SCENE.deletePiece(piece);
  CURRENT_SCENE.drawPieces();

  if (isHost()) {
    piece.deleteMe = true;
    updatePlayerDetails({ id: piece.owner }, piece);

    for (var player of PARTY.players) {
      emitDeletePieceEvent(player.id, id);
    }

    await CURRENT_SCENE.savePieces();
  }

}

const onRequestPieceEvent = function (peerId, id) {
  let piece = CURRENT_SCENE.getPieceById(id);
  emitAddPieceEvent(peerId, piece);
}

const onUpdatePieceEvent = async function (piece) {
  const updatedPiece = await CURRENT_SCENE.updatePiece(piece);

  if (isHost()) {
    updatePlayerDetails({ id: updatedPiece.owner }, updatedPiece);

    for (var player of PARTY.players) {
      emitUpdatePieceEvent(player.id, updatedPiece);
    }

    await CURRENT_SCENE.savePieces();
  }

  CURRENT_SCENE.drawPieces();
}

const onGridChangeEvent = async function (gridSize) {
  CURRENT_SCENE.gridRatio = gridSize;
  if (isHost()) {
    await CURRENT_SCENE.saveGrid();
  }

  if (_spellRuler instanceof Area) {
    _spellRuler.draw();
  }
  CURRENT_SCENE.drawPieces();
}

const onNewPlayerEvent = async function (player, isReconnect = false) {
  if (!isHost()) {
    console.warn("only host should receive new player events");
    return;
  }

  player = Player.fromObj(player);

  if (!isReconnect) {
    PARTY.addPlayer(player);
    await PARTY.save();
  }

  updatePlayerDetails(player);
  emitPermissionsChangeEvent(player.id);
  emitConnectedToHostEvent(player.id);
  emitLoadSceneEvent(player.id);
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
    for (var p of CURRENT_SCENE.pieces) {
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
      playerDiv.html(playerDiv.html() + `<img id="piece-icon-${piece.id}" title=${piece.name} style="width: 15px; object-fit: contain" src="${piece.image instanceof HTMLImageElement ? piece.image.src : piece.image}"></img>`)
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
    if (a.type == 'peer-unavailable') {
      console.warn('could not connect to peer ' + a.message);
      // TODO: change connect icon under party section
    }
    else {
      debugger;

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
        case EventTypes.LoadScene:
          onLoadSceneEvent(data.scene);
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

const displaySceneList = async function (scenePartials) {
  if (!!scenePartials.length) {
    for (var scene of scenePartials) {
      $('#scene-slider').append(`<div id=scene-${scene.id} class="col" onclick="onChangeScene('${scene.id}')">
      <img src=${scene instanceof Scene ? scene.background.url : scene.thumbnail}></img>
      </div>`);
    }
  }
}

const onAddScene = async function () {
  await CURRENT_SCENE.saveThumbnail();

  CURRENT_SCENE = new Scene(newGuid(), _host);
  await CURRENT_SCENE.saveScene();

  $('#scene-slider').append(`<div class="col" id=scene-${CURRENT_SCENE.id} onclick="onChangeScene('${CURRENT_SCENE.id}')">
    <img src="${CURRENT_SCENE.background.url}"></img>
  </div>`);

  CURRENT_SCENE.draw();
}

const onChangeScene = async function (id) {
  if (!isHost()) return;

  await CURRENT_SCENE.saveThumbnail();
  const scenePartials = await localforage.getItem(StorageKeys.Scenes);
  const sceneToLoad = scenePartials.find(sp => sp.id == id);
  if (sceneToLoad == null) {
    console.warn("can not find scene with id: " + id);
    return;
  }

  CURRENT_SCENE = await Scene.load(sceneToLoad);

  CURRENT_SCENE.draw();

  for (var player of PARTY.players) {
    emitLoadSceneEvent(player.id);
  }
}

const onDeleteScene = function (id) {

}

const restoreHostSession = async function () {
  const scenePartials = await localforage.getItem(StorageKeys.Scenes);
  if (!!scenePartials?.length && !!scenePartials.find(s => s.owner == _host)) {
    // load any scene
    const partialToLoad = scenePartials.find(s => s.owner == _host);
    CURRENT_SCENE = await Scene.load(partialToLoad);
    displaySceneList(scenePartials);
  }
  else {
    CURRENT_SCENE = new Scene(newGuid(), _host);
    await CURRENT_SCENE.saveScene();
    displaySceneList([CURRENT_SCENE]);
  }

  const partyVal = await localforage.getItem(`${StorageKeys.Party}-${_host}`);
  if (partyVal != null) {
    PARTY = Party.fromObj(partyVal);
    for (var player of PARTY.players) {
      updatePlayerDetails(player);
    }
    for (var permission of PARTY.permissions) {
      document.getElementById(permission.elementId).checked = permission.value;
    }
  }
  else {
    PARTY = new Party(_host);
  }
}

const initPeer = function () {
  return new Promise(async function (resolve, reject) {
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
        initInviteLink();
        initPeerEvents();
        initMainMenuTour();
        resolve();
      });
    }
    else {
      // player mode
      _host = hostQueryParam;
      PARTY = new Party(_host);
      initInviteLink();

      const existingPlayer = await localforage.getItem(StorageKeys.Player);
      if (existingHostId != null && existingHostId == _host && existingPlayer != null) {
        _player = existingPlayer;
        _peer = new Peer(_player.id);
      }
      else {
        _peer = new Peer();
        await localforage.setItem(StorageKeys.HostId, _host);
      }

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
            resolve();
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
              resolve();
            });
          });
        }
      });
    }
  });
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

const onGridSizeChange = function () {
  if (!isHost()) return;
  $('.grid-indicator').hide();
  const input = document.getElementById('range-grid-size');
  let newGridSize = Number(input.value) / document.getElementById("canvas").width;
  onGridChangeEvent(newGridSize);

  // broadcast grid change
  for (var player of PARTY.players) {
    emitGridSizeChangeEvent(player.id);
  }
}

const initDom = function () {
  var can = document.getElementById('canvas');
  can.width = window.innerWidth;
  can.height = window.innerHeight;

  var ro = new ResizeObserver(e => {
    document.getElementById('canvas').width = window.innerWidth;
    document.getElementById('canvas').height = window.innerHeight;

    if (_spellRuler instanceof Area) {
      _spellRuler.draw();
    }
    CURRENT_SCENE?.drawPieces();
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
  // $('.quick-add').on('click', onQuickAdd);
  document.getElementById('btn-add-scene').addEventListener('click', onAddScene)
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

  can.addEventListener('mousedown', function (args) {
    if (args.button == 0) // left click
      _draggedPiece = shapeIntersects(args.x, args.y);
  });
  can.addEventListener('mousemove', function (args) {
    if (_draggedPiece != null) {
      $('.menu-toggle').hide(); // disable invisible menu toggle
      _draggedPiece.x = (args.x - parseInt(_draggedPiece.width / 2)) / document.getElementById("canvas").width;
      _draggedPiece.y = (args.y - parseInt(_draggedPiece.height / 2)) / document.getElementById("canvas").height;
      CURRENT_SCENE.drawPieces();
    }
    else if (_spellRuler != null) {
      CURRENT_SCENE.drawPieces();
      _spellRuler.x = args.x;
      _spellRuler.y = args.y;
      if (_spellRuler instanceof Area) {
        _spellRuler.draw();
      }
    }
  });
  can.addEventListener('wheel', function (args) {
    if (_spellRuler != null) {
      CURRENT_SCENE.drawPieces();
      _spellRuler.rotation += (Math.PI / 32 * (args.deltaY < 0 ? -1 : 1));
      if (_spellRuler instanceof Area) {
        _spellRuler.draw();
      }

    }
    else if (_draggedPiece != null) {
      _draggedPiece.rotation += (Math.PI / 32 * (args.deltaY < 0 ? -1 : 1));
      CURRENT_SCENE.drawPieces();
    }
  });
  can.addEventListener('mouseup', async function () {
    $('.menu-toggle').show(); // enable invisible menu toggle

    if (_draggedPiece == null) return;
    let movedPiece = { ..._draggedPiece };

    if (isHost()) {
      for (var player of PARTY.players) {
        emitMovePieceEvent(player.id, movedPiece);
      }

      await CURRENT_SCENE.savePieces();
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

window.onload = async function () {
  initDom();
  await initPeer();
  if (isHost()) {
    await restoreHostSession();
    CURRENT_SCENE.draw();
  }
}