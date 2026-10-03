/**
 * main.js - Master Game Loop, Input Controller, and Bootstrapper
 * Futebol de Tampinha
 */

class Game {
  constructor() {
    this.canvas = document.getElementById("gameCanvas");
    this.ctx = this.canvas.getContext("2d");

    // Virtual resolution (standard 16:10 / 16:9 pitch)
    this.width = 1100;
    this.height = 660;

    // High DPI scaling
    this.scale = 1;
    this.resizeCanvas();
    window.addEventListener("resize", () => this.resizeCanvas());

    // Initialize core subsystems
    this.save = new SaveManager();
    this.audio = new AudioManager();
    this.physics = new Physics({ substeps: 5, friction: 0.986 });
    this.vfx = new VFXManager();
    this.stadium = new Stadium('grass', this.width, this.height);
    this.match = new MatchManager(this.physics, this.stadium, this.vfx, this.audio, this.save);
    this.turn = new TurnManager(this.match, this.physics, this.vfx, this.audio);
    this.ai = new AIController('normal');
    this.tournament = new TournamentManager(this.save);
    this.ui = new UIManager(this.save, this.audio);

    // Global hooks
    window.game = this;
    window.tournament = this.tournament;
    window.ui = this.ui;

    // Connect UI callbacks
    this.ui.onStartMatch = (opts) => this.startMatch(opts);
    this.ui.onRestartMatch = () => this.restartMatch();
    this.ui.onQuitMatch = () => this.quitToMenu();

    this.match.onGameOver = (result) => {
      this.ui.showGameOver(result, this.match);
    };

    // Game modes & state
    this.isInMatch = false;
    this.isPaused = false;

    // Menu ambient simulation entities
    this.menuCaps = [];
    this.menuBall = null;
    this.initMenuSimulation();

    // Setup input handlers
    this.setupInput();

    // Start loop
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  resizeCanvas() {
    const container = document.getElementById("canvas-container") || document.body;
    const availWidth = window.innerWidth;
    const availHeight = window.innerHeight;

    const scaleX = availWidth / this.width;
    const scaleY = availHeight / this.height;
    this.scale = Math.min(scaleX, scaleY) * 0.96;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;

    this.canvas.style.width = `${this.width * this.scale}px`;
    this.canvas.style.height = `${this.height * this.scale}px`;

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  initMenuSimulation() {
    this.menuCaps = [
      new Cap({ x: 250, y: 200, team: 1, number: 10, primaryColor: "#facc15", secondaryColor: "#15803d", rimColor: "#1e40af", pattern: "solid" }),
      new Cap({ x: 350, y: 400, team: 1, number: 7, primaryColor: "#facc15", secondaryColor: "#15803d", rimColor: "#1e40af", pattern: "solid" }),
      new Cap({ x: 750, y: 250, team: 2, number: 9, primaryColor: "#ef4444", secondaryColor: "#18181b", rimColor: "#991b1b", pattern: "stripes" }),
      new Cap({ x: 820, y: 450, team: 2, number: 11, primaryColor: "#ef4444", secondaryColor: "#18181b", rimColor: "#991b1b", pattern: "stripes" }),
      new Cap({ x: 500, y: 180, team: 1, number: 1, isGoalkeeper: true, primaryColor: "#facc15", gkColor: "#eab308" }),
      new Cap({ x: 620, y: 480, team: 2, number: 1, isGoalkeeper: true, primaryColor: "#ef4444", gkColor: "#10b981" })
    ];
    this.menuBall = new Ball(this.width / 2, this.height / 2);

    // Give random gentle velocities
    for (const c of this.menuCaps) {
      c.vel.set((Math.random() - 0.5) * 120, (Math.random() - 0.5) * 120);
      c.angularVel = (Math.random() - 0.5) * 4;
    }
    this.menuBall.vel.set((Math.random() - 0.5) * 160, (Math.random() - 0.5) * 160);
  }

  startMatch(options = {}) {
    this.isInMatch = true;
    this.isPaused = false;
    this.ai.setDifficulty(options.difficulty || this.save.data.difficulty || 'normal');

    this.match.initMatch(options);
    this.turn.setTurn(1);

    this.ui.hideAllScreens();
    this.audio.playWhistle(1);
  }

  restartMatch() {
    this.startMatch({
      mode: this.match.mode,
      duration: this.match.totalDuration,
      stadium: this.stadium.theme,
      difficulty: this.ai.difficulty,
      team1: this.match.team1,
      team2: this.match.team2
    });
  }

  quitToMenu() {
    this.isInMatch = false;
    this.isPaused = false;
    this.physics.clearEntities();
    this.physics.clearSegments();
    this.physics.clearObstacles();
    this.vfx.clear();
    this.initMenuSimulation();
  }

  setupInput() {
    const getPos = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const x = (clientX - rect.left) / this.scale;
      const y = (clientY - rect.top) / this.scale;
      return { x, y };
    };

    // Pointer Down (Mouse click or finger touch)
    const onDown = (e) => {
      if (!this.isInMatch || this.isPaused || this.match.isGameOver) return;
      if (this.turn.state !== 'READY') return;

      // Only allow input if human turn
      const isHumanTurn = (this.turn.currentTurn === 1) || (this.turn.currentTurn === 2 && this.match.mode === '2p');
      if (!isHumanTurn) return;

      const p = getPos(e);
      const activeCaps = this.turn.currentTurn === 1 ? this.match.team1Caps : this.match.team2Caps;

      // Find if clicked on any cap belonging to active turn
      for (let i = 0; i < activeCaps.length; i++) {
        const cap = activeCaps[i];
        const dist = Math.hypot(cap.pos.x - p.x, cap.pos.y - p.y);
        if (dist <= cap.radius + 12) {
          this.turn.startAiming(cap, p.x, p.y);
          e.preventDefault();
          break;
        }
      }
    };

    // Pointer Move
    const onMove = (e) => {
      if (!this.isInMatch) return;
      const p = getPos(e);

      if (this.turn.state === 'AIMING') {
        this.turn.updateAiming(p.x, p.y);
        e.preventDefault();
      } else if (this.turn.state === 'READY') {
        // Hover feedback
        const activeCaps = this.turn.currentTurn === 1 ? this.match.team1Caps : this.match.team2Caps;
        for (const cap of activeCaps) {
          const dist = Math.hypot(cap.pos.x - p.x, cap.pos.y - p.y);
          cap.isHovered = (dist <= cap.radius + 10);
        }
      }
    };

    // Pointer Up
    const onUp = (e) => {
      if (this.turn.state === 'AIMING') {
        this.turn.releaseAiming();
        e.preventDefault();
      }
    };

    this.canvas.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);

    this.canvas.addEventListener("touchstart", onDown, { passive: false });
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp, { passive: false });
    window.addEventListener("touchcancel", onUp, { passive: false });

