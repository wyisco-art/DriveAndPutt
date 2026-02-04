import React, { useEffect, useRef, useCallback } from 'react';
import { CANVAS_WIDTH, CANVAS_HEIGHT, RENDER_SCALE } from '../constants';
import { GameState, Level } from '../types';
import { useGameLoop } from '../hooks/useGameLoop';
import { useTextures } from '../hooks/useTextures';
import {
    drawBackground,
    drawTireTracks,
    drawSandTraps,
    drawWater,
    drawWalls,
    drawHoleAndFlag,
    drawCar,
    drawBallTrail,
    drawBall,
    drawParticles,
    drawTextEffects,
    drawSpeedometer,
    drawGuideArrow
} from '../renderers';

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

    // Texture patterns
    const texturesRef = useTextures();

    // Game logic hook
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

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const time = timeRef.current;
        const car = carRef.current;
        const ball = ballRef.current;
        const textures = texturesRef.current;

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
        ctx.fillStyle = '#1a2e1a';
        ctx.fillRect(-10, -10, CANVAS_WIDTH + 20, CANVAS_HEIGHT + 20);

        // Draw terrain layers
        drawBackground(ctx, textures);
        drawTireTracks(ctx, tracksRef.current);
        drawSandTraps(ctx, level.sandTraps, textures);
        drawWater(ctx, level.water, time);
        drawWalls(ctx, level.walls, textures);
        drawHoleAndFlag(ctx, level.holePos, time);

        // Draw car
        drawCar(ctx, {
            car,
            spawnScale: spawnScaleRef.current,
            lean: leanRef.current,
            gameState,
            isBraking: keysPressed.current['ArrowDown'] || keysPressed.current['KeyS']
        });

        // Draw ball
        drawBallTrail(ctx, ball.trail, ball.radius);
        drawBall(ctx, ball);

        // Draw effects
        drawParticles(ctx, particlesRef.current);
        drawTextEffects(ctx, effectsRef.current);

        // Draw HUD
        if (gameState === GameState.PLAYING) {
            drawSpeedometer(ctx, car, keysPressed.current['Space']);
            drawGuideArrow(ctx, car.pos, level.holePos);
        }

        ctx.restore();
    }, [gameState]);

    // Game Loop
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