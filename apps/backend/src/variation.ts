import seedrandom from 'seedrandom';
import { z } from 'zod';

// General Variation Schema (can be kept if other games use it)
const GeneralVariationSchema = z.object({
  seed: z.string(),
  // ruleSet: z.enum(['standard', 'custom']), // Example, if needed for other games
  // theme: z.enum(['light', 'dark', 'system']), // Example, if needed for other games
});
type GeneralVariation = z.infer<typeof GeneralVariationSchema>;

// Snake Game Specific Variation Schema
export const SnakeVariationSchema = z.object({
  seed: z.string(),
  speed: z.number().min(50).max(300), // e.g., interval in ms
  color: z.enum(['green', 'blue', 'yellow', 'purple', 'orange']),
  foodColor: z.enum(['red', 'pink', 'cyan', 'magenta']),
});
type SnakeVariation = z.infer<typeof SnakeVariationSchema>;

// Flappy Bird Specific Variation Schema
export const FlappyVariationSchema = z.object({
  seed: z.string().min(1), // Seed should be a non-empty string
  gap: z.number().min(100).max(200), // Pipe opening size in pixels
  gravity: z.number().min(0.1).max(0.5), // Strength of gravity (e.g. 0.1 to 0.5 is a wider, perhaps better range)
});
type FlappyVariation = z.infer<typeof FlappyVariationSchema>;

// Breakout Game Specific Variation Schema
export const BreakoutVariationSchema = z.object({
  seed: z.string().min(1),
  paddleSize: z.enum(['small', 'medium', 'large']),
  ballSpeed: z.enum(['slow', 'normal', 'fast']),
});
type BreakoutVariation = z.infer<typeof BreakoutVariationSchema>;


// Union type for all possible variations
type GameVariation = GeneralVariation | SnakeVariation | FlappyVariation | BreakoutVariation;

export function generateVariation(gameId: string): GameVariation | { error: string } {
  // For Flappy Bird, we want a new random seed each time, not derived from gameId.
  // For other games like Snake, deriving from gameId might be intended for stable variations per gameId.
  let rng;
  let seedString: string;

  if (gameId.toLowerCase() === 'flappy') {
    // Generate a new, time-based + random seed for each Flappy Bird request
    seedString = Date.now().toString(36) + Math.random().toString(36).substring(2);
    rng = seedrandom(seedString); // Initialize RNG with this new random seed
  } else {
    // For Snake or General, use gameId for potentially stable seed generation if desired
    // Ensure seedString is generated consistently for Breakout as well
    seedString = seedrandom(gameId)().toString();
    rng = seedrandom(seedString); // Re-initialize RNG with this seed for consistent outputs for this gameId
  }


  if (gameId.toLowerCase() === 'snake') {
    const speedValues = [50, 75, 100, 125, 150, 175, 200, 250, 300];
    const colorValues = SnakeVariationSchema.shape.color.options;
    const foodColorValues = SnakeVariationSchema.shape.foodColor.options;

    const variation: SnakeVariation = {
      seed: seedString, // Use the generated seedString
      speed: speedValues[Math.floor(rng() * speedValues.length)],
      color: colorValues[Math.floor(rng() * colorValues.length)],
      foodColor: foodColorValues[Math.floor(rng() * foodColorValues.length)],
    };
    // Validate before returning
    const parseResult = SnakeVariationSchema.safeParse(variation);
    if (!parseResult.success) {
        console.error("Snake variation validation error:", parseResult.error);
        return { error: "Failed to generate valid Snake variation." };
    }
    return parseResult.data;

  } else if (gameId.toLowerCase() === 'flappy') {
    // Use the 'rng' instance that was seeded specifically for Flappy Bird for this request
    const minGravity = FlappyVariationSchema.shape.gravity.minValue || 0.1;
    const maxGravity = FlappyVariationSchema.shape.gravity.maxValue || 0.5;
    const minGap = FlappyVariationSchema.shape.gap.minValue || 100;
    const maxGap = FlappyVariationSchema.shape.gap.maxValue || 200;

    const variation: FlappyVariation = {
      seed: seedString, // This is the unique seed generated for this request
      gap: Math.floor(rng() * (maxGap - minGap + 1)) + minGap,
      gravity: parseFloat((rng() * (maxGravity - minGravity) + minGravity).toFixed(2)),
    };
    // Validate before returning
    const parseResult = FlappyVariationSchema.safeParse(variation);
    if (!parseResult.success) {
        console.error("Flappy variation validation error:", parseResult.error);
        return { error: "Failed to generate valid Flappy Bird variation." };
    }
    return parseResult.data;

  } else {
    // Fallback for unknown game IDs or if GeneralVariation is still desired for some cases
    // For now, let's return an error for unknown gameIds
    // console.warn(`Unknown gameId: ${gameId}. No specific variation generated.`);
    // const variation: GeneralVariation = {
    //   seed: seedString,
    // };
    // GeneralVariationSchema.parse(variation);
    // return variation;
    return { error: `Unknown gameId: ${gameId}` };

  } else if (gameId.toLowerCase() === 'breakout') {
    const paddleSizes = BreakoutVariationSchema.shape.paddleSize.options;
    const ballSpeeds = BreakoutVariationSchema.shape.ballSpeed.options;

    const variation: BreakoutVariation = {
      seed: seedString, // Use the generated seedString
      paddleSize: paddleSizes[Math.floor(rng() * paddleSizes.length)],
      ballSpeed: ballSpeeds[Math.floor(rng() * ballSpeeds.length)],
    };
    // Validate before returning
    const parseResult = BreakoutVariationSchema.safeParse(variation);
    if (!parseResult.success) {
        console.error("Breakout variation validation error:", parseResult.error);
        return { error: "Failed to generate valid Breakout variation." };
    }
    return parseResult.data;
  }
}

// Example usage (optional, can be removed or commented out)
// const flappyVariation = generateVariation('flappy');
// console.log('Generated Flappy Variation:', flappyVariation);
// const snakeVariation = generateVariation('snake');
// console.log('Generated Snake Variation:', snakeVariation);
// const unknownVariation = generateVariation('unknown-game');
// console.log('Generated Unknown Variation:', unknownVariation);
