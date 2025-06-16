import '../style.css'; // Global styles
import { Game } from './game'; // Assuming game.ts is in the same directory (src)

const canvasId = 'game-canvas';

// Type for game instances that conform to the Game interface (Snake, Breakout)
// GameInstance can be simplified if we don't need to distinguish between them explicitly here.
// For now, we can use 'Game' for Snake/Breakout and 'any' for Flappy, or a union.
type GameInstance = Game; // SnakeGame and BreakoutGame implement Game
// FlappyGame's startGame returns a specific type, let's use 'any' for simplicity if its type isn't exported directly or needed for interaction here
type FlappyGameInstance = any; // Or Awaited<ReturnType<typeof import('../games/flappy/index').default.startGame>> if specific type is needed


async function loadGame() {
    const urlParams = new URLSearchParams(window.location.search);
    let gameId = urlParams.get('game');

    const canvasElement = document.getElementById(canvasId);
    if (!canvasElement) {
        console.error(`Canvas element with id '${canvasId}' not found.`);
        document.body.innerHTML = `Error: Canvas element with id '${canvasId}' not found. Append ?game=snake, ?game=flappy, or ?game=breakout to the URL.`;
        return;
    }

    // Default to 'snake' if gameId is null, empty, or not one of the valid options
    if (!gameId || !['snake', 'flappy', 'breakout'].includes(gameId)) {
        if (gameId) { // If an invalid gameId was provided
            console.warn(`Unknown game ID: "${gameId}". Defaulting to Snake.`);
            // Optionally display a message to the user about the default
            const existingContent = document.body.innerHTML;
            document.body.innerHTML = `<p style="color:orange; text-align:center;">Unknown game ID: "${gameId}". Defaulting to Snake.</p>${existingContent}`;
        }
        gameId = 'snake';
    }


    let currentGame: GameInstance | FlappyGameInstance | null = null;

    try {
        console.log(`Loading game: ${gameId}`);
        switch (gameId) {
            case 'snake':
                const { SnakeGame } = await import('../games/snake/index');
                await import('../games/snake/style.css');
                currentGame = new SnakeGame(canvasId);
                // SnakeGame constructor calls fetchVariationAndInitialize -> resetGame (which starts interval)
                break;
            case 'flappy':
                // Flappy game does not have its own style.css in the provided file structure
                const FlappyGameModule = await import('../games/flappy/index');
                const FlappyGame = FlappyGameModule.default;
                // Flappy's startGame is async and returns an initialized game instance
                currentGame = await FlappyGame.startGame(canvasId);
                break;
            case 'breakout':
                const { BreakoutGame } = await import('../games/breakout/index');
                // apps/frontend/games/breakout/style.css is currently empty but should be imported if it exists
                await import('../games/breakout/style.css');
                currentGame = new BreakoutGame(canvasId);
                // BreakoutGame constructor calls fetchVariationAndInitialize -> resetGame (which starts loop)
                break;
            // Default case is handled by the initial gameId validation and setting to 'snake'
            // So, an explicit default in switch might be redundant if validation is comprehensive.
            // However, keeping it for robustness against future changes could be an option,
            // but it would require loading SnakeGame again. The current structure is more efficient.
        }

        if (currentGame) {
            // For Snake and Breakout, their constructors already trigger the game loop.
            // Flappy's startGame also fully initializes and starts it.
            // No explicit universal game.start() call is needed here for initial load.
            console.log(`${gameId} game loaded and should be running.`);

            // Add game to window for debugging/testing convenience
            (window as any).currentGame = currentGame;

        } else {
            // This case should ideally not be reached if gameId validation and switch are correct
            console.error(`Failed to load the selected game: ${gameId}`);
            document.body.innerHTML = `Error: Could not load game "${gameId}".`;
        }
    } catch (error) {
        console.error(`Error loading game ${gameId}:`, error);
        // Check if it's a module loading error (e.g., file not found for CSS or JS)
        if (error instanceof Error && error.message.includes('Failed to fetch dynamically imported module')) {
             document.body.innerHTML = `Error loading game "${gameId}": A required file was not found. Check console for details. (e.g. ${error.message})`;
        } else {
            document.body.innerHTML = `Error loading game "${gameId}": ${error}. Check console for details.`;
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    loadGame();
});
