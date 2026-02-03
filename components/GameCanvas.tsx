import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
    CANVAS_WIDTH, CANVAS_HEIGHT, SIZES, PHYSICS, SURFACE_PROPS,
    LEVEL_1_WALLS, LEVEL_1_SANDTRAPS, LEVEL_1_WATER, 
    START_POS, HOLE_POS, TileType, PAR_STROKES, RENDER_SCALE
} from '../constants';
import { Car, GameState, Vector } from '../types';
import { 
    checkCircleRectCollision, resolveCircleRectCollision, 
    checkCircleCircleCollision, resolveCarBallCollision, getDistance 
} from '../utils/physics';

interface GameCanvasProps {
    gameState: GameState;
    setGameState: (state: GameState) => void;
    strokes: number;
    setStrokes: (s: number | ((prev: number) => number)) => void;
}

interface Effect {
    x: number;
    y: number;
    vx: number;
    vy: number;
    text: string;
    life: number; // 0 to 1
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

const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, setGameState, strokes, setStrokes }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const timeRef = useRef<number>(0);
    
    // Audio Context & Nodes
    const audioCtxRef = useRef<AudioContext | null>(null);
    const engineOscillatorRef = useRef<OscillatorNode | null>(null);
    const engineGainRef = useRef<GainNode | null>(null);
    
    // Texture Refs
    const texturesRef = useRef<{
        grass: CanvasPattern | null;
        sand: CanvasPattern | null;
        wood: CanvasPattern | null;
    }>({ grass: null, sand: null, wood: null });

    // Game Entities State
    const carRef = useRef<Car>({
        pos: { ...START_POS },
        vel: { x: 0, y: 0 },
        angle: 0,
        speed: 0,
        width: SIZES.CAR_WIDTH,
        height: SIZES.CAR_HEIGHT,
        radius: SIZES.CAR_WIDTH / 2
    });

    // Animation States
    const spawnScaleRef = useRef(0); // 0 to 1 for spawn animation
    const leanRef = useRef(0); // Car body roll value

    const ballRef = useRef({
        pos: { x: START_POS.x + 60, y: START_POS.y },
        vel: { x: 0, y: 0 },
        radius: SIZES.BALL_RADIUS,
        trail: [] as Vector[]
    });

    const shakeRef = useRef<number>(0); // Screen shake intensity

    const effectsRef = useRef<Effect[]>([]);
    const particlesRef = useRef<Particle[]>([]);
    const tracksRef = useRef<TireTrack[]>([]);
    const effectIdCounter = useRef(0);

    const keysPressed = useRef<{ [key: string]: boolean }>({});
    const lastStrokeTime = useRef<number>(0);

    // --- AUDIO SYSTEM ---
    const initAudio = useCallback(() => {
        if (!audioCtxRef.current) {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            audioCtxRef.current = new AudioContextClass();
        }
        if (audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
        }
    }, []);

    const startEngineSound = useCallback(() => {
        if (!audioCtxRef.current) return;
        
        // Stop existing engine if any
        if (engineOscillatorRef.current) {
            try { engineOscillatorRef.current.stop(); } catch(e) {}
            engineOscillatorRef.current.disconnect();
        }

        const ctx = audioCtxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.value = 60; // Idle rumble
        
        filter.type = 'lowpass';
        filter.frequency.value = 400; // Muffle the harsh sawtooth
        
        gain.gain.value = 0.05; // Quiet idle

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start();

        engineOscillatorRef.current = osc;
        engineGainRef.current = gain;
    }, []);

    const stopEngineSound = useCallback(() => {
        if (engineOscillatorRef.current) {
            try {
                const now = audioCtxRef.current?.currentTime || 0;
                engineGainRef.current?.gain.setTargetAtTime(0, now, 0.1);
                engineOscillatorRef.current.stop(now + 0.2);
            } catch(e) {}
            engineOscillatorRef.current = null;
        }
    }, []);

    const playSound = useCallback((type: 'hit-wall' | 'hit-ball' | 'splash' | 'win' | 'putt') => {
        if (!audioCtxRef.current) return;
        const ctx = audioCtxRef.current;
        const t = ctx.currentTime;

        if (type === 'hit-wall') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.type = 'square';
            osc.frequency.setValueAtTime(80, t);
            osc.frequency.exponentialRampToValueAtTime(30, t + 0.15);
            
            gain.gain.setValueAtTime(0.15, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
            
            osc.start(t);
            osc.stop(t + 0.16);
        } 
        else if (type === 'hit-ball') {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            // "Wood block" style sound
            osc.type = 'sine';
            osc.frequency.setValueAtTime(800, t);
            osc.frequency.exponentialRampToValueAtTime(400, t + 0.05);
            
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

            osc.start(t);
            osc.stop(t + 0.06);
        }
        else if (type === 'splash') {
            const bufferSize = ctx.sampleRate * 0.5; // 0.5 sec buffer
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = ctx.createBufferSource();
            noise.buffer = buffer;
            
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, t);
            filter.frequency.linearRampToValueAtTime(200, t + 0.4);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0.2, t);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);
            noise.start(t);
        }
        else if (type === 'win') {
            // Simple Arpeggio
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C E G C
            notes.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.connect(gain);
                gain.connect(ctx.destination);
                
                const startTime = t + i * 0.1;
                osc.type = 'triangle';
                osc.frequency.value = freq;
                
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
                
                osc.start(startTime);
                osc.stop(startTime + 0.5);
            });
        }
    }, []);


    // Initialize Textures
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
            for(let i=0; i<40; i++) {
                const x = Math.random() * 32;
                const y = Math.random() * 32;
                ctx.fillRect(x, y, 2, 2);
            }
            ctx.fillStyle = '#86efac'; // Lighter blades
            for(let i=0; i<10; i++) {
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
            for(let i=0; i<12; i++) {
                ctx.fillRect(Math.random() * 16, Math.random() * 16, 1, 1);
            }
             ctx.fillStyle = '#fef08a'; // Light grains
            for(let i=0; i<12; i++) {
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
            for(let i=0; i<10; i++) {
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

    // Audio Lifecycle
    useEffect(() => {
        if (gameState === GameState.PLAYING) {
            initAudio();
            startEngineSound();
        } else {
            stopEngineSound();
        }
        return () => stopEngineSound();
    }, [gameState, initAudio, startEngineSound, stopEngineSound]);

    // Reset Game Logic
    const resetGame = useCallback(() => {
        carRef.current = {
            pos: { ...START_POS },
            vel: { x: 0, y: 0 },
            angle: 0,
            speed: 0,
            width: SIZES.CAR_WIDTH,
            height: SIZES.CAR_HEIGHT,
            radius: SIZES.CAR_WIDTH / 2
        };
        ballRef.current = {
            pos: { x: START_POS.x + 60, y: START_POS.y },
            vel: { x: 0, y: 0 },
            radius: SIZES.BALL_RADIUS,
            trail: []
        };
        effectsRef.current = [];
        particlesRef.current = [];
        tracksRef.current = [];
        shakeRef.current = 0;
        spawnScaleRef.current = 0; // Reset spawn animation
        setStrokes(0);
        keysPressed.current = {};
    }, [setStrokes]);

    // Handle Input
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => { keysPressed.current[e.code] = true; };
        const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Watch GameState changes
    useEffect(() => {
        if (gameState === GameState.PLAYING && strokes === 0 && getDistance(ballRef.current.pos, {x: START_POS.x + 60, y: START_POS.y}) > 1) {
             resetGame();
        }
    }, [gameState, resetGame, strokes]);

    // Victory Effects
    useEffect(() => {
        if (gameState === GameState.WON) {
            playSound('win');
            // Confetti Explosion
            for(let i=0; i<100; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 8 + 2;
                particlesRef.current.push({
                    x: HOLE_POS.x,
                    y: HOLE_POS.y,
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
    }, [gameState, playSound]);

    // The Game Loop
    const update = useCallback(() => {
        timeRef.current += 1;
        if (gameState !== GameState.PLAYING && gameState !== GameState.WON) return;

        const car = carRef.current;
        const ball = ballRef.current;
        const audioCtx = audioCtxRef.current;

        // Spawn Animation
        if (spawnScaleRef.current < 1) {
            spawnScaleRef.current += 0.05;
            if (spawnScaleRef.current > 1) spawnScaleRef.current = 1;
        }

        // --- AUDIO UPDATES ---
        if (gameState === GameState.PLAYING && engineOscillatorRef.current && engineGainRef.current && audioCtx) {
            const speedRatio = Math.abs(car.speed) / PHYSICS.CAR_MAX_SPEED;
            // Modulate pitch: 60Hz idle -> 180Hz max
            const targetFreq = 60 + (speedRatio * 120);
            engineOscillatorRef.current.frequency.setTargetAtTime(targetFreq, audioCtx.currentTime, 0.1);
            
            // Modulate volume: louder when fast
            const targetGain = 0.05 + (speedRatio * 0.05);
            engineGainRef.current.gain.setTargetAtTime(targetGain, audioCtx.currentTime, 0.1);
        }

        // Screen Shake Decay
        if (shakeRef.current > 0) {
            shakeRef.current *= 0.9;
            if (shakeRef.current < 0.5) shakeRef.current = 0;
        }

        if (gameState === GameState.PLAYING) {
            // --- CAR PHYSICS INPUTS ---
            
            // 1. Determine Surface
            let currentSurface = TileType.GRASS;
            if (LEVEL_1_SANDTRAPS.some(t => checkCircleRectCollision(car, t))) {
                currentSurface = TileType.SAND;
            } else if (LEVEL_1_WATER.some(t => checkCircleRectCollision(car, t))) {
                currentSurface = TileType.WATER;
            }
            const surfacePhysics = SURFACE_PROPS[currentSurface];

            // 2. Inputs
            const throttle = keysPressed.current['ArrowUp'] || keysPressed.current['KeyW'];
            const brake = keysPressed.current['ArrowDown'] || keysPressed.current['KeyS'];
            const left = keysPressed.current['ArrowLeft'] || keysPressed.current['KeyA'];
            const right = keysPressed.current['ArrowRight'] || keysPressed.current['KeyD'];
            const isHandbrake = keysPressed.current['Space'];

            // 3. Turning & Steering
            let turnDirection = 0;
            if (Math.abs(car.speed) > 0.1 || (Math.abs(car.speed) > 0 && isHandbrake)) {
                const dir = car.speed > 0 ? 1 : -1;
                let turnSpeed = PHYSICS.CAR_TURN_SPEED;
                
                // Handbrake allows sharper turning (oversteer)
                if (isHandbrake) turnSpeed *= PHYSICS.HANDBRAKE_TURN_MULT;
                
                // Surface modifier (harder to turn/more sluggish in sand)
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

            // Calculate Body Lean (Suspension Roll)
            const targetLean = -turnDirection * (Math.abs(car.speed) / PHYSICS.CAR_MAX_SPEED) * 4; 
            leanRef.current += (targetLean - leanRef.current) * 0.2;

            // 4. Acceleration / Braking / Drag
            if (throttle) {
                car.speed += PHYSICS.CAR_ACCEL * surfacePhysics.accel;
            } else if (brake) {
                car.speed -= PHYSICS.CAR_BRAKE;
            } else {
                car.speed *= (1 - surfacePhysics.drag); 
                if (Math.abs(car.speed) < 0.05) car.speed = 0;
            }

            // Max Speed Cap
            const maxSpeed = PHYSICS.CAR_MAX_SPEED * (currentSurface === TileType.SAND ? 0.6 : 1.0);
            car.speed = Math.max(Math.min(car.speed, maxSpeed), -maxSpeed / 2);

            // 5. Update Car Velocity Vector (based on angle & grip)
            const forwardX = Math.cos(car.angle) * car.speed;
            const forwardY = Math.sin(car.angle) * car.speed;
            
            let traction = surfacePhysics.traction;
            if (isHandbrake) traction = PHYSICS.HANDBRAKE_TRACTION; 
            
            car.vel.x += (forwardX - car.vel.x) * traction;
            car.vel.y += (forwardY - car.vel.y) * traction;

            // --- PARTICLES ---
            // (Keep particle generation logic here, using frame-based checks is fine)
            const cos = Math.cos(car.angle);
            const sin = Math.sin(car.angle);
            const exhaustX = car.pos.x - cos * 15;
            const exhaustY = car.pos.y - sin * 15;
            
            // Re-adding the particle logic from previous step:
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
            const velMag = Math.sqrt(car.vel.x**2 + car.vel.y**2);
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
                        x: car.pos.x + (Math.random()-0.5)*10, y: car.pos.y + (Math.random()-0.5)*10,
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

            // --- BALL FRICTION (Once per frame) ---
            let currentBallFriction = PHYSICS.FRICTION_GROUND;
            for (const trap of LEVEL_1_SANDTRAPS) {
                if (checkCircleRectCollision(ball, trap)) {
                    currentBallFriction = PHYSICS.FRICTION_SAND;
                    break;
                }
            }
            ball.vel.x *= currentBallFriction;
            ball.vel.y *= currentBallFriction;
            
            if (Math.abs(ball.vel.x) < 0.05) ball.vel.x = 0;
            if (Math.abs(ball.vel.y) < 0.05) ball.vel.y = 0;

            // --- SUB-STEPPED PHYSICS ---
            // Move position and resolve collisions in small steps to prevent tunneling
            const SUBSTEPS = 8;
            let hitBallThisFrame = false;
            let hitWallThisFrame = false;
            let splashThisFrame = false;

            for(let i=0; i<SUBSTEPS; i++) {
                // Apply Velocity to Position (Step Fraction)
                car.pos.x += car.vel.x / SUBSTEPS;
                car.pos.y += car.vel.y / SUBSTEPS;
                
                ball.pos.x += ball.vel.x / SUBSTEPS;
                ball.pos.y += ball.vel.y / SUBSTEPS;

                // 1. Resolve Car vs Ball first (so if ball is pushed into wall, wall resolves it next)
                if (checkCircleCircleCollision(car, ball)) {
                    const hit = resolveCarBallCollision(car, ball);
                    if (hit) hitBallThisFrame = true;
                }

                // 2. Resolve Walls (Static) - Corrects penetration from step movement + car push
                const allWalls = [...LEVEL_1_WALLS];
                
                // Car vs Walls
                for (const wall of allWalls) {
                    if (checkCircleRectCollision(car, wall)) {
                        const preSpeed = Math.sqrt(car.vel.x**2 + car.vel.y**2);
                        resolveCircleRectCollision(car, wall);
                        if (preSpeed > 4) hitWallThisFrame = true;
                        car.speed *= 0.5; // Dampen speed on impact
                    }
                }

                // Ball vs Walls
                for (const wall of allWalls) {
                    if (checkCircleRectCollision(ball, wall)) {
                        const prevVelX = ball.vel.x;
                        const prevVelY = ball.vel.y;
                        resolveCircleRectCollision(ball, wall);
                        if (Math.sqrt(prevVelX**2 + prevVelY**2) > 4) hitWallThisFrame = true;
                    }
                }

                // Ball vs Water Check (Trigger)
                for (const water of LEVEL_1_WATER) {
                    if (checkCircleRectCollision(ball, water)) {
                        splashThisFrame = true;
                    }
                }
            }

            // --- POST-PHYSICS EVENTS ---
            
            // Ball Trail
            const ballSpeed = Math.sqrt(ball.vel.x**2 + ball.vel.y**2);
            if (ballSpeed > 1) {
                ballRef.current.trail.push({ ...ball.pos });
                if (ballRef.current.trail.length > 15) ballRef.current.trail.shift();
            } else if (ballRef.current.trail.length > 0) {
                ballRef.current.trail.shift();
            }

            // Events
            if (hitBallThisFrame) {
                const now = Date.now();
                playSound('hit-ball');
                if (Math.abs(car.speed) > 5) shakeRef.current = 5;

                if (now - lastStrokeTime.current > 500) {
                    setStrokes(prev => prev + 1);
                    lastStrokeTime.current = now;
                    // Effects
                    const angle = Math.random() * Math.PI - (Math.PI / 2);
                    effectsRef.current.push({
                        x: ball.pos.x, y: ball.pos.y - 10, vx: Math.cos(angle) * 2, vy: Math.sin(angle) * 4 - 3,
                        text: "+1", life: 1.0, id: effectIdCounter.current++, color: '#ef4444'
                    });
                    for(let i=0; i<8; i++) {
                         particlesRef.current.push({
                            x: (car.pos.x + ball.pos.x)/2, y: (car.pos.y + ball.pos.y)/2, vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
                            life: 1.0, color: '#ffffff', size: 3, decay: 0.05
                        });
                    }
                }
            }

            if (hitWallThisFrame) {
                shakeRef.current = Math.max(shakeRef.current, 2);
                playSound('hit-wall');
                // Optional: Wall particles logic here if needed
            }

            if (splashThisFrame) {
                 setStrokes(prev => prev + 1);
                 playSound('splash');
                 effectsRef.current.push({
                     x: ball.pos.x, y: ball.pos.y - 20, vx: 0, vy: -2,
                     text: "+1 (Water)", life: 1.5, id: effectIdCounter.current++, color: '#60a5fa'
                 });
                 // Respawn Logic
                 ball.pos = { ...car.pos };
                 ball.vel = { x: 0, y: 0 };
                 ball.pos.x -= Math.cos(car.angle) * 40;
                 ball.pos.y -= Math.sin(car.angle) * 40;
                 ballRef.current.trail = [];
            }

            // Hole Detection
            const distToHole = getDistance(ball.pos, HOLE_POS);
            if (distToHole < SIZES.HOLE_RADIUS) {
                const bSpeed = Math.sqrt(ball.vel.x**2 + ball.vel.y**2);
                if (bSpeed < 8) {
                     setGameState(GameState.WON);
                     shakeRef.current = 10; 
                }
            }
        }
        
        // --- COMMON UPDATES (Particles, Effects) ---
        for (let i = effectsRef.current.length - 1; i >= 0; i--) {
            const effect = effectsRef.current[i];
            effect.life -= 0.02;
            effect.x += effect.vx;
            effect.y += effect.vy;
            effect.vy += 0.1; // Gravity for text
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

    }, [gameState, setGameState, setStrokes, playSound]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
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
        for(let i=0; i<CANVAS_WIDTH; i+=100) {
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
        LEVEL_1_SANDTRAPS.forEach(trap => {
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
        const time = timeRef.current * 0.05;
        LEVEL_1_WATER.forEach(water => {
             // Base Water
             ctx.fillStyle = '#2563eb';
             ctx.fillRect(water.x, water.y, water.w, water.h);
             
             // Animated Waves
             ctx.save();
             ctx.beginPath();
             ctx.rect(water.x, water.y, water.w, water.h);
             ctx.clip();
             
             ctx.lineWidth = 4;
             for(let i=0; i<6; i++) {
                const yOffset = (i * 20) + Math.sin(time + i) * 5;
                const y = water.y + 10 + yOffset;
                
                ctx.strokeStyle = (i % 2 === 0) ? '#60a5fa' : '#3b82f6';
                ctx.beginPath();
                ctx.moveTo(water.x - 20, y);
                for(let x=0; x <= water.w + 20; x+=10) {
                    ctx.lineTo(water.x + x, y + Math.sin(x * 0.05 + time) * 3);
                }
                ctx.stroke();
             }
             
             // Water Highlight
             ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
             ctx.beginPath();
             ctx.arc(water.x + 20, water.y + 20, 10, 0, Math.PI*2);
             ctx.fill();
             
             ctx.restore();
             
             // Border
             ctx.strokeStyle = '#1e40af';
             ctx.lineWidth = 2;
             ctx.strokeRect(water.x, water.y, water.w, water.h);
        });

        // Draw Walls (Wood)
        LEVEL_1_WALLS.forEach(wall => {
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
        ctx.arc(HOLE_POS.x, HOLE_POS.y, SIZES.HOLE_RADIUS * (1.2 + pulse * 0.2), 0, Math.PI * 2);
        ctx.fill();
        
        const holeGradient = ctx.createRadialGradient(HOLE_POS.x, HOLE_POS.y, SIZES.HOLE_RADIUS * 0.2, HOLE_POS.x, HOLE_POS.y, SIZES.HOLE_RADIUS);
        holeGradient.addColorStop(0, '#000000');
        holeGradient.addColorStop(1, '#374151');
        
        ctx.fillStyle = holeGradient;
        ctx.beginPath();
        ctx.arc(HOLE_POS.x, HOLE_POS.y, SIZES.HOLE_RADIUS, 0, Math.PI * 2);
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
        ctx.moveTo(HOLE_POS.x, HOLE_POS.y);
        ctx.lineTo(HOLE_POS.x, HOLE_POS.y - 45);
        ctx.stroke();
        
        // Flag Fabric
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.moveTo(HOLE_POS.x, HOLE_POS.y - 45);
        ctx.quadraticCurveTo(HOLE_POS.x + 10, HOLE_POS.y - 45 + flagWave, HOLE_POS.x + 24, HOLE_POS.y - 35 + flagWave); // Top edge
        ctx.lineTo(HOLE_POS.x + 24, HOLE_POS.y - 25 + flagWave); // Right edge
        ctx.quadraticCurveTo(HOLE_POS.x + 10, HOLE_POS.y - 35 + flagWave, HOLE_POS.x, HOLE_POS.y - 25); // Bottom edge
        ctx.fill();
        
        // Flag Shadow on ground
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath();
        ctx.ellipse(HOLE_POS.x + 10, HOLE_POS.y + 5, 8, 3, 0, 0, Math.PI*2);
        ctx.fill();


        const car = carRef.current;
        const ball = ballRef.current;

        // Draw Car
        ctx.save();
        ctx.translate(car.pos.x, car.pos.y);
        
        // Spawn Scale Effect
        const scale = spawnScaleRef.current;
        ctx.scale(scale, scale);
        
        ctx.rotate(car.angle);
        
        // Car Idle Vibration
        if (gameState === GameState.PLAYING && Math.abs(car.speed) < 0.2) {
            ctx.translate((Math.random()-0.5), (Math.random()-0.5));
        }

        // 1. Static Shadow (Doesn't roll)
        ctx.fillStyle = 'rgba(0,0,0,0.4)'; 
        ctx.fillRect(-car.width/2 + 4, -car.height/2 + 4, car.width, car.height);
        
        // 2. Body with Roll (Suspension effect)
        const leanY = leanRef.current;
        
        ctx.translate(0, leanY); // Apply suspension roll
        
        // Body (Red)
        ctx.fillStyle = '#dc2626';
        ctx.fillRect(-car.width/2, -car.height/2, car.width, car.height);
        
        // Roof (Moves more than body to look like perspective lean)
        ctx.save();
        ctx.translate(0, leanY * 0.5); 
        ctx.fillStyle = '#991b1b';
        ctx.fillRect(-car.width/4, -car.height/2 + 2, car.width/2, car.height - 4);
        
        // Windshield (Light blueish)
        ctx.fillStyle = '#93c5fd';
        ctx.fillRect(0, -car.height/2 + 3, 6, car.height - 6);
        ctx.restore();

        // Headlights
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(car.width/2 - 2, -car.height/2 + 2, 4, 4);
        ctx.fillRect(car.width/2 - 2, car.height/2 - 6, 4, 4);
        
        // Brake Lights
        ctx.fillStyle = '#7f1d1d';
        if (keysPressed.current['ArrowDown'] || keysPressed.current['KeyS']) {
             ctx.fillStyle = '#ff0000'; // Bright red when braking
        }
        ctx.fillRect(-car.width/2, -car.height/2 + 2, 2, 4);
        ctx.fillRect(-car.width/2, car.height/2 - 6, 2, 4);

        ctx.restore();

        // Draw Ball Trail
        if (ballRef.current.trail.length > 1) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(ballRef.current.trail[0].x, ballRef.current.trail[0].y);
            for(let i=1; i<ballRef.current.trail.length; i++) {
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
        
        // Iterate over a grid large enough to cover the ball
        // The texture position is offset by the ball's position to create a "rolling" effect
        // Factor of 0.5 makes it look like the surface is moving (rolling) relative to the center
        const startI = -ball.radius - dimpleSpacing;
        const endI = ball.radius + dimpleSpacing;
        
        ctx.fillStyle = '#cbd5e1'; // Grey dimples
        
        for (let i = startI; i < endI; i += dimpleSpacing) {
             for (let j = startI; j < endI; j += dimpleSpacing) {
                  // Hexagonal offset for alternate rows
                  const rowIndex = Math.floor(j / dimpleSpacing);
                  const rowOffset = (rowIndex % 2 === 0) ? 0 : dimpleSpacing / 2;
                  
                  // Calculate scroll offset based on ball position
                  // Modulo ensures the pattern repeats seamlessly
                  const scrollX = (ball.pos.x * 0.5) % dimpleSpacing;
                  const scrollY = (ball.pos.y * 0.5) % dimpleSpacing;
                  
                  let drawX = i - scrollX + rowOffset;
                  let drawY = j - scrollY;
                  
                  // Only draw if within the circle (simple optimization, clip handles visual)
                  if (drawX*drawX + drawY*drawY < (ball.radius + 2)*(ball.radius + 2)) {
                      ctx.beginPath();
                      ctx.arc(drawX, drawY, dimpleSize, 0, Math.PI*2);
                      ctx.fill();
                  }
             }
        }
        
        ctx.restore(); // End clipping

        // 4. Shading Gradient (Overlay to maintain 3D sphere look)
        const grad = ctx.createRadialGradient(-3, -3, 2, 0, 0, ball.radius);
        grad.addColorStop(0, 'rgba(255,255,255,0.9)'); // Highlight
        grad.addColorStop(0.3, 'rgba(255,255,255,0)');
        grad.addColorStop(0.8, 'rgba(0,0,0,0.05)');
        grad.addColorStop(1, 'rgba(0,0,0,0.3)'); // Shadow edge
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
            ctx.fillRect(p.x - p.size/2, p.y - p.size/2, p.size, p.size);
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
            const angleToHole = Math.atan2(HOLE_POS.y - car.pos.y, HOLE_POS.x - car.pos.x);
            const dist = getDistance(car.pos, HOLE_POS);
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

    useEffect(() => {
        if (gameState === GameState.MENU) {
            resetGame();
        }
    }, [gameState, resetGame]);

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