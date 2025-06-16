import { Game } from "../../src/game";

// Importing seedrandom for deterministic food generation based on seed
import seedrandom from 'seedrandom';

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;
const GRID_SIZE = 20;
// Default colors, will be overridden by variation
let SNAKE_COLOR = "green";
let FOOD_COLOR = "red";

type Position = { x: number; y: number };

// Define a type for the variation data we expect for Snake
type SnakeVariation = {
    seed: string;
    speed: number;
    color: string;
    foodColor: string;
};

export class SnakeGame implements Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private snake: Position[];
    private food: Position;
    private direction: Position;
    private score: number;
    private gameInterval: number | undefined;
    private isGameOver: boolean;
    private gameSpeed: number; // ms per update
    private rng: seedrandom.PRNG; // For seeded random number generation

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d")!;
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;

        // Initialize with default values, will be updated by variation
        this.snake = [{ x: 10, y: 10 }];
        this.direction = { x: 1, y: 0 };
        this.score = 0;
        this.isGameOver = false;
        this.gameSpeed = 150; // Default speed
        this.rng = seedrandom(); // Default unseeded RNG
        this.food = this.generateFoodPosition(); // Generate initial food

        document.addEventListener("keydown", this.handleKeyPress.bind(this));
        this.fetchVariationAndInitialize();
    }

    private async fetchVariationAndInitialize(): Promise<void> {
        try {
            const response = await fetch('/api/variation/snake');
            if (!response.ok) {
                throw new Error(`Failed to fetch variation: ${response.statusText}`);
            }
            const variation = await response.json() as SnakeVariation;
            console.log("Received variation:", variation);

            // Apply variations
            this.rng = seedrandom(variation.seed); // Initialize RNG with seed
            this.gameSpeed = variation.speed;
            SNAKE_COLOR = variation.color; // Update global for draw method
            FOOD_COLOR = variation.foodColor; // Update global for draw method

            // Now that variation is loaded, reset/start the game with these settings
            this.resetGame();

        } catch (error) {
            console.error("Error fetching or applying variation:", error);
            // Fallback to default settings if variation fetch fails
            this.resetGame();
        }
    }

    private resetGame(): void {
        this.isGameOver = false;
        this.snake = [{ x: Math.floor(this.rng() * (CANVAS_WIDTH / GRID_SIZE)), y: Math.floor(this.rng() * (CANVAS_HEIGHT / GRID_SIZE))}];
        this.direction = { x: 1, y: 0 };
        this.score = 0;
        this.food = this.generateFoodPosition(); // Use seeded RNG
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
        }
        this.gameInterval = window.setInterval(() => this.gameLoop(), this.gameSpeed);
        console.log(`Snake game started with speed ${this.gameSpeed}ms, snake color ${SNAKE_COLOR}, food color ${FOOD_COLOR}`);
    }

    start(): void {
        // The game now starts after fetching variation in constructor or via Enter key after game over
        // If called directly, ensure variation is loaded or use defaults
        if (!this.rng) { // If RNG not initialized, means variation fetch is pending or failed
            console.log("Variation not yet loaded, using default settings to start.");
            this.rng = seedrandom(); // Ensure RNG is initialized
        }
        this.resetGame();
    }

    stop(): void {
        if (this.gameInterval) {
            clearInterval(this.gameInterval);
            this.gameInterval = undefined;
        }
        console.log("Snake game stopped");
    }

    update(): void {
        if (this.isGameOver) return;

        const head = { ...this.snake[0] };
        head.x += this.direction.x;
        head.y += this.direction.y;

        // Check for wall collision
        if (head.x < 0 || head.x >= CANVAS_WIDTH / GRID_SIZE || head.y < 0 || head.y >= CANVAS_HEIGHT / GRID_SIZE) {
            this.gameOver();
            return;
        }

        // Check for self-collision
        for (let i = 1; i < this.snake.length; i++) {
            if (head.x === this.snake[i].x && head.y === this.snake[i].y) {
                this.gameOver();
                return;
            }
        }

        this.snake.unshift(head); // Add new head

        // Check for food consumption
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score++;
            this.food = this.generateFoodPosition();
        } else {
            this.snake.pop(); // Remove tail if no food eaten
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        // Clear canvas
        ctx.fillStyle = "#f0f0f0"; // Background color from main style.css
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        // Draw snake
        ctx.fillStyle = SNAKE_COLOR;
        this.snake.forEach(segment => {
            ctx.fillRect(segment.x * GRID_SIZE, segment.y * GRID_SIZE, GRID_SIZE, GRID_SIZE);
        });

        // Draw food
        ctx.fillStyle = FOOD_COLOR;
        ctx.fillRect(this.food.x * GRID_SIZE, this.food.y * GRID_SIZE, GRID_SIZE, GRID_SIZE);

        // Draw score
        ctx.fillStyle = "black";
        ctx.font = "20px Arial";
        ctx.fillText("Score: " + this.score, 10, 25);

        if (this.isGameOver) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            ctx.fillStyle = "white";
            ctx.font = "30px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Game Over!", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
            ctx.font = "20px Arial";
            ctx.fillText("Press 'Enter' to Restart", CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
            ctx.textAlign = "left"; // Reset alignment
        }
    }

    private gameLoop(): void {
        this.update();
        this.draw(this.ctx);
    }

    private generateFoodPosition(): Position {
        let newFoodPosition: Position;
        // Use the seeded RNG for food placement
        do {
            newFoodPosition = {
                x: Math.floor(this.rng() * (CANVAS_WIDTH / GRID_SIZE)),
                y: Math.floor(this.rng() * (CANVAS_HEIGHT / GRID_SIZE))
            };
        } while (this.isPositionOnSnake(newFoodPosition));
        return newFoodPosition;
    }

    private isPositionOnSnake(position: Position): boolean {
        return this.snake.some(segment => segment.x === position.x && segment.y === position.y);
    }

    private handleKeyPress(event: KeyboardEvent): void {
        const keyPressed = event.key;

        if (this.isGameOver) {
            if (keyPressed === 'Enter') {
                this.fetchVariationAndInitialize(); // Re-fetch variation and restart
            }
            return;
        }

        switch (keyPressed) {
            case "ArrowUp":
                if (this.direction.y === 0) { // Prevent moving directly opposite
                    this.direction = { x: 0, y: -1 };
                }
                break;
            case "ArrowDown":
                if (this.direction.y === 0) {
                    this.direction = { x: 0, y: 1 };
                }
                break;
            case "ArrowLeft":
                if (this.direction.x === 0) {
                    this.direction = { x: -1, y: 0 };
                }
                break;
            case "ArrowRight":
                if (this.direction.x === 0) {
                    this.direction = { x: 1, y: 0 };
                }
                break;
        }
    }

    private gameOver(): void {
        this.isGameOver = true;
        if (this.gameInterval) {
            // Keep interval running to display game over message and listen for restart
        }
        console.log("Game Over. Score: " + this.score);
        // The draw method will handle displaying the "Game Over" message
    }
}
