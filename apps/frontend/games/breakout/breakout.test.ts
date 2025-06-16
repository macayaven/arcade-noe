import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { BreakoutGame } from './index'; // Assuming BreakoutGame is the default export

// Mock HTMLCanvasElement and its context
const mockGetContext = vi.fn(() => ({
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    closePath: vi.fn(),
    fillText: vi.fn(),
    // Add any other context methods your game uses
    textAlign: '', // Mock property
    fillStyle: '', // Mock property
    font: '', // Mock property
}));

const mockCanvas = {
    getContext: mockGetContext,
    width: 400, // Default mock width, should match game's CANVAS_WIDTH
    height: 400, // Default mock height, should match game's CANVAS_HEIGHT
    getBoundingClientRect: vi.fn(() => ({
        left: 0, // Mock implementation
        top: 0,
        right: mockCanvas.width,
        bottom: mockCanvas.height,
        x:0,
        y:0,
        width: mockCanvas.width,
        height: mockCanvas.height,
        toJSON: () => ({}) // Ensure all properties of DOMRectReadOnly are present
    })),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    // Add any other canvas properties/methods your game uses
};

// global.HTMLCanvasElement.prototype.getContext = mockGetContext; //This is one way
// Another way, more specific to JSDOM if that's the env:
if (typeof HTMLCanvasElement !== 'undefined') {
    HTMLCanvasElement.prototype.getContext = mockGetContext;
}

const getElementByIdMock = vi.fn().mockReturnValue(mockCanvas);
global.document.getElementById = getElementByIdMock;


// Mock fetch for variation API
global.fetch = vi.fn();

// Mock requestAnimationFrame
let rafCallback: FrameRequestCallback | null = null;
global.requestAnimationFrame = vi.fn((callback) => {
    rafCallback = callback; // Store the callback
    return Date.now(); // Return a mock ID
});
global.cancelAnimationFrame = vi.fn();

// Mock console.log and console.error to avoid polluting test output and for spying
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});


// Helper to simulate a game frame
function simulateFrame(time = 0) {
    const currentCallback = rafCallback;
    rafCallback = null; // Clear before execution to mimic rAF behavior (next call to rAF will set it again)
    if (currentCallback) {
        currentCallback(time);
    }
}

// Constants from the game module (adjust if they are exported differently or change)
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const DEFAULT_PADDLE_WIDTH = 75; // Default PADDLE_WIDTH before variation
const PADDLE_HEIGHT = 10;
const PADDLE_Y_OFFSET = 30;
const BALL_RADIUS = 8;
const DEFAULT_BALL_SPEED_MULTIPLIER = 1;
const BRICK_WIDTH = 50;
const BRICK_HEIGHT = 15;


