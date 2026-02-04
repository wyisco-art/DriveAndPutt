/**
 * Renderers Index
 * Re-exports all rendering functions for clean imports.
 */

// Texture patterns
export {
    generatePattern,
    createGrassPattern,
    createSandPattern,
    createWoodPattern,
    type TexturePatterns
} from './texturePatterns';

// Terrain rendering
export {
    drawBackground,
    drawTireTracks,
    drawSandTraps,
    drawWater,
    drawWalls,
    drawHoleAndFlag
} from './terrainRenderer';

// Car rendering
export { drawCar } from './CarRenderer';

// Ball rendering
export { drawBallTrail, drawBall } from './BallRenderer';

// Effects rendering
export { drawParticles, drawTextEffects } from './EffectsRenderer';

// HUD rendering
export { drawSpeedometer, drawGuideArrow } from './HUDRenderer';
