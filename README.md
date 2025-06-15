# arcade-noe

🎮 Arcade Variants POC — Refined Product Requirements Document

Purpose
Build a portable, Docker-packaged web arcade containing three classic games (Snake, Breakout, Flappy).
Each play-through receives a deterministic, server-supplied “variation seed” that tweaks rules and visuals so the game feels slightly different every time.
The project is deliberately minimal yet production-grade in engineering hygiene (TypeScript, TDD, linting, CI-ready).

⸻

1. High-Level Objectives

#	Objective	Success Metric
O-1	Player can open / and see three playable games	Games load & run in latest Chrome, Firefox, Safari, Edge
O-2	Each game instance varies (difficulty, colors, etc.)	Variation JSON delivered & applied ≥ 95 % of loads
O-3	Dev can clone, docker compose up, play in < 2 min	Setup time ≤ 2 min on clean machine
O-4	Codebase follows TDD & quality gates	All PRs blocked if tests ✕, lint ✕, types ✕


⸻

2. Use-Case Catalogue

ID	Actor	Goal	Acceptance Criteria
UC-01	Player	Browse landing page	Sees game thumbnails & “Play” buttons
UC-02	Player	Play game with variation	Game requests /api/variation/{gameId}, UI reflects returned values
UC-03	Dev	Add new variation rule	Add item to variation-rules.ts; tests pass with no other changes
UC-04	Dev	Track anonymous play session	Backend log prints {ts, gameId, seed} on every load
UC-05	DevOps	Run in one command	docker compose up exposes service on http://localhost:3000


⸻

3. Architecture Snapshot

            ┌───────────────┐      HTTP/JSON
            │  Frontend     │  ─────────────────▶  GET /api/variation/{gameId}
            │  (Vite app)   │  ◀────────────────  static assets /index.html
            └───────────────┘
                     ▲
                     │ Docker COPY (dist)
                     ▼
            ┌────────────────────────────┐
            │  Fastify  ·  Node 18-alpine│
            │  - Serves /dist           │
            │  - /api/variation         │
            │  - /api/session (POST)    │
            └────────────────────────────┘

Single container — no external DB; all state is in memory / console logs.

⸻

4. Detailed Requirements

4.1 Functional

Ref	Requirement
F-1	Games: Snake, Breakout, Flappy
F-2	Frontend requests variation JSON once per reload
F-3	Variation JSON contains: seed, ruleSet, theme
F-4	Game applies variation without reload / error
F-5	Backend logs gameId, seed, duration on /api/session POST

4.2 Non-Functional

Ref	Requirement
NF-1	Initial page payload < 250 kB gzipped
NF-2	Time-to-interactive < 2 s on localhost
NF-3	Codebase 100 % TypeScript; ESLint (Airbnb) clean
NF-4	Test coverage ≥ 80 % statements (Vitest)
NF-5	Container size ≤ 150 MB


⸻

5. Technology Choices

Layer	Tooling	Rationale
Front-end	Vite + Canvas + TS	Fast build, no React overhead
Back-end	Fastify	Ultra-light, types-first, 0-config
Testing	Vitest (unit) · Playwright (E2E smoke)	Same runner across FE/BE, headless browser sanity
Lint / Format	ESLint · Prettier · tsc --noEmit	
CI Skeleton	GitHub Actions (node-18, cache pnpm)	
Container	Multi-stage Dockerfile (build → runtime)	


⸻

6. Project Layout

/arcade-variants
├── apps/
│   ├── backend/            Fastify src, routes, tests
│   └── frontend/           Vite root (index.html, games/, styles/)
├── .github/workflows/ci.yml
├── docker-compose.yml      (optional local convenience)
├── Dockerfile
└── taskfile.yml            (task runner: dev, lint, test, build, prod)


⸻

7. Phase Plan (each ⇒ 1 PR, ≤ 2 hrs)

Phase	Title	Work Items	Definition of Done
P-0	Bootstrap	Init repo, monorepo tool (pnpm), eslint, prettier, vitest config, Taskfile, CI skeleton	task lint && task test green; empty Fastify “/ping” passes test
P-1	Landing UI	Static index.html, navigation JS, placeholder canvases	Playwright test verifies three “Play” buttons
P-2	Variation API	/api/variation/:id, deterministic RNG (seedrandom) + schema validation (zod)	Unit tests: valid JSON, same seed ⇒ same output
P-3	Snake Game	Canvas loop, arrow-key control, variation hooks (speed / color)	Unit test mocks variation & asserts state update; manual play works
P-4	Flappy Game	Gravity, obstacles, variation (gap, gravity)	Same test style
P-5	Breakout Game	Brick grid, paddle, variation (paddle size, ball speed)	Same test style
P-6	Session Logging	/api/session/:id POST; console log; vitest spies	API call from each game on load & game-over
P-7	Prod Docker	Multi-stage build; healthcheck; docs (README.md)	docker run -p 3000:3000 arcade-variants passes smoke E2E


⸻

8. Command Glossary

# Dev
pnpm i
task dev          # Vite + Fastify watch
task lint         # ESLint + Prettier check
task typecheck    # tsc --noEmit
task test         # Vitest unit
task e2e          # Playwright smoke

# Build / Run
task build        # Vite build + tsc + docker build
docker run -p 3000:3000 arcade-variants:latest


⸻

9. Risks & Mitigations

Risk	Mitigation
Unbounded variation rules complicate TDD	Keep rules in single variation-rules.ts with unit tests
Canvas game loop regressions	Decouple logic (unit-testable) from render layer
Container bloat	Use node:18-alpine; multi-stage to discard dev deps


⸻

10. Glossary

Term	Meaning
Variation Seed	Random integer sent by backend; fed into RNG so FE & BE remain deterministic
Taskfile	Simple cross-platform script runner (taskfile.yml)
TDD	Write failing test → implement → refactor, enforced per PR


⸻

Next Step

Proceed with Phase 0 Bootstrap?
I can generate the initial repo scaffold (pnpm, ESLint, Vitest, Dockerfile, Taskfile) so you can push the first PR immediately.
