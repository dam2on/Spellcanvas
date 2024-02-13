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
  PlayerReconnected: 'player reconnected'
}

const BackgroundType = {
  Image: 'image',
  Video: 'video'
}

const StorageKeys = {
  Player: 'player',
  HostId: 'hostId',
  BackgroundData: 'background',
  Pieces: 'pieces',
  Party: 'party'
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