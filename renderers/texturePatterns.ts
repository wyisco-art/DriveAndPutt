/**
 * Texture Pattern Generators
 * Creates repeatable canvas patterns for grass, sand, and wood surfaces.
 */

/**
 * Generic pattern generator - creates a canvas pattern from a draw function
 */
export const generatePattern = (
    width: number,
    height: number,
    drawFn: (ctx: CanvasRenderingContext2D) => void
): CanvasPattern | null => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        drawFn(ctx);
        return ctx.createPattern(canvas, 'repeat');
    }
    return null;
};

/**
 * Creates a grass texture pattern with varying shades of green
 */
export const createGrassPattern = (): CanvasPattern | null => {
    return generatePattern(32, 32, (ctx) => {
        // Base green
        ctx.fillStyle = '#4ade80';
        ctx.fillRect(0, 0, 32, 32);

        // Darker blades
        ctx.fillStyle = '#22c55e';
        for (let i = 0; i < 40; i++) {
            const x = Math.random() * 32;
            const y = Math.random() * 32;
            ctx.fillRect(x, y, 2, 2);
        }

        // Lighter blades
        ctx.fillStyle = '#86efac';
        for (let i = 0; i < 10; i++) {
            const x = Math.random() * 32;
            const y = Math.random() * 32;
            ctx.fillRect(x, y, 1, 1);
        }
    });
};

/**
 * Creates a sand texture pattern with grain effect
 */
export const createSandPattern = (): CanvasPattern | null => {
    return generatePattern(16, 16, (ctx) => {
        // Base sand
        ctx.fillStyle = '#fde047';
        ctx.fillRect(0, 0, 16, 16);

        // Dark grains
        ctx.fillStyle = '#d97706';
        for (let i = 0; i < 12; i++) {
            ctx.fillRect(Math.random() * 16, Math.random() * 16, 1, 1);
        }

        // Light grains
        ctx.fillStyle = '#fef08a';
        for (let i = 0; i < 12; i++) {
            ctx.fillRect(Math.random() * 16, Math.random() * 16, 1, 1);
        }
    });
};

/**
 * Creates a wood texture pattern with planks, grain, and nails
 */
export const createWoodPattern = (): CanvasPattern | null => {
    return generatePattern(32, 32, (ctx) => {
        // Base wood
        ctx.fillStyle = '#78350f';
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
};

export interface TexturePatterns {
    grass: CanvasPattern | null;
    sand: CanvasPattern | null;
    wood: CanvasPattern | null;
}