describe('Breakout Game', () => {
    let gameInstance: BreakoutGame;

    // Default successful fetch mock for variations
    const mockDefaultVariation = {
        seed: 'test-seed',
        paddleSize: 'medium',
        ballSpeed: 'normal',
    };

    beforeEach(async () => {
        vi.clearAllMocks(); // Clear mocks before each test
        getElementByIdMock.mockReturnValue(mockCanvas); // Ensure canvas is mocked

        (fetch as vi.Mock).mockResolvedValue({
            ok: true,
            json: async () => (mockDefaultVariation),
        });

        // Create game instance - constructor now fetches variation
        gameInstance = new BreakoutGame('game-canvas');
        // Wait for async operations in constructor (fetchVariationAndInitialize) to complete
        await vi.waitFor(() => {
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Breakout game started.'));
        });
        // Stop the game loop that starts automatically after resetGame in constructor
        gameInstance.stop();
        rafCallback = null; // Ensure no lingering raf callbacks
    });

    afterEach(() => {
        gameInstance.stop(); // Ensure game loop is stopped after each test
        // If event listeners are added to global document/window, remove them here or ensure they are managed by the game class
        document.removeEventListener('mousemove', (gameInstance as any).mouseMoveHandler); // Assuming it's named this and attached to document
    });

    describe('Initialization and Variations', () => {
        it('should create a canvas and rendering context', () => {
            expect(getElementByIdMock).toHaveBeenCalledWith('game-canvas');
            expect(mockCanvas.getContext).toHaveBeenCalledWith('2d');
        });

        it('should fetch variations and apply medium paddle and normal speed by default', async () => {
            expect(fetch).toHaveBeenCalledWith('/api/variation/breakout');
            // Check based on the console.log message from resetGame
            // This relies on PADDLE_WIDTH and BALL_SPEED_MULTIPLIER being global/module scope vars
            // that are updated by fetchVariationAndInitialize
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining(`Paddle: ${DEFAULT_PADDLE_WIDTH}`));
            expect(console.log).toHaveBeenCalledWith(expect.stringContaining(`Speed mult: ${DEFAULT_BALL_SPEED_MULTIPLIER}`));
        });

        it('should apply "small" paddleSize variation', async () => {
            (fetch as vi.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ...mockDefaultVariation, paddleSize: 'small' }),
            });
            // Must re-initialize or have a method to re-fetch and apply.
            // Re-creating the instance for this test.
            const smallPaddleGame = new BreakoutGame('game-canvas-small-paddle');
            await vi.waitFor(() => expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Paddle: 50')));
            smallPaddleGame.stop();
        });

        it('should apply "large" paddleSize variation', async () => {
            (fetch as vi.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ...mockDefaultVariation, paddleSize: 'large' }),
            });
            const largePaddleGame = new BreakoutGame('game-canvas-large-paddle');
            await vi.waitFor(() => expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Paddle: 100')));
            largePaddleGame.stop();
        });

        it('should apply "slow" ballSpeed variation', async () => {
            (fetch as vi.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ...mockDefaultVariation, ballSpeed: 'slow' }),
            });
            const slowBallGame = new BreakoutGame('game-canvas-slow-ball');
            await vi.waitFor(() => expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Speed mult: 0.75')));
            slowBallGame.stop();
        });


        it('should apply "fast" ballSpeed variation', async () => {
            (fetch as vi.Mock).mockResolvedValueOnce({
                ok: true,
                json: async () => ({ ...mockDefaultVariation, ballSpeed: 'fast' }),
            });
            const fastBallGame = new BreakoutGame('game-canvas-fast-ball');
            await vi.waitFor(() => expect(console.log).toHaveBeenCalledWith(expect.stringContaining('Speed mult: 1.5')));
            fastBallGame.stop();
        });

        it('should use default variations if API fetch fails', async () => {
            (fetch as vi.Mock).mockRejectedValueOnce(new Error('API Error'));
            const gameWithApiError = new BreakoutGame('game-canvas-api-error');
            await vi.waitFor(() => expect(console.log).toHaveBeenCalledWith(expect.stringContaining(`Paddle: ${DEFAULT_PADDLE_WIDTH}`)));
            await vi.waitFor(() => expect(console.log).toHaveBeenCalledWith(expect.stringContaining(`Speed mult: ${DEFAULT_BALL_SPEED_MULTIPLIER}`)));
            expect(console.error).toHaveBeenCalledWith('Error fetching or applying Breakout variation:', expect.any(Error));
            gameWithApiError.stop();
        });
    });

    describe('Paddle Mechanics', () => {
        // To test paddle movement, we need to know current PADDLE_WIDTH applied by variation
        // Let's assume default variation (medium paddle = 75px) for these tests,
        // as gameInstance is created with mockDefaultVariation in beforeEach.
        const currentPaddleWidth = DEFAULT_PADDLE_WIDTH;

        it('should move the paddle with mouse, constrained by canvas width', () => {
            // Simulate mouse move event
            // The handler is on `document`, not the canvas itself in the game code provided
            const mouseMoveHandler = (gameInstance as any).setupMouseControls.mock.calls[0][1]; //This is fragile. Better to re-attach if possible
                                                                                                 // Or get a reference to the handler if the game class stores it.

            // The game's setupMouseControls adds an event listener to 'document'.
            // We need to grab that handler or re-implement a way to call it.
            // For simplicity, let's assume the handler is accessible or we can test the paddleX directly.
            // (gameInstance as any).paddleX is set by the mousemove handler.

            // Simulate mouse move to center
            const eventCenter = { clientX: CANVAS_WIDTH / 2 + mockCanvas.getBoundingClientRect().left } as MouseEvent;
            document.dispatchEvent(new MouseEvent('mousemove', eventCenter));
            expect((gameInstance as any).paddleX).toBe(CANVAS_WIDTH / 2 - currentPaddleWidth / 2);

            // Simulate mouse move to left edge
            const eventLeftEdge = { clientX: 0 + mockCanvas.getBoundingClientRect().left } as MouseEvent;
            document.dispatchEvent(new MouseEvent('mousemove', eventLeftEdge));
            expect((gameInstance as any).paddleX).toBe(0);

            // Simulate mouse move far left (should be constrained)
            const eventFarLeft = { clientX: -100 + mockCanvas.getBoundingClientRect().left } as MouseEvent;
            document.dispatchEvent(new MouseEvent('mousemove', eventFarLeft));
            expect((gameInstance as any).paddleX).toBe(0);

            // Simulate mouse move to right edge
            const eventRightEdge = { clientX: CANVAS_WIDTH + mockCanvas.getBoundingClientRect().left } as MouseEvent;
            document.dispatchEvent(new MouseEvent('mousemove', eventRightEdge));
            expect((gameInstance as any).paddleX).toBe(CANVAS_WIDTH - currentPaddleWidth);

            // Simulate mouse move far right (should be constrained)
            const eventFarRight = { clientX: CANVAS_WIDTH + 100 + mockCanvas.getBoundingClientRect().left } as MouseEvent;
            document.dispatchEvent(new MouseEvent('mousemove', eventFarRight));
            expect((gameInstance as any).paddleX).toBe(CANVAS_WIDTH - currentPaddleWidth);
        });
    });

    describe('Ball Mechanics', () => {
        let currentBallSpeedMultiplier: number;
        beforeEach(() => {
            // Assuming default variation (normal speed) for these tests
            currentBallSpeedMultiplier = DEFAULT_BALL_SPEED_MULTIPLIER;
            (gameInstance as any).ballX = CANVAS_WIDTH / 2;
            (gameInstance as any).ballY = CANVAS_HEIGHT / 2;
            (gameInstance as any).ballDX = 2 * currentBallSpeedMultiplier;
            (gameInstance as any).ballDY = -2 * currentBallSpeedMultiplier;
            (gameInstance as any).isGameOver = false;
            (gameInstance as any).lives = 3;
            gameInstance.start(); // Start the game loop for update calls
        });

        afterEach(() => {
            gameInstance.stop();
        });

        it('should move the ball according to its velocity', () => {
            const initialX = (gameInstance as any).ballX;
            const initialY = (gameInstance as any).ballY;
            simulateFrame(); // Process one frame (which calls update)
            expect((gameInstance as any).ballX).toBe(initialX + (gameInstance as any).ballDX);
            expect((gameInstance as any).ballY).toBe(initialY + (gameInstance as any).ballDY);
        });

        it('should bounce off the top wall', () => {
            (gameInstance as any).ballY = BALL_RADIUS;
            (gameInstance as any).ballDY = -2 * currentBallSpeedMultiplier; // Moving upwards
            simulateFrame();
            expect((gameInstance as any).ballDY).toBe(2 * currentBallSpeedMultiplier);
        });

        it('should bounce off the left wall', () => {
            (gameInstance as any).ballX = BALL_RADIUS;
            (gameInstance as any).ballDX = -2 * currentBallSpeedMultiplier; // Moving left
            simulateFrame();
            expect((gameInstance as any).ballDX).toBe(2 * currentBallSpeedMultiplier);
        });

        it('should bounce off the right wall', () => {
            (gameInstance as any).ballX = CANVAS_WIDTH - BALL_RADIUS;
            (gameInstance as any).ballDX = 2 * currentBallSpeedMultiplier; // Moving right
            simulateFrame();
            expect((gameInstance as any).ballDX).toBe(-2 * currentBallSpeedMultiplier);
        });

        it('should bounce off the paddle', () => {
            const currentPaddleWidth = DEFAULT_PADDLE_WIDTH; // from mockDefaultVariation
            (gameInstance as any).paddleX = CANVAS_WIDTH / 2 - currentPaddleWidth / 2;
            (gameInstance as any).ballX = CANVAS_WIDTH / 2;
            (gameInstance as any).ballY = CANVAS_HEIGHT - PADDLE_HEIGHT - PADDLE_Y_OFFSET - BALL_RADIUS - 1;
            (gameInstance as any).ballDY = 2 * currentBallSpeedMultiplier; // Moving downwards towards paddle

            simulateFrame();

            expect((gameInstance as any).ballDY).toBeLessThan(0); // Should be moving upwards
        });

        it('should lose a life if ball goes below paddle', () => {
            const initialLives = (gameInstance as any).lives;
            (gameInstance as any).ballY = CANVAS_HEIGHT - BALL_RADIUS + 1; // Ball below paddle
            (gameInstance as any).ballDY = 2 * currentBallSpeedMultiplier; // Moving downwards

            simulateFrame();

            expect((gameInstance as any).lives).toBe(initialLives - 1);
            expect((gameInstance as any).ballX).toBe(CANVAS_WIDTH / 2); // Ball should reset
        });
    });

    describe('Brick Mechanics', () => {
        beforeEach(() => {
            (gameInstance as any).initializeBricks();
            (gameInstance as any).score = 0;
            (gameInstance as any).isGameOver = false;
            gameInstance.start();
        });
        afterEach(() => {
            gameInstance.stop();
        });

        it('should destroy a brick on collision and increment score', () => {
            const bricks = (gameInstance as any).bricks as {x: number, y: number, status: number}[][];
            let brickToHit: {x: number, y: number, status: number} | null = null;
            let brickC = -1, brickR = -1;

            // Manually set brick positions for test predictability as they are set during draw in game
            for (let c = 0; c < (gameInstance as any).BRICK_COLUMN_COUNT; c++) {
                for (let r = 0; r < (gameInstance as any).BRICK_ROW_COUNT; r++) {
                    bricks[c][r].x = c * (BRICK_WIDTH + (gameInstance as any).BRICK_PADDING) + (gameInstance as any).BRICK_OFFSET_LEFT;
                    bricks[c][r].y = r * (BRICK_HEIGHT + (gameInstance as any).BRICK_PADDING) + (gameInstance as any).BRICK_OFFSET_TOP;
                    bricks[c][r].status = 1; // Ensure brick is active
                }
            }

            // Find first active brick
            for(let c=0; c < bricks.length; c++) {
                for(let r=0; r < bricks[c].length; r++) {
                    if(bricks[c][r].status === 1) {
                        brickToHit = bricks[c][r];
                        brickC = c; brickR = r;
                        break;
                    }
                }
                if(brickToHit) break;
            }
            expect(brickToHit).not.toBeNull();

            (gameInstance as any).ballX = brickToHit!.x + (BRICK_WIDTH / 2);
            (gameInstance as any).ballY = brickToHit!.y + BRICK_HEIGHT -1; // Hit from bottom edge of brick
            (gameInstance as any).ballDY = -1 * (DEFAULT_BALL_SPEED_MULTIPLIER); // Moving upwards towards brick
            (gameInstance as any).ballDX = 0;


            simulateFrame();

            expect(bricks[brickC][brickR].status).toBe(0);
            expect((gameInstance as any).score).toBe(1);
            expect((gameInstance as any).ballDY).toBeGreaterThan(0); // Ball should bounce (reverse vertical direction)
        });
    });

    describe('Game State', () => {
        beforeEach(() => {
            gameInstance.start();
        });
        afterEach(() => {
            gameInstance.stop();
        });

        it('should set gameOver to true when lives run out', () => {
            (gameInstance as any).lives = 1;
            (gameInstance as any).ballY = CANVAS_HEIGHT - BALL_RADIUS + 1; // Ball goes off screen
            (gameInstance as any).ballDY = 2 * DEFAULT_BALL_SPEED_MULTIPLIER;

            simulateFrame(); // Ball misses paddle, life lost
            // The game over flag might be set in the next frame/update cycle in some game logic
            // simulateFrame(); // if needed

            expect((gameInstance as any).isGameOver).toBe(true);
        });

        it('should restart the game state when start() is called after game over', async () => {
            (gameInstance as any).isGameOver = true;
            (gameInstance as any).lives = 0;
            (gameInstance as any).score = 10;
            gameInstance.stop(); // Stop current processing

            // Mock fetch again for the restart
            (fetch as vi.Mock).mockResolvedValue({
                ok: true,
                json: async () => (mockDefaultVariation), // Or a different variation for restart
            });

            // Clear previous console log mocks for this specific check if needed, or use toHaveBeenCalledTimes
            vi.clearAllMocks(); // Clears fetch, console.log spies etc.
            getElementByIdMock.mockReturnValue(mockCanvas); // Reset this mock as clearAllMocks clears it

            // Re-spy on console.log as clearAllMocks would have removed the previous spy
            const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});


            gameInstance.start(); // Should trigger reset via fetchVariationAndInitialize

            await vi.waitFor(() => {
                expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Breakout game started.'));
            });

            expect((gameInstance as any).isGameOver).toBe(false);
            expect((gameInstance as any).lives).toBe(3); // Default lives
            expect((gameInstance as any).score).toBe(0); // Score reset
            consoleLogSpy.mockRestore(); // Restore console.log after test
        });

        it('should set gameOver to true (win) when all bricks are cleared', () => {
            (gameInstance as any).score = (gameInstance as any).BRICK_ROW_COUNT * (gameInstance as any).BRICK_COLUMN_COUNT -1;
            const bricks = (gameInstance as any).bricks as {x: number, y: number, status: number}[][];
            // Set all bricks to inactive except one
             for (let c = 0; c < (gameInstance as any).BRICK_COLUMN_COUNT; c++) {
                for (let r = 0; r < (gameInstance as any).BRICK_ROW_COUNT; r++) {
                    bricks[c][r].status = 0;
                     bricks[c][r].x = c * (BRICK_WIDTH + (gameInstance as any).BRICK_PADDING) + (gameInstance as any).BRICK_OFFSET_LEFT;
                    bricks[c][r].y = r * (BRICK_HEIGHT + (gameInstance as any).BRICK_PADDING) + (gameInstance as any).BRICK_OFFSET_TOP;
                }
            }
            const lastBrick = bricks[0][0];
            lastBrick.status = 1; // Last brick active

            // Position ball to hit the last brick
            (gameInstance as any).ballX = lastBrick.x + BRICK_WIDTH / 2;
            (gameInstance as any).ballY = lastBrick.y + BRICK_HEIGHT -1;
            (gameInstance as any).ballDY = -1 * DEFAULT_BALL_SPEED_MULTIPLIER;
            (gameInstance as any).ballDX = 0;

            simulateFrame(); // Hit the last brick

            expect((gameInstance as any).score).toBe((gameInstance as any).BRICK_ROW_COUNT * (gameInstance as any).BRICK_COLUMN_COUNT);
            expect((gameInstance as any).isGameOver).toBe(true); // Win condition
        });
    });
});
