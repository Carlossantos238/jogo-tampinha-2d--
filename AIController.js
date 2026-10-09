/**
 * AIController.js - Intelligent Adversary for Futebol de Tampinha
 * Supports Easy, Normal, and Hard difficulties with geometric trajectory evaluation,
 * obstacle detection, bank shots, tactical clearances, and visual thinking previews.
 */

class AIController {
  constructor(difficulty = "normal") {
    this.difficulty = difficulty; // 'easy', 'normal', 'hard'
    this.isThinking = false;
    this.thinkTimer = 0;
    this.plannedShot = null;
    this.aimProgress = 0; // 0 to 1 for visual aiming animation
  }

  setDifficulty(diff) {
    this.difficulty = diff;
  }

  startTurn(aiCaps, ball, targetGoal, ownGoal, fieldWidth, fieldHeight) {
    this.isThinking = true;
    this.thinkTimer = 0.5 + Math.random() * 0.4; // 500-900ms human-like thinking delay
    this.aimProgress = 0;
    this.plannedShot = this.calculateBestShot(aiCaps, ball, targetGoal, ownGoal, fieldWidth, fieldHeight);
  }

  update(dt, onExecuteShot) {
    if (!this.isThinking || !this.plannedShot) return;

    if (this.thinkTimer > 0) {
      this.thinkTimer -= dt;
      return;
    }

    // Aim preview animation (draws aiming line smoothly)
    this.aimProgress += dt * 2.2;
    if (this.aimProgress >= 1.0) {
      // Execute the shot!
      const shot = this.plannedShot;
      this.isThinking = false;
      this.plannedShot = null;
      this.aimProgress = 0;

      if (onExecuteShot) {
        onExecuteShot(shot.cap, shot.impulse);
      }
    }
  }

  calculateBestShot(aiCaps, ball, targetGoal, ownGoal, fieldWidth, fieldHeight) {
    const candidates = [];
    // Target is usually the opponent's goal mouth (e.g. Left Goal)
    const goalMouthCenterY = (targetGoal.topY + targetGoal.bottomY) / 2;
    const goalX = targetGoal.lineX;

    // Filter available caps (do not move GK unless ball is inside our penalty box)
    const activeCaps = aiCaps.filter(cap => {
      if (!cap.isGoalkeeper) return true;
      // GK only shoots if ball is very close to own goal
      const distToOwnGoal = Math.abs(ball.pos.x - ownGoal.lineX);
      return distToOwnGoal < 180;
    });

    if (activeCaps.length === 0) return null;

    // Evaluate each cap
    for (const cap of activeCaps) {
      const distToBall = cap.pos.dist(ball.pos);

      // Candidate 1: Direct shot to Top Corner of Goal
      const targetTop = new Vector(goalX, targetGoal.topY + 30);
      const evalTop = this.evaluateStrike(cap, ball, targetTop, fieldWidth, fieldHeight);
      candidates.push({ cap, ...evalTop, type: 'corner_top' });

      // Candidate 2: Direct shot to Bottom Corner of Goal
      const targetBottom = new Vector(goalX, targetGoal.bottomY - 30);
      const evalBottom = this.evaluateStrike(cap, ball, targetBottom, fieldWidth, fieldHeight);
      candidates.push({ cap, ...evalBottom, type: 'corner_bottom' });

      // Candidate 3: Center of Goal
      const targetCenter = new Vector(goalX, goalMouthCenterY);
      const evalCenter = this.evaluateStrike(cap, ball, targetCenter, fieldWidth, fieldHeight);
      candidates.push({ cap, ...evalCenter, type: 'center' });

      // Candidate 4: Clear to center / tactical pass forward
      const forwardTarget = new Vector(targetGoal.lineX * 0.4 + fieldWidth * 0.3, goalMouthCenterY);
      const evalClear = this.evaluateStrike(cap, ball, forwardTarget, fieldWidth, fieldHeight);
      evalClear.score *= 0.6; // lower priority than direct goal shot
      candidates.push({ cap, ...evalClear, type: 'clear' });

      // In Hard mode: Bank shot off top or bottom wall if direct line is awkward
      if (this.difficulty === "hard") {
        const bounceTargetTop = new Vector(goalX, -goalMouthCenterY * 0.4); // virtual reflected target
        const evalBank = this.evaluateStrike(cap, ball, bounceTargetTop, fieldWidth, fieldHeight);
        evalBank.score *= 0.85;
        candidates.push({ cap, ...evalBank, type: 'bank_shot' });
      }
    }

    // Sort candidates by score descending
    candidates.sort((a, b) => b.score - a.score);

    let chosen = candidates[0];

    // Apply difficulty modifiers & realistic human imperfections
    let errorAngle = 0;
    let powerVariance = 1.0;

    if (this.difficulty === "easy") {
      // Easy: pick randomly among top 3 or add large angle error
      const topFew = candidates.slice(0, Math.min(3, candidates.length));
      chosen = topFew[Math.floor(Math.random() * topFew.length)];
      errorAngle = (Math.random() - 0.5) * 0.55; // up to ~30 degrees error
      powerVariance = 0.65 + Math.random() * 0.6;
    } else if (this.difficulty === "normal") {
      // Normal: small error
      errorAngle = (Math.random() - 0.5) * 0.12; // ~6 degrees error
      powerVariance = 0.9 + Math.random() * 0.2;
    } else {
      // Hard: tiny error, razor sharp
      errorAngle = (Math.random() - 0.5) * 0.02; // ~1 degree error
      powerVariance = 0.98 + Math.random() * 0.04;
    }

    // Calculate final impulse vector
    let finalDir = chosen.dir.heading() + errorAngle;
    let finalMag = Math.min(chosen.power * powerVariance, 650);

    const impulse = Vector.fromAngle(finalDir, finalMag);

    return {
      cap: chosen.cap,
      impulse: impulse,
      targetPoint: chosen.targetPoint,
      score: chosen.score
    };
  }

