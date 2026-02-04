import { Level } from '../types';
import { LEVELS } from './levels-data';

export const generateLevel = (levelIndex: number): Level => {
    // 1-indexed at call site, 0-indexed in array
    // Ensure we stay within bounds
    const idx = (levelIndex - 1) % LEVELS.length;
    return LEVELS[idx];
};
