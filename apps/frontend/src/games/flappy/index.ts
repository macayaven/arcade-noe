// Define the interface for variation data
interface FlappyVariation {
    seed: string;
    ruleSet?: { // ruleSet itself is optional
        gravity?: number;
        gap?: number;
    };
    theme?: any; // theme is not used in this subtask but part of the interface
}

// Function to fetch variation data
async function fetchFlappyVariation(): Promise<FlappyVariation | null> {
    try {
        const response = await fetch('/api/variation/flappy');
        if (!response.ok) {
            console.error(`Error fetching variation: ${response.status} ${response.statusText}`);
            return null;
        }
        const variationData = await response.json();
        // Basic validation, can be more thorough
        if (variationData && typeof variationData.seed === 'string') {
            return variationData as FlappyVariation;
        } else {
            console.error('Fetched variation data is not in expected format:', variationData);
            return null;
        }
    } catch (error) {
        console.error('Failed to fetch or parse flappy variation:', error);
        return null;
    }
}

class Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    private birdX = 50;
    private birdY = 150;
    private birdWidth = 20;
    private birdHeight = 20;
    private birdVelocityY = 0;
    private readonly defaultGravity = 0.2;
    private currentGravity: number;
    private flapStrength = 5; // How much the bird flaps upwards

    // Obstacle properties
    private obstacles: { x: number, topPipeHeight: number, passed: boolean }[] = [];
    private obstacleWidth = 50;
    private readonly defaultObstacleGap = 150;
    private currentGap: number;
    private obstacleInterval = 180; // Frames between new obstacles (e.g., 3 seconds at 60fps)
    private obstacleSpeed = 2; // How fast obstacles move to the left
    private framesSinceLastObstacle = 0;
    private minPipeHeight = 40; // Minimum height of the top pipe

    // Game state
    private score = 0;
    private gameOver = false;

    constructor(canvasId: string = 'game-canvas', variationRuleSet?: FlappyVariation['ruleSet']) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        if (!this.canvas) {
            throw new Error(`Canvas with id "${canvasId}" not found.`);
        }
        this.ctx = this.canvas.getContext('2d')!;
        if (!this.ctx) {
            throw new Error('Failed to get 2D rendering context.');
        }

        // Initialize gravity and gap with defaults or fetched values
        this.currentGravity = variationRuleSet?.gravity ?? this.defaultGravity;
        this.currentGap = variationRuleSet?.gap ?? this.defaultObstacleGap;

        // Log applied variations
        console.log(`Game started with Gravity: ${this.currentGravity}, Gap: ${this.currentGap}`);

        this.init();
    }

    private resetGame() {
        this.birdY = 150;
        this.birdVelocityY = 0;
        this.obstacles = [];
        this.score = 0;
        this.gameOver = false;
        this.framesSinceLastObstacle = this.obstacleInterval; // Generate first obstacle relatively soon
    }

    private init() {
        this.resetGame(); // Initialize game state

        // Add event listeners
        // Ensure listeners are only added once, or manage removal if init can be called multiple times
        // For this example, assuming init is called once per Game instance.
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                if (this.gameOver) {
                    this.resetGame();
                } else {
                    this.flap();
                }
            }
        });
        this.canvas.addEventListener('click', () => {
            if (this.gameOver) {
                this.resetGame();
            } else {
                this.flap();
            }
        });

        // Start the game loop
        this.gameLoop();
    }

    private flap() {
        if (this.gameOver) return; // Don't flap if game is over
        this.birdVelocityY = -this.flapStrength;
    }

    private generateObstacle() {
        const maxTopPipeHeight = this.canvas.height - this.currentGap - this.minPipeHeight;
        const topPipeHeight = Math.random() * (maxTopPipeHeight - this.minPipeHeight) + this.minPipeHeight;

        this.obstacles.push({
            x: this.canvas.width,
            topPipeHeight: topPipeHeight,
            passed: false, // Initialize passed status
        });
    }

    private drawBird() {
        this.ctx.fillStyle = 'blue'; // Bird color
        this.ctx.fillRect(this.birdX, this.birdY, this.birdWidth, this.birdHeight);
    }

    private drawObstacles() {
        this.ctx.fillStyle = 'green'; // Obstacle color
        for (const obstacle of this.obstacles) {
            // Draw top pipe
            this.ctx.fillRect(obstacle.x, 0, this.obstacleWidth, obstacle.topPipeHeight);
            // Draw bottom pipe
            const bottomPipeY = obstacle.topPipeHeight + this.currentGap;
            const bottomPipeHeight = this.canvas.height - bottomPipeY;
            this.ctx.fillRect(obstacle.x, bottomPipeY, this.obstacleWidth, bottomPipeHeight);
        }
    }

    private checkCollisions() {
        // Bottom boundary collision
        if (this.birdY + this.birdHeight >= this.canvas.height) {
            this.gameOver = true;
            return;
        }
        // Top boundary collision (already handled by preventing movement, but could be a game over too)
        // if (this.birdY < 0) { this.gameOver = true; return; }


        for (const obstacle of this.obstacles) {
            const birdLeft = this.birdX;
            const birdRight = this.birdX + this.birdWidth;
            const birdTop = this.birdY;
            const birdBottom = this.birdY + this.birdHeight;

            const obsLeft = obstacle.x;
            const obsRight = obstacle.x + this.obstacleWidth;

            // Top pipe
            const topPipeTop = 0;
            const topPipeBottom = obstacle.topPipeHeight;
            // Lower pipe
            const bottomPipeTop = obstacle.topPipeHeight + this.currentGap;
            const bottomPipeBottom = this.canvas.height;

            // Check collision with top pipe
            if (birdRight > obsLeft && birdLeft < obsRight && birdTop < topPipeBottom && birdBottom > topPipeTop) {
                this.gameOver = true;
                return;
            }
            // Check collision with bottom pipe
            if (birdRight > obsLeft && birdLeft < obsRight && birdTop < bottomPipeBottom && birdBottom > bottomPipeTop) {
                this.gameOver = true;
                return;
            }
        }
    }

    private updateScore() {
        for (const obstacle of this.obstacles) {
            if (!obstacle.passed && this.birdX > obstacle.x + this.obstacleWidth) {
                this.score++;
                obstacle.passed = true;
                // console.log("Score:", this.score); // For debugging
            }
        }
    }

    private update() {
        if (this.gameOver) {
            return; // Stop updates if game is over
        }

        // Bird physics
        this.birdVelocityY += this.currentGravity;
        this.birdY += this.birdVelocityY;

        // Prevent bird from going above the top of the canvas (not a game over condition here)
        if (this.birdY < 0) {
            this.birdY = 0;
            this.birdVelocityY = 0;
        }

        this.checkCollisions();
        if (this.gameOver) return; // If collision detected, stop further updates in this frame

        // Obstacle generation
        this.framesSinceLastObstacle++;
        if (this.framesSinceLastObstacle >= this.obstacleInterval) {
            this.generateObstacle();
            this.framesSinceLastObstacle = 0;
        }

        // Move obstacles and remove off-screen ones
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.x -= this.obstacleSpeed;

            if (obstacle.x + this.obstacleWidth < 0) {
                this.obstacles.splice(i, 1);
            }
        }

        this.updateScore();
    }

    private draw() {
        // Clear the canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw game elements
        this.drawBird();
        this.drawObstacles();

        // Draw score
        this.ctx.fillStyle = 'black';
        this.ctx.font = '24px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Score: ${this.score}`, 10, 30);

        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = 'white';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('Game Over', this.canvas.width / 2, this.canvas.height / 2 - 40);

            this.ctx.font = '24px Arial';
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2);

            this.ctx.font = '20px Arial';
            this.ctx.fillText('Click or Space to Restart', this.canvas.width / 2, this.canvas.height / 2 + 40);
        }
    }

    private gameLoop() {
        this.update();
        this.draw();

        // Request the next frame
        requestAnimationFrame(() => this.gameLoop());
    }

    public static async startGame(canvasId?: string): Promise<Game> {
        const variationData = await fetchFlappyVariation();
        return new Game(canvasId, variationData?.ruleSet);
    }
}

// Example usage:
// Ensure the DOM is loaded before starting the game
// window.addEventListener('DOMContentLoaded', async () => {
//     try {
//         const game = await Game.startGame();
//         // If you need to do something with the game instance, like attaching to window
//         // (window as any).currentGame = game;
//     } catch (error) {
//         console.error("Failed to start game:", error);
//     }
// });

// To make it usable in a browser environment if bundled directly or via other scripts
// (window as any).FlappyGame = Game;
export default Game;
