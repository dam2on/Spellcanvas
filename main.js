PARTY = null;
CURRENT_SCENE = null;

_player = null;
_peer = null;
_host = null;

_pieceInMenu = null;
_spellRuler = null;
_draggedPiece = null;
_forceHideRoutes = false;

const isHost = function () {
  return _peer.id == _host;
}

const shapeIntersects = function (x, y) {
  for (var piece of CURRENT_SCENE.pieces) {
    if (piece.intersects(x, y)) {
      if (!isHost() && piece.owner != _player.id) {
        if (PARTY.getPermissionValue(PermissionType.OnlyMoveOwnedPieces)) continue;
      }

      return piece;
    }
  }
  return null;
}

const onBackgroundTypeChange = function () {
  const bgType = document.querySelector('input[type="radio"][name="radio-bg-type"]:checked').value;
  switch (bgType) {
    case BackgroundType.Image:
      document.getElementById("input-bg-video").removeAttribute("required");
      document.getElementById("input-bg-image").setAttribute("required", "required");

      document.getElementById("input-bg-video").parentNode.setAttribute("style", "display: none;");
      document.getElementById("input-bg-image").parentNode.removeAttribute("style");
      break;
    case BackgroundType.Video:
      document.getElementById("input-bg-image").removeAttribute("required");
      document.getElementById("input-bg-video").setAttribute("required", "required");

      document.getElementById("input-bg-image").parentNode.setAttribute("style", "display: none;");
      document.getElementById("input-bg-video").parentNode.removeAttribute("style");
      break;
    default:
      console.warn("background type not recognized: " + bgType);
      break;
  }
}

