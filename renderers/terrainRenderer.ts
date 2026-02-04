/**
 * Terrain Renderer
 * Handles rendering of all terrain elements: grass, sand traps, water, walls, and hole.
 */

import { CANVAS_WIDTH, CANVAS_HEIGHT, SIZES } from '../constants';
import { Rect, Vector } from '../types';
import { TexturePatterns } from './texturePatterns';

interface TireTrack {
    x: number;
    y: number;
    angle: number;
    life: number;
}

/**
 * Draw the grass background with fairway stripes
 */
export const drawBackground = (
    ctx: CanvasRenderingContext2D,
    textures: TexturePatterns
): void => {
    // Draw Grass (Pattern)
    if (textures.grass) {
        ctx.fillStyle = textures.grass;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else {
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    // Draw Fairway Stripes (Visual Only overlay)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    for (let i = 0; i < CANVAS_WIDTH; i += 100) {
        ctx.fillRect(i, 0, 50, CANVAS_HEIGHT);
    }
};

/**
 * Draw tire tracks left by the car
 */
export const drawTireTracks = (
    ctx: CanvasRenderingContext2D,
    tracks: TireTrack[]
): void => {
    tracks.forEach(track => {
        ctx.save();
        ctx.globalAlpha = track.life * 0.4;
        ctx.translate(track.x, track.y);
        ctx.rotate(track.angle);
        ctx.fillStyle = '#1f2937'; // Dark asphalt color
        ctx.fillRect(-2, -2, 4, 4);
        ctx.restore();
    });
};

/**
 * Draw sand traps with texture and shadow
 */
export const drawSandTraps = (
    ctx: CanvasRenderingContext2D,
    sandTraps: Rect[],
    textures: TexturePatterns
): void => {
    sandTraps.forEach(trap => {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(trap.x + 4, trap.y + 4, trap.w, trap.h);

        // Texture
        if (textures.sand) {
            ctx.fillStyle = textures.sand;
        } else {
            ctx.fillStyle = '#fde047';
        }
        ctx.fillRect(trap.x, trap.y, trap.w, trap.h);

        // Inner shadow for depth
        ctx.strokeStyle = 'rgba(0,0,0,0.1)';
        ctx.lineWidth = 4;
        ctx.strokeRect(trap.x + 2, trap.y + 2, trap.w - 4, trap.h - 4);
    });
};

/**
 * Draw water hazards with animated waves
 */
export const drawWater = (
    ctx: CanvasRenderingContext2D,
    waterAreas: Rect[],
    time: number
): void => {
    const animTime = time * 0.05;

    waterAreas.forEach(water => {
        // Base Water
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(water.x, water.y, water.w, water.h);

        // Animated Waves
        ctx.save();
        ctx.beginPath();
        ctx.rect(water.x, water.y, water.w, water.h);
        ctx.clip();

        ctx.lineWidth = 4;
        const numWaves = Math.ceil(water.h / 20) + 1;

        for (let i = 0; i < numWaves; i++) {
            const yOffset = (i * 20) + Math.sin(animTime + i) * 5;
            const y = water.y + 10 + yOffset;

            // Only draw if within bounds (with some margin for wave height)
            if (y > water.y - 10 && y < water.y + water.h + 10) {
                ctx.strokeStyle = (i % 2 === 0) ? '#60a5fa' : '#3b82f6';
                ctx.beginPath();
                ctx.moveTo(water.x - 20, y);
                for (let x = 0; x <= water.w + 20; x += 10) {
                    ctx.lineTo(water.x + x, y + Math.sin(x * 0.05 + animTime) * 3);
                }
                ctx.stroke();
            }
        }

        // Water Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.beginPath();
        ctx.arc(water.x + 20, water.y + 20, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Border
        ctx.strokeStyle = '#1e40af';
        ctx.lineWidth = 2;
        ctx.strokeRect(water.x, water.y, water.w, water.h);
    });
};

/**
 * Draw wooden walls with 3D bevel effect
 */
export const drawWalls = (
    ctx: CanvasRenderingContext2D,
    walls: Rect[],
    textures: TexturePatterns
): void => {
    walls.forEach(wall => {
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(wall.x + 6, wall.y + 6, wall.w, wall.h);

        // Wood Texture
        if (textures.wood) {
            ctx.fillStyle = textures.wood;
        } else {
            ctx.fillStyle = '#78350f';
        }
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);

        // 3D Bevel Edge
        ctx.lineWidth = 4;

        // Top/Left Light
        ctx.beginPath();
        ctx.moveTo(wall.x + wall.w, wall.y);
        ctx.lineTo(wall.x, wall.y);
        ctx.lineTo(wall.x, wall.y + wall.h);
        ctx.strokeStyle = '#a16207'; // Lighter brown
        ctx.stroke();

        // Bottom/Right Dark
        ctx.beginPath();
        ctx.moveTo(wall.x + wall.w, wall.y);
        ctx.lineTo(wall.x + wall.w, wall.y + wall.h);
        ctx.lineTo(wall.x, wall.y + wall.h);
        ctx.strokeStyle = '#451a03'; // Darker brown
        ctx.stroke();
    });
};

/**
 * Draw the hole with glow effect and waving flag
 */
export const drawHoleAndFlag = (
    ctx: CanvasRenderingContext2D,
    holePos: Vector,
    time: number
): void => {
    // Pulse Glow
    const pulse = (Math.sin(time * 0.1) + 1) * 0.5;
    ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + pulse * 0.1})`;
    ctx.beginPath();
    ctx.arc(holePos.x, holePos.y, SIZES.HOLE_RADIUS * (1.2 + pulse * 0.2), 0, Math.PI * 2);
    ctx.fill();

    // Hole gradient
    const holeGradient = ctx.createRadialGradient(
        holePos.x, holePos.y, SIZES.HOLE_RADIUS * 0.2,
        holePos.x, holePos.y, SIZES.HOLE_RADIUS
    );
    holeGradient.addColorStop(0, '#000000');
    holeGradient.addColorStop(1, '#374151');

    ctx.fillStyle = holeGradient;
    ctx.beginPath();
    ctx.arc(holePos.x, holePos.y, SIZES.HOLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Hole Rim
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw Flag
    const flagWave = Math.sin(time * 3) * 3;

    // Pole
    ctx.strokeStyle = '#e5e7eb'; // Silver pole
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(holePos.x, holePos.y);
    ctx.lineTo(holePos.x, holePos.y - 45);
    ctx.stroke();

    // Flag Fabric
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(holePos.x, holePos.y - 45);
    ctx.quadraticCurveTo(
        holePos.x + 10, holePos.y - 45 + flagWave,
        holePos.x + 24, holePos.y - 35 + flagWave
    ); // Top edge
    ctx.lineTo(holePos.x + 24, holePos.y - 25 + flagWave); // Right edge
    ctx.quadraticCurveTo(
        holePos.x + 10, holePos.y - 35 + flagWave,
        holePos.x, holePos.y - 25
    ); // Bottom edge
    ctx.fill();

    // Flag Shadow on ground
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(holePos.x + 10, holePos.y + 5, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
};
