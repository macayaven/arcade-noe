import { generateVariation, SnakeVariationSchema, FlappyVariationSchema, BreakoutVariationSchema } from './variation';
import { z } from 'zod'; // Still needed for .safeParse and other Zod utilities if used directly in tests

describe('Variation Generation', () => {
  describe('Unknown Game ID', () => {
    it('should return an error for an unknown gameId', () => {
      const result = generateVariation('unknown-game');
      expect(result).toEqual({ error: 'Unknown gameId: unknown-game' });
    });
  });

  describe('Snake Variation', () => {
    const gameId = 'snake';
    const gameId2 = 'snake_alt_seed'; // To test if different game IDs produce different variations

    it('should return a valid variation according to SnakeVariationSchema', () => {
      const variation = generateVariation(gameId);
      const parseResult = SnakeVariationSchema.safeParse(variation);
      if (!parseResult.success) {
        console.error('Snake variation schema validation error:', parseResult.error.format());
      }
      expect(parseResult.success).toBe(true);
    });

    it('should be deterministic: same gameId results in the same variation', () => {
      const variation1 = generateVariation(gameId);
      const variation2 = generateVariation(gameId);
      expect(variation1).toEqual(variation2);
    });

    it('should produce different variations for different gameIds when gameId is not "flappy"', () => {
      const variation1 = generateVariation(gameId); // e.g. 'snake'
      const variation2 = generateVariation(gameId2); // e.g. 'snake_alt_seed'
      expect(variation1).not.toEqual(variation2);
    });
  });

  describe('Flappy Bird Variation', () => {
    const gameId = 'flappy';

    it('should return a valid variation according to FlappyVariationSchema', () => {
      const variation = generateVariation(gameId);
      const parseResult = FlappyVariationSchema.safeParse(variation);
      if (!parseResult.success) {
        console.error('Flappy Bird variation schema validation error:', parseResult.error.format());
      }
      expect(parseResult.success).toBe(true);
    });

    it('should return a seed property', () => {
      const variation = generateVariation(gameId) as z.infer<typeof FlappyVariationSchema>;
      expect(variation.seed).toBeDefined();
      expect(typeof variation.seed).toBe('string');
      expect(variation.seed.length).toBeGreaterThan(0);
    });

    it('should be non-deterministic for gameId "flappy": different calls produce different seeds', () => {
      const variation1 = generateVariation(gameId) as z.infer<typeof FlappyVariationSchema>;
      const variation2 = generateVariation(gameId) as z.infer<typeof FlappyVariationSchema>;
      // Due to the nature of seed generation for flappy (timestamp + random), seeds should differ.
      // Consequently, other properties might differ too if they depend on this unique seed.
      expect(variation1.seed).not.toEqual(variation2.seed);
      // It's also possible the entire objects are different, which is a stronger check
      expect(variation1).not.toEqual(variation2);
    });
  });

  describe('Breakout Variation', () => {
    const gameId = 'breakout';
    const gameId2 = 'breakout_alt_seed';

    it('should return a valid variation according to BreakoutVariationSchema', () => {
      const variation = generateVariation(gameId);
      const parseResult = BreakoutVariationSchema.safeParse(variation);
      if (!parseResult.success) {
        console.error('Breakout variation schema validation error:', parseResult.error.format());
      }
      expect(parseResult.success).toBe(true);
    });

    it('should be deterministic: same gameId results in the same variation', () => {
      const variation1 = generateVariation(gameId);
      const variation2 = generateVariation(gameId);
      expect(variation1).toEqual(variation2);
    });

    it('should produce different variations for different gameIds', () => {
      const variation1 = generateVariation(gameId);
      const variation2 = generateVariation(gameId2);
      expect(variation1).not.toEqual(variation2);
    });
  });
});
