import { Game } from '../../src/game';

// Constants
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const BIRD_X_POSITION = 100;
const BIRD_RADIUS = 20;
const BIRD_FLAP_STRENGTH = -8;
const DEFAULT_GRAVITY = 0.5;
const DEFAULT_SEED = 'default-flappy-seed';
const PIPE_WIDTH = 80;
const PIPE_COLOR = "green";
const DEFAULT_PIPE_GAP = 150;
const PIPE_SPAWN_INTERVAL = 2000; //ms
const PIPE_SPEED = 2;

type FlappyVariation = {
    seed: string;
    gap: number; // Pipe opening size
    gravity: number; // Strength of gravity
};

type Obstacle = {
    x: number;
    topPipeHeight: number;
    gap: number;
    passed: boolean;
};

let sr: (seed?: string) => () => number;
if (typeof seedrandom !== 'undefined') {
    sr = seedrandom;
} else {
    console.warn("seedrandom library not found. Using Math.random (unseeded). Ensure seedrandom is included for deterministic behavior.");
    sr = (fallbackSeed?: string) => { // Provide a consistent fallback if seedrandom is missing
        console.log("Using fallback RNG with seed:", fallbackSeed); // Log the seed being used by fallback
        let seed = 0;
        if (fallbackSeed) {
            for (let i = 0; i < fallbackSeed.length; i++) {
                seed = (seed << 5) - seed + fallbackSeed.charCodeAt(i);
                seed |= 0; // Convert to 32bit integer
            }
        }
        return () => {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };
    };
}


export class FlappyGame implements Game {
    private canvas: HTMLCanvasElement;
    private ctx: CanvasRenderingContext2D;

    private birdY: number;
    private birdVelocity: number;
    private obstacles: Obstacle[];
    private score: number;
    private isGameOver: boolean;
    private rng!: () => number; // Definite assignment in constructor via fetch or defaults

    private gameLoopId: number | null = null;
    private lastPipeSpawnTime: number = 0;
    private lastFrameTime: number = 0;

    // Variation-related properties
    private currentGravity: number = DEFAULT_GRAVITY;
    private currentPipeGap: number = DEFAULT_PIPE_GAP;
    private currentSeed: string = DEFAULT_SEED;

    private isLoadingVariations: boolean = true;


    constructor(canvasId: string) {
        this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        this.ctx = this.canvas.getContext("2d")!;
        this.canvas.width = CANVAS_WIDTH;
        this.canvas.height = CANVAS_HEIGHT;

        // Bind methods
        this.handleInput = this.handleInput.bind(this);
        this.gameLoop = this.gameLoop.bind(this);
        this._requestRestartByKey = this._requestRestartByKey.bind(this);

        // Initial setup. Game won't truly start until variations are loaded.
        this.setupInputListeners();
        // Call fetchVariationAndInitialize without awaiting, it will call resetGame and allow start
        this.fetchVariationAndInitialize().then(() => {
            // Variations loaded, game is ready to be formally started by user or auto-start
            // For now, resetGame is called inside fetchVariation, and start() will be called by user input.
            // If an auto-start is desired after loading, it could be triggered here.
            // For now, we just log and ensure the game is in a ready state.
            console.log("Initial variations loaded or defaults applied. Game ready.");
            // Display a "Ready" message or enable a start button
            this.drawLoadingOrReadyState(); // Draw initial state
        });
    }

    private drawLoadingOrReadyState(): void {
        this.ctx.fillStyle = "#70c5ce";
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.fillStyle = "white";
        this.ctx.textAlign = "center";
        this.ctx.font = "20px 'Press Start 2P', Arial, sans-serif";

        if (this.isLoadingVariations) {
            this.ctx.fillText("Loading Variations...", this.canvas.width / 2, this.canvas.height / 2);
        } else if (this.isGameOver) { // Also handles the initial state before first game
             this.ctx.fillText("Press Space or Click to Start", this.canvas.width / 2, this.canvas.height / 2);
        }
        // if game is running, gameLoop's draw takes over.
    }


