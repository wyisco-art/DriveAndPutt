/**
 * HUD Renderer
 * Handles rendering the speedometer and guide arrow.
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, PHYSICS } from '../constants';
import { Car, Vector } from '../types';
import { getDistance } from '../utils/physics';

/**
 * Draw the speedometer gauge
 */
export const drawSpeedometer = (
    ctx: CanvasRenderingContext2D,
    car: Car,
    isHandbraking: boolean
): void => {
    ctx.save();

    // Position: Bottom Right
    const gaugeX = CANVAS_WIDTH - 80;
    const gaugeY = CANVAS_HEIGHT - 80;
    const gaugeR = 40;

    // Gauge Back
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, gaugeR, 0, Math.PI * 2);
    ctx.fill();

    // Speed Arc
    const maxSpeed = PHYSICS.CAR_MAX_SPEED;
    const speedPct = Math.min(Math.abs(car.speed) / maxSpeed, 1);

    const startAngle = Math.PI * 0.8;
    const endAngle = Math.PI * 2.2;
    const currentAngle = startAngle + (endAngle - startAngle) * speedPct;

    // Background Arc
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, gaugeR - 10, startAngle, endAngle);
    ctx.stroke();

    // Active Arc
    ctx.strokeStyle = speedPct > 0.8 ? '#ef4444' : '#3b82f6';
    ctx.beginPath();
    ctx.arc(gaugeX, gaugeY, gaugeR - 10, startAngle, currentAngle);
    ctx.stroke();

    // Label
    ctx.fillStyle = '#fff';
    ctx.font = '10px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText(Math.round(Math.abs(car.speed) * 10).toString(), gaugeX, gaugeY + 5);

    // Handbrake Indicator
    if (isHandbraking) {
        ctx.fillStyle = '#ef4444';
        ctx.font = '8px "Press Start 2P"';
        ctx.fillText("DRIFT", gaugeX, gaugeY + 20);
    }

    ctx.restore();
};

/**
 * Draw the guide arrow pointing toward the hole
 */
export const drawGuideArrow = (
    ctx: CanvasRenderingContext2D,
    carPos: Vector,
    holePos: Vector
): void => {
    const angleToHole = Math.atan2(holePos.y - carPos.y, holePos.x - carPos.x);
    const dist = getDistance(carPos, holePos);

    if (dist > 100) {
        ctx.save();
        ctx.translate(carPos.x, carPos.y);
        ctx.rotate(angleToHole);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.beginPath();
        ctx.moveTo(40, 0);
        ctx.lineTo(30, -8);
        ctx.lineTo(30, 8);
        ctx.fill();
        ctx.restore();
    }
};
