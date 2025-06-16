import { SnakeGame } from "../games/snake"; // Adjusted path
import '../games/snake/style.css'; // Import snake-specific styles
import '../style.css'; // Import global styles

const canvasId = "game-canvas";
const game = new SnakeGame(canvasId);

function startGame() {
    game.start();
}

// Ensure canvas is loaded before starting the game
window.addEventListener('DOMContentLoaded', () => {
    const canvasElement = document.getElementById(canvasId);
    if (canvasElement) {
        startGame();
    } else {
        console.error(`Canvas element with id '${canvasId}' not found.`);
    }
});
