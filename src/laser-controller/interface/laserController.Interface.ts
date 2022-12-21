export type laserControllerstate = LaserControllerState;

export enum LaserControllerState {
  BOOT_UP = 0,
  INIT = 1,
  READY = 2,
  ERROR = 100,
}
