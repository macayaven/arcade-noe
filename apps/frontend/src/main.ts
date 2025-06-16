import { Game } from "./game"; // Import the Game interface
import '../style.css'; // Import global styles

const gameCanvasId = "game-canvas";
let currentGame: Game | any | null = null; // Use 'any' for FlappyGame flexibility or if 'destroy' isn't on Game

const gameSelectionDiv = document.getElementById('game-selection');
const gameActiveAreaDiv = document.getElementById('game-active-area');
const gameCanvasElement = document.getElementById(gameCanvasId) as HTMLCanvasElement | null; // Null check needed
const backToMenuButton = document.getElementById('back-to-menu');

const playSnakeButton = document.getElementById('play-snake');
const playFlappyButton = document.getElementById('play-flappy');
const playBreakoutButton = document.getElementById('play-breakout'); // Added Breakout button

// Initial check for critical elements - this runs when the script is first parsed
if (!gameSelectionDiv || !gameActiveAreaDiv || !gameCanvasElement || !backToMenuButton || !playSnakeButton || !playFlappyButton || !playBreakoutButton) {
    console.error("A critical UI element is missing. Ensure IDs are correct in HTML: game-selection, game-active-area, game-canvas, back-to-menu, play-snake, play-flappy, play-breakout.");
    // Deferring body manipulation to DOMContentLoaded or handle it more carefully
    // if document.body is not yet available. For now, just log and throw.
    throw new Error("Essential HTML elements for game selection UI are missing.");
}


function showGameSelection() {
    if (gameSelectionDiv) gameSelectionDiv.style.display = 'flex';
    if (gameActiveAreaDiv) gameActiveAreaDiv.style.display = 'none';
    if (backToMenuButton) backToMenuButton.style.display = 'none';
    if (gameCanvasElement) {
        gameCanvasElement.style.display = 'none';
        const ctx = gameCanvasElement.getContext('2d');
        if (ctx) {
            ctx.clearRect(0, 0, gameCanvasElement.width, gameCanvasElement.height);
        }
    }
}

function showGameCanvas() {
    if (gameSelectionDiv) gameSelectionDiv.style.display = 'none';
    if (gameActiveAreaDiv) gameActiveAreaDiv.style.display = 'block'; // Or 'flex'
    if (backToMenuButton) backToMenuButton.style.display = 'block';
    if (gameCanvasElement) gameCanvasElement.style.display = 'block';
}

async function launchGame(gameId: 'snake' | 'flappy' | 'breakout') {
    if (currentGame) {
        if (typeof (currentGame as any).destroy === 'function') {
            (currentGame as any).destroy();
        } else if (typeof (currentGame as Game).stop === 'function') {
            (currentGame as Game).stop();
        }
        currentGame = null;
        console.log('Previous game stopped/destroyed.');
    }

    if (!gameCanvasElement) {
        console.error("Canvas element not found during launchGame.");
        showGameSelection(); // Revert to selection screen
        return;
    }

    showGameCanvas();
    console.log(`Attempting to launch game: ${gameId}`);

    try {
        let gameModule;
        switch (gameId) {
            case 'snake':
                gameModule = await import('../games/snake/index');
                try { await import('../games/snake/style.css'); } catch (e) { console.warn(`Snake CSS failed to load: ${(e as Error).message}`); }
                gameCanvasElement.width = 600;
                gameCanvasElement.height = 400;
                currentGame = new gameModule.SnakeGame(gameCanvasId);
                break;
            case 'flappy':
                gameModule = await import('../games/flappy/index');
                try { await import('../games/flappy/style.css'); } catch (e) { console.warn(`Flappy CSS failed to load: ${(e as Error).message}`); }
                gameCanvasElement.width = 400;
                gameCanvasElement.height = 600;
                currentGame = await gameModule.default.startGame(gameCanvasId); // Flappy uses default export and static startGame
                break;
            case 'breakout':
                gameModule = await import('../games/breakout/index');
                try { await import('../games/breakout/style.css'); } catch (e) { console.warn(`Breakout CSS failed to load: ${(e as Error).message}`); }
                gameCanvasElement.width = 400;
                gameCanvasElement.height = 400;
                currentGame = new gameModule.BreakoutGame(gameCanvasId);
                break;
            default:
                // This case should not be reached if called from valid buttons
                console.error(`Unknown game ID in launchGame: ${gameId}`);
                showGameSelection();
                return;
        }

        if (currentGame) {
            console.log(`${gameId} game loaded successfully.`);
            (window as any).currentGame = currentGame; // For debugging
            // Games are expected to auto-start (Snake/Breakout constructor, Flappy's startGame)
        } else {
             console.error(`Game object for ${gameId} was not created.`); // Should not happen if switch is correct
             showGameSelection();
        }

    } catch (error) {
        console.error(`Error launching game ${gameId}:`, error);
        showGameSelection(); // Go back to menu on error
        if (gameCanvasElement && gameCanvasElement.style.display !== 'none') {
            const ctx = gameCanvasElement.getContext('2d');
            if (ctx) {
                ctx.clearRect(0, 0, gameCanvasElement.width, gameCanvasElement.height);
                ctx.font = "16px Arial";
                ctx.fillStyle = "red";
                ctx.textAlign = "center";
                const errorMsg = error instanceof Error ? error.message : String(error);
                ctx.fillText(`Failed to load ${gameId}. Error: ${errorMsg}. Click 'Back to Menu'.`, gameCanvasElement.width / 2, gameCanvasElement.height / 2, gameCanvasElement.width - 20);
            }
        }
    }
}

