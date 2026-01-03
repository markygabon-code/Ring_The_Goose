export type Point = {
  x: number;
  y: number;
};

export type Vector3D = {
  x: number;
  y: number; // Depth (distance from camera)
  z: number; // Height (altitude)
};

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
}

export type GooseState = {
  pos: Vector3D;
  vel: Vector3D;
  targetPos: Vector3D;
  isCaught: boolean;
  neckAngle: number;
  legFrame: number;
  direction: number; // 1 for right, -1 for left
  pauseTimer: number; // How long to stay still
};

export type HoopState = {
  pos: Vector3D;
  vel: Vector3D;
  active: boolean; // Is it currently flying?
  landed: boolean; // Has it hit the ground/neck?
  scale: number;
};

export type DragState = {
  isDragging: boolean;
  start: Point;
  current: Point;
};