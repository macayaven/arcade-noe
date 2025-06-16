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
    gridSize?: number;
    foodTypes?: number;
    wallBehavior?: string;
    snakePattern?: string;
    powerUps?: boolean;
    maxLength?: number;
  };
}

interface Position {
  x: number;
  y: number;
}

interface Food {
  x: number;
  y: number;
  type: number;
  value: number;
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

interface SoundEffect {
  text: string;
  x: number;
  y: number;
  life: number;
  color: string;
}

export class SnakeGame {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private variation: GameVariation;
  private snake: Position[] = [];
  private foods: Food[] = [];
  private particles: Particle[] = [];
  private soundEffects: SoundEffect[] = [];
  private direction: Position = { x: 1, y: 0 };
  private gameRunning = false;
  private score = 0;
  private combo = 0;
  private gameLoop: ReturnType<typeof requestAnimationFrame> | null = null;
  private lastUpdateTime = 0;
  private shakeIntensity = 0;
  
  // Enhanced game settings based on variations
  private gridSize = 20;
  private gameSpeed = 80; // Reduced from 150ms to 80ms for faster gameplay
  private scoreMultiplier = 1;
  private maxFoods = 1;
  private isInverted = false;
  private hasGhostMode = false;
  private ghostModeTimer = 0;

  constructor(canvas: HTMLCanvasElement, variation: GameVariation) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.variation = variation;
    
    this.applyVariations();
    this.setupEventListeners();
    this.initGame();
  }

  private applyVariations() {
    // Apply theme
    this.canvas.style.backgroundColor = this.variation.theme.backgroundColor;
    
    // Apply game-specific variations
    if (this.variation.gameSpecific.gridSize) {
      this.gridSize = this.variation.gameSpecific.gridSize;
    }
    
    // Apply difficulty
    this.gameSpeed = Math.floor(80 / this.variation.difficulty.speedMultiplier); // Updated base from 150 to 80
    this.scoreMultiplier = 1 + this.variation.difficulty.complexityBonus;
    
    // Apply modifiers
    if (this.variation.modifiers.includes('doubleScore')) {
      this.scoreMultiplier *= 2;
    }
    
    if (this.variation.modifiers.includes('fastStart')) {
      this.gameSpeed = Math.floor(this.gameSpeed * 0.7);
    }
    
    if (this.variation.modifiers.includes('slowMotion')) {
      this.gameSpeed = Math.floor(this.gameSpeed * 1.5);
    }
    
    if (this.variation.modifiers.includes('invertedControls')) {
      this.isInverted = true;
    }
    
    if (this.variation.modifiers.includes('ghostMode')) {
      this.hasGhostMode = true;
    }
    
    // Multiple food types
    this.maxFoods = this.variation.gameSpecific.foodTypes || 1;
  }

  private getSnakeColor(): string {
    if (this.variation.gameSpecific.snakePattern === 'striped') {
      return this.variation.theme.primaryColor;
    }
    return this.variation.theme.primaryColor;
  }

  private getSnakeHeadColor(): string {
    return this.variation.theme.accentColor;
  }

  private getFoodColor(type: number): string {
    const colors = [
      this.variation.theme.secondaryColor,
      this.variation.theme.accentColor,
      this.variation.theme.primaryColor,
    ];
    return colors[type % colors.length];
  }

  private initGame() {
    // Initialize snake in center
    const centerX = Math.floor((this.canvas.width / this.gridSize) / 2);
    const centerY = Math.floor((this.canvas.height / this.gridSize) / 2);
    
    this.snake = [
      { x: centerX, y: centerY },
      { x: centerX - 1, y: centerY },
      { x: centerX - 2, y: centerY }
    ];
    
    this.direction = { x: 1, y: 0 };
    this.score = 0;
    this.foods = [];
    this.ghostModeTimer = 0;
    
    // Generate initial foods
    for (let i = 0; i < this.maxFoods; i++) {
      this.generateFood();
    }
  }

  private setupEventListeners() {
    document.addEventListener('keydown', (e) => {
      if (!this.gameRunning) return;
      
      let newDirection = { ...this.direction };
      
      switch (e.key) {
        case 'ArrowUp':
          if (this.direction.y === 0) newDirection = { x: 0, y: -1 };
          break;
        case 'ArrowDown':
          if (this.direction.y === 0) newDirection = { x: 0, y: 1 };
          break;
        case 'ArrowLeft':
          if (this.direction.x === 0) newDirection = { x: -1, y: 0 };
          break;
        case 'ArrowRight':
          if (this.direction.x === 0) newDirection = { x: 1, y: 0 };
          break;
      }
      
      // Apply inverted controls if modifier is active
      if (this.isInverted) {
        newDirection.x *= -1;
        newDirection.y *= -1;
      }
      
      this.direction = newDirection;
    });
  }

