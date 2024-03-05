PARTY = null;
CURRENT_SCENE = null;

_player = null;
_peer = null;
_host = null;

_pieceInMenu = null;
_spellRuler = null;
_gridArea = null;
_draggedPiece = null;
_forceHideRoutes = false;
_cropper = null;
_gridSettingMode = GridSettingMode.Off;

const shapeIntersects = function (x, y, respectLock = false) {
  for (var piece of CURRENT_SCENE?.pieces) {
    if (piece.intersects(x, y)) {
      if (!isHost() && piece.owner != _player.id) {
        if (PARTY.getPermissionValue(PermissionType.OnlyMoveOwnedPieces)) continue;
      }
      if (piece.lock && respectLock) continue;

      return piece;
    }
  }
  return null;
}

const onTutorial = async function() {
  bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('main-menu')).hide();
  await localforage.removeItem(StorageKeys.Tutorial);
  initMainMenuTour(isHost());
}

const onCropperRotate = function (e) {
  if ($(this).hasClass('rotate-left')) {
    _cropper?.rotate(-90);
  }
  else {
    _cropper?.rotate(90);
  }
  _cropper?.zoomTo(-1);
}

const onBackgroundTypeChange = function () {
  const bgType = document.querySelector('input[type="radio"][name="radio-bg-type"]:checked').value;
  switch (bgType) {
    case BackgroundType.Image:
      document.getElementById("input-bg-video").removeAttribute("required");
      document.getElementById("input-bg-image").setAttribute("required", "required");

      $('.image-only').show();
      $('.video-only').hide();
      break;
    case BackgroundType.Video:
      document.getElementById("input-bg-image").removeAttribute("required");
      document.getElementById("input-bg-video").setAttribute("required", "required");

      $('.image-only').hide();
      $('.video-only').show();
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
      const bgImgFile = document.getElementById('input-bg-image').files[0];
      const croppedImg = _cropper.getCroppedCanvas().toDataURL(bgImgFile?.type);
      CURRENT_SCENE.setBackground(new Background(BackgroundType.Image, croppedImg));
      break;
    case BackgroundType.Video:
      const videoUrl = document.getElementById('input-bg-video').value;
      CURRENT_SCENE.setBackground(new Background(BackgroundType.Video, videoUrl));
      break;
    default:
      console.warn("background type not recognized: " + bgType);
      break;
  }

  onChangeBackgroundEvent();
  for (var player of PARTY.players) {
    emitChangeBackgroundEvent(player.id);
  }

  bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-bg')).hide();

  // trigger grid setting mode
  onGridMode();
}

const onGridSubmit = async function (e) {
  e.preventDefault();

  $('.grid-mode-overlay').hide();
  _gridSettingMode = GridSettingMode.Off;
  _gridArea = null;
  await onGridChangeEvent({
    x: $('#input-grid-width').val(),
    y: $('#input-grid-height').val(),
    feetPerGrid: $('#input-feet-per-grid').val()
  });
  bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-grid')).hide();

  for (var player of PARTY.players) {
    emitGridSizeChangeEvent(player.id);
  }
}

const onGridReset = function (e) {
  $('.grid-mode-overlay').hide();
  _gridSettingMode = GridSettingMode.Off;
  _gridArea = null;
}

const initGridArea = function (x, y) {
  _gridArea = new Area(newGuid(), _host, AreaType.Square, CURRENT_SCENE.gridRatio.feetPerGrid, x, y);
  _gridArea.color = '#eaf0f0';
  _gridArea.opacity = 100;
  _gridArea.updateSize();
}

const onGridSizeChange = function (e) {
  let valX = Number($('#input-grid-width').val() * CURRENT_SCENE.canvas.width);
  let valY = Number($('#input-grid-height').val() * CURRENT_SCENE.canvas.height);

  if ($(this)[0] == $('#btn-grid-left')[0]) {
    valX -= 1;
  }
  if ($(this)[0] == $('#btn-grid-right')[0]) {
    valX += 1;
  }
  if ($(this)[0] == $('#btn-grid-down')[0]) {
    valY += 1;
  }
  if ($(this)[0] == $('#btn-grid-up')[0]) {
    valY -= 1;
  }

  $('#input-grid-width').val(valX / CURRENT_SCENE.canvas.width);
  $('#input-grid-height').val(valY / CURRENT_SCENE.canvas.height);
  $('#grid-width-display').html(parseInt(valX) + 'px');
  $('#grid-height-display').html(parseInt(valY) + 'px');

  $('#grid-indicator-end-buffer').css('margin-right', `calc(50% - 3.5rem - ${valX / 2}px)`);
  $('.grid-indicator').css('width', valX + 'px');
  $('.grid-indicator').css('height', valY + 'px');

  CURRENT_SCENE.drawPieces();
  if (_gridArea == null) {
    initGridArea(0.5, 0.5);
  }
  _gridArea.draw({ width: valX, height: valY, border: "#5f8585", borderWidth: 2, backdrop: "#000000a0" });
}

