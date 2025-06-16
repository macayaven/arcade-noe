import { describe, test, expect, beforeEach, afterEach, vi, SpyInstance } from 'vitest';
import { FlappyGame } from './index'; // Import after mocks if needed, or ensure mocks are applied before instantiation.

// Mock seedrandom before FlappyGame is imported or instantiated if it's checked at module level
// However, FlappyGame checks for seedrandom dynamically. We can mock it on `globalThis`
// @ts-ignore
globalThis.seedrandom = vi.fn();

// Default constants from game, might be useful for baseline comparisons
const DEFAULT_GRAVITY_CONST = 0.5;
const DEFAULT_PIPE_GAP_CONST = 150;
const DEFAULT_SEED_CONST = 'default-flappy-seed';
const BIRD_FLAP_STRENGTH_CONST = -8;
const BIRD_X_POS = 100; // From game's BIRD_X_POSITION
const BIRD_RADIUS_CONST = 20; // From game's BIRD_RADIUS
const CANVAS_HEIGHT = 600; // From game's CANVAS_HEIGHT

type FlappyVariation = {
    seed: string;
    gap: number;
    gravity: number;
};

describe('FlappyGame', () => {
    let game: FlappyGame;
    let canvasElement: HTMLCanvasElement;
    let mockFetch: SpyInstance;
    let mockSeedRandomGlobal: SpyInstance;

    const mockSuccessResponse = (variation: FlappyVariation) => {
        mockFetch.mockResolvedValue({
            ok: true,
            json: async () => variation,
        } as Response);
    };

    const mockFailureResponse = (status: number = 500) => {
        mockFetch.mockResolvedValue({
            ok: false,
            status,
            json: async () => ({ message: 'API Error' }),
        } as Response);
    };

    // This mock RNG will be returned by the mocked seedrandom
    const mockRng = vi.fn();

    beforeEach(() => {
        canvasElement = document.createElement('canvas');
        canvasElement.id = 'test-canvas'; // Ensure a unique ID or consistent ID
        document.body.appendChild(canvasElement);

        // Mock global fetch
        mockFetch = vi.spyOn(global, 'fetch');

        // Mock seedrandom on globalThis, which FlappyGame uses
        // @ts-ignore
        mockSeedRandomGlobal = vi.spyOn(globalThis, 'seedrandom').mockReturnValue(mockRng);
        mockRng.mockReturnValue(0.5); // Default RNG behavior for tests not focused on seed

        // Instantiate game AFTER mocks are set up
        // Game constructor calls fetchVariationAndInitialize
    });

    afterEach(() => {
        document.body.removeChild(canvasElement);
        vi.restoreAllMocks(); // Restores all spies and mocks
        // @ts-ignore
        if (game && typeof game.destroy === 'function') {
            // @ts-ignore
            game.destroy(); // Clean up game instance, remove listeners etc.
        }
    });

    describe('Initialization & Variation Application', () => {
        test('should initialize correctly and fetch variations', async () => {
            const testVariation: FlappyVariation = { seed: 'test-seed-1', gap: 200, gravity: 0.6 };
            mockSuccessResponse(testVariation);

            game = new FlappyGame('test-canvas');
            await game.fetchVariationAndInitialize(); // Manually trigger as constructor call is complex to await here

            expect(fetch).toHaveBeenCalledWith('/api/variation/flappy');
            // @ts-ignore
            expect(game.currentGravity).toBe(testVariation.gravity);
            // @ts-ignore
            expect(game.currentPipeGap).toBe(testVariation.gap);
            // @ts-ignore
            expect(game.currentSeed).toBe(testVariation.seed);
            expect(mockSeedRandomGlobal).toHaveBeenCalledWith(testVariation.seed);
        });

        test('should use default variations if fetch fails', async () => {
            mockFailureResponse();

            game = new FlappyGame('test-canvas');
            await game.fetchVariationAndInitialize();

            expect(fetch).toHaveBeenCalledWith('/api/variation/flappy');
            // @ts-ignore
            expect(game.currentGravity).toBe(DEFAULT_GRAVITY_CONST);
            // @ts-ignore
            expect(game.currentPipeGap).toBe(DEFAULT_PIPE_GAP_CONST);
            // @ts-ignore
            expect(game.currentSeed).toBe(DEFAULT_SEED_CONST); // Default seed from game constants
            expect(mockSeedRandomGlobal).toHaveBeenCalledWith(DEFAULT_SEED_CONST);
        });

        test('should use default variations if fetched data is invalid', async () => {
            mockFetch.mockResolvedValue({ // Simulate malformed response
                ok: true,
                json: async () => ({ seed: 'bad-seed', gap: 'not-a-number', gravity: null }),
            } as Response);

            game = new FlappyGame('test-canvas');
            await game.fetchVariationAndInitialize();

            // @ts-ignore
            expect(game.currentGravity).toBe(DEFAULT_GRAVITY_CONST);
            // @ts-ignore
            expect(game.currentPipeGap).toBe(DEFAULT_PIPE_GAP_CONST);
             // @ts-ignore
            expect(game.currentSeed).toBe(DEFAULT_SEED_CONST);
        });
    });

    describe('Gravity Variation', () => {
        test('should apply fetched gravity to bird physics', async () => {
            const customGravity = 0.75;
            mockSuccessResponse({ seed: 'gravity-test', gap: 150, gravity: customGravity });

            game = new FlappyGame('test-canvas');
            await game.fetchVariationAndInitialize();
            // @ts-ignore
            game.isGameOver = false; // Start game for update to run
            // @ts-ignore
            game.birdVelocity = 0;

            const initialVelocity = game['birdVelocity'];
            game.update(16); // Simulate one frame (approx 16ms)

            // Check if velocity changed according to new gravity
            // Expected change: initialVelocity + customGravity * (16/16)
            expect(game['birdVelocity']).toBe(initialVelocity + customGravity);
        });
    });

    describe('Pipe Gap Variation', () => {
        test('should apply fetched pipe gap to generated obstacles', async () => {
            const customGap = 250;
            mockSuccessResponse({ seed: 'gap-test', gap: customGap, gravity: 0.5 });
            mockRng.mockReturnValue(0.5); // Consistent RNG for pipe height generation

            game = new FlappyGame('test-canvas');
            await game.fetchVariationAndInitialize();
            // @ts-ignore
            game.isGameOver = false;

            // @ts-ignore
            game.generateObstacle(); // Generate one obstacle

            // @ts-ignore
            const obstacles = game.obstacles as any[];
            expect(obstacles.length).toBeGreaterThan(0);
            expect(obstacles[0].gap).toBe(customGap);
        });
    });

    describe('Seed Determinism', () => {
        test('should generate deterministic obstacles with the same seed', async () => {
            const seed = 'deterministic-seed';
            mockSuccessResponse({ seed, gap: 150, gravity: 0.5 });

            // Configure mockRng to produce a sequence for the first run
            mockRng.mockReturnValueOnce(0.3).mockReturnValueOnce(0.6).mockReturnValueOnce(0.9);
            game = new FlappyGame('test-canvas');
            await game.fetchVariationAndInitialize(); // Applies the seed
            // @ts-ignore
            game.isGameOver = false;

            // @ts-ignore
            game.generateObstacle(); game.generateObstacle(); game.generateObstacle();
            // @ts-ignore
            const obstacles1 = JSON.parse(JSON.stringify(game.obstacles));

            // Reset and run again with the same seed
            // @ts-ignore
            mockSeedRandomGlobal.mockClear(); // Clear previous calls
            mockRng.mockReset().mockReturnValueOnce(0.3).mockReturnValueOnce(0.6).mockReturnValueOnce(0.9); // Reset sequence for RNG

            // Re-initialize or simulate re-fetch with same seed
            await game.fetchVariationAndInitialize(); // This re-seeds the RNG
            // @ts-ignore
            game.isGameOver = false;
            // @ts-ignore
            game.obstacles = []; // Clear obstacles manually for a clean generation pass

            // @ts-ignore
            game.generateObstacle(); game.generateObstacle(); game.generateObstacle();
            // @ts-ignore
            const obstacles2 = JSON.parse(JSON.stringify(game.obstacles));

            expect(mockSeedRandomGlobal).toHaveBeenCalledWith(seed); // Ensure seed was applied both times
            expect(obstacles1.length).toBe(3);
            expect(obstacles2.length).toBe(3);
            expect(obstacles1).toEqual(obstacles2); // Obstacles should be identical
        });

        test('should generate different obstacles with different seeds', async () => {
            // Seed 1
            mockSuccessResponse({ seed: 'seed-A', gap: 150, gravity: 0.5 });
            mockRng.mockReturnValueOnce(0.25).mockReturnValueOnce(0.55); // RNG sequence for seed A
            game = new FlappyGame('test-canvas');
            await game.fetchVariationAndInitialize();
             // @ts-ignore
            game.isGameOver = false;
            // @ts-ignore
            game.generateObstacle(); game.generateObstacle();
            // @ts-ignore
            const obstaclesA = JSON.parse(JSON.stringify(game.obstacles));

            // Seed 2
            mockSuccessResponse({ seed: 'seed-B', gap: 150, gravity: 0.5 });
            mockRng.mockReset().mockReturnValueOnce(0.75).mockReturnValueOnce(0.15); // Different RNG sequence for seed B
            await game.fetchVariationAndInitialize(); // Re-fetches and applies new seed
             // @ts-ignore
            game.isGameOver = false;
            // @ts-ignore
            game.obstacles = []; // Clear obstacles
            // @ts-ignore
            game.generateObstacle(); game.generateObstacle();
            // @ts-ignore
            const obstaclesB = JSON.parse(JSON.stringify(game.obstacles));

            expect(obstaclesA.length).toBe(2);
            expect(obstaclesB.length).toBe(2);
            expect(obstaclesA).not.toEqual(obstaclesB);
        });
    });

    describe('Core Game Logic', () => {
        beforeEach(async () => {
            // Setup with default variations for core logic tests
            mockSuccessResponse({ seed: DEFAULT_SEED_CONST, gap: DEFAULT_PIPE_GAP_CONST, gravity: DEFAULT_GRAVITY_CONST });
            game = new FlappyGame('test-canvas');
            await game.fetchVariationAndInitialize();
            // @ts-ignore
            game.isGameOver = false; // Start game by default for these tests
        });

        test('flap method should apply upward velocity', () => {
            // @ts-ignore
            game.birdVelocity = 0;
            // @ts-ignore
            game.flap();
            // @ts-ignore
            expect(game.birdVelocity).toBe(BIRD_FLAP_STRENGTH_CONST);
        });

        test('score should increment when bird passes a pipe', () => {
            // @ts-ignore
            game.score = 0;
            // @ts-ignore
            game.obstacles = [{ x: BIRD_X_POS - BIRD_RADIUS_CONST - 50, topPipeHeight: 100, gap: DEFAULT_PIPE_GAP_CONST, passed: false }]; // Pipe just behind bird
            // @ts-ignore
            game.obstacles[0].x = BIRD_X_POS - game.obstacles[0].width - 1; // Position pipe to be passed

            game.update(16); // Update to check for pass
            // @ts-ignore
            expect(game.score).toBe(1);
             // @ts-ignore
            expect(game.obstacles[0].passed).toBe(true);
        });

        test('collision with pipe should set isGameOver to true', () => {
             // @ts-ignore
            game.birdY = CANVAS_HEIGHT / 2;
             // @ts-ignore
            game.obstacles = [{
                x: BIRD_X_POS - BIRD_RADIUS_CONST + 1, // Bird's right edge is inside pipe's left edge
                // @ts-ignore
                width: game.PIPE_WIDTH,
                topPipeHeight: 0, // Top pipe from 0 to 0 (effectively no top pipe for this test part)
                gap: 100, // Small gap
                passed: false
            }];
            // Ensure bird hits the bottom part of this "virtual" pipe
            // @ts-ignore
            game.obstacles[0].topPipeHeight = game.birdY - BIRD_RADIUS_CONST - 50; // Top pipe ends well above bird
            // @ts-ignore
            game.obstacles[0].gap = 20; // Gap is small
            // Bird should collide with bottom pipe part (y > topPipeHeight + gap)
            // Bird's bottom is birdY + BIRD_RADIUS_CONST
            // Bottom pipe starts at obstacles[0].topPipeHeight + obstacles[0].gap
            // @ts-ignore
            game.birdY = game.obstacles[0].topPipeHeight + game.obstacles[0].gap + BIRD_RADIUS_CONST + 1;


            game.update(16);
            // @ts-ignore
            expect(game.isGameOver).toBe(true);
        });

        test('collision with bottom boundary should set isGameOver to true', () => {
            // @ts-ignore
            game.birdY = CANVAS_HEIGHT - BIRD_RADIUS_CONST + 1; // Position bird just below bottom boundary
            // @ts-ignore
            game.birdVelocity = 10; // Moving downwards
            game.update(16);
            // @ts-ignore
            expect(game.isGameOver).toBe(true);
        });

        test('collision with top boundary should not immediately end game but stop bird', () => {
            // @ts-ignore
            game.birdY = BIRD_RADIUS_CONST - 1; // Position bird just above top boundary
            // @ts-ignore
            game.birdVelocity = -10; // Moving upwards
            game.update(16);
            // @ts-ignore
            expect(game.isGameOver).toBe(false); // Game does not end on top collision by current design
            // @ts-ignore
            expect(game.birdY).toBe(BIRD_RADIUS_CONST); // Bird should be reset to boundary
            // @ts-ignore
            expect(game.birdVelocity).toBe(0); // Velocity should be reset
        });


        test('game restart (via start method) should reset game state and fetch new variations', async () => {
            // @ts-ignore
            game.score = 5;
            // @ts-ignore
            game.isGameOver = true;
            const oldSeed = game['currentSeed'];

            const newMockVariation: FlappyVariation = { seed: 'new-seed-on-restart', gap: 180, gravity: 0.55 };
            mockSuccessResponse(newMockVariation); // Mock fetch for the restart

            await game.start(); // Should fetch new variations and reset

            // @ts-ignore
            expect(game.score).toBe(0);
            // @ts-ignore
            expect(game.isGameOver).toBe(false); // Game is active after start
            // @ts-ignore
            expect(game.obstacles.length).toBe(0);
            // @ts-ignore
            expect(game.currentSeed).toBe(newMockVariation.seed);
            expect(game['currentSeed']).not.toBe(oldSeed);
            // @ts-ignore
            expect(game.currentGravity).toBe(newMockVariation.gravity);
            // @ts-ignore
            expect(game.currentPipeGap).toBe(newMockVariation.gap);
        });

        test('input should be ignored for flap if game is over and not restarting via input', () => {
            // @ts-ignore
            game.isGameOver = true;
            // @ts-ignore
            const initialBirdVelocity = game.birdVelocity = 0; // Ensure bird is static

            // @ts-ignore
            game.flap(); // flap() itself won't restart if game is over. handleInput() does.

            // @ts-ignore
            expect(game.birdVelocity).toBe(initialBirdVelocity); // Velocity should not change
        });

    });
});
