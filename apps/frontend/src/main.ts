import { SnakeGame } from "../games/snake"; // Adjusted path
import { FlappyGame } from "../games/flappy"; // Import FlappyGame
import { Game } from "./game"; // Import the Game interface

import '../games/snake/style.css'; // Import snake-specific styles (if any)
import '../games/flappy/style.css'; // Import flappy-specific styles (if any)
import '../style.css'; // Import global styles

const gameCanvasId = "game-canvas";
let currentGame: Game | null = null;

const gameSelectionDiv = document.getElementById('game-selection');
const gameActiveAreaDiv = document.getElementById('game-active-area');
const gameCanvasElement = document.getElementById(gameCanvasId) as HTMLCanvasElement;
const backToMenuButton = document.getElementById('back-to-menu');

function showGameSelection() {
    if (gameSelectionDiv) gameSelectionDiv.style.display = 'flex'; // Or your default display for selection
    if (gameActiveAreaDiv) gameActiveAreaDiv.style.display = 'none';
    if (backToMenuButton) backToMenuButton.style.display = 'none';
    if (gameCanvasElement) gameCanvasElement.style.display = 'none';
     // Also clear the canvas content if needed, though destroying the game instance should suffice
    const ctx = gameCanvasElement?.getContext('2d');
    if (ctx) {
        ctx.clearRect(0, 0, gameCanvasElement.width, gameCanvasElement.height);
    }
}

function showGameCanvas() {
    if (gameSelectionDiv) gameSelectionDiv.style.display = 'none';
    if (gameActiveAreaDiv) gameActiveAreaDiv.style.display = 'block';
    if (backToMenuButton) backToMenuButton.style.display = 'block';
    if (gameCanvasElement) gameCanvasElement.style.display = 'block'; // Make sure canvas is visible
}

async function startGame(GameClass: new (canvasId: string) => Game) {
    if (currentGame) {
        if (typeof (currentGame as any).destroy === 'function') {
            (currentGame as any).destroy(); // Use destroy if available
        } else {
            currentGame.stop(); // Fallback to stop
        }
        currentGame = null;
    }

    showGameCanvas();

    // Set canvas dimensions for Flappy Bird, Snake might use defaults or its own.
    // This is a simplistic way; ideally, games configure the canvas or canvas adapts.
    if (GameClass === FlappyGame) {
        gameCanvasElement.width = 400;
        gameCanvasElement.height = 600;
    } else if (GameClass === SnakeGame) {
        // Assuming SnakeGame defaults to a certain size or handles its own canvas setup
        // For example, let's set a common size if not specified by the game.
        gameCanvasElement.width = 600; // Default or Snake specific
        gameCanvasElement.height = 400;
    }


    currentGame = new GameClass(gameCanvasId);
    // The `start` method in FlappyGame is now async due to variation fetching.
    // We should await it if we want to ensure loading is complete before any other actions.
    if (typeof currentGame.start === 'function') {
        try {
            await (currentGame as any).start(); // Await if start is async (like FlappyGame's)
        } catch (error) {
            console.error("Error starting the game:", error);
            showGameSelection(); // Go back to menu if game fails to start
        }
    } else {
        // Fallback for games with synchronous start (if any)
        // currentGame.start();
        // This part is tricky; the Game interface should ideally define if start is sync or async.
        // For now, assuming FlappyGame's async start is the pattern for games needing init.
        // The original SnakeGame's start was synchronous.
        // Let's assume the Game interface's start is Promise<void> or void
        // Forcing an await might be okay for sync methods too.
        await Promise.resolve(currentGame.start());
    }
}

// Event Listeners for game selection
const playSnakeButton = document.getElementById('play-snake');
const playFlappyButton = document.getElementById('play-flappy');

if (playSnakeButton) {
    playSnakeButton.addEventListener('click', () => {
        console.log("Play Snake button clicked");
        startGame(SnakeGame);
    });
} else {
    console.warn("'play-snake' button not found. Snake game cannot be started.");
}

if (playFlappyButton) {
    playFlappyButton.addEventListener('click', () => {
        console.log("Play Flappy Bird button clicked");
        startGame(FlappyGame);
    });
} else {
    console.warn("'play-flappy' button not found. Flappy Bird game cannot be started.");
}

// Event Listener for Back to Menu
if (backToMenuButton) {
    backToMenuButton.addEventListener('click', () => {
        if (currentGame) {
            if (typeof (currentGame as any).destroy === 'function') {
                (currentGame as any).destroy();
            } else {
                currentGame.stop();
            }
            currentGame = null;
        }
        showGameSelection();
    });
}

// Initial setup
window.addEventListener('DOMContentLoaded', () => {
    // Ensure canvas element exists (it's used by games)
    if (!gameCanvasElement) {
        console.error(`Main canvas element with id '${gameCanvasId}' not found.`);
        return;
    }
    // Initially show the game selection screen
    showGameSelection();

    // Placeholder canvas drawing (optional, just for visual representation on menu)
    const snakePlaceholder = document.getElementById('snake-canvas-placeholder') as HTMLCanvasElement;
    if (snakePlaceholder) {
        const ctx = snakePlaceholder.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'lightgreen';
            ctx.fillRect(0, 0, snakePlaceholder.width, snakePlaceholder.height);
            ctx.fillStyle = 'black';
            ctx.font = '20px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Snake', snakePlaceholder.width / 2, snakePlaceholder.height / 2);
        }
    }
    const flappyPlaceholder = document.getElementById('flappy-canvas-placeholder') as HTMLCanvasElement;
    if (flappyPlaceholder) {
        const ctx = flappyPlaceholder.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#70c5ce';
            ctx.fillRect(0, 0, flappyPlaceholder.width, flappyPlaceholder.height);
            ctx.fillStyle = 'yellow';
            ctx.beginPath();
            ctx.arc(flappyPlaceholder.width / 2 - 30, flappyPlaceholder.height / 2, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'green';
            ctx.fillRect(flappyPlaceholder.width / 2 + 10, flappyPlaceholder.height / 2 - 40, 20, 80);
             ctx.fillStyle = 'black';
            ctx.font = '18px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Flappy Bird', flappyPlaceholder.width / 2, flappyPlaceholder.height - 10);
        }
    }
});