const onSpellRulerToggle = async function (args) {
  if (CURRENT_SCENE == null) return // player mode disable during load up

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
    _spellRuler = new Area(newGuid(), _player?.id ?? _host, type, $('#input-spell-size').val());
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

    bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('main-menu')).hide();
  }
}

const onSpellSizeChange = function (args) {
  if (_spellRuler == null) return;

  _spellRuler.updateSize(Number($(this).val()) / CURRENT_SCENE.gridRatio.feetPerGrid);
}

const onQuickAdd = async function (pieceId) {
  const pieceToAdd = (await localforage.getItem(StorageKeys.SessionPieces)).find(p => p.id == pieceId);
  pieceToAdd.id = newGuid();
  pieceToAdd.isDuplicate = true;

  const piece = CURRENT_SCENE.addPiece(pieceToAdd);
  const initPos = {
    x: Number($('#input-piece-init-pos-x').val() == '' ? 0.3 : $('#input-piece-init-pos-x').val()),
    y: Number($('#input-piece-init-pos-y').val() == '' ? 0.3 : $('#input-piece-init-pos-y').val())
  }
  piece.x = initPos.x;
  piece.y = initPos.y;

  if (isHost()) {
    for (var player of PARTY.players) {
      emitAddPieceEvent(player.id, piece);
    }
  }
  else {
    emitAddPieceEvent(_host, piece);
  }

  await CURRENT_SCENE.savePieces();
  await piece.updateImage();
  piece.draw();
  bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-piece')).hide();
}

const onChangeBackgroundModal = function () {
  $("#canvas-submenu").css({ 'display': 'none' });
  bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('main-menu')).hide();
  bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-bg')).show();

  if (CURRENT_SCENE.background.type == BackgroundType.Image) {
    $('#img-bg-preview').attr('src', CURRENT_SCENE.background.url);
  }
}

const onAddPieceModal = async function () {
  if (CURRENT_SCENE == null) return // player mode disable during load up

  bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('main-menu')).hide();
  bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-piece')).show();

  if ($("#canvas-submenu").css('display') == 'block') {
    $("#canvas-submenu").css({ 'display': 'none' });
    $('#input-piece-init-pos-x').val($("#canvas-submenu").css('left').replace('px', '') / CURRENT_SCENE.canvas.width);
    $('#input-piece-init-pos-y').val($("#canvas-submenu").css('top').replace('px', '') / CURRENT_SCENE.canvas.height);
  }

  // populate recently added pieces carousel
  $('#session-pieces-carousel').parent().hide();

  const sessionPieces = await localforage.getItem(StorageKeys.SessionPieces);
  if (sessionPieces?.length > 0) {
    $('#session-pieces-carousel').parent().show();
    $('#session-pieces-carousel').slick('unslick');
    $('#session-pieces-carousel').empty();
    for (var piece of sessionPieces) {
      $('#session-pieces-carousel').append(`<div onclick="onQuickAdd('${piece.id}')"><img class="mx-auto" style="width: 5em" alt="${piece.name}" data-lazy=${piece.image}></img></div>`);
    }
    $('#session-pieces-carousel').slick({
      slidesToShow: 3,
      slidesToScroll: 3,
      infinite: true,
      lazyLoad: 'ondemand'
    });
  }
}

const resetModalPieceForm = function () {
  $('#input-piece-name').val(null);
  $('#img-piece-preview').attr('src', '');
  $('#input-piece-img').val('');
  $('#input-piece-img').attr('type', 'text');
  $('#input-piece-img').attr('type', 'file');
  $('#input-piece-init-pos-x').val(null);
  $('#input-piece-init-pos-y').val(null);
  $('.rotate-btn').parent().hide();
  _cropper?.destroy();
}

const resetModalBgForm = function () {
  $('#img-bg-preview').attr('src', '');
  $('#input-bg-video').val(null);
  $('#input-bg-image').val('');
  $('#input-bg-image').attr('type', 'text');
  $('#input-bg-image').attr('type', 'file');
  $('.rotate-btn').parent().hide();
  _cropper?.destroy();
}

const onAddPieceSubmit = async function (e) {
  $('#form-modal-piece').removeClass('was-validated');
  const name = $('#input-piece-name').val();
  const file = $('#input-piece-img')[0].files[0];
  const croppedImg = _cropper.getCroppedCanvas().toDataURL(file.type);
  const size = document.querySelector('input[name="radio-piece-size"]:checked').value;
  const initPos = {
    x: Number($('#input-piece-init-pos-x').val() == '' ? 0.3 : $('#input-piece-init-pos-x').val()),
    y: Number($('#input-piece-init-pos-y').val() == '' ? 0.3 : $('#input-piece-init-pos-y').val())
  }

  const piece = new Piece(newGuid(), _peer.id, name, croppedImg, size, initPos.x, initPos.y);
  CURRENT_SCENE.addPiece(piece);
  await CURRENT_SCENE.savePieces();

  if (isHost()) {
    for (var player of PARTY.players) {
      emitAddPieceEvent(player.id, piece);
    }
  }
  else {
    emitAddPieceEvent(_host, piece);
  }

  await piece.updateImage();
  piece.draw();

  bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-piece')).hide();
  initGamePieceTour(piece);
}

