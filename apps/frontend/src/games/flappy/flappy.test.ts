import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Game from './index'; // Assuming Game is the default export

// Mock HTMLCanvasElement and its context
const mockGetContext = vi.fn(()_ => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    // Add any other context methods your game uses and might need mocking
}));

const mockCanvas = {
    getContext: mockGetContext,
    width: 300, // Default mock width
    height: 400, // Default mock height
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    // Add any other canvas properties/methods your game uses
};

global.HTMLCanvasElement.prototype.getContext = mockGetContext;
global.document.getElementById = vi.fn().mockReturnValue(mockCanvas);

// Mock fetch for variation API
global.fetch = vi.fn();

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((callback) => {
    // Immediately invoke the callback for testing purposes, or use a manual trigger
    // callback(0); // Or manage with a manual runner if needed
    return 0; // Return a number like the real API
});
global.cancelAnimationFrame = vi.fn();


describe('Flappy Bird Game', () => {
    let gameInstance: Game;

    beforeEach(async () => {
        // Reset mocks before each test
        vi.clearAllMocks();
        global.document.getElementById.mockReturnValue(mockCanvas); // Ensure canvas is always mocked

        // Default successful fetch mock for variations unless overridden in a specific test
        (fetch as vi.Mock).mockResolvedValue({
            ok: true,
            json: async () => ({
                seed: 'test-seed',
                ruleSet: { gravity: 0.25, gap: 120 },
            }),
        });
        gameInstance = await Game.startGame('game-canvas');
        // Stop the automatic game loop for controlled updates in tests
        if ((gameInstance as any).gameLoopId) {
            cancelAnimationFrame((gameInstance as any).gameLoopId);
        }
         // Access private members for testing if necessary, e.g., (gameInstance as any).method()
    });

    afterEach(() => {
        // Clean up if necessary, e.g., remove event listeners if they were added to global document
        // For now, Game class adds listeners to document, these might persist if not handled.
        // However, Vitest typically sandboxes modules.
    });

    describe('Initialization and Variations', () => {
        it('should initialize with default gravity and gap if API fetch fails', async () => {
            (fetch as vi.Mock).mockRejectedValueOnce(new Error('API Error'));
            const game = await Game.startGame('test-canvas-fail');
            expect((game as any).currentGravity).toBe((game as any).defaultGravity);
            expect((game as any).currentGap).toBe((game as any).defaultObstacleGap);
        });

        it('should initialize with default gravity and gap if API returns no ruleSet', async () => {
            (fetch as vi.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ seed: 'test-seed-no-rules' }), // No ruleSet
            });
            const game = await Game.startGame('test-canvas-no-rules');
            expect((game as any).currentGravity).toBe((game as any).defaultGravity);
            expect((game as any).currentGap).toBe((game as any).defaultObstacleGap);
        });

        it('should initialize with fetched gravity and default gap if API provides only gravity', async () => {
            (fetch as vi.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    seed: 'test-seed-only-gravity',
                    ruleSet: { gravity: 0.3 },
                }),
            });
            const game = await Game.startGame('test-canvas-only-gravity');
            expect((game as any).currentGravity).toBe(0.3);
            expect((game as any).currentGap).toBe((game as any).defaultObstacleGap);
        });

        it('should initialize with fetched gap and default gravity if API provides only gap', async () => {
            (fetch as vi.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    seed: 'test-seed-only-gap',
                    ruleSet: { gap: 100 },
                }),
            });
            const game = await Game.startGame('test-canvas-only-gap');
            expect((game as any).currentGravity).toBe((game as any).defaultGravity);
            expect((game as any).currentGap).toBe(100);
        });

        it('should initialize with fetched gravity and gap values on successful API call', async () => {
            // This is covered by the default beforeEach mock, but explicit test is good
            (fetch as vi.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    seed: 'test-seed-success',
                    ruleSet: { gravity: 0.28, gap: 110 },
                }),
            });
            const game = await Game.startGame('test-canvas-success');
            expect((game as any).currentGravity).toBe(0.28);
            expect((game as any).currentGap).toBe(110);
        });
    });

    describe('Bird Mechanics', () => {
        it('flap() should decrease birdVelocityY (make it negative for upward movement)', () => {
            (gameInstance as any).birdVelocityY = 0;
            (gameInstance as any).flap();
            expect((gameInstance as any).birdVelocityY).toBeLessThan(0);
            expect((gameInstance as any).birdVelocityY).toBe(-(gameInstance as any).flapStrength);
        });

        it('should apply gravity to birdVelocityY and update birdY position', () => {
            const initialBirdY = (gameInstance as any).birdY;
            const initialVelocityY = 0;
            (gameInstance as any).birdVelocityY = initialVelocityY;

            (gameInstance as any).update(); // Simulate one frame update

            const expectedVelocity = initialVelocityY + (gameInstance as any).currentGravity;
            expect((gameInstance as any).birdVelocityY).toBe(expectedVelocity);
            expect((gameInstance as any).birdY).toBe(initialBirdY + expectedVelocity);
        });

        it('should prevent bird from going above the top of the canvas', () => {
            (gameInstance as any).birdY = -10; // Try to set bird above canvas
            (gameInstance as any).birdVelocityY = -10; // Give it upward velocity
            (gameInstance as any).update();
            expect((gameInstance as any).birdY).toBe(0); // Should be reset to 0
            expect((gameInstance as any).birdVelocityY).toBe(0); // Velocity should be reset
        });

        it('should set gameOver to true when bird hits the bottom of the canvas', () => {
            (gameInstance as any).birdY = mockCanvas.height - (gameInstance as any).birdHeight;
            (gameInstance as any).birdVelocityY = 1; // Moving downwards
            (gameInstance as any).update(); // This should trigger collision
            expect((gameInstance as any).gameOver).toBe(true);
        });
    });

    describe('Obstacle Mechanics', () => {
        it('generateObstacle() should create obstacles with correct properties', () => {
            (gameInstance as any).generateObstacle();
            const obstacles = (gameInstance as any).obstacles;
            expect(obstacles.length).toBeGreaterThan(0);
            const newObstacle = obstacles[obstacles.length - 1];
            expect(newObstacle.x).toBe(mockCanvas.width);
            expect(newObstacle.passed).toBe(false);
            expect(newObstacle.topPipeHeight).toBeGreaterThanOrEqual((gameInstance as any).minPipeHeight);
            const maxPossibleHeight = mockCanvas.height - (gameInstance as any).currentGap - (gameInstance as any).minPipeHeight;
            expect(newObstacle.topPipeHeight).toBeLessThanOrEqual(maxPossibleHeight);
        });

        it('obstacles should move to the left', () => {
            (gameInstance as any).generateObstacle();
            const obstacle = (gameInstance as any).obstacles[0];
            const initialX = obstacle.x;
            (gameInstance as any).update();
            expect(obstacle.x).toBe(initialX - (gameInstance as any).obstacleSpeed);
        });

        it('obstacles should be removed when they go off-screen', () => {
            (gameInstance as any).generateObstacle();
            const obstacle = (gameInstance as any).obstacles[0];
            obstacle.x = -(gameInstance as any).obstacleWidth - 1; // Move it off-screen
            (gameInstance as any).update(); // Update should remove it
            expect((gameInstance as any).obstacles.length).toBe(0); // Assuming it was the only one
        });
    });

    describe('Collision Detection', () => {
        beforeEach(() => {
             // Ensure bird is at a controllable position
            (gameInstance as any).birdX = 50;
            (gameInstance as any).birdY = mockCanvas.height / 2;
            (gameInstance as any).birdVelocityY = 0; // No vertical movement unless specified
            (gameInstance as any).gameOver = false;
            (gameInstance as any).obstacles = []; // Clear obstacles
        });

        it('should set gameOver to true when bird collides with an upper pipe', () => {
            (gameInstance as any).obstacles = [{
                x: (gameInstance as any).birdX, // Bird's X aligns with obstacle's X
                topPipeHeight: (gameInstance as any).birdY + 1, // Top pipe extends just below bird's top
                passed: false,
            }];
            (gameInstance as any).update();
            expect((gameInstance as any).gameOver).toBe(true);
        });

        it('should set gameOver to true when bird collides with a lower pipe', () => {
            const birdBottom = (gameInstance as any).birdY + (gameInstance as any).birdHeight;
            (gameInstance as any).obstacles = [{
                x: (gameInstance as any).birdX,
                topPipeHeight: (gameInstance as any).birdY - (gameInstance as any).currentGap - 1, // Top pipe is high enough
                passed: false,
            }];
            // This setup means birdY is e.g. 200, birdHeight is 20. birdBottom = 220.
            // topPipeHeight is 200 - 120 - 1 = 79.
            // lowerPipeTop = topPipeHeight + currentGap = 79 + 120 = 199.
            // Bird (200-220) should collide with lower pipe (starts at 199).
            (gameInstance as any).update();
            expect((gameInstance as any).gameOver).toBe(true);
        });

        it('should not set gameOver when bird flies safely between pipes', () => {
            (gameInstance as any).obstacles = [{
                x: (gameInstance as any).birdX + (gameInstance as any).birdWidth + 10, // Obstacle is ahead
                topPipeHeight: (gameInstance as any).birdY - 50, // Top pipe well above bird
                passed: false,
            }];
             // Lower pipe Y = (birdY - 50) + currentGap. If currentGap is large, this is below bird.
            (gameInstance as any).update();
            expect((gameInstance as any).gameOver).toBe(false);
        });
    });

    describe('Scoring', () => {
        beforeEach(() => {
            (gameInstance as any).score = 0;
            (gameInstance as any).obstacles = [];
            (gameInstance as any).birdX = 50; // Fixed bird X for predictability
        });

        it('should increment score when bird passes an obstacle', () => {
            (gameInstance as any).obstacles = [{
                x: (gameInstance as any).birdX - (gameInstance as any).obstacleWidth - 1, // Obstacle is just behind bird
                topPipeHeight: 100,
                passed: false,
            }];
            (gameInstance as any).updateScore(); // Call directly or via update()
            expect((gameInstance as any).score).toBe(1);
            expect((gameInstance as any).obstacles[0].passed).toBe(true);
        });

        it('should not increment score multiple times for the same obstacle', () => {
            (gameInstance as any).obstacles = [{
                x: (gameInstance as any).birdX - (gameInstance as any).obstacleWidth - 1,
                topPipeHeight: 100,
                passed: false,
            }];
            (gameInstance as any).updateScore();
            expect((gameInstance as any).score).toBe(1);
            (gameInstance as any).updateScore(); // Call again
            expect((gameInstance as any).score).toBe(1); // Score should not change
        });
    });

    describe('Game Over and Restart', () => {
        it('should stop updates when gameOver is true', () => {
            (gameInstance as any).gameOver = true;
            const initialBirdY = (gameInstance as any).birdY;
            (gameInstance as any).generateObstacle();
            const initialObstacleX = (gameInstance as any).obstacles[0].x;

            (gameInstance as any).update(); // Try to update

            expect((gameInstance as any).birdY).toBe(initialBirdY); // Bird should not move
            expect((gameInstance as any).obstacles[0].x).toBe(initialObstacleX); // Obstacles should not move
            // Also check that no new obstacles are generated if framesSinceLastObstacle was high
        });

        it('resetGame() should correctly reset game state', () => {
            // Setup a "dirty" game state
            (gameInstance as any).birdY = 10;
            (gameInstance as any).birdVelocityY = -5;
            (gameInstance as any).obstacles = [{ x: 1, topPipeHeight: 1, passed: true }];
            (gameInstance as any).score = 5;
            (gameInstance as any).gameOver = true;
            (gameInstance as any).framesSinceLastObstacle = 10;

            const initialGravity = (gameInstance as any).currentGravity;
            const initialGap = (gameInstance as any).currentGap;

            (gameInstance as any).resetGame();

            expect((gameInstance as any).birdY).toBe(150); // Default start Y
            expect((gameInstance as any).birdVelocityY).toBe(0);
            expect((gameInstance as any).obstacles.length).toBe(0);
            expect((gameInstance as any).score).toBe(0);
            expect((gameInstance as any).gameOver).toBe(false);
            expect((gameInstance as any).framesSinceLastObstacle).toBe((gameInstance as any).obstacleInterval);

            // Ensure variations are NOT reset by resetGame()
            expect((gameInstance as any).currentGravity).toBe(initialGravity);
            expect((gameInstance as any).currentGap).toBe(initialGap);
        });
    });
});

// Helper to run multiple game updates for testing continuous effects like gravity
// function runGameUpdates(game: Game, count: number) {
//     for (let i = 0; i < count; i++) {
//         (game as any).update();
//     }
// }
