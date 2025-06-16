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
    pipeGap?: number;
    pipeSpeed?: number;
    gravity?: number;
    jumpForce?: number;
    pipeSpacing?: number;
    powerUps?: boolean;
    multipleJumps?: boolean;
  };
}

interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  width: number;
  color: string;
  passed: boolean;
}

interface PowerUp {
  x: number;
  y: number;
  type: string;
  color: string;
  collected: boolean;
}

interface Bird {
  x: number;
  y: number;
  velocity: number;
  size: number;
  color: string;
  rotation: number;
}

export class FlappyGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private variation: GameVariation;
  private bird: Bird = { x: 0, y: 0, velocity: 0, size: 0, color: '', rotation: 0 };
  private pipes: Pipe[] = [];
  private powerUps: PowerUp[] = [];
  private gameRunning = false;
  private score = 0;
  private gameLoop: ReturnType<typeof requestAnimationFrame> | null = null;
  
  // Game physics based on variations
  private gravity: number;
  private jumpForce: number;
  private pipeSpeed: number;
  private pipeGap: number;
  private pipeSpacing: number;
  private lastPipeTime = 0;
  
  // Variation modifiers
  private invertedControls: boolean;
  private doubleScore: boolean;
  private ghostMode: boolean;
  private slowMotion: boolean;
  private fastStart: boolean;
  
  // Power-up effects
  private shieldActive = false;
  private shieldTime = 0;
  private slowTimeActive = false;
  private slowTimeRemaining = 0;
  private doubleJumpActive = false;
  private doubleJumpRemaining = 0;

  constructor(canvas: HTMLCanvasElement, variation: GameVariation) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.variation = variation;
    
    // Apply variation settings
    this.gravity = (variation.gameSpecific.gravity || 1.0) * variation.difficulty.speedMultiplier; // Increased from 0.8 to 1.0
    this.jumpForce = (variation.gameSpecific.jumpForce || -15) * variation.difficulty.speedMultiplier; // Increased from -12 to -15
    this.pipeSpeed = (variation.gameSpecific.pipeSpeed || 4) * variation.difficulty.speedMultiplier; // Increased from 3 to 4
    this.pipeGap = variation.gameSpecific.pipeGap || 150;
    this.pipeSpacing = variation.gameSpecific.pipeSpacing || 300;
    
    // Apply modifiers
    this.invertedControls = variation.modifiers.includes('invertedControls');
    this.doubleScore = variation.modifiers.includes('doubleScore');
    this.ghostMode = variation.modifiers.includes('ghostMode');
    this.slowMotion = variation.modifiers.includes('slowMotion');
    this.fastStart = variation.modifiers.includes('fastStart');
    
    if (this.slowMotion) {
      this.gravity *= 0.6;
      this.jumpForce *= 0.6;
      this.pipeSpeed *= 0.6;
    }
    
    this.setupGame();
    this.setupControls();
  }

  private setupGame() {
    // Set canvas background
    this.canvas.style.background = this.variation.theme.backgroundColor;
    
    // Initialize bird
    this.bird = {
      x: 100,
      y: this.canvas.height / 2,
      velocity: 0,
      size: 20,
      color: this.variation.theme.primaryColor,
      rotation: 0
    };
    
    // Initialize pipes
    this.pipes = [];
    
    // If fast start, add initial pipes
    if (this.fastStart) {
      this.createInitialPipes();
    }
  }

  private createInitialPipes() {
    for (let i = 0; i < 3; i++) {
      this.createPipe(this.canvas.width + i * this.pipeSpacing);
    }
  }

  private setupControls() {
    let keys: { [key: string]: boolean } = {};
    
    const jump = () => {
      if (!this.gameRunning) return;
      
      if (this.invertedControls) {
        this.bird.velocity = Math.abs(this.jumpForce); // Downward
      } else {
        this.bird.velocity = this.jumpForce; // Upward
      }
      
      // Handle double jump power-up
      if (this.doubleJumpActive && this.doubleJumpRemaining > 0) {
        this.doubleJumpRemaining--;
        this.bird.velocity *= 1.5;
      }
    };
    
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
      keys[e.key] = true;
    });
    
    document.addEventListener('keyup', (e) => {
      keys[e.key] = false;
    });
    
    // Mouse/touch controls
    this.canvas.addEventListener('click', jump);
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      jump();
    });
  }

  start() {
    this.gameRunning = true;
    this.lastPipeTime = Date.now();
    this.gameLoop = requestAnimationFrame(this.update.bind(this));
  }

  private update() {
    if (!this.gameRunning) return;
    
    this.updateBird();
    this.updatePipes();
    this.updatePowerUps();
    this.checkCollisions();
    this.spawnPipes();
    this.render();
    
    // Check game over conditions
    if (this.bird.y > this.canvas.height || this.bird.y < 0) {
      if (!this.shieldActive) {
        this.gameOver();
        return;
      }
    }
    
    this.gameLoop = requestAnimationFrame(this.update.bind(this));
  }

  private updateBird() {
    this.bird.velocity += this.gravity;
    this.bird.y += this.bird.velocity;
    
    // Update rotation based on velocity
    this.bird.rotation = Math.max(Math.min(this.bird.velocity * 0.1, 1.5), -1.5);
  }

  private updatePipes() {
    this.pipes = this.pipes.filter(pipe => {
      pipe.x -= this.slowTimeActive ? this.pipeSpeed * 0.3 : this.pipeSpeed;
      
      // Check if bird passed the pipe
      if (!pipe.passed && pipe.x + pipe.width < this.bird.x) {
        pipe.passed = true;
        this.score += this.doubleScore ? 2 : 1;
      }
      
      // Remove pipes that are off-screen
      return pipe.x + pipe.width > -50;
    });
  }

  private updatePowerUps() {
    this.powerUps = this.powerUps.filter(powerUp => {
      powerUp.x -= this.slowTimeActive ? this.pipeSpeed * 0.3 : this.pipeSpeed;
      
      // Check collision with bird
      if (!powerUp.collected && 
          Math.abs(powerUp.x - this.bird.x) < 30 && 
          Math.abs(powerUp.y - this.bird.y) < 30) {
        powerUp.collected = true;
        this.applyPowerUp(powerUp.type);
        return false;
      }
      
      return powerUp.x > -50;
    });
    
    // Update power-up timers
    if (this.shieldActive) {
      this.shieldTime--;
      if (this.shieldTime <= 0) {
        this.shieldActive = false;
      }
    }
    
    if (this.slowTimeActive) {
      this.slowTimeRemaining--;
      if (this.slowTimeRemaining <= 0) {
        this.slowTimeActive = false;
      }
    }
  }

  private applyPowerUp(type: string) {
    switch (type) {
      case 'shield':
        this.shieldActive = true;
        this.shieldTime = 300; // 5 seconds at 60fps
        break;
      case 'slowTime':
        this.slowTimeActive = true;
        this.slowTimeRemaining = 300;
        break;
      case 'doubleJump':
        this.doubleJumpActive = true;
        this.doubleJumpRemaining = 3;
        break;
      case 'scoreBoost':
        this.score += 5;
        break;
    }
  }

  private spawnPipes() {
    const now = Date.now();
    const spawnInterval = (this.pipeSpacing / this.pipeSpeed) * 16.67; // Convert to milliseconds based on 60fps
    if (now - this.lastPipeTime > spawnInterval) {
      this.createPipe(this.canvas.width);
      this.lastPipeTime = now;
    }
  }

  private createPipe(x: number) {
    const minHeight = 50;
    const maxHeight = this.canvas.height - this.pipeGap - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
    
    const pipe: Pipe = {
      x,
      topHeight,
      bottomY: topHeight + this.pipeGap,
      width: 60,
      color: this.variation.theme.secondaryColor,
      passed: false
    };
    
    this.pipes.push(pipe);
    
    // Chance to spawn power-up
    if (this.variation.gameSpecific.powerUps && Math.random() < 0.2) {
      const powerUpTypes = ['shield', 'slowTime', 'doubleJump', 'scoreBoost'];
      const powerUpType = powerUpTypes[Math.floor(Math.random() * powerUpTypes.length)];
      
      this.powerUps.push({
        x: x + 30,
        y: topHeight + this.pipeGap / 2,
        type: powerUpType,
        color: this.variation.theme.accentColor,
        collected: false
      });
    }
  }

  private checkCollisions() {
    // Check pipe collisions
    this.pipes.forEach(pipe => {
      if (this.bird.x + this.bird.size > pipe.x && 
          this.bird.x < pipe.x + pipe.width) {
        
        // Check collision with top or bottom pipe
        if (this.bird.y < pipe.topHeight || 
            this.bird.y + this.bird.size > pipe.bottomY) {
          
          if (!this.shieldActive) {
            this.gameOver();
          } else {
            // Shield protects, but reduces shield time
            this.shieldTime = Math.max(0, this.shieldTime - 60);
          }
        }
      }
    });
  }

  private render() {
    // Clear canvas with theme background
    this.ctx.fillStyle = this.variation.theme.backgroundColor;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw pipes
    this.pipes.forEach(pipe => {
      this.ctx.fillStyle = pipe.color;
      
      // Top pipe
      this.ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
      
      // Bottom pipe
      this.ctx.fillRect(pipe.x, pipe.bottomY, pipe.width, this.canvas.height - pipe.bottomY);
      
      // Pipe borders
      this.ctx.strokeStyle = this.variation.theme.accentColor;
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(pipe.x, 0, pipe.width, pipe.topHeight);
      this.ctx.strokeRect(pipe.x, pipe.bottomY, pipe.width, this.canvas.height - pipe.bottomY);
    });
    
    // Draw power-ups
    this.powerUps.forEach(powerUp => {
      if (!powerUp.collected) {
        this.ctx.fillStyle = powerUp.color;
        this.ctx.beginPath();
        this.ctx.arc(powerUp.x, powerUp.y, 15, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Draw power-up icon
        this.ctx.fillStyle = 'white';
        this.ctx.font = '16px Arial';
        this.ctx.textAlign = 'center';
        const icon = powerUp.type === 'shield' ? '🛡️' :
                     powerUp.type === 'slowTime' ? '⏰' :
                     powerUp.type === 'doubleJump' ? '⬆️' : '⭐';
        this.ctx.fillText(icon, powerUp.x, powerUp.y + 5);
      }
    });
    
    // Draw bird
    this.ctx.save();
    this.ctx.translate(this.bird.x + this.bird.size/2, this.bird.y + this.bird.size/2);
    this.ctx.rotate(this.bird.rotation);
    
    // Bird body - draw as a circle instead of square
    this.ctx.fillStyle = this.bird.color;
    if (this.ghostMode) {
      this.ctx.globalAlpha = 0.7;
    }
    
    // Draw bird as a circle
    this.ctx.beginPath();
    this.ctx.arc(0, 0, this.bird.size/2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Add a beak
    this.ctx.fillStyle = '#FFA500'; // Orange beak
    this.ctx.beginPath();
    this.ctx.moveTo(this.bird.size/2, 0);
    this.ctx.lineTo(this.bird.size/2 + 8, -3);
    this.ctx.lineTo(this.bird.size/2 + 8, 3);
    this.ctx.closePath();
    this.ctx.fill();
    
    // Add an eye
    this.ctx.fillStyle = 'white';
    this.ctx.beginPath();
    this.ctx.arc(-3, -3, 3, 0, Math.PI * 2);
    this.ctx.fill();
    
    this.ctx.fillStyle = 'black';
    this.ctx.beginPath();
    this.ctx.arc(-2, -3, 1.5, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Shield effect
    if (this.shieldActive) {
      this.ctx.strokeStyle = this.variation.theme.accentColor;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, this.bird.size + 5, 0, Math.PI * 2);
      this.ctx.stroke();
    }
    
    this.ctx.restore();
    this.ctx.globalAlpha = 1;
    
    // Draw UI
    this.ctx.fillStyle = this.variation.theme.primaryColor;
    this.ctx.font = '24px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Score: ${this.score}`, 10, 30);
    
    // Draw active power-ups
    let powerUpY = 60;
    if (this.shieldActive) {
      this.ctx.fillStyle = this.variation.theme.accentColor;
      this.ctx.fillText(`Shield: ${Math.ceil(this.shieldTime/60)}s`, 10, powerUpY);
      powerUpY += 30;
    }
    if (this.slowTimeActive) {
      this.ctx.fillStyle = this.variation.theme.accentColor;
      this.ctx.fillText(`Slow Time: ${Math.ceil(this.slowTimeRemaining/60)}s`, 10, powerUpY);
      powerUpY += 30;
    }
    if (this.doubleJumpActive && this.doubleJumpRemaining > 0) {
      this.ctx.fillStyle = this.variation.theme.accentColor;
      this.ctx.fillText(`Double Jump: ${this.doubleJumpRemaining}`, 10, powerUpY);
    }
    
    // Draw theme indicator
    this.ctx.fillStyle = this.variation.theme.primaryColor;
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`${this.variation.theme.name.toUpperCase()} THEME`, this.canvas.width - 10, 30);
    
    // Draw difficulty indicator
    this.ctx.fillText(`${this.variation.difficulty.level.toUpperCase()}`, this.canvas.width - 10, 60);
  }

  private gameOver() {
    this.gameRunning = false;
    
    // Game over screen
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.fillStyle = this.variation.theme.primaryColor;
    this.ctx.font = '48px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 30);
    
    this.ctx.fillStyle = this.variation.theme.accentColor;
    this.ctx.font = '24px Arial';
    this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 30);
    
    this.ctx.fillStyle = this.variation.theme.secondaryColor;
    this.ctx.font = '18px Arial';
    this.ctx.fillText('Click Restart to play again', this.canvas.width / 2, this.canvas.height / 2 + 70);
  }

  restart() {
    this.score = 0;
    this.shieldActive = false;
    this.slowTimeActive = false;
    this.doubleJumpActive = false;
    this.doubleJumpRemaining = 0;
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
