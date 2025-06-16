import '../style.css'; // Global styles
import { Game } from './game'; // Assuming game.ts is in the same directory (src)

// DOM Element References
const gameSelectionDiv = document.getElementById('game-selection');
const gameActiveAreaDiv = document.getElementById('game-active-area');
const gameCanvasElement = document.getElementById('game-canvas') as HTMLCanvasElement | null;

const playSnakeButton = document.getElementById('play-snake');
const playFlappyButton = document.getElementById('play-flappy');
const playBreakoutButton = document.getElementById('play-breakout'); // New button
const backToMenuButton = document.getElementById('back-to-menu');

// Ensure all critical HTML elements are present
if (!gameSelectionDiv || !gameActiveAreaDiv || !gameCanvasElement || !playSnakeButton || !playFlappyButton || !playBreakoutButton || !backToMenuButton) {
    console.error('One or more critical HTML elements are missing. Check IDs: game-selection, game-active-area, game-canvas, play-snake, play-flappy, play-breakout, back-to-menu.');
    if (document.body) { // Check if body exists before manipulating
        document.body.innerHTML = 'Error: Critical HTML elements missing. Application cannot start. Please check console.';
    }
    // Stop further execution if elements are missing
    throw new Error("Critical HTML elements missing.");
}

// Type for active game instance. FlappyGame might not strictly adhere to Game if its stop method is different.
// Using 'any' for Flappy's instance for now, or it needs to conform to Game.
let activeGame: Game | any | null = null;

function showGameSelection() {
    if (gameSelectionDiv) gameSelectionDiv.style.display = 'flex'; // Assuming flex for button layout
    if (gameActiveAreaDiv) gameActiveAreaDiv.style.display = 'none';
    if (gameCanvasElement) { // Clear canvas when returning to menu
        const ctx = gameCanvasElement.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, gameCanvasElement.width, gameCanvasElement.height);
        }
    }
}

function showGameCanvas() {
    if (gameSelectionDiv) gameSelectionDiv.style.display = 'none';
    if (gameActiveAreaDiv) gameActiveAreaDiv.style.display = 'flex'; // Assuming flex for layout
}

async function launchGame(gameId: 'snake' | 'flappy' | 'breakout') {
    if (activeGame) {
        if (typeof (activeGame as Game).stop === 'function') {
            (activeGame as Game).stop();
        }
        // If a more general destroy or cleanup method exists, call it here.
        // e.g., activeGame.destroy?.();
        activeGame = null;
        console.log('Previous game stopped.');
    }

    if (!gameCanvasElement) {
        console.error('Game canvas element not found during launchGame.');
        showGameSelection(); // Go back to menu if canvas is missing
        return;
    }

    showGameCanvas();
    console.log(`Attempting to launch game: ${gameId}`);

    try {
        switch (gameId) {
            case 'snake':
                const { SnakeGame } = await import('../games/snake/index');
                try { // Attempt to load game-specific styles
                    await import('../games/snake/style.css');
                } catch (cssError) {
                    console.warn(`Could not load styles for snake: ${cssError}`);
                }
                gameCanvasElement.width = 600;
                gameCanvasElement.height = 400;
                activeGame = new SnakeGame(gameCanvasElement.id);
                // SnakeGame's constructor is expected to start the game
                break;
            case 'flappy':
                const FlappyGameModule = await import('../games/flappy/index');
                const FlappyGame = FlappyGameModule.default;
                try { // Attempt to load game-specific styles (if any)
                    await import('../games/flappy/style.css'); // Assuming it might exist based on main branch
                } catch (cssError) {
                    console.warn(`Could not load styles for flappy: ${cssError}`);
                }
                gameCanvasElement.width = 400;
                gameCanvasElement.height = 600;
                activeGame = await FlappyGame.startGame(gameCanvasElement.id); // startGame is async
                break;
            case 'breakout':
                const { BreakoutGame } = await import('../games/breakout/index');
                 try { // Attempt to load game-specific styles
                    await import('../games/breakout/style.css');
                } catch (cssError) {
                    console.warn(`Could not load styles for breakout: ${cssError}`);
                }
                gameCanvasElement.width = 400; // Default Breakout canvas size
                gameCanvasElement.height = 400;
                activeGame = new BreakoutGame(gameCanvasElement.id);
                // BreakoutGame's constructor is expected to start the game
                break;
            default:
                console.error(`Unrecognized game ID: ${gameId}`);
                showGameSelection(); // Go back to menu
                return;
        }

        if (activeGame) {
            console.log(`${gameId} game loaded successfully.`);
            (window as any).currentGame = activeGame; // For debugging
        } else {
            console.error(`Failed to initialize ${gameId} game object.`);
            showGameSelection();
        }
    } catch (error) {
        console.error(`Error launching game ${gameId}:`, error);
        showGameSelection(); // Go back to menu on error
         if (document.body && gameActiveAreaDiv && gameActiveAreaDiv.style.display !== 'none') {
            // If game area is visible, show error there too
            gameCanvasElement.getContext('2d')?.clearRect(0,0,gameCanvasElement.width, gameCanvasElement.height); // Clear canvas
            const errorText = `Failed to load ${gameId}. Error: ${error}. Click 'Back to Menu'.`;
            const ctx = gameCanvasElement.getContext('2d');
            if(ctx) {
                ctx.font = "16px Arial";
                ctx.fillStyle = "red";
                ctx.textAlign = "center";
                ctx.fillText(errorText, gameCanvasElement.width / 2, gameCanvasElement.height / 2, gameCanvasElement.width - 20);
            }
        }
    }
}

// Event Listeners
playSnakeButton.addEventListener('click', () => launchGame('snake'));
playFlappyButton.addEventListener('click', () => launchGame('flappy'));
playBreakoutButton.addEventListener('click', () => launchGame('breakout'));

backToMenuButton.addEventListener('click', () => {
    if (activeGame) {
        if (typeof (activeGame as Game).stop === 'function') {
            (activeGame as Game).stop();
        }
        // activeGame.destroy?.(); // If a teardown method exists
        activeGame = null;
        console.log('Game stopped, returning to menu.');
    }
    showGameSelection();
});

// Initial Setup on DOMContentLoaded
window.addEventListener('DOMContentLoaded', () => {
    // Check again if elements were found, as script might run before full DOM parsing if not 'defer'
    if (!gameSelectionDiv || !gameActiveAreaDiv || !gameCanvasElement || !playSnakeButton || !playFlappyButton || !playBreakoutButton || !backToMenuButton) {
        console.error("DOM elements not found after DOMContentLoaded. Ensure HTML is correct and IDs match.");
        if (document.body) {
             document.body.innerHTML = 'Error: DOM not fully loaded or elements missing. Application cannot run.';
        }
        return; // Stop if elements are still not found
    }
    showGameSelection(); // Show the game menu by default
    console.log('Game selection menu initialized.');

    // Placeholder canvas rendering logic can be added here if needed
    // e.g., renderMiniSnake(document.getElementById('snake-canvas-placeholder'));
});
