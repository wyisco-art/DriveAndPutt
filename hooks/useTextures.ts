/**
 * useTextures Hook
 * Initializes and manages texture patterns for the game.
 */

import { useEffect, useRef } from 'react';
import {
    createGrassPattern,
    createSandPattern,
    createWoodPattern,
    TexturePatterns
} from '../renderers/texturePatterns';

/**
 * Hook that initializes texture patterns on mount.
 * Returns a ref containing the patterns for use in rendering.
 */
export const useTextures = () => {
    const texturesRef = useRef<TexturePatterns>({
        grass: null,
        sand: null,
        wood: null
    });

    useEffect(() => {
        texturesRef.current.grass = createGrassPattern();
        texturesRef.current.sand = createSandPattern();
        texturesRef.current.wood = createWoodPattern();
    }, []);

    return texturesRef;
};
