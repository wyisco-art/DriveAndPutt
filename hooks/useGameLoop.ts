import { useEffect, useRef, useCallback } from 'react';
import { GameState, Level, Car, Vector } from '../types';
import { PHYSICS, SIZES, TileType, SURFACE_PROPS } from '../constants';
import { checkCircleRectCollision, resolveCircleRectCollision, checkCircleCircleCollision, resolveCarBallCollision, getDistance } from '../utils/physics';
import { useInput } from './useInput';
import { useAudio } from './useAudio';

interface Effect {
    x: number;
    y: number;
    vx: number;
    vy: number;
    text: string;
    life: number;
    id: number;
    color?: string;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
    decay: number;
    gravity?: number;
}

interface TireTrack {
    x: number;
    y: number;
    angle: number;
    life: number;
}

export const useGameLoop = (
    gameState: GameState,
    setGameState: (state: GameState) => void,
    strokes: number,
    setStrokes: (s: number | ((prev: number) => number)) => void,
    level: Level
) => {
    const requestRef = useRef<number>(0);
    const timeRef = useRef<number>(0);
    const lastStrokeTime = useRef<number>(0);

    const keysPressed = useInput();
    const { playSound, updateEngineSound } = useAudio(gameState);

    // Game Entities
    const carRef = useRef<Car>({
        pos: { ...level.startPos },
        vel: { x: 0, y: 0 },
        angle: 0,
        speed: 0,
        width: SIZES.CAR_WIDTH,
        height: SIZES.CAR_HEIGHT,
        radius: SIZES.CAR_WIDTH / 2
    });

    const ballRef = useRef({
        pos: { x: level.startPos.x + 60, y: level.startPos.y },
        vel: { x: 0, y: 0 },
        radius: SIZES.BALL_RADIUS,
        trail: [] as Vector[]
    });

    // Visual Effects
    const spawnScaleRef = useRef(0);
    const leanRef = useRef(0);
    const shakeRef = useRef(0);
    const effectsRef = useRef<Effect[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const tracksRef = useRef<TireTrack[]>([]);
    const effectIdCounter = useRef(0);

    // Reset Game Logic
    const resetGame = useCallback(() => {
        carRef.current = {
            pos: { ...level.startPos },
            vel: { x: 0, y: 0 },
            angle: 0,
            speed: 0,
            width: SIZES.CAR_WIDTH,
            height: SIZES.CAR_HEIGHT,
            radius: SIZES.CAR_WIDTH / 2
        };
        ballRef.current = {
            pos: { x: level.startPos.x + 60, y: level.startPos.y },
            vel: { x: 0, y: 0 },
            radius: SIZES.BALL_RADIUS,
            trail: []
        };
        effectsRef.current = [];
        particlesRef.current = [];
        tracksRef.current = [];
        shakeRef.current = 0;
        spawnScaleRef.current = 0;
        setStrokes(0);
    }, [level, setStrokes]);

    // Resets when entering MENU or when ball moves before first stroke
    useEffect(() => {
        if (gameState === GameState.MENU) {
            resetGame();
        }
    }, [gameState, resetGame]);

    useEffect(() => {
        if (gameState === GameState.PLAYING && strokes === 0 && getDistance(ballRef.current.pos, { x: level.startPos.x + 60, y: level.startPos.y }) > 1) {
            resetGame();
        }
    }, [gameState, resetGame, strokes, level]);

    // Victory Effects
    useEffect(() => {
        if (gameState === GameState.WON) {
            playSound('win');
            for (let i = 0; i < 100; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 8 + 2;
                particlesRef.current.push({
                    x: level.holePos.x,
                    y: level.holePos.y,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed,
                    life: 1.0 + Math.random(),
                    color: `hsl(${Math.random() * 360}, 100%, 60%)`,
                    size: Math.random() * 5 + 3,
                    decay: 0.01 + Math.random() * 0.01,
                    gravity: 0.1
                });
            }
        }
    }, [gameState, playSound, level]);

    // The Update Loop
    const update = useCallback(() => {
        timeRef.current += 1;
        if (gameState !== GameState.PLAYING && gameState !== GameState.WON) return;

        const car = carRef.current;
        const ball = ballRef.current;

        // Spawn Animation
        if (spawnScaleRef.current < 1) {
            spawnScaleRef.current += 0.05;
            if (spawnScaleRef.current > 1) spawnScaleRef.current = 1;
        }

        // Audio Updates
        if (gameState === GameState.PLAYING) {
            const speedRatio = Math.abs(car.speed) / PHYSICS.CAR_MAX_SPEED;
            updateEngineSound(speedRatio);
        }

        // Screen Shake Decay
        if (shakeRef.current > 0) {
            shakeRef.current *= 0.9;
            if (shakeRef.current < 0.5) shakeRef.current = 0;
        }

        if (gameState === GameState.PLAYING) {
            // --- CAR PHYSICS ---
            let currentSurface = TileType.GRASS;
            if (level.sandTraps.some(t => checkCircleRectCollision(car, t))) {
                currentSurface = TileType.SAND;
            } else if (level.water.some(t => checkCircleRectCollision(car, t))) {
                currentSurface = TileType.WATER;
            }
            const surfacePhysics = SURFACE_PROPS[currentSurface];

            const throttle = keysPressed.current['ArrowUp'] || keysPressed.current['KeyW'];
            const brake = keysPressed.current['ArrowDown'] || keysPressed.current['KeyS'];
            const left = keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA'];
            const right = keysPressed.current['ArrowRight'] || keysPressed.current['KeyD'];
            const isHandbrake = keysPressed.current['Space'];

            // Turning
            let turnDirection = 0;
            if (Math.abs(car.speed) > 0.1 || (Math.abs(car.speed) > 0 && isHandbrake)) {
                const dir = car.speed > 0 ? 1 : -1;
                let turnSpeed = PHYSICS.CAR_TURN_SPEED;
                if (isHandbrake) turnSpeed *= PHYSICS.HANDBRAKE_TURN_MULT;
                if (currentSurface === TileType.SAND) turnSpeed *= 0.6;

                if (left) {
                    car.angle -= turnSpeed * dir;
                    turnDirection = -1 * dir;
                }
                if (right) {
                    car.angle += turnSpeed * dir;
                    turnDirection = 1 * dir;
                }
            }

            // Body Lean
            const targetLean = -turnDirection * (Math.abs(car.speed) / PHYSICS.CAR_MAX_SPEED) * 4;
            leanRef.current += (targetLean - leanRef.current) * 0.2;

            // Acceleration
            if (throttle) {
                car.speed += PHYSICS.CAR_ACCEL * surfacePhysics.accel;
            } else if (brake) {
                car.speed -= PHYSICS.CAR_BRAKE;
            } else {
                car.speed *= (1 - surfacePhysics.drag);
                if (Math.abs(car.speed) < 0.05) car.speed = 0;
            }

            // Speed Cap
            const maxSpeed = PHYSICS.CAR_MAX_SPEED * (currentSurface === TileType.SAND ? 0.6 : 1.0);
            car.speed = Math.max(Math.min(car.speed, maxSpeed), -maxSpeed / 2);

            // Velocity Vector
            const forwardX = Math.cos(car.angle) * car.speed;
            const forwardY = Math.sin(car.angle) * car.speed;

            let traction = surfacePhysics.traction;
            if (isHandbrake) traction = PHYSICS.HANDBRAKE_TRACTION;

            car.vel.x += (forwardX - car.vel.x) * traction;
            car.vel.y += (forwardY - car.vel.y) * traction;

            // --- PARTICLES ---
            const cos = Math.cos(car.angle);
            const sin = Math.sin(car.angle);
            const exhaustX = car.pos.x - cos * 15;
            const exhaustY = car.pos.y - sin * 15;

            if (Math.abs(car.speed) < 1 && Math.random() > 0.9) {
                particlesRef.current.push({
                    x: exhaustX, y: exhaustY, vx: -cos * 0.5 + (Math.random() - 0.5), vy: -sin * 0.5 + (Math.random() - 0.5),
                    life: 1.0, color: 'rgba(100, 100, 100, 0.3)', size: 2, decay: 0.02
                });
            }
            if (Math.abs(car.speed) > 0.5 && Math.random() > 0.8) {
                particlesRef.current.push({
                    x: exhaustX, y: exhaustY, vx: -cos * 2 + (Math.random() - 0.5), vy: -sin * 2 + (Math.random() - 0.5),
                    life: 0.6, color: 'rgba(150, 150, 150, 0.5)', size: Math.random() * 3 + 2, decay: 0.05
                });
            }
            const velMag = Math.sqrt(car.vel.x ** 2 + car.vel.y ** 2);
            const velAngle = Math.atan2(car.vel.y, car.vel.x);
            let driftDiff = velAngle - car.angle;
            while (driftDiff > Math.PI) driftDiff -= Math.PI * 2;
            while (driftDiff < -Math.PI) driftDiff += Math.PI * 2;
            const isDrifting = (Math.abs(driftDiff) > 0.35 && velMag > 3) || (isHandbrake && velMag > 2);

            if ((Math.abs(car.speed) > 3 || isDrifting) && Math.random() > 0.6) {
                const color = currentSurface === TileType.SAND ? '#fde047' : '#166534';
                const count = isDrifting || currentSurface === TileType.SAND ? 2 : 1;
                for (let k = 0; k < count; k++) {
                    particlesRef.current.push({
                        x: car.pos.x + (Math.random() - 0.5) * 10, y: car.pos.y + (Math.random() - 0.5) * 10,
                        vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, life: 0.5, color: color, size: 3, decay: 0.05
                    });
                }
            }
            if (isDrifting && currentSurface !== TileType.WATER) {
                const tires = [{ x: -12, y: -7 }, { x: -12, y: 7 }];
                tires.forEach(tire => {
                    const wx = car.pos.x + (tire.x * cos - tire.y * sin);
                    const wy = car.pos.y + (tire.x * sin + tire.y * cos);
                    tracksRef.current.push({ x: wx, y: wy, angle: car.angle, life: 1.0 });
                });
            }

            // --- BALL PHYSICS ---
            let currentBallFriction = PHYSICS.FRICTION_GROUND;
            for (const trap of level.sandTraps) {
                if (checkCircleRectCollision(ball, trap)) {
                    currentBallFriction = PHYSICS.FRICTION_SAND;
                    break;
                }
            }
            ball.vel.x *= currentBallFriction;
            ball.vel.y *= currentBallFriction;

            if (Math.abs(ball.vel.x) < 0.05) ball.vel.x = 0;
            if (Math.abs(ball.vel.y) < 0.05) ball.vel.y = 0;

            // Sub-steps collision
            const SUBSTEPS = 8;
            let hitBallThisFrame = false;
            let hitWallThisFrame = false;
            let splashThisFrame = false;

            for (let i = 0; i < SUBSTEPS; i++) {
                car.pos.x += car.vel.x / SUBSTEPS;
                car.pos.y += car.vel.y / SUBSTEPS;
                ball.pos.x += ball.vel.x / SUBSTEPS;
                ball.pos.y += ball.vel.y / SUBSTEPS;

                if (checkCircleCircleCollision(car, ball)) {
                    const hit = resolveCarBallCollision(car, ball);
                    if (hit) hitBallThisFrame = true;
                }

                // Check water FIRST - if ball is in water, skip wall collisions and break
                for (const water of level.water) {
                    if (checkCircleRectCollision(ball, water)) {
                        splashThisFrame = true;
                        break;
                    }
                }

                // If ball hit water, stop processing further substeps
                if (splashThisFrame) break;

                // Walls - only check if ball is NOT in water
                const allWalls = [...level.walls];
                for (const wall of allWalls) {
                    if (checkCircleRectCollision(car, wall)) {
                        const preSpeed = Math.sqrt(car.vel.x ** 2 + car.vel.y ** 2);
                        resolveCircleRectCollision(car, wall);
                        if (preSpeed > 4) hitWallThisFrame = true;
                        car.speed *= 0.5;
                    }
                }
                for (const wall of allWalls) {
                    if (checkCircleRectCollision(ball, wall)) {
                        const prevVelX = ball.vel.x;
                        const prevVelY = ball.vel.y;
                        resolveCircleRectCollision(ball, wall);
                        if (Math.sqrt(prevVelX ** 2 + prevVelY ** 2) > 4) hitWallThisFrame = true;
                    }
                }
            }

            // Post-Physics Events
            const ballSpeed = Math.sqrt(ball.vel.x ** 2 + ball.vel.y ** 2);
            if (ballSpeed > 1) {
                ballRef.current.trail.push({ ...ball.pos });
                if (ballRef.current.trail.length > 15) ballRef.current.trail.shift();
            } else if (ballRef.current.trail.length > 0) {
                ballRef.current.trail.shift();
            }

            if (hitBallThisFrame) {
                const now = Date.now();
                playSound('hit-ball');
                if (Math.abs(car.speed) > 5) shakeRef.current = 5;

                if (now - lastStrokeTime.current > 500) {
                    setStrokes(prev => prev + 1);
                    lastStrokeTime.current = now;
                    const angle = Math.random() * Math.PI - (Math.PI / 2);
                    effectsRef.current.push({
                        x: ball.pos.x, y: ball.pos.y - 10, vx: Math.cos(angle) * 2, vy: Math.sin(angle) * 4 - 3,
                        text: "+1", life: 1.0, id: effectIdCounter.current++, color: '#ef4444'
                    });
                    for (let i = 0; i < 8; i++) {
                        particlesRef.current.push({
                            x: (car.pos.x + ball.pos.x) / 2, y: (car.pos.y + ball.pos.y) / 2, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
                            life: 1.0, color: '#ffffff', size: 3, decay: 0.05
                        });
                    }
                }
            }

            if (hitWallThisFrame) {
                shakeRef.current = Math.max(shakeRef.current, 2);
                playSound('hit-wall');
            }

            if (splashThisFrame) {
                setStrokes(prev => prev + 1);
                playSound('splash');
                effectsRef.current.push({
                    x: ball.pos.x, y: ball.pos.y - 20, vx: 0, vy: -2,
                    text: "+1 (Water)", life: 1.5, id: effectIdCounter.current++, color: '#60a5fa'
                });
                ball.pos = { ...car.pos };
                ball.vel = { x: 0, y: 0 };
                ball.pos.x -= Math.cos(car.angle) * 40;
                ball.pos.y -= Math.sin(car.angle) * 40;
                ballRef.current.trail = [];
            }

            const distToHole = getDistance(ball.pos, level.holePos);
            if (distToHole < SIZES.HOLE_RADIUS) {
                const bSpeed = Math.sqrt(ball.vel.x ** 2 + ball.vel.y ** 2);
                if (bSpeed < 8) {
                    setGameState(GameState.WON);
                    shakeRef.current = 10;
                }
            }
        }

        // --- COMMON UPDATES ---
        for (let i = effectsRef.current.length - 1; i >= 0; i--) {
            const effect = effectsRef.current[i];
            effect.life -= 0.02;
            effect.x += effect.vx;
            effect.y += effect.vy;
            effect.vy += 0.1;
            if (effect.life <= 0) effectsRef.current.splice(i, 1);
        }

        for (let i = tracksRef.current.length - 1; i >= 0; i--) {
            const track = tracksRef.current[i];
            track.life -= 0.005;
            if (track.life <= 0) tracksRef.current.splice(i, 1);
        }

        for (let i = particlesRef.current.length - 1; i >= 0; i--) {
            const p = particlesRef.current[i];
            p.x += p.vx;
            p.y += p.vy;
            if (p.gravity) p.vy += p.gravity;
            p.life -= p.decay;
            if (p.life <= 0) particlesRef.current.splice(i, 1);
        }

    }, [gameState, setGameState, setStrokes, playSound, level, updateEngineSound, keysPressed]);

    return {
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
    };
};
