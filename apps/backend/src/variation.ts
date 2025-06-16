import seedrandom from 'seedrandom';
import { z } from 'zod';

// General Variation Schema (can be kept if other games use it)
const GeneralVariationSchema = z.object({
  seed: z.string(),
  ruleSet: z.enum(['standard', 'custom']),
  theme: z.enum(['light', 'dark', 'system']),
});
type GeneralVariation = z.infer<typeof GeneralVariationSchema>;

// Snake Game Specific Variation Schema
const SnakeVariationSchema = z.object({
  seed: z.string(),
  speed: z.number().min(50).max(300), // e.g., interval in ms
  color: z.enum(['green', 'blue', 'yellow', 'purple', 'orange']), // Snake color options
  foodColor: z.enum(['red', 'pink', 'cyan', 'magenta']), // Food color options
});
type SnakeVariation = z.infer<typeof SnakeVariationSchema>;

// Union type for all possible variations
type GameVariation = GeneralVariation | SnakeVariation;

export function generateVariation(gameId: string): GameVariation {
  const rng = seedrandom(gameId);
  const seed = rng().toString(); // Generate a primary seed first

  if (gameId.toLowerCase() === 'snake') {
    const speedValues = [50, 75, 100, 125, 150, 175, 200, 250, 300]; // Example speeds
    const colorValues = SnakeVariationSchema.shape.color.options;
    const foodColorValues = SnakeVariationSchema.shape.foodColor.options;

    const variation: SnakeVariation = {
      seed,
      speed: speedValues[Math.floor(rng() * speedValues.length)],
      color: colorValues[Math.floor(rng() * colorValues.length)],
      foodColor: foodColorValues[Math.floor(rng() * foodColorValues.length)],
    };
    SnakeVariationSchema.parse(variation);
    return variation;
  } else {
    // Default or other game variations
    const ruleSetValues = GeneralVariationSchema.shape.ruleSet.options;
    const themeValues = GeneralVariationSchema.shape.theme.options;

    const variation: GeneralVariation = {
      seed,
      ruleSet: ruleSetValues[Math.floor(rng() * ruleSetValues.length)],
      theme: themeValues[Math.floor(rng() * themeValues.length)],
    };
    GeneralVariationSchema.parse(variation);
    return variation;
  }
}

// Example usage (optional, can be removed)
// const gameId = 'my-game-123';
// const variation = generateVariation(gameId);
// console.log(`Variation for game ${gameId}:`, variation);
