import React, { useEffect, useRef, useCallback } from 'react';
import {
    CANVAS_WIDTH, CANVAS_HEIGHT, SIZES, PHYSICS, RENDER_SCALE
} from '../constants';
import { GameState, Level } from '../types';
import { useGameLoop } from '../hooks/useGameLoop';
import { getDistance } from '../utils/physics';

interface GameCanvasProps {
    gameState: GameState;
    setGameState: (state: GameState) => void;
    strokes: number;
    setStrokes: (s: number | ((prev: number) => number)) => void;
    level: Level;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, strokes, setStrokes, level }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);

    // Texture Refs
    const texturesRef = useRef<{
        grass: CanvasPattern | null;
        sand: CanvasPattern | null;
        wood: CanvasPattern | null;
    }>({ grass: null, sand: null, wood: null });

    // Use Custom Hook for Logic
    const {
        update,
        timeRef,
        carRef,
        ballRef,
        effectsRef,
        particlesRef,
        tracksRef,
        shakeRef,
        spawnScaleRef,
        leanRef,
        keysPressed
    } = useGameLoop(gameState, setGameState, strokes, setStrokes, level);

    // Initialize Textures (Visuals only, kept in component)
    useEffect(() => {
        const generatePattern = (width: number, height: number, drawFn: (ctx: CanvasRenderingContext2D) => void) => {
            const c = document.createElement('canvas');
            c.width = width;
            c.height = height;
            const ctx = c.getContext('2d');
            if (ctx) {
                drawFn(ctx);
                return ctx.createPattern(c, 'repeat');
            }
            return null;
        };

        // Grass Pattern
        texturesRef.current.grass = generatePattern(32, 32, (ctx) => {
            ctx.fillStyle = '#4ade80'; // Base green
            ctx.fillRect(0, 0, 32, 32);
            ctx.fillStyle = '#22c55e'; // Darker blades
            for (let i = 0; i < 40; i++) {
                const x = Math.random() * 32;
                const y = Math.random() * 32;
                ctx.fillRect(x, y, 2, 2);
            }
            ctx.fillStyle = '#86efac'; // Lighter blades
            for (let i = 0; i < 10; i++) {
                const x = Math.random() * 32;
                const y = Math.random() * 32;
                ctx.fillRect(x, y, 1, 1);
            }
        });

        // Sand Pattern
        texturesRef.current.sand = generatePattern(16, 16, (ctx) => {
            ctx.fillStyle = '#fde047'; // Base sand
            ctx.fillRect(0, 0, 16, 16);
            ctx.fillStyle = '#d97706'; // Dark grains
            for (let i = 0; i < 12; i++) {
                ctx.fillRect(Math.random() * 16, Math.random() * 16, 1, 1);
            }
            ctx.fillStyle = '#fef08a'; // Light grains
            for (let i = 0; i < 12; i++) {
                ctx.fillRect(Math.random() * 16, Math.random() * 16, 1, 1);
            }
        });

        // Wood Pattern
        texturesRef.current.wood = generatePattern(32, 32, (ctx) => {
            ctx.fillStyle = '#78350f'; // Base wood
            ctx.fillRect(0, 0, 32, 32);
            // Planks
            ctx.fillStyle = '#451a03';
            ctx.fillRect(0, 0, 32, 1); // Top line
            ctx.fillRect(0, 16, 32, 1); // Middle line
            // Grain
            ctx.fillStyle = 'rgba(0,0,0,0.1)';
            for (let i = 0; i < 10; i++) {
                const y = Math.random() * 32;
                ctx.fillRect(Math.random() * 20, y, 12, 1);
            }
            // Nails
            ctx.fillStyle = '#27272a';
            ctx.fillRect(2, 4, 2, 2);
            ctx.fillRect(2, 20, 2, 2);
            ctx.fillRect(28, 4, 2, 2);
            ctx.fillRect(28, 20, 2, 2);
        });

    }, []);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const time = timeRef.current;
        const car = carRef.current;
        const ball = ballRef.current;

        // Apply scaling
        ctx.save();
        ctx.scale(RENDER_SCALE, RENDER_SCALE);

        // Apply Screen Shake
        if (shakeRef.current > 0) {
            const dx = (Math.random() - 0.5) * shakeRef.current;
            const dy = (Math.random() - 0.5) * shakeRef.current;
            ctx.translate(dx, dy);
        }

        // Clear Screen
        ctx.fillStyle = '#1a2e1a'; // Dark background
        ctx.fillRect(-10, -10, CANVAS_WIDTH + 20, CANVAS_HEIGHT + 20);

        // Draw Grass (Pattern)
        if (texturesRef.current.grass) {
            ctx.fillStyle = texturesRef.current.grass;
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

        // Draw Tire Tracks
        tracksRef.current.forEach(track => {
            ctx.save();
            ctx.globalAlpha = track.life * 0.4;
            ctx.translate(track.x, track.y);
            ctx.rotate(track.angle);
            ctx.fillStyle = '#1f2937'; // Dark asphalt color
            ctx.fillRect(-2, -2, 4, 4);
            ctx.restore();
        });

        // Draw Sand Traps
        level.sandTraps.forEach(trap => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.fillRect(trap.x + 4, trap.y + 4, trap.w, trap.h);

            // Texture
            if (texturesRef.current.sand) {
                ctx.fillStyle = texturesRef.current.sand;
            } else {
                ctx.fillStyle = '#fde047';
            }
            ctx.fillRect(trap.x, trap.y, trap.w, trap.h);

            // Inner shadow for depth
            ctx.strokeStyle = 'rgba(0,0,0,0.1)';
            ctx.lineWidth = 4;
            ctx.strokeRect(trap.x + 2, trap.y + 2, trap.w - 4, trap.h - 4);
        });

        // Draw Water with Animation
        const animTime = time * 0.05;
        level.water.forEach(water => {
            // Base Water
            ctx.fillStyle = '#2563eb';
            ctx.fillRect(water.x, water.y, water.w, water.h);

            // Animated Waves
            ctx.save();
            ctx.beginPath();
            ctx.rect(water.x, water.y, water.w, water.h);
            ctx.clip();

            ctx.lineWidth = 4;
            // FIX: Loop based on height to cover entire water area
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

        // Draw Walls (Wood)
        level.walls.forEach(wall => {
            // Shadow
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fillRect(wall.x + 6, wall.y + 6, wall.w, wall.h);

            // Wood Texture
            if (texturesRef.current.wood) {
                ctx.fillStyle = texturesRef.current.wood;
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

        // Draw Hole (With depth and glow)
        // Pulse Glow
        const pulse = (Math.sin(time * 0.1) + 1) * 0.5;
        ctx.fillStyle = `rgba(255, 255, 255, ${0.1 + pulse * 0.1})`;
        ctx.beginPath();
        ctx.arc(level.holePos.x, level.holePos.y, SIZES.HOLE_RADIUS * (1.2 + pulse * 0.2), 0, Math.PI * 2);
        ctx.fill();

        const holeGradient = ctx.createRadialGradient(level.holePos.x, level.holePos.y, SIZES.HOLE_RADIUS * 0.2, level.holePos.x, level.holePos.y, SIZES.HOLE_RADIUS);
        holeGradient.addColorStop(0, '#000000');
        holeGradient.addColorStop(1, '#374151');

        ctx.fillStyle = holeGradient;
        ctx.beginPath();
        ctx.arc(level.holePos.x, level.holePos.y, SIZES.HOLE_RADIUS, 0, Math.PI * 2);
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
        ctx.moveTo(level.holePos.x, level.holePos.y);
        ctx.lineTo(level.holePos.x, level.holePos.y - 45);
        ctx.stroke();

        // Flag Fabric
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(level.holePos.x, level.holePos.y - 45);
        ctx.quadraticCurveTo(level.holePos.x + 10, level.holePos.y - 45 + flagWave, level.holePos.x + 24, level.holePos.y - 35 + flagWave); // Top edge
        ctx.lineTo(level.holePos.x + 24, level.holePos.y - 25 + flagWave); // Right edge
        ctx.quadraticCurveTo(level.holePos.x + 10, level.holePos.y - 35 + flagWave, level.holePos.x, level.holePos.y - 25); // Bottom edge
        ctx.fill();

        // Flag Shadow on ground
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(level.holePos.x + 10, level.holePos.y + 5, 8, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw Car
        ctx.save();
        ctx.translate(car.pos.x, car.pos.y);

        // Spawn Scale Effect
        const scale = spawnScaleRef.current;
        ctx.scale(scale, scale);

        ctx.rotate(car.angle);

        // Car Idle Vibration
        if (gameState === GameState.PLAYING && Math.abs(car.speed) < 0.2) {
            ctx.translate((Math.random() - 0.5), (Math.random() - 0.5));
        }

        // 1. Static Shadow (Doesn't roll)
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(-car.width / 2 + 4, -car.height / 2 + 4, car.width, car.height);

        // 2. Body with Roll (Suspension effect)
        const leanY = leanRef.current;

        ctx.translate(0, leanY); // Apply suspension roll

        // Body (Red)
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-car.width / 2, -car.height / 2, car.width, car.height);

        // Roof (Moves more than body to look like perspective lean)
        ctx.save();
        ctx.translate(0, leanY * 0.5);
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
        if (keysPressed.current['ArrowDown'] || keysPressed.current['KeyS']) {
            ctx.fillStyle = '#ff0000'; // Bright red when braking
        }
        ctx.fillRect(-car.width / 2, -car.height / 2 + 2, 2, 4);
        ctx.fillRect(-car.width / 2, car.height / 2 - 6, 2, 4);

        ctx.restore();

        // Draw Ball Trail
        if (ballRef.current.trail.length > 1) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(ballRef.current.trail[0].x, ballRef.current.trail[0].y);
            for (let i = 1; i < ballRef.current.trail.length; i++) {
                ctx.lineTo(ballRef.current.trail[i].x, ballRef.current.trail[i].y);
            }
            ctx.lineWidth = ball.radius;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
            ctx.restore();
        }

        // Draw Ball with Rolling Animation
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

        // Draw Particles
        particlesRef.current.forEach(p => {
            ctx.save();
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
            ctx.restore();
        });

        // Draw Text Effects
        effectsRef.current.forEach(effect => {
            ctx.save();
            ctx.globalAlpha = Math.max(0, effect.life);
            ctx.fillStyle = effect.color || '#ef4444';
            ctx.font = '20px "Press Start 2P"';
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 4;
            ctx.lineJoin = 'round';
            ctx.strokeText(effect.text, effect.x, effect.y);
            ctx.fillText(effect.text, effect.x, effect.y);
            ctx.restore();
        });

        // Draw HUD Elements (Speedometer)
        if (gameState === GameState.PLAYING) {
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
            if (keysPressed.current['Space']) {
                ctx.fillStyle = '#ef4444';
                ctx.font = '8px "Press Start 2P"';
                ctx.fillText("DRIFT", gaugeX, gaugeY + 20);
            }

            ctx.restore();
        }

        // Guide Arrow
        if (gameState === GameState.PLAYING) {
            const angleToHole = Math.atan2(level.holePos.y - car.pos.y, level.holePos.x - car.pos.x);
            const dist = getDistance(car.pos, level.holePos);
            if (dist > 100) {
                ctx.save();
                ctx.translate(car.pos.x, car.pos.y);
                ctx.rotate(angleToHole);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.beginPath();
                ctx.moveTo(40, 0);
                ctx.lineTo(30, -8);
                ctx.lineTo(30, 8);
                ctx.fill();
                ctx.restore();
            }
        }

        ctx.restore();

    }, [gameState]);

    // Loop
    useEffect(() => {
        const loop = () => {
            update();
            draw();
            requestRef.current = requestAnimationFrame(loop);
        };
        requestRef.current = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(requestRef.current!);
    }, [update, draw]);

    return (
        <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH * RENDER_SCALE}
            height={CANVAS_HEIGHT * RENDER_SCALE}
            className="block w-full h-full bg-green-800"
            style={{ imageRendering: 'pixelated' }}
        />
    );
};

export default GameCanvas;