import './style.css';
import { SnakeGame } from './games/snake';
import { BreakoutGame } from './games/breakout';
import { FlappyGame } from './games/flappy';

let currentGame: any = null;

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>🎮 Arcade Games</h1>
    <div id="gameSelection">
      <p>Choose a game to play:</p>
      <button id="playSnake" class="game-button">🐍 Snake</button>
      <button id="playBreakout" class="game-button">🧱 Breakout</button>
      <button id="playFlappy" class="game-button">🐦 Flappy Bird</button>
    </div>
    <div id="gameContainer" style="display: none;">
      <button id="backToMenu" class="back-button">← Back to Menu</button>
      <div id="gameInfo">
        <h2 id="gameTitle"></h2>
        <p id="gameVariation"></p>
      </div>
      <canvas id="gameCanvas" width="800" height="600"></canvas>
      <div id="gameControls">
        <p id="gameInstructions"></p>
        <button id="restartGame">Restart Game</button>
      </div>
    </div>
  </div>
`;

// Game selection handlers
document.getElementById('playSnake')?.addEventListener('click', () => startGame('snake'));
document.getElementById('playBreakout')?.addEventListener('click', () => startGame('breakout'));
document.getElementById('playFlappy')?.addEventListener('click', () => startGame('flappy'));

// Back to menu handler
document.getElementById('backToMenu')?.addEventListener('click', () => {
  if (currentGame) {
    currentGame.destroy();
    currentGame = null;
  }
  showGameSelection();
});

// Restart game handler
document.getElementById('restartGame')?.addEventListener('click', () => {
  if (currentGame) {
    currentGame.restart();
  }
});

function showGameSelection() {
  document.getElementById('gameSelection')!.style.display = 'block';
  document.getElementById('gameContainer')!.style.display = 'none';
}

function showGameContainer() {
  document.getElementById('gameSelection')!.style.display = 'none';
  document.getElementById('gameContainer')!.style.display = 'block';
}

async function startGame(gameId: string) {
  try {
    // Get game variation from backend
    const response = await fetch(`/api/variation/${gameId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const variation = await response.json();
    
    // Show game container
    showGameContainer();
    
    // Update game info
    const gameTitle = document.getElementById('gameTitle')!;
    const gameVariation = document.getElementById('gameVariation')!;
    const gameInstructions = document.getElementById('gameInstructions')!;
    
    gameTitle.textContent = getGameTitle(gameId);
    gameVariation.textContent = `Variation: ${variation.ruleSet} rules, ${variation.theme} theme`;
    
    // Get canvas
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    
    // Start the appropriate game
    switch (gameId) {
      case 'snake':
        currentGame = new SnakeGame(canvas, variation);
        gameInstructions.textContent = 'Use arrow keys to move the snake. Eat food to grow!';
        break;
      case 'breakout':
        currentGame = new BreakoutGame(canvas, variation);
        gameInstructions.textContent = 'Use arrow keys or mouse to move the paddle. Break all bricks!';
        break;
      case 'flappy':
        currentGame = new FlappyGame(canvas, variation);
        gameInstructions.textContent = 'Press spacebar or click to flap. Avoid the pipes!';
        break;
    }
    
    currentGame.start();
    
  } catch (error) {
    console.error('Error starting game:', error);
    alert(`Error starting game: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function getGameTitle(gameId: string): string {
  switch (gameId) {
    case 'snake': return '🐍 Snake';
    case 'breakout': return '🧱 Breakout';
    case 'flappy': return '🐦 Flappy Bird';
    default: return 'Game';
  }
}

console.log('Arcade Games loaded!');
