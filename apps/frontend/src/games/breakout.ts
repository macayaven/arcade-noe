interface GameVariation {
  seed: string;
  ruleSet: 'standard' | 'custom';
  theme: 'light' | 'dark' | 'system';
}

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  visible: boolean;
  color: string;
}

export class BreakoutGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private variation: GameVariation;
  private gameRunning = false;
  private score = 0;
  private lives = 3;
  private animationId: number | null = null;
  
  // Game objects
  private paddle = { x: 0, y: 0, width: 100, height: 15, speed: 8 };
  private ball = { x: 0, y: 0, dx: 4, dy: -4, radius: 8 };
  private bricks: Brick[] = [];
  
  // Input
  private keys: { [key: string]: boolean } = {};
  private mouseX = 0;

  constructor(canvas: HTMLCanvasElement, variation: GameVariation) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.variation = variation;
    
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

  private getPaddleColor(): string {
    switch (this.variation.theme) {
      case 'dark': return '#2196F3';
      case 'light': return '#1976D2';
      default: return '#1E88E5';
    }
  }

  private getBallColor(): string {
    switch (this.variation.theme) {
      case 'dark': return '#FFC107';
      case 'light': return '#F57C00';
      default: return '#FF9800';
    }
  }

  private getBrickColors(): string[] {
    if (this.variation.theme === 'dark') {
      return ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5'];
    } else if (this.variation.theme === 'light') {
      return ['#D32F2F', '#C2185B', '#7B1FA2', '#512DA8', '#303F9F'];
    }
    return ['#E53935', '#D81B60', '#8E24AA', '#5E35B1', '#3949AB'];
  }

  private initGame() {
    // Initialize paddle
    this.paddle.x = this.canvas.width / 2 - this.paddle.width / 2;
    this.paddle.y = this.canvas.height - 30;
    
    // Initialize ball
    this.ball.x = this.canvas.width / 2;
    this.ball.y = this.canvas.height - 50;
    this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * 4;
    this.ball.dy = -4;
    
    // Apply variation to ball speed
    if (this.variation.ruleSet === 'custom') {
      this.ball.dx *= 1.2;
      this.ball.dy *= 1.2;
    }
    
    this.score = 0;
    this.lives = 3;
    this.createBricks();
  }

  private createBricks() {
    this.bricks = [];
    const brickWidth = 75;
    const brickHeight = 20;
    const brickPadding = 5;
    const brickOffsetTop = 60;
    const brickOffsetLeft = 35;
    const brickRowCount = 5;
    const brickColumnCount = Math.floor((this.canvas.width - 2 * brickOffsetLeft) / (brickWidth + brickPadding));
    
    const colors = this.getBrickColors();
    
    for (let r = 0; r < brickRowCount; r++) {
      for (let c = 0; c < brickColumnCount; c++) {
        this.bricks.push({
          x: c * (brickWidth + brickPadding) + brickOffsetLeft,
          y: r * (brickHeight + brickPadding) + brickOffsetTop,
          width: brickWidth,
          height: brickHeight,
          visible: true,
          color: colors[r % colors.length]
        });
      }
    }
  }

  private setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      this.keys[e.key] = true;
    });
    
    document.addEventListener('keyup', (e) => {
      this.keys[e.key] = false;
    });
    
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
    });
  }

  private update() {
    if (!this.gameRunning) return;

    // Update paddle position
    if (this.keys['ArrowLeft'] && this.paddle.x > 0) {
      this.paddle.x -= this.paddle.speed;
    }
    if (this.keys['ArrowRight'] && this.paddle.x < this.canvas.width - this.paddle.width) {
      this.paddle.x += this.paddle.speed;
    }
    
    // Mouse control
    this.paddle.x = Math.max(0, Math.min(this.canvas.width - this.paddle.width, this.mouseX - this.paddle.width / 2));

    // Update ball position
    this.ball.x += this.ball.dx;
    this.ball.y += this.ball.dy;

    // Ball collision with walls
    if (this.ball.x + this.ball.radius > this.canvas.width || this.ball.x - this.ball.radius < 0) {
      this.ball.dx = -this.ball.dx;
    }
    if (this.ball.y - this.ball.radius < 0) {
      this.ball.dy = -this.ball.dy;
    }

    // Ball collision with paddle
    if (this.ball.y + this.ball.radius > this.paddle.y &&
        this.ball.x > this.paddle.x &&
        this.ball.x < this.paddle.x + this.paddle.width) {
      
      // Calculate bounce angle based on where ball hits paddle
      const relativeIntersectX = (this.ball.x - (this.paddle.x + this.paddle.width / 2)) / (this.paddle.width / 2);
      const bounceAngle = relativeIntersectX * Math.PI / 3; // Max 60 degrees
      
      const speed = Math.sqrt(this.ball.dx * this.ball.dx + this.ball.dy * this.ball.dy);
      this.ball.dx = speed * Math.sin(bounceAngle);
      this.ball.dy = -speed * Math.cos(bounceAngle);
    }

    // Ball collision with bricks
    for (let brick of this.bricks) {
      if (brick.visible &&
          this.ball.x > brick.x &&
          this.ball.x < brick.x + brick.width &&
          this.ball.y > brick.y &&
          this.ball.y < brick.y + brick.height) {
        
        this.ball.dy = -this.ball.dy;
        brick.visible = false;
        this.score += 10;
        
        // Custom rule bonus
        if (this.variation.ruleSet === 'custom') {
          this.score += 5;
        }
      }
    }

    // Ball falls below paddle
    if (this.ball.y > this.canvas.height) {
      this.lives--;
      if (this.lives <= 0) {
        this.gameOver();
      } else {
        this.resetBall();
      }
    }

    // Check win condition
    if (this.bricks.every(brick => !brick.visible)) {
      this.gameWin();
    }
  }

  private gameLoop = () => {
    this.update();
    this.draw();
    
    if (this.gameRunning) {
      this.animationId = requestAnimationFrame(this.gameLoop);
    }
  };

  private resetBall() {
    this.ball.x = this.canvas.width / 2;
    this.ball.y = this.canvas.height - 50;
    this.ball.dx = (Math.random() > 0.5 ? 1 : -1) * 4;
    this.ball.dy = -4;
  }

  private draw() {
    // Clear canvas
    this.ctx.fillStyle = this.getBackgroundColor();
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw paddle
    this.ctx.fillStyle = this.getPaddleColor();
    this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);

    // Draw ball
    this.ctx.fillStyle = this.getBallColor();
    this.ctx.beginPath();
    this.ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw bricks
    for (let brick of this.bricks) {
      if (brick.visible) {
        this.ctx.fillStyle = brick.color;
        this.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
      }
    }

    // Draw UI
    this.ctx.fillStyle = this.variation.theme === 'light' ? '#000' : '#fff';
    this.ctx.font = '18px Arial';
    this.ctx.fillText(`Score: ${this.score}`, 10, 25);
    this.ctx.fillText(`Lives: ${this.lives}`, 10, 50);
  }

  private gameOver() {
    this.gameRunning = false;
    
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

  private gameWin() {
    this.gameRunning = false;
    
    this.ctx.fillStyle = 'rgba(0, 100, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('You Win!', this.canvas.width / 2, this.canvas.height / 2 - 50);
    
    this.ctx.font = '24px Arial';
    this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 20);
    this.ctx.fillText('Press Restart to play again', this.canvas.width / 2, this.canvas.height / 2 + 60);
    
    this.ctx.textAlign = 'left';
  }

  public start() {
    this.gameRunning = true;
    this.gameLoop();
  }

  public restart() {
    this.initGame();
    this.start();
  }

  public destroy() {
    this.gameRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}