  private generateFood() {
    const maxX = Math.floor(this.canvas.width / this.gridSize);
    const maxY = Math.floor(this.canvas.height / this.gridSize);
    
    let attempts = 0;
    let food: Food;
    
    do {
      food = {
        x: Math.floor(Math.random() * maxX),
        y: Math.floor(Math.random() * maxY),
        type: Math.floor(Math.random() * (this.variation.gameSpecific.foodTypes || 1)),
        value: 10 + (Math.floor(Math.random() * 3) * 5) // 10, 15, or 20 points
      };
      attempts++;
    } while (
      attempts < 100 && 
      (this.snake.some(segment => segment.x === food.x && segment.y === food.y) ||
       this.foods.some(f => f.x === food.x && f.y === food.y))
    );
    
    this.foods.push(food);
  }

  private update() {
    if (!this.gameRunning) return;

    // Update ghost mode timer
    if (this.hasGhostMode && this.ghostModeTimer > 0) {
      this.ghostModeTimer--;
    }

    // Move snake
    const head = { ...this.snake[0] };
    head.x += this.direction.x;
    head.y += this.direction.y;

    // Handle wall behavior
    const maxX = Math.floor(this.canvas.width / this.gridSize);
    const maxY = Math.floor(this.canvas.height / this.gridSize);
    
    if (this.variation.gameSpecific.wallBehavior === 'wrap') {
      // Wrapping walls
      if (head.x < 0) head.x = maxX - 1;
      if (head.x >= maxX) head.x = 0;
      if (head.y < 0) head.y = maxY - 1;
      if (head.y >= maxY) head.y = 0;
    } else {
      // Solid walls - default behavior (ensure collision detection works)
      if (head.x < 0 || head.x >= maxX || head.y < 0 || head.y >= maxY) {
        console.log('Snake hit wall at:', head.x, head.y, 'bounds:', maxX, maxY);
        this.gameOver();
        return;
      }
    }

    // Check self collision (unless in ghost mode)
    if (this.ghostModeTimer === 0 && this.snake.some(segment => segment.x === head.x && segment.y === head.y)) {
      this.gameOver();
      return;
    }

    this.snake.unshift(head);

    // Check food collision
    let foodEaten = false;
    for (let i = this.foods.length - 1; i >= 0; i--) {
      const food = this.foods[i];
      if (head.x === food.x && head.y === food.y) {
        const points = Math.floor(food.value * this.scoreMultiplier);
        this.score += points;
        this.combo++;
        this.foods.splice(i, 1);
        foodEaten = true;
        
        // 🎆 PARTICLE EXPLOSION!
        this.createFoodParticles(food.x * this.gridSize + this.gridSize/2, food.y * this.gridSize + this.gridSize/2, food.type);
        
        // Screen shake for epic feel!
        this.shakeIntensity = 8;
        
        // 🔊 Visual "sound" effect!
        this.showSoundEffect(`CHOMP! +${points}`, food.x * this.gridSize, food.y * this.gridSize);
        
        // Activate ghost mode temporarily if modifier is present
        if (this.hasGhostMode) {
          this.ghostModeTimer = 30; // 30 frames of ghost mode
        }
        
        // Generate new food
        if (this.foods.length < this.maxFoods) {
          this.generateFood();
        }
      }
    }

    if (!foodEaten) {
      this.snake.pop();
    }
    
    // Check max length limit
    const maxLength = this.variation.gameSpecific.maxLength || 999;
    if (this.snake.length > maxLength) {
      this.snake.pop();
    }

    // Maintain food count
    while (this.foods.length < this.maxFoods) {
      this.generateFood();
    }
    
    // Update particles and effects
    this.updateParticles();
    this.updateSoundEffects();
    
    // Reduce screen shake
    if (this.shakeIntensity > 0) {
      this.shakeIntensity *= 0.9;
      if (this.shakeIntensity < 0.1) this.shakeIntensity = 0;
    }
  }

