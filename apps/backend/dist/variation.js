"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVariation = generateVariation;
const seedrandom_1 = __importDefault(require("seedrandom"));
const zod_1 = require("zod");
// Enhanced variation schema with much more detailed parameters
const VariationSchema = zod_1.z.object({
    seed: zod_1.z.string(),
    sessionId: zod_1.z.string(),
    // Visual theme
    theme: zod_1.z.object({
        name: zod_1.z.enum(['neon', 'retro', 'pastel', 'dark', 'ocean', 'sunset', 'forest', 'cosmic', 'fire', 'ice', 'toxic', 'cyber']),
        primaryColor: zod_1.z.string(),
        secondaryColor: zod_1.z.string(),
        accentColor: zod_1.z.string(),
        backgroundColor: zod_1.z.string(),
    }),
    // Game mechanics
    difficulty: zod_1.z.object({
        level: zod_1.z.enum(['easy', 'normal', 'hard', 'extreme']),
        speedMultiplier: zod_1.z.number(),
        complexityBonus: zod_1.z.number(),
    }),
    // Special modifiers - dramatically more variety
    modifiers: zod_1.z.array(zod_1.z.enum([
        'fastStart', 'slowMotion', 'doubleScore', 'shrinkingTime',
        'ghostMode', 'magneticEffect', 'turbulence', 'rapidFire',
        'biggerTargets', 'smallerTargets', 'invertedControls', 'bouncyWalls',
        'timeWarp', 'gravityShift', 'mirrorMode', 'fadeTrail',
        'explosiveMode', 'multiplierMadness', 'invisibleObstacles', 'colorBlind',
        'hyperspeed', 'freezeFrame', 'chaosMode', 'perfectAccuracy'
    ])),
    // Game-specific parameters
    gameSpecific: zod_1.z.record(zod_1.z.any()),
});
// Color palettes for different themes - more dramatic contrasts
const COLOR_THEMES = {
    neon: {
        primaryColor: '#00FFFF',
        secondaryColor: '#FF0080',
        accentColor: '#FFFF00',
        backgroundColor: '#0A0A0A',
    },
    retro: {
        primaryColor: '#FF6B35',
        secondaryColor: '#F7931E',
        accentColor: '#FFD23F',
        backgroundColor: '#2F1B14',
    },
    pastel: {
        primaryColor: '#FFB3BA',
        secondaryColor: '#BFEFFF',
        accentColor: '#FFFFBA',
        backgroundColor: '#F0F8FF',
    },
    dark: {
        primaryColor: '#8A2BE2',
        secondaryColor: '#4B0082',
        accentColor: '#9370DB',
        backgroundColor: '#1A1A1A',
    },
    ocean: {
        primaryColor: '#0077BE',
        secondaryColor: '#00A8CC',
        accentColor: '#4DD0E1',
        backgroundColor: '#001F3F',
    },
    sunset: {
        primaryColor: '#FF4500',
        secondaryColor: '#FF6347',
        accentColor: '#FFD700',
        backgroundColor: '#2F1B2C',
    },
    forest: {
        primaryColor: '#228B22',
        secondaryColor: '#32CD32',
        accentColor: '#ADFF2F',
        backgroundColor: '#0B3D0B',
    },
    cosmic: {
        primaryColor: '#9932CC',
        secondaryColor: '#8A2BE2',
        accentColor: '#FF1493',
        backgroundColor: '#191970',
    },
    fire: {
        primaryColor: '#FF4500',
        secondaryColor: '#DC143C',
        accentColor: '#FF6347',
        backgroundColor: '#800000',
    },
    ice: {
        primaryColor: '#87CEEB',
        secondaryColor: '#4682B4',
        accentColor: '#B0E0E6',
        backgroundColor: '#191970',
    },
    toxic: {
        primaryColor: '#ADFF2F',
        secondaryColor: '#7FFF00',
        accentColor: '#32CD32',
        backgroundColor: '#2F4F2F',
    },
    cyber: {
        primaryColor: '#00CED1',
        secondaryColor: '#FF1493',
        accentColor: '#00FF7F',
        backgroundColor: '#000000',
    },
};
function generateVariation(gameId) {
    // Create unique session by combining gameId with current timestamp
    const sessionId = `${gameId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const rng = (0, seedrandom_1.default)(sessionId);
    // Select theme
    const themeNames = Object.keys(COLOR_THEMES);
    const selectedTheme = themeNames[Math.floor(rng() * themeNames.length)];
    const themeColors = COLOR_THEMES[selectedTheme];
    // Generate difficulty
    const difficultyLevels = ['easy', 'normal', 'hard', 'extreme'];
    const difficultyLevel = difficultyLevels[Math.floor(rng() * difficultyLevels.length)];
    const speedMultiplier = 0.7 + (rng() * 0.8); // 0.7x to 1.5x speed
    const complexityBonus = rng() * 0.5; // 0 to 0.5 complexity bonus
    // Generate random modifiers (1-4 modifiers per game for more chaos)
    const allModifiers = [
        'fastStart', 'slowMotion', 'doubleScore', 'shrinkingTime',
        'ghostMode', 'magneticEffect', 'turbulence', 'rapidFire',
        'biggerTargets', 'smallerTargets', 'invertedControls', 'bouncyWalls',
        'timeWarp', 'gravityShift', 'mirrorMode', 'fadeTrail',
        'explosiveMode', 'multiplierMadness', 'invisibleObstacles', 'colorBlind',
        'hyperspeed', 'freezeFrame', 'chaosMode', 'perfectAccuracy'
    ];
    const numModifiers = 1 + Math.floor(rng() * 4); // 1-4 modifiers for more variety
    const selectedModifiers = [];
    for (let i = 0; i < numModifiers; i++) {
        const availableModifiers = allModifiers.filter(m => !selectedModifiers.includes(m));
        if (availableModifiers.length > 0) {
            const modifier = availableModifiers[Math.floor(rng() * availableModifiers.length)];
            selectedModifiers.push(modifier);
        }
    }
    // Generate game-specific parameters
    const gameSpecific = generateGameSpecificParams(gameId, rng);
    const variation = {
        seed: rng().toString(),
        sessionId,
        theme: {
            name: selectedTheme,
            ...themeColors,
        },
        difficulty: {
            level: difficultyLevel,
            speedMultiplier,
            complexityBonus,
        },
        modifiers: selectedModifiers,
        gameSpecific,
    };
    // Validate the generated variation against the schema
    VariationSchema.parse(variation);
    return variation;
}
function generateGameSpecificParams(gameId, rng) {
    switch (gameId) {
        case 'snake':
            return {
                gridSize: 12 + Math.floor(rng() * 18), // 12-30 pixel grid (wider range)
                foodTypes: Math.floor(rng() * 5) + 1, // 1-5 different food types
                wallBehavior: rng() > 0.5 ? 'wrap' : 'solid', // walls vs wrapping
                snakePattern: ['solid', 'striped', 'gradient', 'pulsing'][Math.floor(rng() * 4)],
                powerUps: rng() > 0.4, // 60% chance of power-ups
                maxLength: 30 + Math.floor(rng() * 150), // max snake length 30-180
                foodSpawnRate: 0.5 + (rng() * 1.5), // 0.5x to 2x food spawn rate
                snakeGlow: rng() > 0.5, // glowing snake effect
                trailEffect: rng() > 0.6, // snake leaves a trail
                pulseEffect: rng() > 0.7, // pulsing animation
            };
        case 'breakout':
            return {
                brickLayers: 2 + Math.floor(rng() * 8), // 2-10 layers of bricks
                paddleSize: 0.6 + (rng() * 0.8), // 0.6x to 1.4x paddle size
                ballTrail: rng() > 0.4, // 60% chance ball leaves a trail
                multiball: rng() > 0.6, // 40% chance of multiple balls
                brickTypes: Math.floor(rng() * 6) + 1, // 1-6 different brick types
                powerUpChance: rng() * 0.4, // 0-40% power-up drop chance
                ballGlow: rng() > 0.5, // glowing ball effect
                paddleSticky: rng() > 0.7, // sticky paddle mode
                ballCount: 1 + Math.floor(rng() * 3), // 1-3 balls at start
                brickHealth: 1 + Math.floor(rng() * 4), // bricks take 1-4 hits
                paddleMovement: rng() > 0.8 ? 'teleport' : 'smooth', // teleporting paddle
                ballSize: 0.7 + (rng() * 0.6), // 0.7x to 1.3x ball size
                explosiveBricks: rng() > 0.8, // explosive bricks
                magneticPaddle: rng() > 0.85, // magnetic paddle effect
            };
        case 'flappy':
            return {
                pipeGapVariation: 0.5 + (rng() * 1.0), // 0.5x to 1.5x gap size variation
                birdSize: 0.6 + (rng() * 0.8), // 0.6x to 1.4x bird size
                gravityVariation: 0.5 + (rng() * 1.0), // 0.5x to 1.5x gravity
                pipeMovement: ['straight', 'wave', 'bounce', 'spiral'][Math.floor(rng() * 4)],
                particleEffects: rng() > 0.4, // 60% chance particle trail
                backgroundParallax: rng() > 0.5, // parallax scrolling background
                windEffect: rng() > 0.7, // 30% chance of wind affecting bird
                pipePattern: ['standard', 'alternating', 'random', 'increasing'][Math.floor(rng() * 4)],
                birdTrail: rng() > 0.6, // bird leaves a trail
                rotationEffect: rng() > 0.8, // bird rotates based on velocity
                glowEffect: rng() > 0.7, // glowing bird
                doubleJump: rng() > 0.9, // rare double-jump ability
                pipeCount: Math.floor(rng() * 3) + 1, // 1-3 simultaneous pipe sets
                scoreMultiplier: 1 + (rng() * 2), // 1x to 3x score multiplier
            };
        default:
            return {};
    }
}
