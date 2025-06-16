import { describe, test, expect, beforeEach, afterEach, vi, SpyInstance } from 'vitest';
import { SnakeGame } from './index'; // Assuming SnakeGame is exported
import seedrandom from 'seedrandom'; // Import to allow spying on its default export if needed

// It's better to mock the module 'seedrandom'
vi.mock('seedrandom', () => {
  // Mock the default export
  return {
    default: vi.fn().mockImplementation(() => mockRngInstance)
  };
});


// Mock canvas and context
const mockCtx = {
  fillRect: vi.fn(),
  fillText: vi.fn(),
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  closePath: vi.fn(),
  measureText: vi.fn(() => ({ width: 50 })), // Mock measureText
  textAlign: '', // Add property
  font: '', // Add property
};

const mockCanvas = {
  getContext: vi.fn(() => mockCtx as any), // Use 'as any' to bypass strict type checking for mocks
  width: 400,
  height: 400,
};

// Global mocks
let mockFetch: SpyInstance;
// let mockSeedrandomGlobal: SpyInstance; // This was the original plan, but module mock is better
const mockRngInstance = vi.fn(); // This will be the function returned by seedrandom(seed)

// Game constants - might be needed for assertions
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const GRID_SIZE = 20;


beforeEach(() => {
  vi.stubGlobal('document', {
    getElementById: vi.fn().mockReturnValue(mockCanvas),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });

  // Clear mock history
  mockCtx.fillRect.mockClear();
  mockCtx.fillText.mockClear();
  mockCtx.clearRect.mockClear();
  mockCanvas.getContext.mockClear();
  (document.getElementById as vi.Mock).mockClear();
  (document.addEventListener as vi.Mock).mockClear();


  mockFetch = vi.spyOn(global, 'fetch');

  // Configure the mockRngInstance returned by the mocked seedrandom
  // The mock for seedrandom itself is done via vi.mock at the top of the file
  mockRngInstance.mockReturnValue(0.5); // Default RNG behavior for tests

  vi.useFakeTimers();
});

afterEach(() => {
  vi.restoreAllMocks(); // This will also clear spies and reset vi.mock if configured
  vi.clearAllTimers();
  vi.useRealTimers();
});

