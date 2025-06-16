import { Game } from '../../src/game'; // Adjust path as needed
import seedrandom from 'seedrandom';

// Constants for canvas and game elements
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 400;

// Paddle properties
let PADDLE_WIDTH = 75; // Default, will be updated by variation
const PADDLE_HEIGHT = 10;
const PADDLE_Y_OFFSET = 30; // Distance from bottom

// Ball properties
const BALL_RADIUS = 8;
let BALL_SPEED_MULTIPLIER = 1; // Default, will be updated by variation

// Brick properties
const BRICK_ROW_COUNT = 5;
const BRICK_COLUMN_COUNT = 7;
const BRICK_WIDTH = 50;
const BRICK_HEIGHT = 15;
const BRICK_PADDING = 5;
const BRICK_OFFSET_TOP = 30;
const BRICK_OFFSET_LEFT = 30;

type Brick = {
    x: number;
    y: number;
    status: number; // 1 for active, 0 for destroyed
};

type BreakoutVariation = {
    seed: string;
    paddleSize: 'small' | 'medium' | 'large';
    ballSpeed: 'slow' | 'normal' | 'fast';
    // Potentially add brick layout or color variations later
};

export class BreakoutGame implements Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;
    private rng: seedrandom.PRNG;

    // Game elements
    private paddleX: number;
    private ballX: number;
    private ballY: number;
    private ballDX: number;
    private ballDY: number;
    private bricks: Brick[][];

    // Game state
    private score: number;
    private lives: number;
    private isGameOver: boolean;
    private animationFrameId?: number;

    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!this.canvas) {
            throw new Error(`Canvas with id '${canvasId}' not found.`);
        }
        this.ctx = this.canvas.getContext('2d')!;
        if (!this.ctx) {
            throw new Error('Failed to get 2D rendering context.');
        }

        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;

        this.rng = seedrandom(); // Initialize with a default seed

        this.paddleX = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
        this.ballX = CANVAS_WIDTH / 2;
        this.ballY = CANVAS_HEIGHT - PADDLE_Y_OFFSET - PADDLE_HEIGHT - BALL_RADIUS - 5; // Start above paddle
        this.ballDX = 2; // Initial speed
        this.ballDY = -2; // Initial speed
        this.bricks = [];
        this.score = 0;
        this.lives = 3;
        this.isGameOver = false;

        this.setupMouseControls();
        this.fetchVariationAndInitialize();
    }

    private async fetchVariationAndInitialize(): Promise<void> {
        try {
            const response = await fetch('/api/variation/breakout');
            if (!response.ok) {
                throw new Error(`Failed to fetch variation: ${response.statusText}`);
            }
            const variation = await response.json() as BreakoutVariation;
            console.log('Received Breakout variation:', variation);

            this.rng = seedrandom(variation.seed);

            // Apply paddle size variation
            switch (variation.paddleSize) {
                case 'small': PADDLE_WIDTH = 50; break;
                case 'medium': PADDLE_WIDTH = 75; break;
                case 'large': PADDLE_WIDTH = 100; break;
            }
            this.paddleX = (CANVAS_WIDTH - PADDLE_WIDTH) / 2; // Recenter paddle

            // Apply ball speed variation
            switch (variation.ballSpeed) {
                case 'slow': BALL_SPEED_MULTIPLIER = 0.75; break;
                case 'normal': BALL_SPEED_MULTIPLIER = 1; break;
                case 'fast': BALL_SPEED_MULTIPLIER = 1.5; break;
            }
            // Adjust initial speed based on multiplier, maintaining direction
            this.ballDX = (this.ballDX > 0 ? 2 : -2) * BALL_SPEED_MULTIPLIER;
            this.ballDY = (this.ballDY > 0 ? 2 : -2) * BALL_SPEED_MULTIPLIER;


        } catch (error) {
            console.error('Error fetching or applying Breakout variation:', error);
            // Fallback to default settings if variation fetch fails
            // PADDLE_WIDTH and BALL_SPEED_MULTIPLIER will retain their initial default values
        } finally {
            this.resetGame(); // Initialize bricks and start game after variation is (or isn't) applied
        }
    }

    private setupMouseControls(): void {
        document.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const relativeX = e.clientX - rect.left;
            if (relativeX > 0 && relativeX < CANVAS_WIDTH) {
                this.paddleX = Math.min(Math.max(relativeX - PADDLE_WIDTH / 2, 0), CANVAS_WIDTH - PADDLE_WIDTH);
            }
        });
    }

    private initializeBricks(): void {
        this.bricks = [];
        for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
            this.bricks[c] = [];
            for (let r = 0; r < BRICK_ROW_COUNT; r++) {
                this.bricks[c][r] = { x: 0, y: 0, status: 1 };
            }
        }
    }

    private resetGame(): void {
        this.isGameOver = false;
        this.score = 0;
        this.lives = 3;
        this.ballX = CANVAS_WIDTH / 2;
        this.ballY = CANVAS_HEIGHT - PADDLE_Y_OFFSET - PADDLE_HEIGHT - BALL_RADIUS - 5;
        // Reset ball speed and direction (could be randomized with seed later)
        this.ballDX = 2 * BALL_SPEED_MULTIPLIER * (this.rng() > 0.5 ? 1 : -1); // Random initial horizontal direction
        this.ballDY = -2 * BALL_SPEED_MULTIPLIER;
        this.paddleX = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
        this.initializeBricks();

        // Restart game loop if it was stopped
        if (!this.animationFrameId) {
            this.gameLoop();
        }
        console.log(`Breakout game started. Paddle: ${PADDLE_WIDTH}, Speed mult: ${BALL_SPEED_MULTIPLIER}`);
    }

    start(): void {
        if (this.isGameOver) { // Only reset if game was over
             this.fetchVariationAndInitialize(); // Re-fetch and re-initialize
        } else if (!this.animationFrameId) { // Or if not started yet
            // If fetchVariationAndInitialize was already called in constructor, resetGame would have started the loop.
            // This ensures that if start() is called manually before constructor's async part finishes, it still tries to start.
            // However, the design intends for the game to auto-start after variation fetch.
            // This explicit call might be redundant if constructor always completes fetch & calls resetGame.
            this.gameLoop();
        }
    }

    stop(): void {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = undefined;
        }
        // Remove event listener for restart to prevent issues if stop is called, then game over happens.
        this.canvas.removeEventListener('click', this.handleRestartClick);
        console.log('Breakout game stopped.');
    }

    private collisionDetection(): void {
        // Ball with bricks
        for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
            for (let r = 0; r < BRICK_ROW_COUNT; r++) {
                const b = this.bricks[c][r];
                if (b.status === 1) {
                    if (
                        this.ballX + BALL_RADIUS > b.x &&
                        this.ballX - BALL_RADIUS < b.x + BRICK_WIDTH &&
                        this.ballY + BALL_RADIUS > b.y &&
                        this.ballY - BALL_RADIUS < b.y + BRICK_HEIGHT
                    ) {
                        this.ballDY = -this.ballDY; // Reverse ball's vertical direction
                        b.status = 0; // Destroy brick
                        this.score++;
                        if (this.score === BRICK_ROW_COUNT * BRICK_COLUMN_COUNT) {
                            this.isGameOver = true;
                            // No alert here, gameLoop will handle drawing win/loss state
                        }
                    }
                }
            }
        }

        // Ball with walls
        if (this.ballX + this.ballDX > CANVAS_WIDTH - BALL_RADIUS || this.ballX + this.ballDX < BALL_RADIUS) {
            this.ballDX = -this.ballDX; // Bounce off left/right
        }
        if (this.ballY + this.ballDY < BALL_RADIUS) {
            this.ballDY = -this.ballDY; // Bounce off top
        } else if (this.ballY + this.ballDY > CANVAS_HEIGHT - BALL_RADIUS) { // Ball is at the bottom edge
            // Check for paddle collision more accurately
            // The ball's center (ballY) is compared against the paddle's top surface
            if (this.ballY + this.ballDY > CANVAS_HEIGHT - PADDLE_HEIGHT - PADDLE_Y_OFFSET - BALL_RADIUS && // Ball is above paddle bottom
                this.ballY + this.ballDY < CANVAS_HEIGHT - PADDLE_Y_OFFSET + BALL_RADIUS && // Ball is below paddle top (allowing for some overlap)
                this.ballX > this.paddleX &&
                this.ballX < this.paddleX + PADDLE_WIDTH) {
                 this.ballDY = -this.ballDY;
                 // Optional: Add angle change based on where it hits the paddle
                 // For example, make the ball bounce more to the side if it hits the edge of the paddle
                 let deltaX = this.ballX - (this.paddleX + PADDLE_WIDTH / 2);
                 this.ballDX = deltaX * 0.15; // Adjust multiplier for desired effect
            } else {
                // Ball missed paddle and went below the canvas
                this.lives--;
                if (this.lives <= 0) {
                    this.isGameOver = true;
                } else {
                    // Reset ball position and paddle
                    this.ballX = CANVAS_WIDTH / 2;
                    this.ballY = CANVAS_HEIGHT - PADDLE_Y_OFFSET - PADDLE_HEIGHT - BALL_RADIUS - 5;
                    this.ballDX = 2 * BALL_SPEED_MULTIPLIER * (this.rng() > 0.5 ? 1 : -1);
                    this.ballDY = -2 * BALL_SPEED_MULTIPLIER;
                    this.paddleX = (CANVAS_WIDTH - PADDLE_WIDTH) / 2;
                }
            }
        }
    }

    update(): void {
        if (this.isGameOver) {
            return;
        }

        this.collisionDetection();

        this.ballX += this.ballDX;
        this.ballY += this.ballDY;
    }

    private drawPaddle(): void {
        this.ctx.beginPath();
        this.ctx.rect(this.paddleX, CANVAS_HEIGHT - PADDLE_HEIGHT - PADDLE_Y_OFFSET, PADDLE_WIDTH, PADDLE_HEIGHT);
        this.ctx.fillStyle = '#0095DD'; // Paddle color
        this.ctx.fill();
        this.ctx.closePath();
    }

    private drawBall(): void {
        this.ctx.beginPath();
        this.ctx.arc(this.ballX, this.ballY, BALL_RADIUS, 0, Math.PI * 2);
        this.ctx.fillStyle = '#0095DD'; // Ball color
        this.ctx.fill();
        this.ctx.closePath();
    }

    private drawBricks(): void {
        for (let c = 0; c < BRICK_COLUMN_COUNT; c++) {
            for (let r = 0; r < BRICK_ROW_COUNT; r++) {
                if (this.bricks[c][r].status === 1) {
                    const brickX = c * (BRICK_WIDTH + BRICK_PADDING) + BRICK_OFFSET_LEFT;
                    const brickY = r * (BRICK_HEIGHT + BRICK_PADDING) + BRICK_OFFSET_TOP;
                    this.bricks[c][r].x = brickX;
                    this.bricks[c][r].y = brickY;
                    this.ctx.beginPath();
                    this.ctx.rect(brickX, brickY, BRICK_WIDTH, BRICK_HEIGHT);
                    this.ctx.fillStyle = '#AA4A44'; // Brick color
                    this.ctx.fill();
                    this.ctx.closePath();
                }
            }
        }
    }

    private drawScore(): void {
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#000';
        this.ctx.fillText('Score: ' + this.score, 8, 20);
    }

    private drawLives(): void {
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = '#000';
        this.ctx.fillText('Lives: ' + this.lives, CANVAS_WIDTH - 65, 20);
    }

    private drawEndGameMessage(): void {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        this.ctx.font = '48px Arial';
        this.ctx.fillStyle = 'white';
        this.ctx.textAlign = 'center';

        if (this.score === BRICK_ROW_COUNT * BRICK_COLUMN_COUNT) {
            this.ctx.fillText('YOU WIN!', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        } else {
            this.ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);
        }

        this.ctx.font = '24px Arial';
        this.ctx.fillText(`Final Score: ${this.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

        this.ctx.font = '20px Arial';
        this.ctx.fillText('Click to Restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
        this.ctx.textAlign = 'left'; // Reset alignment
    }


    draw(): void {
        this.ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); // Clear canvas
        this.drawBricks();
        this.drawBall();
        this.drawPaddle();
        this.drawScore();
        this.drawLives();

        if (this.isGameOver) {
            this.drawEndGameMessage();
        }
    }

    private gameLoop = (): void => { // Use arrow function to bind 'this'
        if (!this.isGameOver) {
            this.update();
            this.draw();
            this.animationFrameId = requestAnimationFrame(this.gameLoop);
        } else {
            this.draw(); // Draw one last time to show game over screen
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = undefined;
            }
            // Listen for click to restart
            this.canvas.addEventListener('click', this.handleRestartClick, { once: true });
        }
    }

    private handleRestartClick = (): void => {
        if (this.isGameOver) {
            console.log("Restarting game...");
            // Stop listening to further clicks until next game over
            this.canvas.removeEventListener('click', this.handleRestartClick);
            this.fetchVariationAndInitialize(); // This will call resetGame and start the loop
        }
    }
}

// Optional: If you want to make it runnable standalone for testing:
// window.addEventListener('DOMContentLoaded', () => {
//     const game = new BreakoutGame('game-canvas'); // Ensure you have a canvas with id 'game-canvas' in your HTML
//     // game.start(); // Game auto-starts after variation fetch.
// });
