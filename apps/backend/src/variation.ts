import seedrandom from 'seedrandom';
import { z } from 'zod';

const VariationSchema = z.object({
  seed: z.string(),
  ruleSet: z.enum(['standard', 'custom']),
  theme: z.enum(['light', 'dark', 'system']),
});

type Variation = z.infer<typeof VariationSchema>;

export function generateVariation(gameId: string): Variation {
  const rng = seedrandom(gameId);

  const ruleSetValues = VariationSchema.shape.ruleSet.options;
  const themeValues = VariationSchema.shape.theme.options;

  const seed = rng().toString();
  const ruleSet = ruleSetValues[Math.floor(rng() * ruleSetValues.length)];
  const theme = themeValues[Math.floor(rng() * themeValues.length)];

  const variation: Variation = {
    seed,
    ruleSet,
    theme,
  };

  // Validate the generated variation against the schema
  VariationSchema.parse(variation);

  return variation;
}

// Example usage (optional, can be removed)
// const gameId = 'my-game-123';
// const variation = generateVariation(gameId);
// console.log(`Variation for game ${gameId}:`, variation);
