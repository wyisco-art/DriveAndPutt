export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 768;
export const RENDER_SCALE = 0.35;

export const PHYSICS = {
  FRICTION_GROUND: 0.96, // Friction for ball/car on grass
  FRICTION_SAND: 0.85,   // Friction in sand traps
  CAR_ACCEL: 0.4,
  CAR_MAX_SPEED: 12,
  CAR_TURN_SPEED: 0.07,
  CAR_BRAKE: 0.3,
  BALL_BOUNCE: 0.8,      // Bounciness of ball against walls
  CAR_BOUNCE: 0.3,       // Bounciness of car against walls
  COLLISION_DAMPING: 0.8, // Energy lost in car-ball collision
  HANDBRAKE_TRACTION: 0.05,
  HANDBRAKE_TURN_MULT: 1.8
};

export const SURFACE_PROPS: Record<number, { drag: number, traction: number, accel: number }> = {
  0: { drag: 0.04, traction: 0.15, accel: 1.0 }, // GRASS
  1: { drag: 0.04, traction: 0.15, accel: 1.0 }, // WALL
  2: { drag: 0.15, traction: 0.04, accel: 0.5 }, // SAND (High drag, low grip)
  3: { drag: 0.30, traction: 0.02, accel: 0.2 }, // WATER (Very high drag, no grip)
  4: { drag: 0.04, traction: 0.15, accel: 1.0 }, // HOLE
  5: { drag: 0.04, traction: 0.15, accel: 1.0 }  // START
};

export const SIZES = {
  CAR_WIDTH: 30,
  CAR_HEIGHT: 18,
  BALL_RADIUS: 10,
  HOLE_RADIUS: 18,
  WALL_THICKNESS: 20
};

export enum TileType {
  GRASS = 0,
  WALL = 1,
  SAND = 2,
  WATER = 3,
  HOLE = 4,
  START = 5
}

// A simple map layout defined by rectangles [x, y, w, h, type]
export const LEVEL_1_WALLS = [
  // Outer Boundaries
  { x: 0, y: 0, w: CANVAS_WIDTH, h: 20, type: TileType.WALL }, // Top
  { x: 0, y: CANVAS_HEIGHT - 20, w: CANVAS_WIDTH, h: 20, type: TileType.WALL }, // Bottom
  { x: 0, y: 0, w: 20, h: CANVAS_HEIGHT, type: TileType.WALL }, // Left
  { x: CANVAS_WIDTH - 20, y: 0, w: 20, h: CANVAS_HEIGHT, type: TileType.WALL }, // Right

  // Obstacles (Dogleg Right layout)
  { x: 300, y: 0, w: 50, h: 400, type: TileType.WALL }, 
  { x: 300, y: 550, w: 50, h: 250, type: TileType.WALL },
  
  { x: 600, y: 200, w: 40, h: 600, type: TileType.WALL },
];

export const LEVEL_1_SANDTRAPS = [
  { x: 100, y: 400, w: 150, h: 100, type: TileType.SAND },
  { x: 700, y: 100, w: 200, h: 150, type: TileType.SAND },
];

export const LEVEL_1_WATER = [
  { x: 400, y: 600, w: 150, h: 100, type: TileType.WATER },
];

export const START_POS = { x: 100, y: 100 };
export const HOLE_POS = { x: 900, y: 650 };
export const PAR_STROKES = 4;
export const MAX_STROKES_FOR_PAR = 4;