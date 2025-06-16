interface GameVariation {
  seed: string;
  sessionId: string;
  theme: {
    name: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
  };
  difficulty: {
    level: string;
    speedMultiplier: number;
    complexityBonus: number;
  };
  modifiers: string[];
  gameSpecific: {
    brickRows?: number;
    brickCols?: number;
    paddleSize?: number;
    ballSpeed?: number;
    powerUps?: boolean;
    multiball?: boolean;
    destructiblePaddle?: boolean;
  };
}

interface Ball {
  x: number;
  y: number;
  dx: number;
  dy: number;
  speed: number;
  color: string;
}

interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  hits: number;
  maxHits: number;
  color: string;
  powerUp?: string;
}

interface PowerUp {
  x: number;
  y: number;
  type: string;
  color: string;
  dy: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export class BreakoutGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private variation: GameVariation;
  private balls: Ball[] = [];
  private paddle: { x: number; y: number; width: number; height: number; color: string } = { x: 0, y: 0, width: 0, height: 0, color: '' };
  private bricks: Brick[] = [];
  private powerUps: PowerUp[] = [];
  private particles: Particle[] = [];
  private gameRunning = false;
  private score = 0;
  private lives = 3;
  private combo = 0;
  private gameLoop: ReturnType<typeof requestAnimationFrame> | null = null;
  private shakeIntensity = 0;
  
  // Game settings based on variations
  private baseSpeed: number;
  private paddleSpeed: number;
  private invertedControls: boolean;
  private doubleScore: boolean;
  private ghostMode: boolean;
  private slowMotion: boolean;

  constructor(canvas: HTMLCanvasElement, variation: GameVariation) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.variation = variation;
    
    // Apply variation settings
    this.baseSpeed = 6 * variation.difficulty.speedMultiplier; // Increased from 4 to 6
    this.paddleSpeed = 12 * variation.difficulty.speedMultiplier; // Increased from 8 to 12
    this.invertedControls = variation.modifiers.includes('invertedControls');
    this.doubleScore = variation.modifiers.includes('doubleScore');
    this.ghostMode = variation.modifiers.includes('ghostMode');
    this.slowMotion = variation.modifiers.includes('slowMotion');
    
    if (this.slowMotion) {
      this.baseSpeed *= 0.5;
      this.paddleSpeed *= 0.5;
    }
    
