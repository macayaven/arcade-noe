# 🚀 Quick Setup Guide - Arcade Variation System

*Get the demo running in under 2 minutes*

## 📋 **Prerequisites**

```bash
# Check if you have Node.js 18+ installed
node --version  # Should be 18.0.0 or higher

# Check if you have pnpm installed
pnpm --version  # If not installed, run: npm install -g pnpm
```

## ⚡ **Installation Steps**

### **Step 1: Clone & Navigate**
```bash
git clone <repository-url>
cd arcade-noe
```

### **Step 2: Install Dependencies**
```bash
# Install all dependencies for monorepo
pnpm install
```
*This installs dependencies for both frontend and backend automatically*

### **Step 3: Start Development Servers**
```bash
# Start both frontend (port 3000) and backend (port 3002)
task dev
```

**Alternative if you don't have task runner:**
```bash
# Terminal 1 - Backend
cd apps/backend && pnpm dev

# Terminal 2 - Frontend  
cd apps/frontend && pnpm dev
```

### **Step 4: Open in Browser**
```bash
# Open your browser to:
http://localhost:3000
```

## 🎮 **Verify Installation**

### **✅ Success Indicators:**
- Frontend loads at `http://localhost:3000`
- You see 3 game options: Snake, Breakout, Flappy Bird
- Each game shows different themes/variations on refresh
- Backend API responds at `http://localhost:3002/api/variation/snake`

### **🎯 Test the Variation System:**
1. **Click any game** → Note the theme and difficulty displayed
2. **Click "Menu"** to go back
3. **Click the same game again** → Different theme/variation!
4. **Try all 3 games** → Each has unique visual styles

## 🛠️ **Development Commands**

```bash
# Linting & Quality Checks
task lint       # ESLint + Prettier
task typecheck  # TypeScript validation
task test       # Run unit tests

# Production Build
task build      # Build both frontend and backend

# Individual Package Commands
pnpm --filter frontend dev    # Frontend only
pnpm --filter backend dev     # Backend only
```

## 🔧 **Troubleshooting**

### **Common Issues:**

#### **Port Already in Use**
```bash
# Kill processes on ports 3000/3002
lsof -ti:3000 | xargs kill -9
lsof -ti:3002 | xargs kill -9
```

#### **Dependencies Issues**
```bash
# Clean install
rm -rf node_modules apps/*/node_modules
pnpm install
```

#### **Task Command Not Found**
```bash
# Install task globally
npm install -g @go-task/cli
# OR use npm scripts directly
npm run dev
```

## 🏗️ **Architecture Overview**

### **Project Structure**
```
arcade-noe/
├── apps/
│   ├── backend/          # Fastify API (Port 3002)
│   │   ├── src/
│   │   │   ├── index.ts      # Server entry
│   │   │   └── variation.ts  # Variation engine
│   │   └── package.json
│   └── frontend/         # Vite SPA (Port 3000)
│       ├── src/
│       │   ├── main.ts       # App entry
│       │   └── games/        # Game implementations
│       └── package.json
├── Taskfile.yml          # Task runner config
└── package.json          # Monorepo root
```

### **Technology Stack**
- **🎯 Frontend**: Vite + TypeScript + Canvas API
- **⚡ Backend**: Fastify + TypeScript + Zod validation
- **📦 Package Manager**: pnpm with workspaces
- **🔧 Development**: Task runner + ESLint + Prettier

## 🎯 **Quick Demo Script**

### **For Presentations (30 seconds):**

1. **Open browser** → `http://localhost:3000`
2. **Click "Snake"** → Show the theme and modifiers
3. **Play briefly** → Demonstrate particle effects and game mechanics
4. **Go back to menu** → Click Snake again → New variation!
5. **Try Breakout** → Different theme entirely
6. **Open new tab** → `http://localhost:3002/api/variation/snake` → Show raw API

**Key Message**: *"Same game, completely different experience every time!"*

## 📱 **API Testing**

### **Quick API Endpoints:**
```bash
# Get Snake variation
curl http://localhost:3002/api/variation/snake

# Get Breakout variation  
curl http://localhost:3002/api/variation/breakout

# Get Flappy variation
curl http://localhost:3002/api/variation/flappy
```

### **Expected Response:**
```json
{
  "seed": "0.12345",
  "theme": {
    "name": "neon",
    "primaryColor": "#00FFFF",
    "secondaryColor": "#FF0080"
  },
  "difficulty": {
    "level": "hard",
    "speedMultiplier": 1.3
  },
  "modifiers": ["ghostMode", "doubleScore"]
}
```

---

## 🎉 **You're Ready!**

The arcade is now running with infinite variations. Each refresh creates a new gaming experience!

**🎮 Enjoy the demo and watch the magic of deterministic variation in action!**