const onChangeBackgroundSubmit = function () {
  $('#form-modal-bg').removeClass('was-validated');
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

const onSpellRulerToggle = async function (args) {
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
    _spellRuler = new Area(newGuid(), _player?.id ?? _host, type, $('#input-spell-size').val() / 5);
    _spellRuler.color = await CURRENT_SCENE.background.getContrastColor();
    sizeInput.show();
    sizeLabel.show();
    switch (type) {
      case AreaType.Circle:
        sizeLabel.html("ft (diameter)");
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

  piece.imageEl.addEventListener('load', async () => {
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

const onChangeBackgroundModal = function () {
  bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('main-menu')).hide();
  bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-bg')).show();
}

const onAddPieceModal = function (initPos = null) {
  bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('main-menu')).hide();
  bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-piece')).show();

  if (initPos != null && !(initPos instanceof Event)) {
    $('#input-piece-init-pos-x').val(initPos.x);
    $('#input-piece-init-pos-y').val(initPos.y);
  }
}

const onAddPieceSubmit = async function (e) {
  // e.preventDefault();
  $('#form-modal-piece').removeClass('was-validated');
  const name = $('#input-piece-name').val();
  const img = $('#input-piece-img')[0].files[0];
  const size = document.querySelector('input[name="radio-piece-size"]:checked').value;
  const initPos = {
    x: Number($('#input-piece-init-pos-x').val() == '' ? 0.3 : $('#input-piece-init-pos-x').val()),
    y: Number($('#input-piece-init-pos-y').val() == '' ? 0.3 : $('#input-piece-init-pos-y').val())
  }

  const piece = new Piece(newGuid(), _peer.id, name, img, size, initPos.x, initPos.y);
  CURRENT_SCENE.addPiece(piece);

  piece.imageEl.addEventListener('load', async () => {
    piece.draw();
    await CURRENT_SCENE.savePieces();
    initGamePieceTour(piece);
    $('#input-piece-name').val(null);
    $('#input-piece-img').val('');
    $('#input-piece-img').attr('type', 'text');
    $('#input-piece-img').attr('type', 'file');
    $('#input-piece-init-pos-x').val(null);
    $('#input-piece-init-pos-y').val(null);

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

  if (_pieceInMenu instanceof Area) {
    const type = document.querySelector('input[name="radio-area-menu-type"]:checked').value;
    const size = document.getElementById("input-area-menu-size").value;
    const color = document.getElementById("input-area-menu-color").value;
    const opacity = document.getElementById("input-area-menu-opacity").value;
    _pieceInMenu.type = type;
    _pieceInMenu.size = Number(size) / 5;
    _pieceInMenu.color = color;
    _pieceInMenu.contrastColor = invertColor(_pieceInMenu.color);
    _pieceInMenu.opacity = opacity;
  }
  else {
    const name = document.getElementById("piece-menu-name").value;
    const size = document.querySelector('input[name="radio-piece-menu-size"]:checked').value;
    const statusConds = document.getElementById("piece-menu-status-conditions").value;
    const dead = document.getElementById("piece-menu-dead").checked;
    const image = document.getElementById("piece-menu-image-input").files[0];
    const auraEnabled = document.getElementById("checkbox-piece-menu-aura").checked;
    _pieceInMenu.name = name;
    _pieceInMenu.dead = dead;
    _pieceInMenu.updateSize(size);
    _pieceInMenu.updateConditions(statusConds);
    if (auraEnabled) {
      _pieceInMenu.aura = new Area(_pieceInMenu.id, _pieceInMenu.owner, $('#checkbox-piece-menu-aura').val(), $('#input-aura-menu-size').val() / 2.5, _pieceInMenu.x, _pieceInMenu.y);
      _pieceInMenu.aura.color = $('#input-aura-menu-color').val();
      _pieceInMenu.aura.contrastColor = invertColor(_pieceInMenu.aura.color);
      _pieceInMenu.aura.opacity = $('#input-aura-menu-opacity').val();
    }
    else {
      _pieceInMenu.aura = undefined;
    }
    if (image != null) {
      await _pieceInMenu.updateImage(image);
      _pieceInMenu.imageUpdated = true;
    }
  }

  CURRENT_SCENE.drawPieces();

  if (isHost()) {
    await CURRENT_SCENE.savePieces();

    for (var player of PARTY.players) {
      emitUpdatePieceEvent(player.id, _pieceInMenu);
    }
  }
  else {
    emitUpdatePieceEvent(_host, _pieceInMenu);
  }

  bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('piece-menu')).hide();
}

const onPieceAuraToggle = function (e) {
  const auraEnabled = $(this).prop('checked');
  if (auraEnabled) {
    $('.aura-only').show();
  }
  else {
    $('.aura-only').hide();

  }
}

const onDeletePieceSubmit = async function () {
  if (_pieceInMenu == null) return;
  if (confirm("Delete piece: " + _pieceInMenu.name + "?")) {
    CURRENT_SCENE.deletePiece(_pieceInMenu);
    CURRENT_SCENE.drawPieces();

    if (isHost()) {
      await CURRENT_SCENE.savePieces();

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

const onResetPiecesEvent = async function () {
  CURRENT_SCENE.clearPieces();
  CURRENT_SCENE.drawPieces();

  if (isHost()) {
    await CURRENT_SCENE.savePieces();

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

  loading(true);
  alert(`Successfully connected to ${host}'s party!`);
  initMainMenuTour(false);
}

const onPermissionsUpdateEvent = function (permissions) {
  PARTY.permissions = permissions;
}

const onLoadSceneEvent = async function (scene) {
  loading(true);
  CURRENT_SCENE = await Scene.fromObj(scene);
  CURRENT_SCENE.draw();
  loading(false);
}

const emitLoadSceneEvent = function (peerId) {
  var conn = _peer.connect(peerId);
  conn.on('open', function () {
    conn.send({
      event: EventTypes.LoadScene,
      scene: CURRENT_SCENE
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
  conn.on('open', function () {
    conn.send({ event: EventTypes.AddPiece, piece: piece });
  });
}

const emitMovePieceEvent = function (peerId, piece) {
  if (CURRENT_SCENE.getPieceById(piece.id) == null) return;
  const movedPiece = {
    id: piece.id,
    x: piece.x,
    y: piece.y,
    origin: piece.origin,
    rotation: piece.rotation
  }
  var conn = _peer.connect(peerId);
  conn.on('open', function () {
    conn.send({
      event: EventTypes.MovePiece,
      movedPiece: movedPiece
    });
  });
}

const emitDeletePieceEvent = function (peerId, id) {
  if (CURRENT_SCENE.getPieceById(id) == null) return;
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
  if (CURRENT_SCENE.getPieceById(piece.id) == null) return;
  let pieceCopy = { ...piece };
  if (!pieceCopy.imageUpdated) {
    // dont send image
    pieceCopy.image = undefined;
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

const onAddPieceEvent = async function (peerId, piece) {
  if (CURRENT_SCENE.getPieceById(piece.id) != null) {
    // redundant piece
    return;
  }

  const newPiece = await CURRENT_SCENE.addPiece(piece);
  CURRENT_SCENE.drawPieces();

  if (isHost()) {
    PARTY.getPlayer(newPiece.owner)?.updateOrCreateDom(CURRENT_SCENE.pieces);

    for (var player of PARTY.players) {
      if (player.id == peerId) continue;
      emitAddPieceEvent(player.id, newPiece);
    }
    await CURRENT_SCENE.savePieces();
  }
}

const onMovePieceEvent = async function (peerId, movedPiece) {
  let pieceToMove = CURRENT_SCENE.getPieceById(movedPiece.id);
  if (pieceToMove == null) {
    // emitRequestPieceEvent(movedPiece.id);
    return;
  }
  pieceToMove.x = movedPiece.x;
  pieceToMove.y = movedPiece.y;
  pieceToMove.rotation = movedPiece.rotation;
  pieceToMove.origin = movedPiece.origin;

  CURRENT_SCENE.bringPieceToFront(pieceToMove);
  CURRENT_SCENE.drawPieces();

  if (isHost()) {
    for (var player of PARTY.players) {
      if (player.id == peerId) continue;
      emitMovePieceEvent(player.id, pieceToMove);
    }

    await CURRENT_SCENE.savePieces();
  }
}

const onDeletePieceEvent = async function (peerId, id) {
  let piece = CURRENT_SCENE.getPieceById(id);
  if (piece == null) return;

  CURRENT_SCENE.deletePiece(piece);
  CURRENT_SCENE.drawPieces();

  if (isHost()) {
    PARTY.getPlayer(piece.owner)?.updateOrCreateDom(CURRENT_SCENE.pieces);

    for (var player of PARTY.players) {
      if (player.id == peerId) continue;
      emitDeletePieceEvent(player.id, id);
    }

    await CURRENT_SCENE.savePieces();
  }
}

const onRequestPieceEvent = function (peerId, id) {
  let piece = CURRENT_SCENE.getPieceById(id);
  emitAddPieceEvent(peerId, piece);
}

const onUpdatePieceEvent = async function (peerId, piece) {
  if (CURRENT_SCENE.getPieceById(piece.id) == null) return;
  const updatedPiece = await CURRENT_SCENE.updatePiece(piece);

  CURRENT_SCENE.drawPieces();

  if (isHost()) {
    $("#list-connected-party-members").append(PARTY.getPlayer(peerId).updateOrCreateDom(CURRENT_SCENE.pieces));

    for (var player of PARTY.players) {
      if (player.id == peerId) continue;
      emitUpdatePieceEvent(player.id, updatedPiece);
    }

    await CURRENT_SCENE.savePieces();
  }
}

const onGridChangeEvent = async function (gridSize) {
  CURRENT_SCENE.gridRatio = gridSize;

  if (_spellRuler instanceof Area) {
    _spellRuler.draw();
  }
  CURRENT_SCENE.drawPieces();

  if (isHost()) {
    await CURRENT_SCENE.saveGrid();
  }
}

const onPlayerJoinEvent = async function (player) {
  if (!isHost()) {
    console.warn("only host should receive new player events");
    return;
  }

  const existingPlayer = PARTY.getPlayer(player.id);
  if (existingPlayer != null) {
    existingPlayer.status = PlayerStatus.Connected;
  }
  else {
    player = Player.fromObj(player);
    player.status = PlayerStatus.Connected;

    PARTY.addPlayer(player);
    await PARTY.save();
  }

  $('#list-connected-party-members').append((existingPlayer ?? player).updateOrCreateDom(CURRENT_SCENE.pieces));
  emitPermissionsChangeEvent(player.id);
  emitConnectedToHostEvent(player.id);
  emitLoadSceneEvent(player.id);
}

const onDeletePlayer = async function (id) {
  if (!isHost()) {
    console.warn("only host should receive new player events");
    return;
  }

  PARTY.deletePlayer(id);
  await PARTY.save();
  $('#player-' + id).parent().remove();
  if ($('#list-connected-party-members').children().length == 0) {
    $('#empty-party-msg').show();
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
    // leave here to learn about mmore errors
    _peer.reconnect();
    debugger;
  });

  _peer.on('error', function (a) {
    if (a.type == 'peer-unavailable') {
      console.warn('could not connect to peer ' + a.message);
      const idMatch = a.message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
      if (!!idMatch.length) {
        const player = PARTY.getPlayer(idMatch[0]);
        if (player != null) {
          player.status = PlayerStatus.Disconnected;
          player.updateOrCreateDom(CURRENT_SCENE.pieces);
        }
      }
    }
    else {
      // leave here to learn about mmore errors
      debugger;
    }
  });

  _peer.on('connection', function (conn) {
    conn.on('data', function (data) {
      if (isHost() && PARTY.deletedPlayerIds.indexOf(conn.peer) >= 0) {
        // refuse connection from deleted player
        conn.close();
        return;
      }
      switch (data.event) {
        case EventTypes.AddPiece:
          onAddPieceEvent(conn.peer, data.piece);
          break;
        case EventTypes.MovePiece:
          onMovePieceEvent(conn.peer, data.movedPiece);
          break;
        case EventTypes.UpdatePiece:
          onUpdatePieceEvent(conn.peer, data.piece);
          break;
        case EventTypes.DeletePiece:
          onDeletePieceEvent(conn.peer, data.id);
          break;
        case EventTypes.ResetPieces:
          onResetPiecesEvent();
          break;
        case EventTypes.RequestPiece:
          onRequestPieceEvent(conn.peer, data.id);
          break;
        case EventTypes.PlayerJoin:
          onPlayerJoinEvent(data.player);
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
}

const displaySceneList = async function (scenePartials) {
  if (!!scenePartials.length) {
    for (var scene of scenePartials) {
      $('#scene-list').prepend(Scene.updateOrCreateDom(scene));
    }

    $('#option-' + CURRENT_SCENE.id).prop('checked', true);
  }
}

const onAddScene = async function () {
  await CURRENT_SCENE.saveScene();

  CURRENT_SCENE = new Scene(newGuid(), _host);
  CURRENT_SCENE.draw();
  await CURRENT_SCENE.saveScene();

  $('#scene-list').prepend(Scene.updateOrCreateDom(CURRENT_SCENE));
  $('#option-' + CURRENT_SCENE.id).prop('checked', true);

  for (var player of PARTY.players) {
    emitLoadSceneEvent(player.id);
  }
}

const onPlayerMenu = function (e, id) {
  e.preventDefault();
  $('.player-label').each((i, el) => {
    bootstrap.Dropdown.getOrCreateInstance(el).hide();
  });

  // close any dropdowns on next click
  $(document.body).one('click', () => {
    $('.player-label').each((i, el) => {
      bootstrap.Dropdown.getOrCreateInstance(el).hide();
    });
  });

  bootstrap.Dropdown.getOrCreateInstance($(`#player-${id}`)[0]).show();
}

const onSceneMenu = function (e, id) {
  e.preventDefault();
  $('.scene-label').each((i, el) => {
    bootstrap.Dropdown.getOrCreateInstance(el).hide();
  });

  // close any dropdowns on next click
  $(document.body).one('click', () => {
    $('.scene-label').each((i, el) => {
      bootstrap.Dropdown.getOrCreateInstance(el).hide();
    });
  });

  bootstrap.Dropdown.getOrCreateInstance($(`label[for="option-${id}"]`)[0]).show();
}

const onChangeScene = async function (id) {
  if (!isHost()) return;

  $('#option-' + id).prop('checked', true);
  // save current scene
  await CURRENT_SCENE.saveScene();

  const scenePartials = await localforage.getItem(StorageKeys.Scenes);
  const sceneToLoad = scenePartials.find(sp => sp.id == id);
  if (sceneToLoad == null) {
    console.warn("can not find scene with id: " + id);
    return;
  }

  CURRENT_SCENE = await Scene.load(sceneToLoad);
  CURRENT_SCENE.draw();

  for (var player of PARTY.players) {
    player.updateOrCreateDom(CURRENT_SCENE.pieces);
    emitLoadSceneEvent(player.id);
  }
}

const onExportSession = async function () {
  if (!isHost()) {
    console.warn('only host can export session');
    return;
  }

  const exportVal = {
    scenes: [],
    party: undefined,
    host: undefined
  };
  const scenePartials = await localforage.getItem(StorageKeys.Scenes);

  for (var scene of scenePartials) {
    const loadedScene = await Scene.load(scene);
    exportVal.scenes.push(loadedScene);
  }

  const partyVal = await localforage.getItem(`${StorageKeys.Party}-${_host}`);
  PARTY = Party.fromObj(partyVal);
  for (var player of PARTY.players) {
    $("#list-connected-party-members").append(player.updateOrCreateDom(CURRENT_SCENE.pieces));
  }
  exportVal.party = PARTY;

  exportVal.host = _host;

  downloadObjectAsJson(exportVal, "session");
}

const onImportSession = async function () {
  if (!isHost()) {
    console.warn('only host can export session');
    return;
  }

  document.getElementById('input-session-import').click();
  $('#input-session-import').one('change', function (args) {
    loading(true);
    const file = $(this)[0].files[0];
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const session = JSON.parse(ev.target.result);

      for (var key of Object.keys(session)) {
        switch (key) {
          case 'scenes':
            for (var scene of session.scenes) {
              await localforage.setItem(`${StorageKeys.Pieces}-${scene.id}`, scene.pieces);
              await localforage.setItem(`${StorageKeys.Background}-${scene.id}`, scene.background);
              await localforage.setItem(`${StorageKeys.GridRatio}-${scene.id}`, scene.gridRatio);
            }

            const scenePartials = session.scenes.map(s => {
              return {
                id: s.id,
                name: s.name,
                owner: s.owner,
                gridRatio: s.gridRatio,
                thumbnail: s.thumbnail
              }
            });
            await localforage.setItem(StorageKeys.Scenes, scenePartials);
            break;
          case 'party':
            await localforage.setItem(`${StorageKeys.Party}-${session.host}`, session.party);
            break;
          case 'host':
            await localforage.setItem(StorageKeys.HostId, session.host);
            break;
          default:
            console.warn("unrecognized session key: " + key);
            continue;
        }
      }

      loading(false);
      window.location.href = window.location.origin + window.location.pathname;
    };

    reader.readAsText(file);
  });
}

const onClearSession = async function () {
  // items to preserve on session clear
  const tutorials = await localforage.getItem(StorageKeys.Tutorial);

  await localforage.clear();

  // restore items
  await localforage.setItem(StorageKeys.Tutorial, tutorials);
  // reload page
  window.location.href = window.location.origin + window.location.pathname;
}

const onDeleteScene = async function (id) {
  const scenes = $('#scene-list').find('label.scene-label');
  if (scenes.length == 1) {
    alert("Cannot delete last remaining scene");
    return;
  }

  if (confirm("Are you sure you wish to delete this scene?")) {
    if (CURRENT_SCENE.id == id) {
      for (var scene of scenes) {
        let sceneToLoadId = scene.getAttribute('for').replace('option-', '');
        if (sceneToLoadId != id) {
          await onChangeScene(sceneToLoadId);
          break;
        }
      }
    }
    await Scene.delete(id);
    $(`label[for="option-${id}"]`).parent().remove();
  }
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
      $("#list-connected-party-members").append(player.updateOrCreateDom(CURRENT_SCENE.pieces));
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
        _peer = new Peer(existingHostId, peerJsOptions);
        _peer.reconnect();
      }
      else {
        _peer = new Peer(newGuid(), peerJsOptions);
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
        _peer = new Peer(_player.id, peerJsOptions);
      }
      else {
        _peer = new Peer(newGuid(), peerJsOptions);
        await localforage.setItem(StorageKeys.HostId, _host);
      }

      // hide buttons for players
      $('.host-only').hide();
      $('.host-only').find('input,button').prop('disabled', true)

      // initial peer open
      _peer.on('open', function (id) {
        console.log('My peer ID is: ' + id);
        initPeerEvents();
        if (_player != null) {
          var conn = _peer.connect(_host);
          conn.on('open', function () {
            conn.send({
              event: EventTypes.PlayerJoin,
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

            _player = new Player(id, playerName);
            await localforage.setItem(StorageKeys.Player, _player);

            var conn = _peer.connect(_host);
            conn.on('open', function () {
              conn.send({
                event: EventTypes.PlayerJoin,
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

const onGridSizeInput = function (args) {
  if (!isHost()) return;
  const controllingX = $(this)[0] === $('#range-grid-size-x')[0];
  let valX = $('#range-grid-size-x').val();
  let valY = $('#range-grid-size-y').val();
  $('.modal-backdrop.show').css('opacity', 0.0);
  $('.extra-grid-controls').show();

  $('.grid-indicator').css('width', valX + 'px');
  $('.grid-indicator').css('height', valY + 'px');
  $('.grid-indicator').css('margin-bottom', (149 - valY) + 'px');
  $('label[for="range-grid-size-x"]').html(`<i class="fa-solid fa-border-none me-2"></i>Grid Size: ${valX}, ${valY}`);
}

const onGridSizeChange = function () {
  if (!isHost()) return;
  const controllingX = $(this)[0] === $('#range-grid-size-x')[0];
  $('.modal-backdrop.show').css('opacity', 0.5);
  // $('.grid-indicator').hide();
  const valX = $('#range-grid-size-x').val();
  const valY = $('#range-grid-size-y').val();
  let newGridSize = {
    x: Number(valX) / document.getElementById("canvas").width,
    y: Number(valY) / document.getElementById("canvas").height
  };

  if (!controllingX && valX == valY) {
    $('.extra-grid-controls').hide();
  }

  onGridChangeEvent(newGridSize);

  // broadcast grid change
  for (var player of PARTY.players) {
    emitGridSizeChangeEvent(player.id);
  }
}

const onRouteToggle = function () {
  if (document.getElementById('checkbox-route-toggle').checked) {
    // this is handled in scene.js:drawPieces();

  }
  else {
    _forceHideRoutes = true;
    CURRENT_SCENE.drawPieces();
  }
}

const onRouteShow = function () {
  if (!_forceHideRoutes)
    CURRENT_SCENE.drawPieces(true);
}

const onRouteHide = function () {
  CURRENT_SCENE.drawPieces();
  _forceHideRoutes = false;
}

const initDom = function () {
  var can = document.getElementById('canvas');
  can.width = window.innerWidth;
  can.height = window.innerHeight;

  new ResizeObserver(function () {
    document.getElementById('canvas').width = window.innerWidth;
    document.getElementById('canvas').height = window.innerHeight;
    document.getElementById('background-image').width = window.innerWidth;
    document.getElementById('background-image').height = window.innerHeight;

    displayDebugInfo(`${window.innerWidth}, ${window.innerHeight}`);

    if (_spellRuler instanceof Area) {
      _spellRuler.draw();
    }
    CURRENT_SCENE?.draw();
  }).observe(document.body);

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

  $('#spell-ruler').find('input.btn-check').on('click', onSpellRulerToggle);
  $('#input-spell-size').on('change', onSpellSizeChange);
  // $('.quick-add').on('click', onQuickAdd);
  document.getElementById('btn-change-bg').addEventListener('click', onChangeBackgroundModal);
  document.getElementById('btn-add-piece').addEventListener('click', onAddPieceModal);
  document.getElementById('btn-add-scene').addEventListener('click', onAddScene);
  document.getElementById('permissions-own-pieces').addEventListener('change', onPermissionsChange);
  document.getElementById('form-modal-piece').addEventListener('submit', onAddPieceSubmit);
  document.getElementById('form-modal-bg').addEventListener('submit', onChangeBackgroundSubmit);
  document.getElementById('btn-update-piece').addEventListener('click', onUpdatePieceSubmit);
  document.getElementById('checkbox-piece-menu-aura').addEventListener('change', onPieceAuraToggle);
  document.getElementById('range-grid-size-x').addEventListener('input', onGridSizeInput);
  document.getElementById('range-grid-size-x').addEventListener('change', onGridSizeChange);
  document.getElementById('range-grid-size-y').addEventListener('input', onGridSizeInput);
  document.getElementById('range-grid-size-y').addEventListener('change', onGridSizeChange);
  document.getElementById('btn-delete-piece').addEventListener("click", onDeletePieceSubmit);
  document.getElementById('btn-reset-pieces').addEventListener('click', onResetPiecesSubmit);
  document.getElementById('checkbox-route-toggle').addEventListener('change', onRouteToggle);
  document.getElementById('btn-export-session').addEventListener('click', onExportSession);
  document.getElementById('btn-import-session').addEventListener('click', onImportSession);
  document.getElementById('btn-clear-session').addEventListener('click', onClearSession);
  document.querySelector('label[for="checkbox-route-toggle"]').addEventListener('mouseenter', onRouteShow);
  document.querySelector('label[for="checkbox-route-toggle"]').addEventListener('mouseleave', onRouteHide);
  $('input[type="radio"][name="radio-bg-type"]').on('change', onBackgroundTypeChange);
  document.getElementById('input-aura-menu-opacity').addEventListener('input', (e) => {
    $('#value-aura-menu-opacity').html(parseInt(100 * e.target.value / 255) + '%');
  });
  document.getElementById('input-area-menu-opacity').addEventListener('input', (e) => {
    $('#value-area-menu-opacity').html(parseInt(100 * e.target.value / 255) + '%');
  });

  document.getElementById("piece-menu").addEventListener("hide.bs.offcanvas", () => {
    // reset piece form
    _pieceInMenu = null;
    $("#piece-menu-status-conditions").tagsinput('removeAll');
    const imgInput = document.getElementById("piece-menu-image-input");
    imgInput.value = null;
    imgInput.type = "text";
    imgInput.type = "file";
    $('#btn-update-piece').removeClass('shake');
  });

  document.getElementById("main-menu").addEventListener("hide.bs.offcanvas", () => {
    $('.extra-grid-controls').hide();
  });

  document.getElementById("piece-menu").addEventListener("shown.bs.offcanvas", () => {
    $('#piece-menu').find('input').one('change', function () {
      $('#btn-update-piece').addClass('shake');
    });
  });

  // canvas
  can.addEventListener('mousedown', async function (args) {
    if (args.button == 0) {
      // left click
      if (_spellRuler instanceof Area) {
        await CURRENT_SCENE.addPiece(_spellRuler);
        const newPiece = { ..._spellRuler };
        $('#spell-ruler').find('input.btn-check:checked').click();
        CURRENT_SCENE.drawPieces();

        if (isHost()) {
          for (var player of PARTY.players) {
            emitAddPieceEvent(player.id, newPiece);
          }

          await CURRENT_SCENE.savePieces();
        }
        else {
          emitAddPieceEvent(_host, newPiece);
        }
      }
      else {
        _draggedPiece = shapeIntersects(args.x, args.y);
        if (_draggedPiece != null) {
          _draggedPiece.origin = {
            x: _draggedPiece.x,
            y: _draggedPiece.y
          };
          CURRENT_SCENE.bringPieceToFront(_draggedPiece);
        }
      }
    }
  });
  can.addEventListener('mousemove', function (args) {
    if (_draggedPiece != null) {
      $('.menu-toggle').hide(); // disable invisible menu toggle
      if (_draggedPiece instanceof Area) {
        _draggedPiece.x = args.x / document.getElementById("canvas").width;
        _draggedPiece.y = args.y / document.getElementById("canvas").height;
      }
      else {
        _draggedPiece.x = (args.x - parseInt(_draggedPiece.width / 2)) / document.getElementById("canvas").width;
        _draggedPiece.y = (args.y - parseInt(_draggedPiece.height / 2)) / document.getElementById("canvas").height;
      }

      CURRENT_SCENE.drawPieces();
    }
    else if (_spellRuler != null) {
      CURRENT_SCENE.drawPieces();
      _spellRuler.x = args.x / document.getElementById("canvas").width;
      _spellRuler.y = args.y / document.getElementById("canvas").height;
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
    if (_draggedPiece == null) return;
    $('.menu-toggle').show();

    const movedPiece = {
      id: _draggedPiece.id,
      x: _draggedPiece.x,
      y: _draggedPiece.y,
      origin: _draggedPiece.origin,
      rotation: _draggedPiece.rotation
    }
    _draggedPiece = null;

    if (isHost()) {
      for (var player of PARTY.players) {
        emitMovePieceEvent(player.id, movedPiece);
      }

      await CURRENT_SCENE.savePieces();
    }
    else {
      emitMovePieceEvent(_host, movedPiece);
    }
  });

  can.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    _pieceInMenu = shapeIntersects(e.clientX, e.clientY);
    if (_pieceInMenu != null) {
      $('.area-only').hide();
      $('.piece-only').hide();
      bootstrap.Offcanvas.getOrCreateInstance(document.getElementById("piece-menu")).show();

      if (_pieceInMenu instanceof Area) {
        $('.area-only').show();
        $('input[name="radio-area-menu-type"]').prop('checked', false);
        $(`input[name='radio-area-menu-type'][value='${_pieceInMenu.type}']`).prop("checked", true);
        $('#input-area-menu-size').val(_pieceInMenu.size * 5);
        $('#input-area-menu-color').val(_pieceInMenu.color);
        $('#input-area-menu-opacity').val(_pieceInMenu.opacity);
        $('#value-area-menu-opacity').html(parseInt(100 * _pieceInMenu.opacity / 255) + '%');
      }
      else {
        $('.piece-only').show();
        // open piece submenu
        document.getElementById("piece-menu-name").value = _pieceInMenu.name;
        document.getElementById("piece-menu-image").src = _pieceInMenu.image;
        document.getElementById("piece-menu-dead").checked = _pieceInMenu.dead;
        $('input[name="radio-piece-menu-size"]').prop('checked', false);
        $(`input[name='radio-piece-menu-size'][value='${_pieceInMenu.size}']`).prop("checked", true);
        $("#piece-menu-status-conditions").tagsinput('removeAll')
        for (var cond of _pieceInMenu.conditions) {
          $("#piece-menu-status-conditions").tagsinput('add', cond);
        }
        if (_pieceInMenu.aura != null) {
          $('.aura-only').show();
          document.getElementById("checkbox-piece-menu-aura").checked = true;
          document.getElementById("input-aura-menu-size").value = _pieceInMenu.aura.size * 2.5;
          document.getElementById("input-aura-menu-color").value = _pieceInMenu.aura.color;
          document.getElementById('input-aura-menu-opacity').value = _pieceInMenu.aura.opacity;
          $('#value-aura-menu-opacity').html(parseInt(100 * _pieceInMenu.aura?.opacity ?? 0 / 255) + '%');
        }
        else {
          $('.aura-only').hide();
          document.getElementById("checkbox-piece-menu-aura").checked = false;
        }
      }
    }
    else {
      // open add piece dialog
      onAddPieceModal({ x: e.x / document.getElementById('canvas').width, y: e.y / document.getElementById('canvas').height });
    }
  });
}

const displayDebugInfo = function (text) {
  $('.debug-info').html(text);
}

window.onload = async function () {
  loading(true);
  initDom();
  initFormValidation();
  await initPeer();
  if (isHost()) {
    await restoreHostSession();
    CURRENT_SCENE.draw();
  }
  loading(false);
}