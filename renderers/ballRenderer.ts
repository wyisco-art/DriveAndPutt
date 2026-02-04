/**
 * Ball Renderer
 * Handles rendering the golf ball with trail, dimples, and shading.
 */

import { Vector } from '../types';

interface Ball {
    pos: Vector;
    vel: Vector;
    radius: number;
    trail: Vector[];
}

/**
 * Draw the ball's motion trail
 */
export const drawBallTrail = (
    ctx: CanvasRenderingContext2D,
    trail: Vector[],
    radius: number
): void => {
    if (trail.length <= 1) return;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(trail[0].x, trail[0].y);
    for (let i = 1; i < trail.length; i++) {
        ctx.lineTo(trail[i].x, trail[i].y);
    }
    ctx.lineWidth = radius;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.restore();
};

/**
 * Draw the golf ball with rolling dimple animation and shading
 */
export const drawBall = (
    ctx: CanvasRenderingContext2D,
    ball: Ball
): void => {
    ctx.save();
    ctx.translate(ball.pos.x, ball.pos.y);

    // 1. Shadow (On ground)
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.arc(3, 3, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // 2. Ball Base (White)
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // 3. Rolling Texture (Dimples)
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.clip(); // Clip drawing to ball circle

    const dimpleSpacing = 5;
    const dimpleSize = 1.0; // Small crisp dots

    const startI = -ball.radius - dimpleSpacing;
    const endI = ball.radius + dimpleSpacing;

    ctx.fillStyle = '#cbd5e1'; // Grey dimples

    for (let i = startI; i < endI; i += dimpleSpacing) {
        for (let j = startI; j < endI; j += dimpleSpacing) {
            // Hexagonal offset for alternate rows
            const rowIndex = Math.floor(j / dimpleSpacing);
            const rowOffset = (rowIndex % 2 === 0) ? 0 : dimpleSpacing / 2;

            const scrollX = (ball.pos.x * 0.5) % dimpleSpacing;
            const scrollY = (ball.pos.y * 0.5) % dimpleSpacing;

            let drawX = i - scrollX + rowOffset;
            let drawY = j - scrollY;

            if (drawX * drawX + drawY * drawY < (ball.radius + 2) * (ball.radius + 2)) {
                ctx.beginPath();
                ctx.arc(drawX, drawY, dimpleSize, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    ctx.restore(); // End clipping

    // 4. Shading Gradient
    const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, ball.radius);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)');
    grad.addColorStop(0.3, 'rgba(255,255,255,0)');
    grad.addColorStop(0.8, 'rgba(0,0,0,0.05)');
    grad.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
};