// Event listeners are attached in DOMContentLoaded to ensure elements exist

if (backToMenuButton) { // This listener can be set up early if backToMenuButton is guaranteed to exist
    backToMenuButton.addEventListener('click', () => {
        if (currentGame) {
            if (typeof (currentGame as any).destroy === 'function') {
                (currentGame as any).destroy();
            } else if (typeof (currentGame as Game).stop === 'function') {
                (currentGame as Game).stop();
            }
            currentGame = null;
            console.log('Game stopped, returning to menu.');
        }
        showGameSelection();
    });
}

window.addEventListener('DOMContentLoaded', () => {
    // Re-check elements and attach game launching listeners
    const domContentLoadedGameSelectionDiv = document.getElementById('game-selection');
    const domContentLoadedGameActiveAreaDiv = document.getElementById('game-active-area');
    const domContentLoadedGameCanvasElement = document.getElementById(gameCanvasId) as HTMLCanvasElement | null;
    const domContentLoadedBackToMenuButton = document.getElementById('back-to-menu');
    const domContentLoadedPlaySnakeButton = document.getElementById('play-snake');
    const domContentLoadedPlayFlappyButton = document.getElementById('play-flappy');
    const domContentLoadedPlayBreakoutButton = document.getElementById('play-breakout');

    if (!domContentLoadedGameSelectionDiv || !domContentLoadedGameActiveAreaDiv || !domContentLoadedGameCanvasElement ||
        !domContentLoadedBackToMenuButton || !domContentLoadedPlaySnakeButton || !domContentLoadedPlayFlappyButton || !domContentLoadedPlayBreakoutButton) {
        console.error("Critical DOM elements are missing after DOMContentLoaded. The application may not function correctly.");
        if(document.body) document.body.innerHTML = "Error: Critical HTML elements were not found after page load. Cannot initialize game selection.";
        return;
    }

    if (domContentLoadedPlaySnakeButton) {
        domContentLoadedPlaySnakeButton.addEventListener('click', () => launchGame('snake'));
    }
    if (domContentLoadedPlayFlappyButton) {
        domContentLoadedPlayFlappyButton.addEventListener('click', () => launchGame('flappy'));
    }
    if (domContentLoadedPlayBreakoutButton) {
        domContentLoadedPlayBreakoutButton.addEventListener('click', () => launchGame('breakout'));
    }
    // backToMenuButton listener might have already been set up, or can be set here if preferred.
    // If set up earlier, ensure it used the 'backToMenuButton' variable which was checked.

    showGameSelection();
    console.log("Game selection menu initialized.");

    // Placeholder canvas drawing
    const snakePlaceholder = document.getElementById('snake-canvas-placeholder') as HTMLCanvasElement | null;
    if (snakePlaceholder?.getContext) {
        const ctx = snakePlaceholder.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'lightgreen';
            ctx.fillRect(0, 0, snakePlaceholder.width, snakePlaceholder.height);
            ctx.fillStyle = 'black'; ctx.font = '20px Arial'; ctx.textAlign = 'center';
            ctx.fillText('Snake', snakePlaceholder.width / 2, snakePlaceholder.height / 2);
        }
    }
    const flappyPlaceholder = document.getElementById('flappy-canvas-placeholder') as HTMLCanvasElement | null;
    if (flappyPlaceholder?.getContext) {
        const ctx = flappyPlaceholder.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#70c5ce';
            ctx.fillRect(0, 0, flappyPlaceholder.width, flappyPlaceholder.height);
            ctx.fillStyle = 'yellow'; ctx.beginPath();
            ctx.arc(flappyPlaceholder.width / 2 - 30, flappyPlaceholder.height / 2, 15, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = 'green';
            ctx.fillRect(flappyPlaceholder.width / 2 + 10, flappyPlaceholder.height / 2 - 40, 20, 80);
            ctx.fillStyle = 'black'; ctx.font = '18px Arial'; ctx.textAlign = 'center';
            ctx.fillText('Flappy Bird', flappyPlaceholder.width / 2, flappyPlaceholder.height - 10);
        }
    }
    const breakoutPlaceholder = document.getElementById('breakout-canvas-placeholder') as HTMLCanvasElement | null;
    if (breakoutPlaceholder?.getContext) {
        const ctx = breakoutPlaceholder.getContext('2d');
        if (ctx) {
            ctx.fillStyle = 'lightblue';
            ctx.fillRect(0, 0, breakoutPlaceholder.width, breakoutPlaceholder.height);
            ctx.fillStyle = 'black'; ctx.font = '20px Arial'; ctx.textAlign = 'center';
            ctx.fillText('Breakout', breakoutPlaceholder.width / 2, breakoutPlaceholder.height / 2);
    }
});
