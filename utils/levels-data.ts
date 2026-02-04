import { Rect, Vector, Level } from '../types';
import { TileType, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

// Helper to create walls easily
const b = (x: number, y: number, w: number, h: number, type: TileType = TileType.WALL): Rect => ({ x, y, w, h, type });

// Default borders that apply to most "Open" maps
const BORDERS = [
    b(0, 0, CANVAS_WIDTH, 20), // Top
    b(0, CANVAS_HEIGHT - 20, CANVAS_WIDTH, 20), // Bottom
    b(0, 0, 20, CANVAS_HEIGHT), // Left
    b(CANVAS_WIDTH - 20, 0, 20, CANVAS_HEIGHT) // Right
];

export const LEVELS: Level[] = [
    // --- BASICS (1-5) ---
    {
        id: 1, name: "Training Day", par: 4,
        startPos: { x: 100, y: 100 }, holePos: { x: 900, y: 600 },
        walls: [...BORDERS, b(300, 0, 40, 400), b(300, 400, 400, 40)],
        sandTraps: [b(400, 500, 200, 100, TileType.SAND)], water: []
    },
    {
        id: 2, name: "The Drag Strip", par: 4,
        startPos: { x: 80, y: 384 }, holePos: { x: 950, y: 384 },
        walls: [...BORDERS, b(0, 250, CANVAS_WIDTH, 40), b(0, 480, CANVAS_WIDTH, 40)],
        sandTraps: [b(700, 300, 150, 170, TileType.SAND)], water: []
    },
    {
        id: 3, name: "Hairpin", par: 5,
        startPos: { x: 100, y: 100 }, holePos: { x: 100, y: 650 }, // FIXED: Hole moved to valid spot
        walls: [...BORDERS, b(300, 0, 40, 550), b(600, 200, 40, 600)],
        sandTraps: [b(340, 450, 260, 100, TileType.SAND)], water: []
    },
    {
        id: 4, name: "Square One", par: 5,
        startPos: { x: 100, y: 100 }, holePos: { x: 900, y: 650 },
        walls: [...BORDERS, b(300, 200, 400, 300)],
        sandTraps: [b(100, 400, 200, 100, TileType.SAND), b(700, 200, 100, 200, TileType.SAND)], water: []
    },
    {
        id: 5, name: "Sandbox", par: 5,
        startPos: { x: 100, y: 384 }, holePos: { x: 900, y: 384 },
        walls: [...BORDERS],
        sandTraps: [b(300, 100, 100, 600, TileType.SAND), b(600, 100, 100, 600, TileType.SAND)], water: []
    },

    // --- INTERMEDIATE (6-10) ---
    {
        id: 6, name: "Water Hazard", par: 6,
        startPos: { x: 100, y: 650 }, holePos: { x: 900, y: 100 },
        walls: [...BORDERS], sandTraps: [],
        water: [b(300, 0, 400, 400, TileType.WATER), b(0, 400, 400, 100, TileType.WATER)]
    },
    {
        id: 7, name: "The Figure 8", par: 6,
        startPos: { x: 100, y: 100 }, holePos: { x: 900, y: 100 },
        walls: [...BORDERS, b(450, 0, 124, 250), b(450, 500, 124, 300), b(200, 350, 624, 40)],
        sandTraps: [b(100, 500, 200, 200, TileType.SAND)], water: []
    },
    {
        id: 8, name: "The Snake", par: 5,
        startPos: { x: 100, y: 50 }, holePos: { x: 900, y: 700 },
        walls: [...BORDERS, b(200, 0, 40, 500), b(500, 250, 40, 600), b(800, 0, 40, 500)],
        sandTraps: [b(240, 300, 260, 50, TileType.SAND), b(540, 400, 260, 50, TileType.SAND)], water: []
    },
    {
        id: 9, name: "The Tee", par: 5,
        startPos: { x: 500, y: 700 }, holePos: { x: 500, y: 100 },
        walls: [...BORDERS, b(0, 300, 400, 40), b(624, 300, 400, 40), b(400, 300, 40, 200), b(584, 300, 40, 200)],
        sandTraps: [b(440, 300, 144, 200, TileType.SAND)], water: []
    },
    {
        id: 10, name: "Target Practice", par: 5,
        startPos: { x: 100, y: 384 }, holePos: { x: 900, y: 384 },
        walls: [...BORDERS, b(300, 200, 50, 50), b(500, 500, 50, 50), b(700, 200, 50, 50), b(400, 600, 50, 50)],
        sandTraps: [b(200, 100, 600, 50, TileType.SAND), b(200, 618, 600, 50, TileType.SAND)], water: []
    },

    // --- ADVANCED (11-20) ---
    {
        id: 11, name: "Dual Lanes", par: 6,
        startPos: { x: 100, y: 384 }, holePos: { x: 900, y: 384 },
        walls: [...BORDERS, b(200, 360, 600, 48)],
        sandTraps: [b(200, 100, 600, 260, TileType.SAND)], // Top is sand (slow)
        water: [b(200, 408, 600, 260, TileType.WATER)] // Bottom is water (risk)
    },
    {
        id: 12, name: "The Spiral", par: 7,
        startPos: { x: 50, y: 50 }, holePos: { x: 512, y: 384 }, // Center
        walls: [...BORDERS, b(150, 150, 724, 40), b(150, 150, 40, 550), b(150, 650, 600, 40), b(700, 300, 40, 390), b(300, 300, 440, 40)],
        sandTraps: [], water: [b(200, 200, 50, 400, TileType.WATER)]
    },
    {
        id: 13, name: "The Cage", par: 6,
        startPos: { x: 100, y: 100 }, holePos: { x: 900, y: 650 },
        walls: [...BORDERS,
        b(300, 100, 40, 100), b(500, 100, 40, 100), b(700, 100, 40, 100),
        b(300, 300, 40, 100), b(500, 300, 40, 100), b(700, 300, 40, 100),
        b(300, 500, 40, 100), b(500, 500, 40, 100), b(700, 500, 40, 100)
        ],
        sandTraps: [b(0, 200, CANVAS_WIDTH, 50, TileType.SAND), b(0, 450, CANVAS_WIDTH, 50, TileType.SAND)], water: []
    },
    {
        id: 14, name: "Bridge Cross", par: 6,
        startPos: { x: 100, y: 384 }, holePos: { x: 900, y: 384 },
        walls: [...BORDERS], sandTraps: [],
        water: [b(300, 0, 424, 300, TileType.WATER), b(300, 468, 424, 300, TileType.WATER)] // Narrow bridge in middle
    },
    {
        id: 15, name: "Bunker Hill", par: 7,
        startPos: { x: 100, y: 100 }, holePos: { x: 900, y: 650 },
        walls: [...BORDERS],
        sandTraps: [b(200, 0, 600, 600, TileType.SAND)], // Massive sand field
        water: []
    },
    {
        id: 16, name: "Zig Zag", par: 6,
        startPos: { x: 100, y: 100 }, holePos: { x: 900, y: 100 },
        walls: [...BORDERS, b(200, 0, 40, 600), b(400, 168, 40, 600), b(600, 0, 40, 600), b(800, 168, 40, 600)],
        sandTraps: [], water: []
    },
    {
        id: 17, name: "The Donut", par: 5,
        startPos: { x: 100, y: 384 }, holePos: { x: 512, y: 384 },
        walls: [...BORDERS], sandTraps: [],
        water: [b(350, 0, 324, 768, TileType.WATER)] // Moat? No, rects overlap. Just a "block" with hole?
        // Let's make an island.
        // Actually simple water bands
    },
    {
        id: 18, name: "Corner Pocket", par: 6,
        startPos: { x: 100, y: 100 }, holePos: { x: 950, y: 700 }, // Deep corner
        walls: [...BORDERS, b(800, 500, 224, 40), b(800, 500, 40, 268)], // Protecting wall
        sandTraps: [b(600, 0, 100, 768, TileType.SAND)], water: []
    },
    {
        id: 19, name: "Gauntlet", par: 6,
        startPos: { x: 50, y: 384 }, holePos: { x: 974, y: 384 },
        walls: [...BORDERS, b(200, 0, 40, 300), b(200, 468, 40, 300), b(400, 0, 40, 300), b(400, 468, 40, 300), b(600, 0, 40, 300), b(600, 468, 40, 300), b(800, 0, 40, 300), b(800, 468, 40, 300)],
        sandTraps: [], water: []
    },
    {
        id: 20, name: "Islands", par: 8,
        startPos: { x: 100, y: 100 }, holePos: { x: 900, y: 650 },
        walls: [...BORDERS], sandTraps: [],
        water: [b(250, 0, 100, 768, TileType.WATER), b(650, 0, 100, 768, TileType.WATER)]
    },

    // --- EXPERT (21-30) ---
    {
        id: 21, name: "Maze Runner", par: 8,
        startPos: { x: 50, y: 50 }, holePos: { x: 950, y: 700 },
        walls: [...BORDERS, b(0, 150, 800, 40), b(224, 300, 800, 40), b(0, 450, 800, 40), b(224, 600, 800, 40)],
        sandTraps: [], water: []
    },
    {
        id: 22, name: "Death Trap", par: 8,
        startPos: { x: 100, y: 100 }, holePos: { x: 900, y: 650 },
        walls: [...BORDERS],
        sandTraps: [],
        water: [b(0, 0, 1024, 768, TileType.WATER), b(50, 50, 300, 300, TileType.GRASS), b(700, 500, 250, 200, TileType.GRASS), b(400, 300, 200, 100, TileType.GRASS)]
        // Note: Water covers everything, Grass rects "carve" out islands (if renderer draws grass on top? no, renderer draws water on top)
        // Correction: We must place water *around* the path.
        // Simplified: Narrow path
    },
    {
        id: 23, name: "The U-Turn", par: 7,
        startPos: { x: 100, y: 100 }, holePos: { x: 100, y: 650 },
        walls: [...BORDERS, b(200, 150, 824, 468)], // Massive block in middle
        sandTraps: [], water: []
    },
    {
        id: 24, name: "Pinball", par: 7,
        startPos: { x: 512, y: 700 }, holePos: { x: 512, y: 100 },
        walls: [...BORDERS, b(300, 500, 100, 40), b(624, 500, 100, 40), b(200, 300, 40, 100), b(784, 300, 40, 100)],
        sandTraps: [b(400, 400, 224, 200, TileType.SAND)], water: []
    },
    {
        id: 25, name: "Hourglass", par: 6,
        startPos: { x: 100, y: 100 }, holePos: { x: 100, y: 650 },
        walls: [...BORDERS, b(0, 200, 450, 368), b(574, 200, 450, 368)], // Choke point int middle
        sandTraps: [], water: []
    },
    {
        id: 26, name: "Checkers", par: 8,
        startPos: { x: 50, y: 384 }, holePos: { x: 974, y: 384 },
        walls: [...BORDERS],
        sandTraps: [b(200, 0, 100, 200, TileType.SAND), b(400, 200, 100, 200, TileType.SAND), b(600, 0, 100, 200, TileType.SAND), b(800, 200, 100, 200, TileType.SAND)],
        water: [b(200, 400, 100, 200, TileType.WATER), b(400, 600, 100, 200, TileType.WATER)]
    },
    {
        id: 27, name: "The Void", par: 10,
        startPos: { x: 50, y: 384 }, holePos: { x: 974, y: 384 },
        walls: [...BORDERS],
        sandTraps: [],
        water: [b(150, 0, 100, 768, TileType.WATER), b(350, 0, 100, 768, TileType.WATER), b(550, 0, 100, 768, TileType.WATER), b(750, 0, 100, 768, TileType.WATER)]
    },
    {
        id: 28, name: "Labyrinth", par: 9,
        startPos: { x: 50, y: 50 }, holePos: { x: 974, y: 700 },
        walls: [...BORDERS, b(150, 0, 40, 600), b(300, 168, 40, 600), b(450, 0, 40, 600), b(600, 168, 40, 600), b(750, 0, 40, 600)],
        sandTraps: [], water: []
    },
    {
        id: 29, name: "The Long Haul", par: 12,
        startPos: { x: 102, y: 102 }, holePos: { x: 200, y: 102 },
        walls: [...BORDERS, b(200, 200, 624, 368)], // Perimeter run
        sandTraps: [b(0, 0, 100, 100, TileType.SAND)], water: []
    },
    {
        id: 30, name: "Grand Finale", par: 15,
        startPos: { x: 100, y: 700 }, holePos: { x: 900, y: 100 },
        walls: [...BORDERS, b(200, 200, 40, 600), b(600, 0, 40, 600)],
        sandTraps: [b(300, 500, 200, 200, TileType.SAND)],
        water: [b(700, 200, 200, 200, TileType.WATER)]
    }
];