const onUpdatePieceSubmit = async function () {
  if (_pieceInMenu == null) return;

  const lock = document.getElementById('piece-menu-lock').checked;
  _pieceInMenu.lock = lock;

  if (_pieceInMenu instanceof Area) {
    const type = document.querySelector('input[name="radio-area-menu-type"]:checked').value;
    const size = document.getElementById("input-area-menu-size").value;
    const color = document.getElementById("input-area-menu-color").value;
    const opacity = document.getElementById("input-area-menu-opacity").value;
    _pieceInMenu.type = type;
    _pieceInMenu.size = Number(size);
    _pieceInMenu.color = color;
    _pieceInMenu.contrastColor = invertColor(_pieceInMenu.color);
    _pieceInMenu.opacity = opacity;
  }
  else {
    const name = document.getElementById("piece-menu-name").value;
    const size = document.querySelector('input[name="radio-piece-menu-size"]:checked').value;
    const statusConds = document.getElementById("piece-menu-status-conditions").value;
    const dead = document.getElementById("piece-menu-dead").checked;
    const hideShadow = document.getElementById("piece-menu-shadow").checked;
    const file = document.getElementById("piece-menu-image-input").files[0];
    const auraEnabled = document.getElementById("checkbox-piece-menu-aura").checked;
    _pieceInMenu.name = name;
    _pieceInMenu.dead = dead;
    _pieceInMenu.hideShadow = hideShadow;
    _pieceInMenu.updateSize(size);
    _pieceInMenu.updateConditions(statusConds);
    if (auraEnabled) {
      _pieceInMenu.aura = new Area(_pieceInMenu.id, _pieceInMenu.owner, $('#checkbox-piece-menu-aura').val(), $('#input-aura-menu-size').val(), _pieceInMenu.x, _pieceInMenu.y);
      _pieceInMenu.aura.color = $('#input-aura-menu-color').val();
      _pieceInMenu.aura.contrastColor = invertColor(_pieceInMenu.aura.color);
      _pieceInMenu.aura.opacity = $('#input-aura-menu-opacity').val();
    }
    else {
      _pieceInMenu.aura = undefined;
    }
    if (file != null || _pieceInMenu.imageCropped) {
      _pieceInMenu.imageUpdated = true;
      const croppedImg = _cropper.getCroppedCanvas().toDataURL(file?.type);
      await _pieceInMenu.updateImage(croppedImg);
      CURRENT_SCENE.drawPieces();
    }
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

  bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('piece-menu')).hide();
}

