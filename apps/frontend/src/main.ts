console.log('🚀 main.ts is loading...');

import './style.css';
import { SnakeGame } from './games/snake';
import { BreakoutGame } from './games/breakout';
import { FlappyGame } from './games/flappy';

console.log('✅ All imports loaded successfully');

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
    console.log(`Starting game: ${gameId}`);
    
    // Get game variation from backend
    const response = await fetch(`/api/variation/${gameId}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const variation = await response.json();
    
    console.log(`Variation loaded for ${gameId}:`, variation);
    
    // Show game container
    showGameContainer();
    
    // Update game info with rich variation details
    const gameTitle = document.getElementById('gameTitle')!;
    const gameVariation = document.getElementById('gameVariation')!;
    const gameInstructions = document.getElementById('gameInstructions')!;
    
    gameTitle.textContent = getGameTitle(gameId);
    
    // Create rich variation description
    const themeEmoji = getThemeEmoji(variation.theme.name);
    const difficultyEmoji = getDifficultyEmoji(variation.difficulty.level);
    const modifierText = variation.modifiers.length > 0 ? 
      ` • Special: ${variation.modifiers.join(', ')}` : '';
    
    gameVariation.innerHTML = `
      ${themeEmoji} <strong>${variation.theme.name}</strong> theme • 
      ${difficultyEmoji} <strong>${variation.difficulty.level}</strong> difficulty 
      (${(variation.difficulty.speedMultiplier * 100).toFixed(0)}% speed)${modifierText}
    `;
    
    // Set theme colors on the container
    const gameContainer = document.getElementById('gameContainer')!;
    gameContainer.style.setProperty('--primary-color', variation.theme.primaryColor);
    gameContainer.style.setProperty('--secondary-color', variation.theme.secondaryColor);
    gameContainer.style.setProperty('--accent-color', variation.theme.accentColor);
    
    // Get canvas
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    
    // Start the appropriate game
    switch (gameId) {
      case 'snake':
        currentGame = new SnakeGame(canvas, variation);
        gameInstructions.innerHTML = `
          <strong>🐍 Snake Controls:</strong><br>
          Use arrow keys to move the snake. Eat food to grow!<br>
          ${getGameSpecificInstructions(gameId, variation)}
        `;
        break;
      case 'breakout':
        currentGame = new BreakoutGame(canvas, variation);
        gameInstructions.innerHTML = `
          <strong>🧱 Breakout Controls:</strong><br>
          Use arrow keys or mouse to move the paddle. Break all bricks!<br>
          ${getGameSpecificInstructions(gameId, variation)}
        `;
        break;
      case 'flappy':
        currentGame = new FlappyGame(canvas, variation);
        gameInstructions.innerHTML = `
          <strong>🐦 Flappy Bird Controls:</strong><br>
          Press spacebar or click to flap. Avoid the pipes!<br>
          ${getGameSpecificInstructions(gameId, variation)}
        `;
        break;
    }
    
    currentGame.start();
    
  } catch (error) {
    console.error('Error starting game:', error);
    alert(`Error starting game: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function getThemeEmoji(themeName: string): string {
  const themeEmojis: { [key: string]: string } = {
    'neon': '⚡',
    'retro': '📼',
    'pastel': '🌸',
    'dark': '🌙',
    'ocean': '🌊',
    'sunset': '🌅',
    'forest': '🌲',
    'cosmic': '🌌'
  };
  return themeEmojis[themeName] || '🎨';
}

function getDifficultyEmoji(difficulty: string): string {
  const difficultyEmojis: { [key: string]: string } = {
    'easy': '😊',
    'normal': '😐',
    'hard': '😅',
    'extreme': '😱'
  };
  return difficultyEmojis[difficulty] || '🎯';
}

function getGameSpecificInstructions(gameId: string, variation: any): string {
  const modifiers = variation.modifiers || [];
  let instructions = '';
  
  if (modifiers.includes('invertedControls')) {
    instructions += '<span style="color: var(--accent-color);">⚠️ Controls are inverted!</span><br>';
  }
  if (modifiers.includes('ghostMode')) {
    instructions += '<span style="color: var(--accent-color);">👻 Ghost mode activates when eating!</span><br>';
  }
  if (modifiers.includes('doubleScore')) {
    instructions += '<span style="color: var(--accent-color);">⭐ Double score bonus!</span><br>';
  }
  if (modifiers.includes('fastStart')) {
    instructions += '<span style="color: var(--accent-color);">🚀 Fast start enabled!</span><br>';
  }
  if (modifiers.includes('slowMotion')) {
    instructions += '<span style="color: var(--accent-color);">🐌 Slow motion mode!</span><br>';
  }
  
  // Game-specific variations
  if (gameId === 'snake') {
    if (variation.gameSpecific?.wallBehavior === 'wrap') {
      instructions += '<span style="color: var(--secondary-color);">🔄 Walls wrap around!</span><br>';
    }
    if (variation.gameSpecific?.foodTypes > 1) {
      instructions += `<span style="color: var(--secondary-color);">🍎 ${variation.gameSpecific.foodTypes} different food types!</span><br>`;
    }
  }
  
  return instructions;
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
