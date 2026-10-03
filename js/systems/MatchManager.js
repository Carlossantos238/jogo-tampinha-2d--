/**
 * MatchManager.js - Orchestrates Match Flow, Formations, Score,
 * Timer, Training Targets, and Post-Match Statistics.
 * Futebol de Tampinha
 */

class MatchManager {
  constructor(physics, stadium, vfx, audio, save) {
    this.physics = physics;
    this.stadium = stadium;
    this.vfx = vfx;
    this.audio = audio;
    this.save = save;

    this.fieldWidth = stadium.width;
    this.fieldHeight = stadium.height;

    // Goals
    this.leftGoal = new Goal('left', this.fieldWidth, this.fieldHeight);
    this.rightGoal = new Goal('right', this.fieldWidth, this.fieldHeight);

    // Ball
    this.ball = new Ball(this.fieldWidth / 2, this.fieldHeight / 2);

    // Teams Caps Arrays
    this.team1Caps = [];
    this.team2Caps = [];

    // Match State
    this.mode = 'quick'; // 'quick', '2p', 'tournament', 'training'
    this.matchTime = 120; // seconds remaining
    this.totalDuration = 120;
    this.isPaused = false;
    this.isGameOver = false;

    // Scores
    this.team1Score = 0;
    this.team2Score = 0;

    // Teams Info
    this.team1 = { name: "Time 1", primaryColor: "#2563eb", secondaryColor: "#ffffff", rimColor: "#1d4ed8", skin: "plastic", decal: null };
    this.team2 = { name: "Time 2", primaryColor: "#dc2626", secondaryColor: "#ffffff", rimColor: "#b91c1c", skin: "plastic", decal: null };

    // Match Statistics
    this.stats = {
      shotsT1: 0,
      shotsT2: 0,
      savesT1: 0,
      savesT2: 0,
      collisionsCount: 0,
      maxSpeedPx: 0,
      trainingScore: 0
    };

    // Training Cones and Targets
    this.trainingCones = [];
    this.trainingTargets = [];

    // Setup collision listeners
    this.setupCollisionCallbacks();
  }

  setupCollisionCallbacks() {
    this.physics.onCollision = (a, b, normal, speed) => {
      this.stats.collisionsCount++;
      if (a.isCap && b.isCap) {
        this.audio.playClack(speed);
        this.vfx.emitCollisionSparks((a.pos.x + b.pos.x) / 2, (a.pos.y + b.pos.y) / 2, speed);
      } else if (a.isBall || b.isBall) {
        this.audio.playBallKick(speed);
        const ball = a.isBall ? a : b;
        const cap = a.isCap ? a : b;
        if (cap && cap.isGoalkeeper && speed > 120) {
          // Goalkeeper Save recorded!
          if (cap.team === 1) this.stats.savesT1++;
          else this.stats.savesT2++;
          this.audio.playSave();
          this.vfx.showFloatingText("DEFESA!", cap.pos.x, cap.pos.y - 25, "#38bdf8", 32);
        }
      }
    };

    this.physics.onWallCollision = (entity, seg, speed) => {
      this.audio.playWallHit(speed);
    };

    this.physics.onObstacleCollision = (entity, obs, speed) => {
      if (obs.type === 'post') {
        this.audio.playPostHit(speed);
        this.vfx.addScreenShake(0.4);
        this.vfx.showFloatingText("NA TRAVE!", obs.pos.x, obs.pos.y - 20, "#fbbf24", 28);
      }
    };
  }

  initMatch(options = {}) {
    this.mode = options.mode || 'quick';
    this.totalDuration = options.duration || 120;
    this.matchTime = this.mode === 'training' ? Infinity : this.totalDuration;
    this.isPaused = false;
    this.isGameOver = false;
    this.team1Score = 0;
    this.team2Score = 0;

    this.team1 = options.team1 || this.save.data.playerTeam;
    this.team2 = options.team2 || this.save.data.aiTeam;

    this.stats = {
      shotsT1: 0,
      shotsT2: 0,
      savesT1: 0,
      savesT2: 0,
      collisionsCount: 0,
      maxSpeedPx: 0,
      trainingScore: 0
    };

    // Build Stadium
    const stadiumTheme = options.stadium || this.save.data.selectedStadium || 'grass';
    this.stadium.setTheme(stadiumTheme);

    // Rebuild physics world
    this.physics.clearEntities();
    this.physics.clearSegments();
    this.physics.clearObstacles();

    // Register pitch borders and goals
    this.stadium.registerPhysics(this.physics, this.leftGoal, this.rightGoal);
    this.leftGoal.registerPhysics(this.physics);
    this.rightGoal.registerPhysics(this.physics);

    // Create Caps
    this.createCaps();

    // Register all entities with physics
    this.physics.addEntity(this.ball);
    for (const c of this.team1Caps) this.physics.addEntity(c);
    for (const c of this.team2Caps) this.physics.addEntity(c);

    // Training Cones and Targets setup if in training mode
    if (this.mode === 'training') {
      this.setupTrainingMode();
    }

    // Reset to kickoff formation
    this.resetKickoff(1);

    // Play kickoff whistle
    this.audio.playWhistle(1);
  }