const onPieceAuraToggle = function (e) {
  const auraEnabled = $(this).prop('checked');
  if (auraEnabled) {
    $('.aura-only').fadeIn();
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

const onConnectedToHostEvent = function (host) {
  if (isHost()) {
    console.warn("only non-host can recieve this 'connected to host' event");
    return;
  }

  console.log("successfully connected to host: " + _host);
}

const onPermissionsUpdateEvent = function (permissions) {
  PARTY.permissions = permissions;
}

const onLoadSceneEvent = async function (scene) {
  if (isHost()) {
    console.warn('host cannot recieve load scene event');
    return;
  }

  loading(true);

  CURRENT_SCENE = await Scene.fromObj(scene);
  if (!!CURRENT_SCENE.unloadedPieces.length) {
    emitRequestPiecesEvent(scene.pieces);
    CURRENT_SCENE.drawBackground();
  }
  else {
    CURRENT_SCENE.draw();
    loading(false);
    emitLoadSceneSuccessEvent();
  }
}

const onLoadSceneSuccessEvent = function (peerId) {
  if (!isHost()) {
    console.warn('only host can recieve load scene success event');
    return;
  }

  const player = PARTY.getPlayer(peerId);
  player.status = PlayerStatus.Connected;
  player.updateOrCreateDom(CURRENT_SCENE.pieces);
}

const onInformPlayerRemovedEvent = function () {
  alert('You have been removed from the party...loading new session');

  onClearSession();
}

const emitInformPlayerRemovedEvent = function (peerId) {
  var conn = _peer.connect(peerId);
  conn.on('open', function () {
    conn.send({
      event: EventTypes.InformPlayerRemoved
    });
  });
}

const emitLoadSceneEvent = function (peerId) {
  const player = PARTY.getPlayer(peerId);
  player.status = PlayerStatus.Loading;
  player.updateOrCreateDom();
  var conn = _peer.connect(peerId);
  conn.on('open', function () {
    conn.send({
      event: EventTypes.LoadScene,
      scene: {
        ...CURRENT_SCENE,
        pieces: CURRENT_SCENE.getSizeMB() > 3 ? CURRENT_SCENE.pieces.map(p => p.id) : CURRENT_SCENE.pieces
      }
    });
  });
}

const emitLoadSceneSuccessEvent = function () {
  if (isHost()) {
    console.warn('host cannot emit load scene success event');
    return;
  }

  togglePlayerControls(true);

  var conn = _peer.connect(_host);
  conn.on('open', function () {
    conn.send({
      event: EventTypes.LoadSceneSuccess
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

const emitRequestPiecesEvent = function (ids) {
  if (isHost()) {
    console.warn("cannot request piece as host");
    return;
  }

  var conn = _peer.connect(_host);
  conn.on('open', function () {
    conn.send({
      event: EventTypes.RequestPieces,
      ids: ids
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
  if (CURRENT_SCENE == null) {
    console.warn('cannot add piece when scene is null...try refreshing');
    return null;
  }
  if (CURRENT_SCENE.getPieceById(piece.id) != null) {
    // redundant piece
    return;
  }

  const stillLoading = !!CURRENT_SCENE.unloadedPieces.length;
  const newPiece = CURRENT_SCENE.addPiece(piece);
  if (isHost()) {
    PARTY.getPlayer(newPiece.owner)?.updateOrCreateDom(CURRENT_SCENE.pieces);

    for (var player of PARTY.players) {
      if (player.id == peerId) continue;
      emitAddPieceEvent(player.id, newPiece);
    }
    await CURRENT_SCENE.savePieces();
  }
  else if (stillLoading && !CURRENT_SCENE.unloadedPieces.length) {
    loading(false);
    emitLoadSceneSuccessEvent();
  }

  if (newPiece.objectType == 'Piece')
    await newPiece.updateImage();
  newPiece.draw();
}

const onMovePieceEvent = async function (peerId, movedPiece) {
  let pieceToMove = CURRENT_SCENE?.getPieceById(movedPiece.id);
  if (pieceToMove == null) {
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
  let piece = CURRENT_SCENE?.getPieceById(id);
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

const onRequestPiecesEvent = function (peerId, ids) {
  if (!isHost()) {
    console.warn("Only host can recieve request pieces event");
    return;
  }

  for (var id of ids) {
    emitAddPieceEvent(peerId, CURRENT_SCENE.getPieceById(id));
  }
}

const onUpdatePieceEvent = async function (peerId, piece) {
  if (CURRENT_SCENE?.getPieceById(piece.id) == null) return;
  const updatedPiece = CURRENT_SCENE.updatePiece(piece);

  if (isHost()) {
    $("#list-connected-party-members").append(PARTY.getPlayer(peerId).updateOrCreateDom(CURRENT_SCENE.pieces));

    for (var player of PARTY.players) {
      if (player.id == peerId) continue;
      emitUpdatePieceEvent(player.id, updatedPiece);
    }

    await CURRENT_SCENE.savePieces();
  }

  if (updatedPiece.objectType == 'Piece')
    await updatedPiece.updateImage();
  CURRENT_SCENE.drawPieces();
}

const onGridChangeEvent = async function (gridSize) {
  CURRENT_SCENE.gridRatio = gridSize;

  if (_spellRuler instanceof Area) {
    _spellRuler.updateSize(Number($('#input-spell-size').val()) / CURRENT_SCENE.gridRatio.feetPerGrid);
    _spellRuler.draw();
  }

  CURRENT_SCENE.drawGridSetting();
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
    player = existingPlayer
  }
  else {
    player = Player.fromObj(player);

    PARTY.addPlayer(player);
    await PARTY.save();
  }


  player.status = PlayerStatus.Pending;
  $('#list-connected-party-members').append(player.updateOrCreateDom(CURRENT_SCENE.pieces));
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
  $('#input-invite-link').val(window.location.origin + window.location.pathname.replace(/\/+$/, '') + (isLocal() ? '' : '/index.html') + `?host=${encodeURI(_host)}`);
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
      console.warn(a.message);
      const idMatch = a.message.match(/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
      if (!!idMatch.length) {
        if (isHost()) {
          const player = PARTY.getPlayer(idMatch[0]);
          if (player != null) {
            player.status = PlayerStatus.Disconnected;
            player.updateOrCreateDom(CURRENT_SCENE.pieces);
          }
        }
        else if (_host == idMatch[0]) {
          loading(false);
          togglePlayerControls(true);
          alert('Unable to connect to host. If you know your host is online, try refreshing the page.');
        }
        else {
          // if some player tries to connect directly to another player
          debugger;
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
        emitInformPlayerRemovedEvent(conn.peer);
        conn.close();
        return;
      }
      if (!isHost() && CURRENT_SCENE == null) {
        switch (data.event) {
          case EventTypes.AddPiece:
          case EventTypes.UpdatePiece:
          case EventTypes.MovePiece:
          case EventTypes.DeletePiece:
          case EventTypes.ChangeBackground:
          case EventTypes.GridChange:
            /* 
             CURRENT_SCENE may be null during initial connection to host which
             can cause errors if other events come through. Refreshing the page should resolve this.
            */
            refreshPage();
            return;
          default:
            // continue;
            break;
        }
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
        case EventTypes.RequestPieces:
          onRequestPiecesEvent(conn.peer, data.ids);
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
          onConnectedToHostEvent(conn.peer);
          break;
        case EventTypes.PermissionsUpdate:
          onPermissionsUpdateEvent(data.permissions);
          break;
        case EventTypes.LoadScene:
          onLoadSceneEvent(data.scene);
          break;
        case EventTypes.LoadSceneSuccess:
          onLoadSceneSuccessEvent(conn.peer);
          break;
        case EventTypes.InformPlayerRemoved:
          onInformPlayerRemovedEvent();
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

  // $('#scene-list').prepend(Scene.updateOrCreateDom(CURRENT_SCENE));
  Scene.updateOrCreateDom(CURRENT_SCENE).insertBefore($('#btn-add-scene').parent());
  $('#option-' + CURRENT_SCENE.id).prop('checked', true);

  for (var player of PARTY.players) {
    emitLoadSceneEvent(player.id);
  }
}

const onGridMode = function () {
  $("#canvas-submenu").css({ 'display': 'none' });
  $('.grid-mode-overlay').show();

  if (!($('#modal-grid.modal.show').length)) {
    $('#modal-grid').find('.modal-dialog').css({
      top: '5vh',
      left: '10vw'
    });
  }
  CURRENT_SCENE.drawGridSetting();
  bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('main-menu')).hide();
  bootstrap.Modal.getOrCreateInstance(document.getElementById('modal-grid')).show();

  _gridSettingMode = GridSettingMode.AwaitingInput;
  $('#spell-ruler').find('input.btn-check').prop("checked", false);
  _spellRuler = null;

  CURRENT_SCENE.drawPieces();
  CURRENT_SCENE.ctx.fillStyle = "#000000a0";
  CURRENT_SCENE.ctx.fillRect(0, 0, CURRENT_SCENE.canvas.width, CURRENT_SCENE.canvas.height);
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

const onSceneTouch = function (e, id) {
  e.preventDefault();

  let menuOpened = false;
  $(this).one('touchend touchcancel', function () {
    clearTimeout(sceneMenuRightClickTimeout);
    if (!menuOpened) {
      onChangeScene(id);
    }
  });

  const sceneMenuRightClickTimeout = setTimeout(function () {
    menuOpened = true;
    onSceneMenu(e, id);
  }, 1200);
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
      refreshPage();
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
  refreshPage(false);
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
      togglePlayerControls(false);

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

const togglePlayerControls = function (enabled) {
  $('#btn-add-piece').prop('disabled', !enabled);
  $('#btn-clear-session').prop('disabled', !enabled);
  $('#spell-ruler').find('input').prop('disabled', !enabled);
}

const onRouteToggle = function () {
  if (document.getElementById('checkbox-route-toggle').checked) {
    // this is handled in scene.js:drawPieces();

  }
  else {
    _forceHideRoutes = true;
    CURRENT_SCENE?.drawPieces();
  }
}

const onRouteShow = function () {
  if (!_forceHideRoutes)
    CURRENT_SCENE?.drawPieces(true);
}

const onRouteHide = function () {
  CURRENT_SCENE?.drawPieces();
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

    if (_cropper instanceof Cropper) {
      if (_cropper.element == document.getElementById('img-bg-preview')) {
        _cropper.setAspectRatio(CURRENT_SCENE.canvas.width / CURRENT_SCENE.canvas.height)
      }
      else {
        _cropper.setAspectRatio(CURRENT_SCENE.getGridAspectRatio())
      }
    }

    if (_spellRuler instanceof Area) {
      _spellRuler.draw();
    }

    if (CURRENT_SCENE != null) {
      CURRENT_SCENE.drawBackground();
      CURRENT_SCENE.drawPieces();
      if (_gridArea != null) {
        const currGridWidth = $('#input-grid-width').val();
        const currGridHeight = $('#input-grid-height').val();

        const valX = currGridWidth * CURRENT_SCENE.canvas.width;
        const valY = currGridHeight * CURRENT_SCENE.canvas.height;
        _gridArea.draw({ width: valX, height: valY, border: "#5f8585", borderWidth: 2, backdrop: "#000000a0" });

        if (currGridWidth != CURRENT_SCENE.gridRatio.x || currGridHeight != CURRENT_SCENE.gridRatio.y) {

          $('#grid-width-display').html(parseInt(valX) + 'px');
          $('#grid-height-display').html(parseInt(valY) + 'px');

          $('#grid-indicator-end-buffer').css('margin-right', `calc(50% - 3.5rem - ${valX / 2}px)`);
          $('.grid-indicator').css('width', valX + 'px');
          $('.grid-indicator').css('height', valY + 'px');
        }
      }
      else {
        CURRENT_SCENE.drawGridSetting();
      }
    }
  }).observe(document.body);

  // init cropper
  Cropper.setDefaults({
    viewMode: 2,
    autoCropArea: 1,
    ready() {
      $('.img-preview-loader').hide();
      $('.rotate-btn').parent().show();

      // attach crop zoom events for loading a previous image
      if (_cropper.element == document.getElementById('img-bg-preview')) {
        $('#img-bg-preview').one('crop zoom', function () {
          document.getElementById('input-bg-image').removeAttribute('required');
        });
      }
      else if (_cropper.element == document.getElementById('piece-menu-image')) {
        $('#piece-menu-image').one('crop zoom', function () {
          _pieceInMenu.imageCropped = true;
          $('#btn-update-piece').addClass('shake');
        });
      }
    }
  });

  // init popovers
  var popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'))
  popoverTriggerList.map(function (popoverTriggerEl) {
    return new bootstrap.Popover(popoverTriggerEl)
  });
  $('a[data-bs-trigger="focus"]').on('click', function () {
    $(this).trigger('focus');
  });

  // init croppers
  $('#img-piece-preview').on('load', function () {
    _cropper?.destroy();
    _cropper = new Cropper(document.getElementById('img-piece-preview'), {
      initialAspectRatio: CURRENT_SCENE.getGridAspectRatio()
    });
  });
  $('#img-bg-preview').on('load', function () {
    console.log('initing bg cropper');
    _cropper?.destroy();
    _cropper = new Cropper(document.getElementById('img-bg-preview'), {
      initialAspectRatio: CURRENT_SCENE.canvas.width / CURRENT_SCENE.canvas.height
    });
  });
  $('#piece-menu-image').on('load', function () {
    _cropper?.destroy();
    _cropper = new Cropper(document.getElementById('piece-menu-image'), {
      initialAspectRatio: CURRENT_SCENE.getGridAspectRatio()
    });
  });

  // init carousel
  $('#session-pieces-carousel').slick();

  document.getElementById('input-piece-img').addEventListener('change', async function (e) {
    $('.img-preview-loader').show();
    const data = await resizeImage(e.target.files[0], 1000);
    $('#img-piece-preview').attr('src', data);
  });

  document.getElementById('input-bg-image').addEventListener('change', async function (e) {
    $('.img-preview-loader').show();
    const data = await resizeImage(e.target.files[0], CURRENT_SCENE.canvas.width);
    $('#img-bg-preview').attr('src', data);
  });

  document.getElementById('piece-menu-image-input').addEventListener('change', async function (e) {
    $('.img-preview-loader').show();
    const data = await resizeImage(e.target.files[0], 1000);
    $('#piece-menu-image').attr('src', data);
  });

  let menuToggleTimeout;
  $('.menu-toggle').on('mouseover', function () {
    if (_draggedPiece == null) {
      $('.menu-toggle').addClass('opacity-100');

      menuToggleTimeout = setTimeout(() => {
        $('.menu-toggle').removeClass('opacity-100');
        bootstrap.Offcanvas.getOrCreateInstance(document.getElementById('main-menu')).show();
      }, 450);
    }
  });
  $('.menu-toggle').on('mouseout', function () {
    $('.menu-toggle').removeClass('opacity-100');
    clearTimeout(menuToggleTimeout);
  });

  $('#spell-ruler').find('input.btn-check').on('click', onSpellRulerToggle);
  $('#input-spell-size').on('change', onSpellSizeChange);
  $('.btn-grid-size').on('click', onGridSizeChange);
  $('.rotate-btn').on('click', onCropperRotate);
  // $('.quick-add').on('click', onQuickAdd);
  document.getElementById('btn-tutorial').addEventListener('click', onTutorial);
  document.getElementById('canvas-submenu-change-bg').addEventListener('click', onChangeBackgroundModal);
  document.getElementById('btn-change-bg').addEventListener('click', onChangeBackgroundModal);
  document.getElementById('canvas-submenu-add-piece').addEventListener('click', onAddPieceModal);
  document.getElementById('btn-add-piece').addEventListener('click', onAddPieceModal);
  document.getElementById('btn-add-scene').addEventListener('click', onAddScene);
  document.getElementById('canvas-submenu-adjust-grid').addEventListener('click', onGridMode);
  document.getElementById('btn-grid-mode').addEventListener('click', onGridMode);
  document.getElementById('permissions-own-pieces').addEventListener('change', onPermissionsChange);
  document.getElementById('form-modal-piece').addEventListener('submit', onAddPieceSubmit);
  document.getElementById('form-modal-bg').addEventListener('submit', onChangeBackgroundSubmit);
  document.getElementById('form-modal-grid').addEventListener('submit', onGridSubmit);
  document.getElementById('form-modal-grid').addEventListener('reset', onGridReset);
  document.getElementById('btn-update-piece').addEventListener('click', onUpdatePieceSubmit);
  document.getElementById('checkbox-piece-menu-aura').addEventListener('change', onPieceAuraToggle);
  document.getElementById('btn-delete-piece').addEventListener("click", onDeletePieceSubmit);
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

  document.getElementById("main-menu").addEventListener("hidden.bs.offcanvas", () => {
    $('.extra-grid-controls').hide();
  });

  document.getElementById('modal-grid').addEventListener('show.bs.modal', function () {
    $('.menu-toggle').hide();
    $('.menu-btn').prop('disabled', true);

    $('#modal-grid').modal({
      backdrop: false,
      show: true
    });

    $('#modal-grid').find('.modal-dialog').draggable();
  });

  document.getElementById('modal-grid').addEventListener('hidden.bs.modal', function () {
    $('.menu-toggle').show();
    $('.menu-btn').prop('disabled', false);
  });

  document.getElementById('modal-bg').addEventListener('hidden.bs.modal', function () {
    $('#img-bg-preview').unbind('crop zoom');
  });

  document.getElementById("piece-menu").addEventListener("hide.bs.offcanvas", () => {
    // reset piece form
    _pieceInMenu = null;
    $("#piece-menu-status-conditions").tagsinput('removeAll');
    const imgInput = document.getElementById("piece-menu-image-input");
    imgInput.value = null;
    imgInput.type = "text";
    imgInput.type = "file";
    CURRENT_SCENE.drawPieces();
    $('#piece-menu-image').unbind('crop zoom');
    $('#btn-update-piece').removeClass('shake');
  });

  document.getElementById("piece-menu").addEventListener("shown.bs.offcanvas", () => {
    // animate save button on change
    $('#piece-menu').find('input').one('change', function () {
      $('#btn-update-piece').addClass('shake');
    });
  });

  document.getElementById('modal-piece').addEventListener("hidden.bs.modal", () => resetModalPieceForm());
  document.getElementById('modal-bg').addEventListener("show.bs.modal", () => resetModalBgForm());

  document.getElementById("modal-grid").addEventListener("hide.bs.modal", () => {
    if (_gridSettingMode) {
      _gridArea = null;
      CURRENT_SCENE.drawPieces();
    }
  });

  // canvas
  let touchRightClickTimeout;
  $(can).on('mousedown touchstart', async function (args) {
    if (args.type == 'touchstart') {
      args.clientX = args.touches[0].clientX;
      args.clientY = args.touches[0].clientY;
      touchRightClickTimeout = setTimeout(function () {
        e = $.Event('contextmenu');
        e.clientX = args.clientX;
        e.clientY = args.clientY;
        $(can).trigger(e);
      }, 1200);
    }
    else if (args.button != 0) {
      // button: 0 is left click
      return;
    }

    if (_gridSettingMode) {
      let pos = {
        x: args.clientX / CURRENT_SCENE.canvas.width + CURRENT_SCENE.gridRatio.x / 2,
        y: args.clientY / CURRENT_SCENE.canvas.height + CURRENT_SCENE.gridRatio.y / 2
      }
      initGridArea(pos.x, pos.y);
      _gridSettingMode = GridSettingMode.Drawing;
      return;
    }
    if (_spellRuler instanceof Area) {
      CURRENT_SCENE.addPiece(_spellRuler);
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
      _draggedPiece = shapeIntersects(args.clientX, args.clientY, true);
      if (_draggedPiece != null) {
        _draggedPiece.origin = {
          x: _draggedPiece.x,
          y: _draggedPiece.y
        };
        CURRENT_SCENE.bringPieceToFront(_draggedPiece);
      }
    }
  });
  $(can).on('mousemove touchmove', function (args) {
    if (args.type == 'touchmove') {
      clearTimeout(touchRightClickTimeout);
      args.clientX = args.touches[0].clientX;
      args.clientY = args.touches[0].clientY;
    }
    if (_gridSettingMode == GridSettingMode.Drawing && _gridArea != null) {
      CURRENT_SCENE.drawPieces();
      const origin = {
        x: _gridArea.getX() - _gridArea.width / 2,
        y: _gridArea.getY() - _gridArea.height / 2
      }
      const dW = (args.clientX - origin.x);
      const dH = (args.clientY - origin.y);
      _gridArea.x = (origin.x + dW / 2) / CURRENT_SCENE.canvas.width;
      _gridArea.y = (origin.y + dH / 2) / CURRENT_SCENE.canvas.height;

      _gridArea.draw({ width: dW, height: dH, border: "#5f8585", borderWidth: 2 });
      return;
    }
    if (_draggedPiece != null) {
      $('.menu-toggle').hide(); // disable invisible menu toggle
      if (_draggedPiece instanceof Area) {
        _draggedPiece.x = args.clientX / document.getElementById("canvas").width;
        _draggedPiece.y = args.clientY / document.getElementById("canvas").height;
      }
      else {
        _draggedPiece.x = (args.clientX - parseInt(_draggedPiece.width / 2)) / document.getElementById("canvas").width;
        _draggedPiece.y = (args.clientY - parseInt(_draggedPiece.height / 2)) / document.getElementById("canvas").height;
      }

      CURRENT_SCENE.drawPieces();
    }
    else if (_spellRuler != null) {
      CURRENT_SCENE.drawPieces();
      _spellRuler.x = args.clientX / document.getElementById("canvas").width;
      _spellRuler.y = args.clientY / document.getElementById("canvas").height;
      if (_spellRuler instanceof Area) {
        _spellRuler.draw();
      }
    }
  });
  $(can).on('wheel', function (args) {
    if (_spellRuler != null) {
      CURRENT_SCENE.drawPieces();
      _spellRuler.rotation += (Math.PI / 32 * (args.originalEvent.deltaY < 0 ? -1 : 1));
      if (_spellRuler instanceof Area) {
        _spellRuler.draw();
      }

    }
    else if (_draggedPiece != null) {
      _draggedPiece.rotation += (Math.PI / 32 * (args.originalEvent.deltaY < 0 ? -1 : 1));
      CURRENT_SCENE.drawPieces();
    }
  });
  $(can).on('mouseup touchend', async function (args) {
    if (args.type == 'touchend') {
      clearTimeout(touchRightClickTimeout);
    }
    if (_gridSettingMode && _gridArea != null) {
      _gridSettingMode = GridSettingMode.AwaitingInput;
      const width = Math.abs(_gridArea.width);
      const height = Math.abs(_gridArea.height);
      $('.grid-indicator').css('width', width + 'px');
      $('.grid-indicator').css('height', height + 'px');
      $('#input-grid-width').val(width / CURRENT_SCENE.canvas.width);
      $('#input-grid-height').val(height / CURRENT_SCENE.canvas.height);
      onGridSizeChange();
      // _gridArea = null;
      // CURRENT_SCENE.drawPieces();
    }

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
    if (CURRENT_SCENE == null) return; // player mode disable during load up

    _pieceInMenu = shapeIntersects(e.clientX, e.clientY);
    if (_pieceInMenu != null) {
      $('.area-only').hide();
      $('.piece-only').hide();
      bootstrap.Offcanvas.getOrCreateInstance(document.getElementById("piece-menu")).show();
      _pieceInMenu.draw({ border: "#FFEA00" });

      document.getElementById("piece-menu-lock").checked = _pieceInMenu.lock;

      if (_pieceInMenu instanceof Area) {
        $('.area-only').show();
        $('input[name="radio-area-menu-type"]').prop('checked', false);
        $(`input[name='radio-area-menu-type'][value='${_pieceInMenu.type}']`).prop("checked", true);
        $('#input-area-menu-size').val(_pieceInMenu.size);
        $('#input-area-menu-color').val(_pieceInMenu.color);
        $('#input-area-menu-opacity').val(_pieceInMenu.opacity);
        $('#value-area-menu-opacity').html(parseInt(100 * _pieceInMenu.opacity / 255) + '%');
      }
      else {
        $('.piece-only').show();

        // open piece submenu
        document.getElementById("piece-menu-name").value = _pieceInMenu.name;
        $('#piece-menu-image').one('load', function () {
          // work around to re-init cropper for loading current piece image 
          _cropper?.destroy();
          _cropper = new Cropper(document.getElementById('piece-menu-image'));
        });
        document.getElementById("piece-menu-image").src = _pieceInMenu.image;
        document.getElementById("piece-menu-dead").checked = _pieceInMenu.dead;
        document.getElementById("piece-menu-shadow").checked = _pieceInMenu.hideShadow;
        $('input[name="radio-piece-menu-size"]').prop('checked', false);
        $(`input[name='radio-piece-menu-size'][value='${_pieceInMenu.size}']`).prop("checked", true);
        $("#piece-menu-status-conditions").tagsinput('removeAll')
        for (var cond of _pieceInMenu.conditions) {
          $("#piece-menu-status-conditions").tagsinput('add', cond);
        }
        if (_pieceInMenu.aura != null) {
          $('.aura-only').show();
          document.getElementById("checkbox-piece-menu-aura").checked = true;
          document.getElementById("input-aura-menu-size").value = _pieceInMenu.aura.size;
          document.getElementById("input-aura-menu-color").value = _pieceInMenu.aura.color;
          document.getElementById('input-aura-menu-opacity').value = _pieceInMenu.aura.opacity;
          $('#value-aura-menu-opacity').html(parseInt(100 * (_pieceInMenu.aura?.opacity ?? 0) / 255) + '%');
        }
        else {
          $('.aura-only').hide();
          document.getElementById("checkbox-piece-menu-aura").checked = false;
        }
      }
    }
    else {

      var bodyOffsets = document.body.getBoundingClientRect();
      tempX = e.pageX - bodyOffsets.left;
      tempY = e.pageY;

      $("#canvas-submenu").css({ 'display': 'block', 'top': tempY, 'left': tempX });
      $(document.body).one('click focusin', function (e) {
        if (!$('#canvas-submenu').has(e.target).length) {
          $("#canvas-submenu").css({ 'display': 'none' });
        }
      });
    }
  });
}

const displayDebugInfo = function (text) {
  $('.debug-info').html(text);
  if (isLocal()) {
    $('.debug-info').show();
  }
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
  else {
    initMainMenuTour(false);
  }
  loading(false);
}