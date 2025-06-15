import { generateVariation } from './variation';
import { z } from 'zod';

// Re-define the schema here or import it if it's exported from variation.ts
// For simplicity, re-defining it here to match the one in variation.ts
const VariationSchema = z.object({
  seed: z.string(),
  ruleSet: z.enum(['standard', 'custom']),
  theme: z.enum(['light', 'dark', 'system']),
});

describe('Variation Generation', () => {
  const testGameId1 = 'test-game-id-1';
  const testGameId2 = 'test-game-id-2';

  it('should return valid JSON matching the VariationSchema', () => {
    const variation = generateVariation(testGameId1);

    // Validate against the Zod schema
    const parseResult = VariationSchema.safeParse(variation);
    expect(parseResult.success).toBe(true);
    if (!parseResult.success) {
      console.error('Schema validation failed:', parseResult.error.format());
    }

    // Basic type checks (though Zod already does this)
    expect(typeof variation.seed).toBe('string');
    expect(['standard', 'custom']).toContain(variation.ruleSet);
    expect(['light', 'dark', 'system']).toContain(variation.theme);
  });

  it('should be deterministic: same gameId results in the same variation', () => {
    const variation1 = generateVariation(testGameId1);
    const variation2 = generateVariation(testGameId1);
    expect(variation1).toEqual(variation2);
  });

  it('should produce different variations for different gameIds', () => {
    const variation1 = generateVariation(testGameId1);
    const variation2 = generateVariation(testGameId2);
    expect(variation1).not.toEqual(variation2);
  });

  it('should generate a seed that is a string representation of a number', () => {
    const variation = generateVariation(testGameId1);
    expect(typeof variation.seed).toBe('string');
    // Check if it's a string representation of a number between 0 and 1 (exclusive of 1 for Math.random like behavior)
    const seedAsNumber = parseFloat(variation.seed);
    expect(seedAsNumber).toBeGreaterThanOrEqual(0);
    expect(seedAsNumber).toBeLessThan(1);
  });

  it('should select ruleSet from the predefined enum values', () => {
    const variation = generateVariation(testGameId1);
    expect(VariationSchema.shape.ruleSet.options).toContain(variation.ruleSet);
  });

  it('should select theme from the predefined enum values', () => {
    const variation = generateVariation(testGameId1);
    expect(VariationSchema.shape.theme.options).toContain(variation.theme);
  });
});
