/**
 * Effects Renderer
 * Handles rendering particles and floating text effects.
 */

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

interface TextEffect {
    x: number;
    y: number;
    vx: number;
    vy: number;
    text: string;
    life: number;
    id: number;
    color?: string;
}

/**
 * Draw all active particles
 */
export const drawParticles = (
    ctx: CanvasRenderingContext2D,
    particles: Particle[]
): void => {
    particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        ctx.restore();
    });
};

/**
 * Draw floating text effects (e.g. "BIRDIE!", "PAR")
 */
export const drawTextEffects = (
    ctx: CanvasRenderingContext2D,
    effects: TextEffect[]
): void => {
    effects.forEach(effect => {
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
};