    private setupInputListeners(): void {
        document.addEventListener('keydown', this.handleInput);
        this.canvas.addEventListener('mousedown', this.handleInput);
        document.addEventListener('keydown', this._requestRestartByKey);
    }

    private removeInputListeners(): void {
        document.removeEventListener('keydown', this.handleInput);
        this.canvas.removeEventListener('mousedown', this.handleInput);
        document.removeEventListener('keydown', this._requestRestartByKey);
    }

    public async fetchVariationAndInitialize(): Promise<void> {
        this.isLoadingVariations = true;
        this.drawLoadingOrReadyState(); // Show loading screen
        console.log("Fetching variations for Flappy Bird from /api/variation/flappy...");
        try {
            const response = await fetch('/api/variation/flappy');
            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}`);
            }
            const variationData = await response.json();

            if (typeof variationData.seed === 'string' &&
                typeof variationData.gap === 'number' && variationData.gap > BIRD_RADIUS * 2.5 && // Min gap sanity check
                typeof variationData.gravity === 'number' && variationData.gravity > 0 && variationData.gravity < 2) { // Gravity sanity check

                this.currentSeed = variationData.seed;
                this.currentGravity = variationData.gravity;
                this.currentPipeGap = variationData.gap;
                console.log(`Variations fetched and applied: seed=${this.currentSeed}, gravity=${this.currentGravity}, gap=${this.currentPipeGap}`);
            } else {
                throw new Error('Invalid variation data received');
            }
        } catch (error) {
            console.error("Failed to fetch or apply variations, using defaults:", error);
            this.currentSeed = DEFAULT_SEED; // Use the class default
            this.currentGravity = DEFAULT_GRAVITY;
            this.currentPipeGap = DEFAULT_PIPE_GAP;
        } finally {
            this.rng = sr(this.currentSeed); // Initialize RNG with fetched or default seed
            this.isLoadingVariations = false;
            this.resetGame(); // This will also call drawLoadingOrReadyState
        }
    }

    private resetGame(): void {
        this.isGameOver = true; // Game starts in a "ready to play" or "game over" state initially
        this.birdY = this.canvas.height / 2;
        this.birdVelocity = 0;
        this.obstacles = [];
        this.score = 0;
        this.lastPipeSpawnTime = 0;
        this.lastFrameTime = 0;

        if (!this.isLoadingVariations) { // Only log if not in initial loading phase
            console.log("Flappy Bird game reset. Current settings: G:", this.currentGravity, "Gap:", this.currentPipeGap, "Seed:", this.currentSeed);
        }

        // Clear any running game loop before resetting UI
        if (this.gameLoopId !== null) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
        }
        this.drawLoadingOrReadyState(); // Update UI to "Press start"
    }

    public async start(): Promise<void> {
        if (this.isLoadingVariations) {
            console.log("Waiting for variations to load before starting...");
            return;
        }
        // Stop any existing game loop before fetching new variations
        if (this.gameLoopId !== null) {
            this.stop();
        }

        console.log("Starting new game session. Fetching new variations...");
        await this.fetchVariationAndInitialize(); // Fetch new variations FOR THIS SESSION
        // fetchVariationAndInitialize calls resetGame(), which sets isGameOver = true and draws ready state

        // Actual game start conditions after variations are loaded and game is reset:
        this.isGameOver = false; // NOW the game is truly starting
        this.lastPipeSpawnTime = performance.now();
        this.lastFrameTime = performance.now();

        if (this.gameLoopId === null) { // Ensure no duplicate loops
            this.gameLoopId = requestAnimationFrame(this.gameLoop);
            console.log("Flappy Bird game loop started.");
        } else {
            console.log("Game loop already running or start called multiple times.");
        }
    }

    stop(): void {
        if (this.gameLoopId !== null) {
            cancelAnimationFrame(this.gameLoopId);
            this.gameLoopId = null;
            this.lastFrameTime = 0;
            console.log("Flappy Bird game stopped.");
            // Optionally, update UI to show "Paused" or return to a menu state
            // For now, if isGameOver is true, draw() will handle the Game Over screen.
            // If explicitly stopped while not game over, it will just freeze.
            if (!this.isGameOver) { // If explicitly stopped, show a paused-like state or just the current frame
                this.draw(this.ctx); // Draw one last time
            }
        }
    }

    private flap(): void {
        // Flap only if the game is active (not game over, not loading)
        if (!this.isGameOver && !this.isLoadingVariations) {
            this.birdVelocity = BIRD_FLAP_STRENGTH;
        }
    }

    private _requestRestartByKey(e: KeyboardEvent): void {
        if (this.isGameOver && e.key === 'Enter' && !this.isLoadingVariations) {
            console.log("Enter key pressed to restart game.");
            this.start(); // This will fetch new variations and then start the game loop
        }
    }

    private handleInput(event?: MouseEvent | KeyboardEvent): void {
        if (this.isLoadingVariations) return; // Ignore input while loading

        if (event instanceof KeyboardEvent && event.code !== 'Space') {
            return;
        }

        if (this.isGameOver) { // If game is over (or in ready-to-start state)
            console.log("Input received to start/restart game.");
            this.start(); // Will fetch new variations
        } else {
            this.flap();
        }
    }

    private generateObstacle(): void {
        const minPipeHeight = 40;
        const maxTopPipeHeight = this.canvas.height - this.currentPipeGap - minPipeHeight;
        // Ensure maxTopPipeHeight is not less than minPipeHeight (can happen with very large gaps)
        const actualMaxTopPipeHeight = Math.max(minPipeHeight, maxTopPipeHeight);
        const topPipeHeight = this.rng() * (actualMaxTopPipeHeight - minPipeHeight) + minPipeHeight;


        this.obstacles.push({
            x: this.canvas.width,
            topPipeHeight: topPipeHeight,
            gap: this.currentPipeGap, // Use variation-defined gap
            passed: false
        });
    }

    update(deltaTime: number): void {
        if (this.isGameOver || this.isLoadingVariations) return;

        this.birdVelocity += this.currentGravity * (deltaTime / 16); // Use variation-defined gravity
        this.birdY += this.birdVelocity * (deltaTime / 16);

        if (this.birdY - BIRD_RADIUS < 0) {
            this.birdY = BIRD_RADIUS;
            this.birdVelocity = 0;
        }
        if (this.birdY + BIRD_RADIUS > this.canvas.height) {
            this.birdY = this.canvas.height - BIRD_RADIUS;
            this.birdVelocity = 0;
            this.isGameOver = true;
            this.stop(); // Stop game loop on game over
            this.draw(this.ctx); // Draw final game over screen
            return;
        }

        const currentTime = performance.now();
        if (currentTime - this.lastPipeSpawnTime > PIPE_SPAWN_INTERVAL) {
            this.generateObstacle();
            this.lastPipeSpawnTime = currentTime;
        }

        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obs = this.obstacles[i];
            obs.x -= PIPE_SPEED * (deltaTime / 16);

            if (obs.x + PIPE_WIDTH < 0) {
                this.obstacles.splice(i, 1);
                continue;
            }

            const birdLeft = BIRD_X_POSITION - BIRD_RADIUS;
            const birdRight = BIRD_X_POSITION + BIRD_RADIUS;
            const birdTop = this.birdY - BIRD_RADIUS;
            const birdBottom = this.birdY + BIRD_RADIUS;

            const pipeRight = obs.x + PIPE_WIDTH;
            const pipeTopY = obs.topPipeHeight;
            const pipeBottomY = obs.topPipeHeight + obs.gap;

            if (birdRight > obs.x && birdLeft < pipeRight) {
                if (birdTop < pipeTopY || birdBottom > pipeBottomY) {
                    this.isGameOver = true;
                    this.stop(); // Stop game loop on game over
                    this.draw(this.ctx); // Draw final game over screen
                    return;
                }
            }

            if (!obs.passed && BIRD_X_POSITION > obs.x + PIPE_WIDTH) {
                obs.passed = true;
                this.score++;
            }
        }
    }

    draw(ctx: CanvasRenderingContext2D): void {
        // Background
        ctx.fillStyle = "#70c5ce";
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        if (this.isLoadingVariations) {
            this.drawLoadingOrReadyState();
            return;
        }

        if (this.isGameOver && this.obstacles.length === 0 && this.score === 0) {
            // This is the state before the very first game start after variations are loaded
            this.drawLoadingOrReadyState(); // Shows "Press Space/Click to Start"
            return;
        }


        // Draw bird
        ctx.fillStyle = "yellow";
        ctx.beginPath();
        ctx.arc(BIRD_X_POSITION, this.birdY, BIRD_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "black";
        ctx.stroke();

        // Draw obstacles
        this.obstacles.forEach(obstacle => {
            ctx.fillStyle = PIPE_COLOR;
            ctx.fillRect(obstacle.x, 0, PIPE_WIDTH, obstacle.topPipeHeight);
            ctx.fillRect(obstacle.x, obstacle.topPipeHeight + obstacle.gap, PIPE_WIDTH, this.canvas.height - (obstacle.topPipeHeight + obstacle.gap));
            ctx.strokeStyle = "black";
            ctx.strokeRect(obstacle.x, 0, PIPE_WIDTH, obstacle.topPipeHeight);
            ctx.strokeRect(obstacle.x, obstacle.topPipeHeight + obstacle.gap, PIPE_WIDTH, this.canvas.height - (obstacle.topPipeHeight + obstacle.gap));
        });

        // Draw score
        ctx.fillStyle = "white";
        ctx.font = "30px 'Press Start 2P', Arial, sans-serif";
        ctx.textAlign = "left";
        ctx.fillText("Score: " + this.score, 15, 45);
        ctx.fillStyle = "black";
        ctx.fillText("Score: " + this.score, 17, 47); // Shadow

        if (this.isGameOver) {
            ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.fillStyle = "white";
            ctx.textAlign = "center";
            ctx.font = "40px 'Press Start 2P', Arial, sans-serif";
            ctx.fillText("Game Over!", this.canvas.width / 2, this.canvas.height / 2 - 60);
            ctx.font = "24px 'Press Start 2P', Arial, sans-serif";
            ctx.fillText("Score: " + this.score, this.canvas.width / 2, this.canvas.height / 2 - 10);
            ctx.font = "18px 'Press Start 2P', Arial, sans-serif";
            ctx.fillText("Press Enter, Space, or Click", this.canvas.width / 2, this.canvas.height / 2 + 30);
            ctx.fillText("to Play Again", this.canvas.width / 2, this.canvas.height / 2 + 60);
        }
    }

    private gameLoop(timestamp: number): void {
        if (this.isGameOver || this.isLoadingVariations) { // Should not run if game over or loading
            this.stop(); // Ensure loop is stopped
            return;
        }

        if (!this.lastFrameTime) {
            this.lastFrameTime = timestamp;
        }
        const deltaTime = timestamp - this.lastFrameTime;
        this.lastFrameTime = timestamp;
        const cappedDeltaTime = Math.min(deltaTime, 100);

        this.update(cappedDeltaTime);
        this.draw(this.ctx);

        if (!this.isGameOver) { // only request next frame if game is still active
            this.gameLoopId = requestAnimationFrame(this.gameLoop);
        } else {
             // If game became over during update/draw, the draw method would have shown game over screen.
             // No need to request another frame. Loop is effectively stopped.
             console.log("Game over detected in gameLoop, loop will not continue.");
        }
    }

    public destroy(): void {
        this.stop();
        this.removeInputListeners();
        console.log("Flappy Bird game instance destroyed.");
    }
}