    this.setupGame();
    this.setupControls();
  }

  private setupGame() {
    // Set canvas background
    this.canvas.style.background = this.variation.theme.backgroundColor;
    
    // Initialize paddle
    const basePaddleSize = 100; // Base paddle size in pixels
    const paddleMultiplier = this.variation.gameSpecific.paddleSize || 1.0;
    const paddleSize = basePaddleSize * paddleMultiplier;
    // Ensure paddle is always visible - use accent color, or fallback to bright color
    let paddleColor = this.variation.theme.accentColor;
    // If accent color is too dark or similar to background, use a bright fallback
    if (paddleColor === this.variation.theme.backgroundColor || 
        paddleColor.toLowerCase().includes('dark') || 
        paddleColor === '#000000' || paddleColor === '#000') {
      paddleColor = '#00FFFF'; // Bright cyan fallback
    }
    this.paddle = {
      x: this.canvas.width / 2 - paddleSize / 2,
      y: this.canvas.height - 30,
      width: paddleSize,
      height: 12,
      color: paddleColor
    };
    
    // Initialize ball
    this.balls = [{
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      dx: this.baseSpeed * (Math.random() > 0.5 ? 1 : -1),
      dy: -this.baseSpeed,
      speed: this.baseSpeed,
      color: this.variation.theme.accentColor
    }];
    
    // Initialize bricks
    this.createBricks();
  }

  private createBricks() {
    const rows = this.variation.gameSpecific.brickRows || 6;
    const cols = this.variation.gameSpecific.brickCols || 10;
    const brickWidth = (this.canvas.width - 20) / cols;
    const brickHeight = 25;
    const colors = [
      this.variation.theme.primaryColor,
      this.variation.theme.secondaryColor,
      this.variation.theme.accentColor
    ];
    
    this.bricks = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const hits = Math.floor(this.variation.difficulty.complexityBonus) + 1;
        this.bricks.push({
          x: col * brickWidth + 10,
          y: row * brickHeight + 50,
          width: brickWidth - 2,
          height: brickHeight - 2,
          hits,
          maxHits: hits,
          color: colors[row % colors.length],
          powerUp: Math.random() < 0.1 && this.variation.gameSpecific.powerUps ? this.getRandomPowerUp() : undefined
        });
      }
    }
  }

  private getRandomPowerUp(): string {
    const powerUps = ['extraBall', 'largePaddle', 'slowBall', 'extraLife'];
    return powerUps[Math.floor(Math.random() * powerUps.length)];
  }

  private setupControls() {
    let keys: { [key: string]: boolean } = {};
    
    document.addEventListener('keydown', (e) => {
      keys[e.key] = true;
    });
    
    document.addEventListener('keyup', (e) => {
      keys[e.key] = false;
    });
    
    // Mouse controls
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      this.paddle.x = mouseX - this.paddle.width / 2;
      
      // Keep paddle within bounds
      if (this.paddle.x < 0) this.paddle.x = 0;
      if (this.paddle.x + this.paddle.width > this.canvas.width) {
        this.paddle.x = this.canvas.width - this.paddle.width;
      }
    });
    
    // Game loop input handling
    this.handleInput = () => {
      let moveLeft = keys['ArrowLeft'] || keys['a'] || keys['A'];
      let moveRight = keys['ArrowRight'] || keys['d'] || keys['D'];
      
      if (this.invertedControls) {
        [moveLeft, moveRight] = [moveRight, moveLeft];
      }
      
      if (moveLeft && this.paddle.x > 0) {
        this.paddle.x -= this.paddleSpeed;
      }
      if (moveRight && this.paddle.x + this.paddle.width < this.canvas.width) {
        this.paddle.x += this.paddleSpeed;
      }
    };
  }

  private handleInput() {
    // This will be overridden in setupControls
  }

  start() {
    this.gameRunning = true;
    this.gameLoop = requestAnimationFrame(this.update.bind(this));
  }

  private update() {
    if (!this.gameRunning) return;
    
    this.handleInput();
    this.updateBalls();
    this.updatePowerUps();
    this.checkCollisions();
    this.updateParticles();
    this.render();
    
    // Reduce screen shake
    if (this.shakeIntensity > 0) {
      this.shakeIntensity *= 0.9;
      if (this.shakeIntensity < 0.1) this.shakeIntensity = 0;
    }
    
    // Check win/lose conditions
    if (this.bricks.length === 0) {
      this.gameWon();
      return;
    }
    
    if (this.balls.length === 0 && this.lives <= 0) {
      this.gameOver();
      return;
    }
    
    this.gameLoop = requestAnimationFrame(this.update.bind(this));
  }

  private updateBalls() {
    this.balls = this.balls.filter(ball => {
      ball.x += ball.dx;
      ball.y += ball.dy;
      
      // Wall collisions
      if (ball.x <= 0 || ball.x >= this.canvas.width) {
        ball.dx = -ball.dx;
      }
      if (ball.y <= 0) {
        ball.dy = -ball.dy;
      }
      
      // Bottom wall - lose ball
      if (ball.y >= this.canvas.height) {
        if (this.balls.length === 1) {
          this.lives--;
          if (this.lives > 0) {
            this.resetBall();
          }
        }
        return false; // Remove this ball
      }
      
      return true;
    });
  }

  private updatePowerUps() {
    this.powerUps = this.powerUps.filter(powerUp => {
      powerUp.y += powerUp.dy;
      
      // Check collision with paddle
      if (powerUp.y + 20 >= this.paddle.y &&
          powerUp.x + 20 >= this.paddle.x &&
          powerUp.x <= this.paddle.x + this.paddle.width) {
        this.applyPowerUp(powerUp.type);
        return false;
      }
      
      // Remove if off screen
      return powerUp.y < this.canvas.height;
    });
  }

  private applyPowerUp(type: string) {
    switch (type) {
      case 'extraBall':
        if (this.balls.length > 0) {
          const newBall = { ...this.balls[0] };
          newBall.dx = -newBall.dx;
          this.balls.push(newBall);
        }
        break;
      case 'largePaddle':
        this.paddle.width = Math.min(this.paddle.width * 1.5, this.canvas.width * 0.3);
        break;
      case 'slowBall':
        this.balls.forEach(ball => {
          ball.dx *= 0.7;
          ball.dy *= 0.7;
        });
        break;
      case 'extraLife':
        this.lives++;
        break;
    }
  }

  private checkCollisions() {
    this.balls.forEach(ball => {
      // Paddle collision
      if (ball.y + 5 >= this.paddle.y &&
          ball.y - 5 <= this.paddle.y + this.paddle.height &&
          ball.x >= this.paddle.x &&
          ball.x <= this.paddle.x + this.paddle.width) {
        
        ball.dy = -Math.abs(ball.dy);
        // Add angle based on where ball hits paddle
        const hitPos = (ball.x - this.paddle.x) / this.paddle.width;
        ball.dx = ball.speed * (hitPos - 0.5) * 2;
      }
      
      // Brick collisions
      this.bricks = this.bricks.filter(brick => {
        if (ball.x >= brick.x && ball.x <= brick.x + brick.width &&
            ball.y >= brick.y && ball.y <= brick.y + brick.height) {
          
          ball.dy = -ball.dy;
          brick.hits--;
          this.combo++;
          
          // 💥 BRICK EXPLOSION PARTICLES!
          this.createBrickParticles(brick.x + brick.width/2, brick.y + brick.height/2, brick.color);
          this.shakeIntensity = 5;
          
          const points = (brick.maxHits - brick.hits + 1) * 10 * this.combo;
          this.score += this.doubleScore ? points * 2 : points;
          
          if (brick.hits <= 0) {
            // Create power-up if brick had one
            if (brick.powerUp) {
              this.powerUps.push({
                x: brick.x + brick.width / 2,
                y: brick.y + brick.height,
                type: brick.powerUp,
                color: this.variation.theme.accentColor,
                dy: 2
              });
            }
            return false; // Remove brick
          }
          
          // Change brick color based on damage
          const damageRatio = brick.hits / brick.maxHits;
          if (damageRatio < 0.5) {
            brick.color = this.variation.theme.secondaryColor;
          }
        }
        
        return true;
      });
    });
  }

  private createBrickParticles(x: number, y: number, brickColor: string) {
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 20,
        maxLife: 20,
        color: brickColor,
        size: 2 + Math.random() * 2
      });
    }
  }

  private updateParticles() {
    this.particles = this.particles.filter(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += 0.1; // gravity
      particle.life--;
      return particle.life > 0;
    });
  }

  private resetBall() {
    this.balls = [{
      x: this.canvas.width / 2,
      y: this.canvas.height / 2,
      dx: this.baseSpeed * (Math.random() > 0.5 ? 1 : -1),
      dy: -this.baseSpeed,
      speed: this.baseSpeed,
      color: this.variation.theme.accentColor
    }];
  }

  private render() {
    // Apply screen shake
    this.ctx.save();
    if (this.shakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(shakeX, shakeY);
    }
    
    // Clear canvas with dynamic gradient
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, this.variation.theme.backgroundColor);
    gradient.addColorStop(1, this.adjustBrightness(this.variation.theme.backgroundColor, -30));
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw paddle with better visibility
    this.ctx.fillStyle = this.paddle.color;
    this.ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
    
    // Add a bright border to ensure paddle is always visible
    this.ctx.strokeStyle = '#FFFFFF'; // White border
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
    
    // Add a subtle inner highlight
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.fillRect(this.paddle.x + 1, this.paddle.y + 1, this.paddle.width - 2, 2);
    
    // Draw balls
    this.balls.forEach(ball => {
      this.ctx.fillStyle = ball.color;
      this.ctx.beginPath();
      this.ctx.arc(ball.x, ball.y, 8, 0, Math.PI * 2);
      this.ctx.fill();
      
      if (this.ghostMode) {
        this.ctx.globalAlpha = 0.5;
      }
    });
    this.ctx.globalAlpha = 1;
    
    // Draw bricks
    this.bricks.forEach(brick => {
      this.ctx.fillStyle = brick.color;
      this.ctx.fillRect(brick.x, brick.y, brick.width, brick.height);
      
      // Draw border
      this.ctx.strokeStyle = this.variation.theme.backgroundColor;
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(brick.x, brick.y, brick.width, brick.height);
      
      // Draw hits indicator
      if (brick.maxHits > 1) {
        this.ctx.fillStyle = 'white';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(brick.hits.toString(), brick.x + brick.width/2, brick.y + brick.height/2 + 4);
      }
    });
    
    // Draw power-ups
    this.powerUps.forEach(powerUp => {
      this.ctx.fillStyle = powerUp.color;
      this.ctx.fillRect(powerUp.x, powerUp.y, 20, 20);
      
      // Draw power-up icon
      this.ctx.fillStyle = 'white';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      const icon = powerUp.type === 'extraBall' ? '●' : 
                   powerUp.type === 'largePaddle' ? '▬' :
                   powerUp.type === 'slowBall' ? '🐌' : '❤';
      this.ctx.fillText(icon, powerUp.x + 10, powerUp.y + 14);
    });
    
    // ✨ Draw particles for epic effects
    this.particles.forEach(particle => {
      const alpha = particle.life / particle.maxLife;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;
    
    // Enhanced UI with better visual hierarchy
    this.ctx.fillStyle = this.variation.theme.primaryColor;
    this.ctx.font = 'bold 28px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Score: ${this.score}`, 10, 35);
    
    this.ctx.font = '18px Arial';
    this.ctx.fillText(`Lives: ${this.lives}`, 10, 55);
    
    // Show modifiers with better styling
    if (this.variation.modifiers.length > 0) {
      this.ctx.font = '14px Arial';
      this.ctx.fillStyle = this.variation.theme.secondaryColor;
      this.ctx.fillText(`Active: ${this.variation.modifiers.join(' • ')}`, 10, 80);
    }
    
    // Show theme and difficulty
    this.ctx.font = '12px Arial'; 
    this.ctx.fillStyle = this.variation.theme.accentColor;
    this.ctx.fillText(`${this.variation.theme.name.toUpperCase()} • ${this.variation.difficulty.level.toUpperCase()}`, 10, 100);
    
    // COMBO display!
    if (this.combo > 1) {
      this.ctx.fillStyle = this.variation.theme.accentColor;
      this.ctx.font = 'bold 20px Arial';
      this.ctx.fillText(`🔥 COMBO x${this.combo}!`, 10, 90);
    }
    
    // Show balls remaining
    this.ctx.textAlign = 'right';
    this.ctx.font = '16px Arial';
    this.ctx.fillStyle = this.variation.theme.primaryColor;
    this.ctx.fillText(`Balls: ${this.balls.length}`, this.canvas.width - 10, 30);
    
    this.ctx.restore(); // Restore screen shake transform
  }

  private adjustBrightness(color: string, amount: number): string {
    if (color.startsWith('#')) {
      const num = parseInt(color.slice(1), 16);
      const r = Math.max(0, Math.min(255, (num >> 16) + amount));
      const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
      const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
      return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    }
    return color;
  }

  private gameWon() {
    this.gameRunning = false;
    this.ctx.fillStyle = this.variation.theme.accentColor;
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('YOU WIN!', this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 60);
  }

  private gameOver() {
    this.gameRunning = false;
    this.ctx.fillStyle = this.variation.theme.primaryColor;
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 60);
  }

  restart() {
    this.score = 0;
    this.lives = 3;
    this.combo = 0;
    this.particles = [];
    this.shakeIntensity = 0;
    this.setupGame();
    this.start();
  }

  destroy() {
    this.gameRunning = false;
    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop);
    }
  }
}
