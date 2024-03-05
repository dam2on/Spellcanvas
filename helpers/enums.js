const EventTypes = {
  AddPiece: 'add piece',
  MovePiece: 'move piece',
  DeletePiece: 'delete piece',
  RequestPieces: 'request peice',
  UpdatePiece: 'update piece',
  ChangeBackground: 'change background',
  GridChange: 'grid change',
  ConnectedToHost: 'connected to host',
  PlayerJoin: 'player join',
  InformPlayerRemoved: 'inform player removed',
  PermissionsUpdate: 'permissions update',
  LoadScene: 'load scene',
  LoadSceneSuccess: 'load scene success'
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
  Scenes: 'scenes',
  SessionPieces: 'session pieces'
}

const PieceSizes = {
  Tiny: 2.5,
  Small: 4,
  Medium: 5,
  Large: 10,
  Huge: 15,
  Gargantuan: 20,
  Colossal: 30
}

const GridSettingMode = {
  Off: 0,
  AwaitingInput: 1,
  Drawing: 2
}

const AreaType = {
  Line: 'line',
  Circle: 'circle',
  Cone: 'cone',
  Square: 'square'
}

const PlayerStatus = {
  Pending: 'pending',
  Connected: 'connected',
  Loading: 'loading',
  Disconnected: 'disconnected'
}

const PermissionType = {
  OnlyMoveOwnedPieces: 'only moved owned pieces'
}

const Tutorials = {
  Main: 'main',
  GamePiece: 'game piece'
}