import { Rect, Vector, Level } from '../types';
import { TileType, CANVAS_WIDTH, CANVAS_HEIGHT } from '../constants';

const modules = import.meta.glob('../levels/*.json', { eager: true });

export const LEVELS: Level[] = Object.values(modules)
    .map((mod: any) => mod.default || mod)
    .sort((a, b) => a.id - b.id);