  createCaps() {
    this.team1Caps = [];
    this.team2Caps = [];

    // Safety: ensure Team 2 is visually distinct from Team 1
    if (this.team1.primaryColor === this.team2.primaryColor) {
      this.team2.primaryColor = "#ef4444";
      this.team2.secondaryColor = "#18181b";
      this.team2.rimColor = "#991b1b";
      this.team2.pattern = "stripes";
    }

    // Team 1 (Left side, attacking Right)
    // Goalkeeper (with contrasting goalie attire)
    this.team1Caps.push(new Cap({
      id: "t1_gk",
      team: 1,
      isGoalkeeper: true,
      number: 1,
      primaryColor: this.team1.primaryColor,
      secondaryColor: this.team1.secondaryColor,
      rimColor: this.team1.rimColor,
      pattern: this.team1.pattern || "solid",
      skin: this.team1.skin,
      decal: this.team1.decal
    }));

    // 4 Field Players
    const t1Numbers = [4, 7, 9, 10];
    for (const num of t1Numbers) {
      this.team1Caps.push(new Cap({
        id: `t1_${num}`,
        team: 1,
        isGoalkeeper: false,
        number: num,
        primaryColor: this.team1.primaryColor,
        secondaryColor: this.team1.secondaryColor,
        rimColor: this.team1.rimColor,
        pattern: this.team1.pattern || "solid",
        skin: this.team1.skin,
        decal: this.team1.decal
      }));
    }

    // Team 2 (Right side, attacking Left)
    // Goalkeeper
    this.team2Caps.push(new Cap({
      id: "t2_gk",
      team: 2,
      isGoalkeeper: true,
      number: 1,
      primaryColor: this.team2.primaryColor,
      secondaryColor: this.team2.secondaryColor,
      rimColor: this.team2.rimColor,
      pattern: this.team2.pattern || "stripes",
      skin: this.team2.skin,
      decal: this.team2.decal
    }));

    // 4 Field Players
    const t2Numbers = [3, 8, 11, 7];
    for (const num of t2Numbers) {
      this.team2Caps.push(new Cap({
        id: `t2_${num}`,
        team: 2,
        isGoalkeeper: false,
        number: num,
        primaryColor: this.team2.primaryColor,
        secondaryColor: this.team2.secondaryColor,
        rimColor: this.team2.rimColor,
        pattern: this.team2.pattern || "stripes",
        skin: this.team2.skin,
        decal: this.team2.decal
      }));
    }
  }

  setupTrainingMode() {
    this.trainingCones = [
      { x: this.fieldWidth * 0.45, y: this.fieldHeight * 0.35, radius: 14 },
      { x: this.fieldWidth * 0.55, y: this.fieldHeight * 0.50, radius: 14 },
      { x: this.fieldWidth * 0.48, y: this.fieldHeight * 0.65, radius: 14 }
    ];

    // Add obstacles for cones in physics
    for (const cone of this.trainingCones) {
      this.physics.addObstacle(cone.x, cone.y, cone.radius, { type: 'cone', restitution: 0.5 });
    }

    // Goal Target rings on Right Goal (Target practice)
    const goalX = this.rightGoal.lineX - 12;
    this.trainingTargets = [
      { x: goalX, y: this.rightGoal.topY + 28, radius: 24, points: 100, label: "100" },
      { x: goalX, y: this.rightGoal.bottomY - 28, radius: 24, points: 100, label: "100" },
      { x: goalX, y: (this.rightGoal.topY + this.rightGoal.bottomY) / 2, radius: 22, points: 50, label: "50" }
    ];
  }

  resetKickoff(servingTeam = 1) {
    this.physics.stopAll();

    const midX = this.fieldWidth / 2;
    const midY = this.fieldHeight / 2;

    // Reset Ball at center
    this.ball.reset(midX, midY);

    // Position Team 1 (Left half)
    const t1GK = this.team1Caps[0];
    t1GK.reset(this.leftGoal.lineX + 38, midY);

    this.team1Caps[1].reset(midX - 250, midY);        // #4 Zagueiro
    this.team1Caps[2].reset(midX - 150, midY - 140);  // #7 Ala esquerdo
    this.team1Caps[3].reset(midX - 150, midY + 140);  // #10 Ala direito
    this.team1Caps[4].reset(midX - (servingTeam === 1 ? 50 : 80), midY); // #9 Atacante

    // Position Team 2 (Right half)
    const t2GK = this.team2Caps[0];
    t2GK.reset(this.rightGoal.lineX - 38, midY);

    this.team2Caps[1].reset(midX + 250, midY);        // Zagueiro
    this.team2Caps[2].reset(midX + 150, midY - 140);  // Ala esquerdo
    this.team2Caps[3].reset(midX + 150, midY + 140);  // Ala direito
    this.team2Caps[4].reset(midX + (servingTeam === 2 ? 50 : 80), midY); // Atacante
  }