describe('SnakeGame', () => {
  const defaultVariation = {
    seed: 'test-seed',
    speed: 150,
    color: 'green',
    foodColor: 'red',
  };

  const mockCanvasId = 'snake-canvas';

  describe('Initialization and Variation Application', () => {
    test('should fetch variations on construction and apply them', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => defaultVariation,
      } as Response);

      const game = new SnakeGame(mockCanvasId);

      // Wait for async operations in constructor (fetchVariationAndInitialize)
      await vi.runAllTimersAsync(); // Process timers and microtasks

      expect(mockFetch).toHaveBeenCalledWith('/api/variation/snake');
      // @ts-ignore: Access private member for test
      expect(game.gameSpeed).toBe(defaultVariation.speed);
      // @ts-ignore: Access private member for test
      // expect(SNAKE_COLOR).toBe(defaultVariation.color); // SNAKE_COLOR is module level, need different check
      // @ts-ignore: Access private member for test
      // expect(FOOD_COLOR).toBe(defaultVariation.foodColor); // FOOD_COLOR is module level

      // Check if rng is seeded
      // @ts-ignore seedrandom is mocked
      expect(seedrandom.default).toHaveBeenCalledWith(defaultVariation.seed);
      // @ts-ignore: Access private member for test
      expect(game.rng).toBe(mockRngInstance);

      // Check if resetGame was called (e.g. by checking if snake/food are initialized)
      // @ts-ignore: Access private member for test
      expect(game.snake.length).toBe(1);
    });

    test('should fallback to default settings if API call fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('API Failure'));

      const game = new SnakeGame(mockCanvasId);
      await vi.runAllTimersAsync();

      expect(mockFetch).toHaveBeenCalledWith('/api/variation/snake');
      // @ts-ignore: Access private member for test
      expect(game.gameSpeed).toBe(150); // Default speed

      // Check if rng is initialized with a default seed (or no seed)
      // @ts-ignore seedrandom is mocked
      expect(seedrandom.default).toHaveBeenCalled(); // Called at least once for default init
      // @ts-ignore: Access private member for test
      expect(game.rng).toBeDefined(); // Should still be initialized

      // Check if resetGame was called
      // @ts-ignore: Access private member for test
      expect(game.snake.length).toBe(1);
    });

    test('resetGame correctly initializes snake and food positions using rng', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => defaultVariation,
      } as Response);

      // Specific RNG values for this test
      const mockSpecificRng = vi.fn()
        .mockReturnValueOnce(0.1) // snake x
        .mockReturnValueOnce(0.2) // snake y
        .mockReturnValueOnce(0.3) // food x
        .mockReturnValueOnce(0.4); // food y
      // @ts-ignore seedrandom is mocked
      (seedrandom.default as vi.Mock).mockReturnValue(mockSpecificRng);

      const game = new SnakeGame(mockCanvasId);
      await vi.runAllTimersAsync(); // Let fetchVariationAndInitialize complete

      // @ts-ignore: Access private member for test
      const snakeInitialX = Math.floor(0.1 * (CANVAS_WIDTH / GRID_SIZE));
      // @ts-ignore: Access private member for test
      const snakeInitialY = Math.floor(0.2 * (CANVAS_HEIGHT / GRID_SIZE));
      // @ts-ignore: Access private member for test
      expect(game.snake[0]).toEqual({ x: snakeInitialX, y: snakeInitialY });

      // @ts-ignore: Access private member for test
      const foodInitialX = Math.floor(0.3 * (CANVAS_WIDTH / GRID_SIZE));
      // @ts-ignore: Access private member for test
      const foodInitialY = Math.floor(0.4 * (CANVAS_HEIGHT / GRID_SIZE));
      // @ts-ignore: Access private member for test
      expect(game.food).toEqual({ x: foodInitialX, y: foodInitialY });
    });
  });

  describe('Game Logic', () => {
    let game: SnakeGame;

    beforeEach(async () => {
      // Setup game instance for each logic test
      mockFetch.mockResolvedValue({ // Use mockResolvedValue for repeated calls if necessary
        ok: true,
        json: async () => defaultVariation,
      } as Response);
      game = new SnakeGame(mockCanvasId);
      await vi.runAllTimersAsync(); // Ensure initialization is complete
      // @ts-ignore Access private member
      game.isGameOver = false; // Ensure game is not over for logic tests
    });

    test('handleKeyPress updates direction correctly and prevents reversing', () => {
      // Initial direction is {x: 1, y: 0} (Right)
      // @ts-ignore Access private member
      game.direction = { x: 1, y: 0 };

      // @ts-ignore Access private member
      game.handleKeyPress({ key: 'ArrowUp' } as KeyboardEvent);
      // @ts-ignore Access private member
      expect(game.direction).toEqual({ x: 0, y: -1 });

      // @ts-ignore Access private member
      game.handleKeyPress({ key: 'ArrowDown' } as KeyboardEvent); // Try to reverse
      // @ts-ignore Access private member
      expect(game.direction).toEqual({ x: 0, y: -1 }); // Should not change

      // @ts-ignore Access private member
      game.handleKeyPress({ key: 'ArrowLeft' } as KeyboardEvent);
      // @ts-ignore Access private member
      expect(game.direction).toEqual({ x: -1, y: 0 });

      // @ts-ignore Access private member
      game.handleKeyPress({ key: 'ArrowRight' } as KeyboardEvent); // Try to reverse
      // @ts-ignore Access private member
      expect(game.direction).toEqual({ x: -1, y: 0 }); // Should not change
    });

    test('snake moves in the set direction during update', () => {
      // @ts-ignore Access private member
      game.snake = [{ x: 10, y: 10 }];
      // @ts-ignore Access private member
      game.direction = { x: 0, y: -1 }; // Up

      game.update();
      // @ts-ignore Access private member
      expect(game.snake[0]).toEqual({ x: 10, y: 9 });
    });

    test('food consumption increments score, grows snake, generates new food', () => {
      // @ts-ignore Access private member
      game.snake = [{ x: 5, y: 5 }];
      // @ts-ignore Access private member
      game.food = { x: 6, y: 5 }; // Food ahead
      // @ts-ignore Access private member
      game.direction = { x: 1, y: 0 }; // Moving right
      // @ts-ignore Access private member
      const initialScore = game.score;
      // @ts-ignore Access private member
      const initialLength = game.snake.length;

      // Mock RNG for predictable new food position
      const mockNewFoodRng = vi.fn()
        .mockReturnValueOnce(0.7) // new food x
        .mockReturnValueOnce(0.8); // new food y
      // @ts-ignore seedrandom is mocked
      (seedrandom.default as vi.Mock).mockReturnValue(mockNewFoodRng);
      // @ts-ignore Access private member (re-initialize rng for generateFoodPosition)
      game.rng = mockNewFoodRng;


      game.update();

      // @ts-ignore Access private member
      expect(game.score).toBe(initialScore + 1);
      // @ts-ignore Access private member
      expect(game.snake.length).toBe(initialLength + 1);
      // @ts-ignore Access private member
      expect(game.snake[0]).toEqual({ x: 6, y: 5 }); // New head at food pos

      const newFoodX = Math.floor(0.7 * (CANVAS_WIDTH / GRID_SIZE));
      const newFoodY = Math.floor(0.8 * (CANVAS_HEIGHT / GRID_SIZE));
      // @ts-ignore Access private member
      expect(game.food).toEqual({ x: newFoodX, y: newFoodY });
    });

    test('no food consumption: snake moves but does not grow', () => {
      // @ts-ignore Access private member
      game.snake = [{ x: 5, y: 5 }, {x: 4, y: 5}];
      // @ts-ignore Access private member
      game.food = { x: 10, y: 10 }; // Food far away
      // @ts-ignore Access private member
      game.direction = { x: 1, y: 0 }; // Moving right
      // @ts-ignore Access private member
      const initialScore = game.score;
      // @ts-ignore Access private member
      const initialLength = game.snake.length;

      game.update();
      // @ts-ignore Access private member
      expect(game.score).toBe(initialScore);
      // @ts-ignore Access private member
      expect(game.snake.length).toBe(initialLength); // Length should not change
      // @ts-ignore Access private member
      expect(game.snake[0]).toEqual({ x: 6, y: 5 }); // New head
      // @ts-ignore Access private member
      expect(game.snake[game.snake.length -1]).toEqual({x: 5, y: 5}); // Tail should have moved
    });

    test('wall collision ends game (right wall)', () => {
      // @ts-ignore Access private member
      game.snake = [{ x: (CANVAS_WIDTH / GRID_SIZE) - 1, y: 10 }];
      // @ts-ignore Access private member
      game.direction = { x: 1, y: 0 }; // Moving right

      game.update();
      // @ts-ignore Access private member
      expect(game.isGameOver).toBe(true);
    });

    test('wall collision ends game (left wall)', () => {
      // @ts-ignore Access private member
      game.snake = [{ x: 0, y: 10 }];
      // @ts-ignore Access private member
      game.direction = { x: -1, y: 0 }; // Moving left

      game.update();
      // @ts-ignore Access private member
      expect(game.isGameOver).toBe(true);
    });

    test('wall collision ends game (top wall)', () => {
      // @ts-ignore Access private member
      game.snake = [{ x: 10, y: 0 }];
      // @ts-ignore Access private member
      game.direction = { x: 0, y: -1 }; // Moving up

      game.update();
      // @ts-ignore Access private member
      expect(game.isGameOver).toBe(true);
    });

    test('wall collision ends game (bottom wall)', () => {
      // @ts-ignore Access private member
      game.snake = [{ x: 10, y: (CANVAS_HEIGHT / GRID_SIZE) - 1 }];
      // @ts-ignore Access private member
      game.direction = { x: 0, y: 1 }; // Moving down

      game.update();
      // @ts-ignore Access private member
      expect(game.isGameOver).toBe(true);
    });

    test('self collision ends game', () => {
      // @ts-ignore Access private member
      game.snake = [
        { x: 5, y: 5 }, { x: 6, y: 5 }, { x: 7, y: 5 }, { x: 8, y: 5 }
      ];
      // @ts-ignore Access private member
      game.direction = { x: -1, y: 0 }; // Moving left towards its own body (5,5 -> 6,5)
      // @ts-ignore Access private member
      game.snake.unshift({ x: 6, y: 5 }); // Manually put snake head on a body part for next move

      game.update(); // Head will move to (5,5) which is already part of snake
      // @ts-ignore Access private member
      expect(game.isGameOver).toBe(true);
    });

    test('input is ignored when gameOver (except Enter)', () => {
      // @ts-ignore Access private member
      game.isGameOver = true;
      // @ts-ignore Access private member
      game.direction = { x: 1, y: 0 };

      // @ts-ignore Access private member
      game.handleKeyPress({ key: 'ArrowUp' } as KeyboardEvent);
      // @ts-ignore Access private member
      expect(game.direction).toEqual({ x: 1, y: 0 }); // Direction should not change
    });

    test('pressing Enter after game over calls fetchVariationAndInitialize', async () => {
      // @ts-ignore Access private member
      game.isGameOver = true;
      mockFetch.mockClear(); // Clear previous fetch calls
      mockFetch.mockResolvedValueOnce({ // Mock for the new fetch call
        ok: true,
        json: async () => ({ ...defaultVariation, seed: 'new-seed' }), // new variation
      } as Response);

      // @ts-ignore spy on private method
      const fetchSpy = vi.spyOn(game, 'fetchVariationAndInitialize');

      // @ts-ignore Access private member
      game.handleKeyPress({ key: 'Enter' } as KeyboardEvent);

      expect(fetchSpy).toHaveBeenCalled();
      await vi.runAllTimersAsync(); // Allow async fetch and re-init to complete
      // @ts-ignore seedrandom is mocked
      expect(seedrandom.default).toHaveBeenCalledWith('new-seed');
    });
  });

  describe('Drawing', () => {
    test('draw method calls canvas context methods and does not throw', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => defaultVariation,
      } as Response);
      const game = new SnakeGame(mockCanvasId);
      await vi.runAllTimersAsync();

      expect(() => game.draw(mockCtx as any)).not.toThrow();
      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      expect(mockCtx.fillRect).toHaveBeenCalled(); // For snake and food
      expect(mockCtx.fillText).toHaveBeenCalled(); // For score
    });

    test('draw method displays game over message when isGameOver is true', async () => {
       mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => defaultVariation,
      } as Response);
      const game = new SnakeGame(mockCanvasId);
      await vi.runAllTimersAsync();

      // @ts-ignore Access private member
      game.isGameOver = true;
      game.draw(mockCtx as any);

      expect(mockCtx.fillText).toHaveBeenCalledWith("Game Over!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
      expect(mockCtx.fillText).toHaveBeenCalledWith("Press 'Enter' to Restart", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    });
  });
});