  private createFoodParticles(x: number, y: number, foodType: number) {
    const colors = [this.variation.theme.secondaryColor, this.variation.theme.accentColor, this.variation.theme.primaryColor];
    const particleColor = colors[foodType % colors.length];
    
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30,
        maxLife: 30,
        color: particleColor,
        size: 2 + Math.random() * 3
      });
    }
  }

  private updateParticles() {
    this.particles = this.particles.filter(particle => {
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vx *= 0.98;
      particle.vy *= 0.98;
      particle.life--;
      return particle.life > 0;
    });
  }

  private showSoundEffect(text: string, x: number, y: number) {
    this.soundEffects.push({
      text,
      x,
      y: y - 20,
      life: 40,
      color: this.variation.theme.accentColor
    });
  }

  private updateSoundEffects() {
    this.soundEffects = this.soundEffects.filter(effect => {
      effect.y -= 1;
      effect.life--;
      return effect.life > 0;
    });
  }

  private draw() {
    // Apply screen shake
    this.ctx.save();
    if (this.shakeIntensity > 0) {
      const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
      const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
      this.ctx.translate(shakeX, shakeY);
    }
    
    // Clear canvas with gradient background for style!
    const gradient = this.ctx.createLinearGradient(0, 0, this.canvas.width, this.canvas.height);
    gradient.addColorStop(0, this.variation.theme.backgroundColor);
    gradient.addColorStop(1, this.adjustBrightness(this.variation.theme.backgroundColor, -20));
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw snake with pattern
    this.snake.forEach((segment, index) => {
      const isHead = index === 0;
      const isGhost = this.ghostModeTimer > 0;
      
      if (isHead) {
        this.ctx.fillStyle = this.getSnakeHeadColor();
      } else if (this.variation.gameSpecific.snakePattern === 'striped' && index % 2 === 0) {
        this.ctx.fillStyle = this.variation.theme.secondaryColor;
      } else {
        this.ctx.fillStyle = this.getSnakeColor();
      }
      
      // Apply ghost mode transparency
      if (isGhost) {
        this.ctx.globalAlpha = 0.5;
      }
      
      this.ctx.fillRect(
        segment.x * this.gridSize + 1,
        segment.y * this.gridSize + 1,
        this.gridSize - 2,
        this.gridSize - 2
      );
      
      // Add glow effect for certain themes
      if (this.variation.theme.name === 'neon' || this.variation.theme.name === 'cosmic') {
        this.ctx.shadowColor = this.ctx.fillStyle as string;
        this.ctx.shadowBlur = 10;
        this.ctx.fillRect(
          segment.x * this.gridSize + 1,
          segment.y * this.gridSize + 1,
          this.gridSize - 2,
          this.gridSize - 2
        );
        this.ctx.shadowBlur = 0;
      }
      
      this.ctx.globalAlpha = 1;
    });

    // Draw foods with different styles
    this.foods.forEach(food => {
      this.ctx.fillStyle = this.getFoodColor(food.type);
      
      if (food.type === 0) {
        // Regular food - circle
        this.ctx.beginPath();
        this.ctx.arc(
          food.x * this.gridSize + this.gridSize / 2,
          food.y * this.gridSize + this.gridSize / 2,
          this.gridSize / 3,
          0,
          Math.PI * 2
        );
        this.ctx.fill();
      } else if (food.type === 1) {
        // Special food - diamond
        const centerX = food.x * this.gridSize + this.gridSize / 2;
        const centerY = food.y * this.gridSize + this.gridSize / 2;
        const size = this.gridSize / 3;
        
        this.ctx.beginPath();
        this.ctx.moveTo(centerX, centerY - size);
        this.ctx.lineTo(centerX + size, centerY);
        this.ctx.lineTo(centerX, centerY + size);
        this.ctx.lineTo(centerX - size, centerY);
        this.ctx.closePath();
        this.ctx.fill();
      } else {
        // Bonus food - star
        this.drawStar(
          food.x * this.gridSize + this.gridSize / 2,
          food.y * this.gridSize + this.gridSize / 2,
          this.gridSize / 4
        );
      }
    });

    // 🎆 Draw particles BEFORE UI
    this.particles.forEach(particle => {
      const alpha = particle.life / particle.maxLife;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = particle.color;
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, particle.size * alpha, 0, Math.PI * 2);
      this.ctx.fill();
    });
    this.ctx.globalAlpha = 1;

    // ✨ Draw sound effects!
    this.soundEffects.forEach(effect => {
      const alpha = effect.life / 40;
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = effect.color;
      this.ctx.font = 'bold 16px Arial';
      this.ctx.fillText(effect.text, effect.x, effect.y);
    });
    this.ctx.globalAlpha = 1;

    // Draw UI with theme colors and COMBO system!
    this.ctx.fillStyle = this.variation.theme.accentColor;
    this.ctx.font = 'bold 24px Arial';
    this.ctx.fillText(`Score: ${this.score}`, 10, 35);
    
    // COMBO display!
    if (this.combo > 1) {
      this.ctx.fillStyle = this.variation.theme.primaryColor;
      this.ctx.font = 'bold 18px Arial';
      this.ctx.fillText(`COMBO x${this.combo}!`, 10, 60);
    }
    
    // Show active modifiers with better styling
    if (this.variation.modifiers.length > 0) {
      this.ctx.font = '14px Arial';
      this.ctx.fillStyle = this.variation.theme.secondaryColor;
      this.ctx.fillText(`Active: ${this.variation.modifiers.join(' • ')}`, 10, 55);
    }
    
    // Show theme and difficulty
    this.ctx.font = '12px Arial';
    this.ctx.fillStyle = this.variation.theme.primaryColor;
    this.ctx.fillText(`${this.variation.theme.name.toUpperCase()} • ${this.variation.difficulty.level.toUpperCase()}`, 10, 75);
    
    // Ghost mode indicator
    if (this.ghostModeTimer > 0) {
      this.ctx.fillStyle = this.variation.theme.accentColor;
      this.ctx.font = '16px Arial';
      this.ctx.fillText('👻 GHOST MODE', 10, 100);
    }
    
    this.ctx.restore(); // Restore screen shake transform
  }

  private adjustBrightness(color: string, amount: number): string {
    // Simple brightness adjustment for gradient
    if (color.startsWith('#')) {
      const num = parseInt(color.slice(1), 16);
      const r = Math.max(0, Math.min(255, (num >> 16) + amount));
      const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
      const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
      return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    }
    return color;
  }

  private drawStar(x: number, y: number, radius: number) {
    this.ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 2 * Math.PI) / 5 - Math.PI / 2;
      const x1 = x + Math.cos(angle) * radius;
      const y1 = y + Math.sin(angle) * radius;
      
      if (i === 0) {
        this.ctx.moveTo(x1, y1);
      } else {
        this.ctx.lineTo(x1, y1);
      }
      
      const angle2 = ((i + 0.5) * 2 * Math.PI) / 5 - Math.PI / 2;
      const x2 = x + Math.cos(angle2) * (radius * 0.5);
      const y2 = y + Math.sin(angle2) * (radius * 0.5);
      this.ctx.lineTo(x2, y2);
    }
    this.ctx.closePath();
    this.ctx.fill();
  }

  private gameOver() {
    this.gameRunning = false;
    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop);
      this.gameLoop = null;
    }

    // EPIC EXPLOSION PARTICLES!
    for (let i = 0; i < 50; i++) {
      this.particles.push({
        x: this.canvas.width / 2,
        y: this.canvas.height / 2,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 60,
        maxLife: 60,
        color: [this.variation.theme.primaryColor, this.variation.theme.secondaryColor, this.variation.theme.accentColor][Math.floor(Math.random() * 3)],
        size: 3 + Math.random() * 5
      });
    }

    // Animated game over message
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    this.ctx.fillStyle = this.variation.theme.accentColor;
    this.ctx.font = 'bold 56px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.shadowColor = this.variation.theme.primaryColor;
    this.ctx.shadowBlur = 10;
    this.ctx.fillText('💥 GAME OVER 💥', this.canvas.width / 2, this.canvas.height / 2 - 60);
    
    this.ctx.shadowBlur = 0;
    this.ctx.font = 'bold 28px Arial';
    this.ctx.fillStyle = this.variation.theme.primaryColor;
    this.ctx.fillText(`🏆 Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 10);
    
    if (this.combo > 5) {
      this.ctx.fillStyle = this.variation.theme.accentColor;
      this.ctx.fillText(`🔥 Max Combo: ${this.combo}!`, this.canvas.width / 2, this.canvas.height / 2 + 45);
    }
    
    this.ctx.font = '18px Arial';
    this.ctx.fillStyle = this.variation.theme.secondaryColor;
    this.ctx.fillText('Click Restart to play again', this.canvas.width / 2, this.canvas.height / 2 + 85);
    
    this.ctx.textAlign = 'left';
  }

  public start() {
    this.gameRunning = true;
    this.lastUpdateTime = Date.now();
    this.gameLoop = requestAnimationFrame(this.animate.bind(this));
  }

  private animate() {
    if (!this.gameRunning) return;
    
    try {
      const currentTime = Date.now();
      const deltaTime = currentTime - this.lastUpdateTime;
      
      // Only update at the specified game speed interval
      if (deltaTime >= this.gameSpeed) {
        this.update();
        this.draw();
        this.lastUpdateTime = currentTime;
      }
      
      this.gameLoop = requestAnimationFrame(this.animate.bind(this));
    } catch (error) {
      console.error('Snake game error:', error);
      this.gameOver();
    }
  }

  public restart() {
    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop);
    }
    this.combo = 0;
    this.particles = [];
    this.soundEffects = [];
    this.shakeIntensity = 0;
    this.initGame();
    this.start();
  }

  public destroy() {
    this.gameRunning = false;
    if (this.gameLoop) {
      cancelAnimationFrame(this.gameLoop);
      this.gameLoop = null;
    }
  }
}