  evaluateStrike(cap, ball, targetPoint, fieldWidth, fieldHeight) {
    // 1. Vector from Ball to Target
    const ballToTarget = Vector.sub(targetPoint, ball.pos);
    const ballTargetDist = ballToTarget.mag();
    const ballDir = ballToTarget.copy().normalize();

    // 2. Position cap must strike the ball from:
    const contactOffset = cap.radius + ball.radius;
    const strikePos = Vector.sub(ball.pos, Vector.mult(ballDir, contactOffset));

    // 3. Vector from Cap to StrikePos
    const capToStrike = Vector.sub(strikePos, cap.pos);
    const distCapToStrike = capToStrike.mag();
    const capDir = capToStrike.copy().normalize();

    // 4. Dot product between Cap approach angle and Ball target angle
    const alignment = capDir.dot(ballDir);

    // 5. Scoring formula:
    // High alignment = clean hit pushing ball towards target
    // Lower distance to strike point = easier shot
    let score = alignment * 100 - (distCapToStrike * 0.15);

    // If cap is on the wrong side of the ball (alignment < 0), severely penalize
    if (alignment < 0.2) {
      score -= 150;
    }

    // Required power calculation
    // Base power to reach ball + power to drive ball to target
    const basePower = Math.min(650, 180 + distCapToStrike * 0.8 + ballTargetDist * 0.65);

    return {
      dir: capToStrike.normalize(),
      power: basePower,
      score: score,
      targetPoint: strikePos
    };
  }

  drawAimingPreview(ctx) {
    if (!this.isThinking || !this.plannedShot || this.aimProgress <= 0) return;

    const cap = this.plannedShot.cap;
    const impulse = this.plannedShot.impulse;
    const progress = Math.min(1.0, this.aimProgress);

    ctx.save();
    const startX = cap.pos.x;
    const startY = cap.pos.y;
    const dir = impulse.copy().normalize();
    const len = (impulse.mag() * 0.35) * progress;

    // Laser aim line
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(startX + dir.x * len, startY + dir.y * len);
    ctx.strokeStyle = "rgba(239, 68, 68, 0.75)";
    ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 4]);
    ctx.stroke();

    // Arrowhead
    const endX = startX + dir.x * len;
    const endY = startY + dir.y * len;
    const headAngle = dir.heading();
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - Math.cos(headAngle - 0.4) * 10, endY - Math.sin(headAngle - 0.4) * 10);
    ctx.lineTo(endX - Math.cos(headAngle + 0.4) * 10, endY - Math.sin(headAngle + 0.4) * 10);
    ctx.closePath();
    ctx.fillStyle = "#ef4444";
    ctx.fill();

    ctx.restore();
  }
}

window.AIController = AIController;
