"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVariation = generateVariation;
const seedrandom_1 = __importDefault(require("seedrandom"));
const zod_1 = require("zod");
const VariationSchema = zod_1.z.object({
    seed: zod_1.z.string(),
    ruleSet: zod_1.z.enum(['standard', 'custom']),
    theme: zod_1.z.enum(['light', 'dark', 'system']),
});
function generateVariation(gameId) {
    const rng = (0, seedrandom_1.default)(gameId);
    const ruleSetValues = VariationSchema.shape.ruleSet.options;
    const themeValues = VariationSchema.shape.theme.options;
    const seed = rng().toString();
    const ruleSet = ruleSetValues[Math.floor(rng() * ruleSetValues.length)];
    const theme = themeValues[Math.floor(rng() * themeValues.length)];
    const variation = {
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
