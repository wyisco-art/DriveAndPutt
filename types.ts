export interface Vector {
    x: number;
    y: number;
}

export interface GameObject {
    pos: Vector;
    vel: Vector;
    radius: number; // Used for collision approximation
}

export interface Car extends GameObject {
    angle: number; // in radians
    speed: number;
    width: number;
    height: number;
}

export interface Rect {
    x: number;
    y: number;
    w: number;
    h: number;
    type: number;
}

export enum GameState {
    MENU,
    PLAYING,
    WON,
    LOST
}
