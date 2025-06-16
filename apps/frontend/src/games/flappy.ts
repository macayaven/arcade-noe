interface GameVariation {
  seed: string;
  ruleSet: 'standard' | 'custom';
  theme: 'light' | 'dark' | 'system';
}

interface Pipe {
  x: number;
  topHeight: number;
  bottomY: number;
  width: number;
  passed: boolean;
}

export class FlappyGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private variation: GameVariation;
  private gameRunning = false;
  private score = 0;
  private animationId: number | null = null;
  
  // Game objects
  private bird = { x: 100, y: 300, velocity: 0, radius: 20 };
  private pipes: Pipe[] = [];
  private gravity = 0.5;
  private jumpPower = -10;
  private pipeSpeed = 2;
  private pipeGap = 150;
  private pipeWidth = 60;
  private pipeSpacing = 300;

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
      case 'dark': return '#1a1a2e';
      case 'light': return '#87CEEB';
      default: return '#4A90E2';
    }
  }

  private getBirdColor(): string {
    switch (this.variation.theme) {
      case 'dark': return '#FFD700';
      case 'light': return '#FF6B35';
      default: return '#FFA500';
    }
  }

  private getPipeColor(): string {
    switch (this.variation.theme) {
      case 'dark': return '#2E8B57';
      case 'light': return '#228B22';
      default: return '#32CD32';
    }
  }

  private initGame() {
    this.bird.x = 100;
    this.bird.y = this.canvas.height / 2;
    this.bird.velocity = 0;
    this.pipes = [];
    this.score = 0;
    
    // Apply variation rules
    if (this.variation.ruleSet === 'custom') {
      this.pipeGap = 130; // Smaller gap for more challenge
      this.pipeSpeed = 2.5; // Slightly faster
    } else {
      this.pipeGap = 150;
      this.pipeSpeed = 2;
    }
    
    // Create initial pipes
    this.createPipe(this.canvas.width);
    this.createPipe(this.canvas.width + this.pipeSpacing);
  }

  private setupEventListeners() {
    const jump = () => {
      if (this.gameRunning) {
        this.bird.velocity = this.jumpPower;
      }
    };
    
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    });
    
    this.canvas.addEventListener('click', jump);
  }

  private createPipe(x: number) {
    const minHeight = 50;
    const maxHeight = this.canvas.height - this.pipeGap - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
    
    this.pipes.push({
      x: x,
      topHeight: topHeight,
      bottomY: topHeight + this.pipeGap,
      width: this.pipeWidth,
      passed: false
    });
  }

  private update() {
    if (!this.gameRunning) return;

    // Update bird physics
    this.bird.velocity += this.gravity;
    this.bird.y += this.bird.velocity;

    // Check ground and ceiling collision
    if (this.bird.y + this.bird.radius >= this.canvas.height || this.bird.y - this.bird.radius <= 0) {
      this.gameOver();
      return;
    }

    // Update pipes
    for (let i = this.pipes.length - 1; i >= 0; i--) {
      const pipe = this.pipes[i];
      pipe.x -= this.pipeSpeed;

      // Check collision with pipe
      if (this.bird.x + this.bird.radius > pipe.x &&
          this.bird.x - this.bird.radius < pipe.x + pipe.width) {
        
        if (this.bird.y - this.bird.radius < pipe.topHeight ||
            this.bird.y + this.bird.radius > pipe.bottomY) {
          this.gameOver();
          return;
        }
      }

      // Check if bird passed pipe
      if (!pipe.passed && this.bird.x > pipe.x + pipe.width) {
        pipe.passed = true;
        this.score++;
        
        // Custom rule bonus
        if (this.variation.ruleSet === 'custom') {
          this.score++; // Extra point for custom rules
        }
      }

      // Remove pipes that are off screen
      if (pipe.x + pipe.width < 0) {
        this.pipes.splice(i, 1);
      }
    }

    // Add new pipes
    const lastPipe = this.pipes[this.pipes.length - 1];
    if (lastPipe && lastPipe.x < this.canvas.width - this.pipeSpacing) {
      this.createPipe(this.canvas.width);
    }
  }

  private draw() {
    // Clear canvas with gradient background
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    if (this.variation.theme === 'dark') {
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#16213e');
    } else if (this.variation.theme === 'light') {
      gradient.addColorStop(0, '#87CEEB');
      gradient.addColorStop(1, '#4682B4');
    } else {
      gradient.addColorStop(0, '#4A90E2');
      gradient.addColorStop(1, '#357ABD');
    }
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw pipes
    this.ctx.fillStyle = this.getPipeColor();
    for (const pipe of this.pipes) {
      // Top pipe
      this.ctx.fillRect(pipe.x, 0, pipe.width, pipe.topHeight);
      
      // Bottom pipe
      this.ctx.fillRect(pipe.x, pipe.bottomY, pipe.width, this.canvas.height - pipe.bottomY);
      
      // Pipe caps
      this.ctx.fillStyle = '#228B22';
      this.ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, pipe.width + 10, 20);
      this.ctx.fillRect(pipe.x - 5, pipe.bottomY, pipe.width + 10, 20);
      this.ctx.fillStyle = this.getPipeColor();
    }

    // Draw bird
    this.ctx.fillStyle = this.getBirdColor();
    this.ctx.beginPath();
    this.ctx.arc(this.bird.x, this.bird.y, this.bird.radius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Bird eye
    this.ctx.fillStyle = '#000';
    this.ctx.beginPath();
    this.ctx.arc(this.bird.x + 8, this.bird.y - 5, 3, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Bird beak
    this.ctx.fillStyle = '#FFA500';
    this.ctx.beginPath();
    this.ctx.moveTo(this.bird.x + this.bird.radius, this.bird.y);
    this.ctx.lineTo(this.bird.x + this.bird.radius + 10, this.bird.y - 5);
    this.ctx.lineTo(this.bird.x + this.bird.radius + 10, this.bird.y + 5);
    this.ctx.fill();

    // Draw score
    this.ctx.fillStyle = this.variation.theme === 'light' ? '#000' : '#fff';
    this.ctx.font = '32px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(this.score.toString(), this.canvas.width / 2, 50);
    this.ctx.textAlign = 'left';
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

  private gameLoop = () => {
    this.update();
    this.draw();
    
    if (this.gameRunning) {
      this.animationId = requestAnimationFrame(this.gameLoop);
    }
  };

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
