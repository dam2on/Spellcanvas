const EventTypes = {
  NewPlayer: 'new player',
  AddPiece: 'add piece',
  MovePiece: 'move piece',
  DeletePiece: 'delete piece',
  RequestPiece: 'request peice',
  UpdatePiece: 'update piece',
  ChangeBackground: 'change background',
  GridChange: 'grid change',
  ConnectedToHost: 'connected to host',
  ResetPieces: 'reset pieces',
  PlayerReconnected: 'player reconnected',
  PermissionsUpdate: 'permissions update',
  LoadScene: 'load scene'
}

const BackgroundType = {
  Image: 'image',
  Video: 'video'
}

const StorageKeys = {
  Player: 'player',
  HostId: 'host id',
  Background: 'background',
  Pieces: 'pieces',
  Party: 'party',
  Tutorial: 'tutorial',
  GridRatio: 'grid ratio',
  Permissions: 'permissions',
  Scenes: 'scenes'
}

const PieceSizes = {
  Tiny: 0.5,
  Small: 0.9,
  Medium: 1,
  Large: 2,
  Huge: 3,
  Gargantuan: 4,
}

const AreaType = {
  Line: 'line',
  Circle: 'circle',
  Cone: 'cone',
  Square: 'square'
}

const PermissionType = {
  OnlyMoveOwnedPieces: 'only moved owned pieces'
}