  recordShot(teamNumber, speedPx) {
    if (teamNumber === 1) this.stats.shotsT1++;
    else this.stats.shotsT2++;

    if (speedPx > this.stats.maxSpeedPx) {
      this.stats.maxSpeedPx = speedPx;
    }
  }

  checkGoalConditions() {
    // Left Goal (Scored by Team 2)
    if (this.leftGoal.checkGoal(this.ball)) {
      this.team2Score++;
      return { team: 2, goal: this.leftGoal };
    }

    // Right Goal (Scored by Team 1)
    if (this.rightGoal.checkGoal(this.ball)) {
      this.team1Score++;
      return { team: 1, goal: this.rightGoal };
    }

    // Check Training Targets
    if (this.mode === 'training') {
      for (let i = 0; i < this.trainingTargets.length; i++) {
        const tg = this.trainingTargets[i];
        if (this.ball.pos.dist(tg) < tg.radius + this.ball.radius && this.ball.vel.mag() > 40) {
          this.stats.trainingScore += tg.points;
          this.save.addCoins(5);
          this.audio.playPostHit(300);
          this.vfx.showFloatingText(`+${tg.points} PTS!`, tg.x - 40, tg.y, "#facc15", 36);
          this.vfx.emitCollisionSparks(tg.x, tg.y, 250);
          // Bounce ball back
          this.ball.vel.x = -Math.abs(this.ball.vel.x) * 0.8;
          break;
        }
      }
    }

    return null;
  }

  update(dt) {
    if (this.isPaused || this.isGameOver) return;

    // Match Timer
    if (this.mode !== 'training') {
      this.matchTime -= dt;
      if (this.matchTime <= 0) {
        this.matchTime = 0;
        this.endMatch();
      }
    }

    // Update Goal Net physics
    this.leftGoal.update(this.ball);
    this.rightGoal.update(this.ball);
  }

  endMatch() {
    this.isGameOver = true;
    this.audio.playWhistle(3); // Triple whistle for full time

    // Calculate maximum speed in km/h (rough scaling: 100px/s ≈ 18 km/h)
    const maxSpeedKmH = (this.stats.maxSpeedPx * 0.18);

    // Save stats & award coins
    let coinsEarned = this.team1Score * 10;
    if (this.team1Score > this.team2Score) {
      coinsEarned += 50; // Win bonus
    } else if (this.team1Score === this.team2Score) {
      coinsEarned += 20; // Draw bonus
    }

    this.save.addCoins(coinsEarned);
    this.save.recordMatchResult(this.team1Score, this.team2Score, maxSpeedKmH);

    if (this.onGameOver) {
      this.onGameOver({
        team1Score: this.team1Score,
        team2Score: this.team2Score,
        winner: this.team1Score > this.team2Score ? 1 : (this.team2Score > this.team1Score ? 2 : 0),
        coinsEarned: coinsEarned,
        stats: {
          ...this.stats,
          maxSpeedKmH: Math.round(maxSpeedKmH)
        }
      });
    }
  }

  draw(ctx) {
    // 1. Draw Goals (Net & Posts)
    this.leftGoal.draw(ctx, this.stadium.theme);
    this.rightGoal.draw(ctx, this.stadium.theme);

    // 2. Draw Training Mode Cones & Targets if active
    if (this.mode === 'training') {
      this.drawTrainingDecorations(ctx);
    }

    // 3. Draw All Caps
    for (let i = 0; i < this.team1Caps.length; i++) {
      this.team1Caps[i].draw(ctx);
    }
    for (let i = 0; i < this.team2Caps.length; i++) {
      this.team2Caps[i].draw(ctx);
    }

    // 4. Draw Ball
    this.ball.draw(ctx);
  }

  drawTrainingDecorations(ctx) {
    // Draw Cones
    for (const cone of this.trainingCones) {
      ctx.save();
      // Drop shadow
      ctx.beginPath();
      ctx.ellipse(cone.x + 2, cone.y + 3, cone.radius, cone.radius * 0.7, 0, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(0,0,0,0.3)";
      ctx.fill();

      // Orange Cone
      ctx.beginPath();
      ctx.arc(cone.x, cone.y, cone.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#f97316";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Inner white ring
      ctx.beginPath();
      ctx.arc(cone.x, cone.y, cone.radius * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
      ctx.restore();
    }

    // Draw Targets inside Right Goal
    for (const tg of this.trainingTargets) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(tg.x, tg.y, tg.radius, 0, Math.PI * 2);
      ctx.fillStyle = tg.points === 100 ? "rgba(239, 68, 68, 0.4)" : "rgba(234, 179, 8, 0.4)";
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = tg.points === 100 ? "#ef4444" : "#eab308";
      ctx.stroke();

      // Label text
      ctx.font = '900 12px "Russo One", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(tg.label, tg.x, tg.y);
      ctx.restore();
    }
  }
}

window.MatchManager = MatchManager;