    // Keyboard Shortcuts
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" || e.key === "p" || e.key === "P") {
        if (this.isInMatch && !this.match.isGameOver) {
          this.ui.openPauseModal();
        }
      } else if (e.key === "r" || e.key === "R") {
        if (this.isInMatch && this.match.mode === 'training') {
          // Quick ball respawn in training
          this.match.ball.reset(this.width / 2, this.height / 2);
          this.vfx.showFloatingText("BOLA REPOSTA!", this.width / 2, this.height / 2 - 30, "#38bdf8", 24);
        }
      }
    });

    // Practice Mode Reposition Ball button
    const resetBallBtn = document.getElementById("btn-training-reset-ball");
    if (resetBallBtn) {
      resetBallBtn.addEventListener("click", () => {
        if (this.isInMatch) {
          this.match.ball.reset(this.width / 2, this.height / 2);
          this.audio.playWhistle(1);
          this.vfx.showFloatingText("BOLA REPOSTA!", this.width / 2, this.height / 2 - 30, "#38bdf8", 24);
        }
      });
    }
  }

  loop(currentTime) {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.05);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.loop(t));
  }

  update(dt) {
    this.vfx.update(dt);

    if (this.isInMatch) {
      if (!this.isPaused && !this.match.isGameOver) {
        // Step Physics simulation
        const stadiumFriction = this.stadium.config.friction;
        this.physics.update(dt, stadiumFriction);

        // Update Stadium animations
        this.stadium.update(dt);

        // Update Match logic
        this.match.update(dt);
        this.turn.update(dt);

        // AI Turn
        if (this.turn.currentTurn === 2 && this.match.mode !== '2p' && !this.match.isGameOver) {
          if (this.turn.state === 'READY' && !this.ai.isThinking) {
            this.ai.startTurn(
              this.match.team2Caps,
              this.match.ball,
              this.match.leftGoal,  // AI attacks Left Goal
              this.match.rightGoal, // AI defends Right Goal
              this.width,
              this.height
            );
          }
          this.ai.update(dt, (cap, impulse) => {
            this.turn.executeShot(cap, impulse);
          });
        }

        // Update HUD
        this.ui.updateHUD(this.match, this.turn);
      }
    } else {
      // Menu ambient physics
      this.updateMenuSimulation(dt);
    }
  }

  updateMenuSimulation(dt) {
    // Gentle collision and border bounce for menu caps
    const bounds = { left: 100, right: 1000, top: 50, bottom: 610 };
    const all = [...this.menuCaps, this.menuBall];

    for (const ent of all) {
      ent.pos.x += ent.vel.x * dt;
      ent.pos.y += ent.vel.y * dt;
      ent.angle = (ent.angle || 0) + (ent.angularVel || 0) * dt;

      // Bounce off borders
      if (ent.pos.x - ent.radius < bounds.left) {
        ent.pos.x = bounds.left + ent.radius;
        ent.vel.x = -ent.vel.x * 0.95;
      }
      if (ent.pos.x + ent.radius > bounds.right) {
        ent.pos.x = bounds.right - ent.radius;
        ent.vel.x = -ent.vel.x * 0.95;
      }
      if (ent.pos.y - ent.radius < bounds.top) {
        ent.pos.y = bounds.top + ent.radius;
        ent.vel.y = -ent.vel.y * 0.95;
      }
      if (ent.pos.y + ent.radius > bounds.bottom) {
        ent.pos.y = bounds.bottom - ent.radius;
        ent.vel.y = -ent.vel.y * 0.95;
      }

      // Keep minimum movement
      if (ent.vel.mag() < 30) {
        ent.vel.add(new Vector((Math.random() - 0.5) * 50, (Math.random() - 0.5) * 50));
      }
    }

    // Pairwise bounces
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];
        const dist = a.pos.dist(b.pos);
        const minDist = a.radius + b.radius;
        if (dist < minDist && dist > 0) {
          const normal = Vector.sub(b.pos, a.pos).normalize();
          const overlap = minDist - dist;
          a.pos.sub(Vector.mult(normal, overlap * 0.5));
          b.pos.add(Vector.mult(normal, overlap * 0.5));

          const vRel = Vector.sub(b.vel, a.vel);
          const vn = vRel.dot(normal);
          if (vn < 0) {
            const imp = Vector.mult(normal, -vn * 0.85);
            a.vel.sub(imp);
            b.vel.add(imp);
          }
        }
      }
    }
  }

  render() {
    this.ctx.save();

    // Clear Screen
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Apply Camera Screen Shake
    if (this.vfx.shakeTrauma > 0) {
      this.ctx.translate(this.vfx.shakeOffsetX, this.vfx.shakeOffsetY);
    }

    if (this.isInMatch) {
      // 1. Draw Stadium (Ground, Markings, Walls)
      this.stadium.draw(this.ctx);

      // 2. Draw Match Entities (Goals, Caps, Ball, Targets)
      this.match.draw(this.ctx);

      // 3. Draw Player Aiming Trajectory & Slingshot Guide
      this.turn.drawAiming(this.ctx);

      // 4. Draw AI Aiming Laser preview
      this.ai.drawAimingPreview(this.ctx);

      // 5. Draw VFX (Particles, Confetti, Floating text)
      this.vfx.draw(this.ctx);
    } else {
      // Draw Menu background stadium & floating caps
      this.stadium.draw(this.ctx);
      for (const cap of this.menuCaps) cap.draw(this.ctx);
      this.menuBall.draw(this.ctx);
      this.vfx.draw(this.ctx);
    }

    this.ctx.restore();
  }
}

// Bootstrap when DOM is loaded
window.addEventListener("DOMContentLoaded", () => {
  new Game();
});
