/**
 * Car Renderer
 * Handles rendering the golf cart with lean effects, brake lights, and spawn animation.
 */

import { Car, GameState } from '../types';

interface CarRenderOptions {
    car: Car;
    spawnScale: number;
    lean: number;
    gameState: GameState;
    isBraking: boolean;
}

/**
 * Draw the golf cart with all effects
 */
export const drawCar = (
    ctx: CanvasRenderingContext2D,
    options: CarRenderOptions
): void => {
    const { car, spawnScale, lean, gameState, isBraking } = options;

    ctx.save();
    ctx.translate(car.pos.x, car.pos.y);

    // Spawn Scale Effect
    ctx.scale(spawnScale, spawnScale);

    ctx.rotate(car.angle);

    // Car Idle Vibration
    if (gameState === GameState.PLAYING && Math.abs(car.speed) < 0.2) {
        ctx.translate((Math.random() - 0.5), (Math.random() - 0.5));
    }

    // 1. Static Shadow (Doesn't roll)
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(-car.width / 2 + 4, -car.height / 2 + 4, car.width, car.height);

    // 2. Body with Roll (Suspension effect)
    ctx.translate(0, lean); // Apply suspension roll

    // Body (Red)
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(-car.width / 2, -car.height / 2, car.width, car.height);

    // Roof (Moves more than body to look like perspective lean)
    ctx.save();
    ctx.translate(0, lean * 0.5);
    ctx.fillStyle = '#991b1b';
    ctx.fillRect(-car.width / 4, -car.height / 2 + 2, car.width / 2, car.height - 4);

    // Windshield (Light blueish)
    ctx.fillStyle = '#93c5fd';
    ctx.fillRect(0, -car.height / 2 + 3, 6, car.height - 6);
    ctx.restore();

    // Headlights
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(car.width / 2 - 2, -car.height / 2 + 2, 4, 4);
    ctx.fillRect(car.width / 2 - 2, car.height / 2 - 6, 4, 4);

    // Brake Lights
    ctx.fillStyle = '#7f1d1d';
    if (isBraking) {
        ctx.fillStyle = '#ff0000'; // Bright red when braking
    }
    ctx.fillRect(-car.width / 2, -car.height / 2 + 2, 2, 4);
    ctx.fillRect(-car.width / 2, car.height / 2 - 6, 2, 4);

    ctx.restore();
};
