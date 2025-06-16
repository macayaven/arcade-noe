interface GameVariation {
  seed: string;
  ruleSet: 'standard' | 'custom';
  theme: 'light' | 'dark' | 'system';
}

interface Position {
  x: number;
  y: number;
}

export class SnakeGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private variation: GameVariation;
  private snake: Position[] = [];
  private food: Position = { x: 0, y: 0 };
  private direction: Position = { x: 1, y: 0 };
  private gameRunning = false;
  private score = 0;
  private gameLoop: ReturnType<typeof setInterval> | null = null;
  
  // Game settings
  private readonly GRID_SIZE = 20;
  private readonly GAME_SPEED = 150; // milliseconds

  constructor(canvas: HTMLCanvasElement, variation: GameVariation) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.variation = variation;
    
    // Set canvas background color based on theme
    this.canvas.style.backgroundColor = this.getBackgroundColor();
    
    this.setupEventListeners();
    this.initGame();
  }

  private getBackgroundColor(): string {
    switch (this.variation.theme) {
      case 'dark': return '#1a1a1a';
      case 'light': return '#f5f5f5';
      default: return '#2d2d2d';
    }
  }

  private getSnakeColor(): string {
    switch (this.variation.theme) {
      case 'dark': return '#4CAF50';
      case 'light': return '#2E7D32';
      default: return '#43A047';
    }
  }

  private getFoodColor(): string {
    switch (this.variation.theme) {
      case 'dark': return '#F44336';
      case 'light': return '#D32F2F';
      default: return '#E53935';
    }
  }

  private initGame() {
    // Initialize snake in center
    this.snake = [
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 }
    ];
    
    this.direction = { x: 1, y: 0 };
    this.score = 0;
    this.generateFood();
  }

  private setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (!this.gameRunning) return;
      
      switch (e.key) {
        case 'ArrowUp':
          if (this.direction.y === 0) this.direction = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
          if (this.direction.y === 0) this.direction = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
          if (this.direction.x === 0) this.direction = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
          if (this.direction.x === 0) this.direction = { x: 1, y: 0 };
          break;
      }
    });
  }

  private generateFood() {
    const maxX = Math.floor(this.canvas.width / this.GRID_SIZE);
    const maxY = Math.floor(this.canvas.height / this.GRID_SIZE);
    
    do {
      this.food = {
        x: Math.floor(Math.random() * maxX),
        y: Math.floor(Math.random() * maxY)
      };
    } while (this.snake.some(segment => segment.x === this.food.x && segment.y === this.food.y));
  }

  private update() {
    if (!this.gameRunning) return;

    // Move snake
    const head = { ...this.snake[0] };
    head.x += this.direction.x;
    head.y += this.direction.y;

    // Check wall collision
    const maxX = Math.floor(this.canvas.width / this.GRID_SIZE);
    const maxY = Math.floor(this.canvas.height / this.GRID_SIZE);
    
    if (head.x < 0 || head.x >= maxX || head.y < 0 || head.y >= maxY) {
      this.gameOver();
      return;
    }

    // Check self collision
    if (this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
      this.gameOver();
      return;
    }

    this.snake.unshift(head);

    // Check food collision
    if (head.x === this.food.x && head.y === this.food.y) {
      this.score += 10;
      this.generateFood();
      
      // Apply variation rules
      if (this.variation.ruleSet === 'custom') {
        // Custom rule: snake speeds up slightly when eating
        this.score += 5; // Bonus points
      }
    } else {
      this.snake.pop();
    }
  }

  private draw() {
    // Clear canvas
    this.ctx.fillStyle = this.getBackgroundColor();
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw snake
    this.ctx.fillStyle = this.getSnakeColor();
    this.snake.forEach((segment, index) => {
      // Make head slightly different
      if (index === 0) {
        this.ctx.fillStyle = this.variation.theme === 'dark' ? '#66BB6A' : '#1B5E20';
      } else {
        this.ctx.fillStyle = this.getSnakeColor();
      }
      
      this.ctx.fillRect(
        segment.x * this.GRID_SIZE,
        segment.y * this.GRID_SIZE,
        this.GRID_SIZE - 2,
        this.GRID_SIZE - 2
      );
    });

    // Draw food
    this.ctx.fillStyle = this.getFoodColor();
    this.ctx.fillRect(
      this.food.x * this.GRID_SIZE,
      this.food.y * this.GRID_SIZE,
      this.GRID_SIZE - 2,
      this.GRID_SIZE - 2
    );

    // Draw score
    this.ctx.fillStyle = this.variation.theme === 'light' ? '#000' : '#fff';
    this.ctx.font = '20px Arial';
    this.ctx.fillText(`Score: ${this.score}`, 10, 30);
  }

  private gameOver() {
    this.gameRunning = false;
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }

    // Draw game over message
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Game Over', this.canvas.width / 2, this.canvas.height / 2 - 50);
    
    this.ctx.font = '24px Arial';
    this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
    this.ctx.fillText('Press Restart to play again', this.canvas.width / 2, this.canvas.height / 2 + 60);
    
    this.ctx.textAlign = 'left';
  }

  public start() {
    this.gameRunning = true;
    this.gameLoop = setInterval(() => {
      this.update();
      this.draw();
    }, this.GAME_SPEED);
  }

  public restart() {
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
    }
    this.initGame();
    this.start();
  }

  public destroy() {
    this.gameRunning = false;
    if (this.gameLoop) {
      clearInterval(this.gameLoop);
      this.gameLoop = null;
    }
  }
}
