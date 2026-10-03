/**
 * TurnManager.js - State Machine for Turn Transitions, Input Handling,
 * Trajectory Prediction, and Goal Verification.
 * Futebol de Tampinha
 */

class TurnManager {
  constructor(matchManager, physics, vfx, audio) {
    this.match = matchManager;
    this.physics = physics;
    this.vfx = vfx;
    this.audio = audio;

    // States: 'READY', 'AIMING', 'SIMULATING', 'GOAL_CELEBRATION', 'MATCH_OVER'
    this.state = 'READY';
    this.currentTurn = 1; // 1 = Team 1, 2 = Team 2

    // Slingshot Aiming details
    this.selectedCap = null;
    this.aimStartPos = new Vector(0, 0);
    this.currentDragPos = new Vector(0, 0);
    this.maxDragDistance = 140; // Max pixels of pull
    this.maxImpulse = 720;

    // Goal celebration timer
    this.goalTimer = 0;
    this.goalTeam = 0;

    // Event callbacks
    this.onTurnChange = null;
  }

  setTurn(teamNumber) {
    this.currentTurn = teamNumber;
    this.state = 'READY';
    this.selectedCap = null;

    if (this.onTurnChange) {
      this.onTurnChange(this.currentTurn);
    }
  }

  startAiming(cap, screenX, screenY) {
    if (this.state !== 'READY') return false;
    if (cap.team !== this.currentTurn) return false;

    this.state = 'AIMING';
    this.selectedCap = cap;
    cap.isSelected = true;
    this.aimStartPos.set(cap.pos.x, cap.pos.y);
    this.currentDragPos.set(screenX, screenY);
    this.audio.playClick();
    return true;
  }

  updateAiming(screenX, screenY) {
    if (this.state !== 'AIMING' || !this.selectedCap) return;
    this.currentDragPos.set(screenX, screenY);
  }

  cancelAiming() {
    if (this.state === 'AIMING' && this.selectedCap) {
      this.selectedCap.isSelected = false;
      this.selectedCap = null;
      this.state = 'READY';
    }
  }

  releaseAiming() {
    if (this.state !== 'AIMING' || !this.selectedCap) return false;

    // Calculate drag vector (slingshot: pull back to launch forward!)
    // Drag vector = currentDragPos - cap.pos
    const dragVec = Vector.sub(this.currentDragPos, this.selectedCap.pos);
    const dragDist = dragVec.mag();

    // Minimum drag threshold to prevent accidental misclicks
    if (dragDist < 12) {
      this.cancelAiming();
      return false;
    }

    // Launch direction is OPPOSITE to drag direction (slingshot mechanic)
    const launchDir = dragVec.copy().mult(-1).normalize();
    const clampedDist = Math.min(dragDist, this.maxDragDistance);
    const powerRatio = clampedDist / this.maxDragDistance;
    const impulseMag = powerRatio * this.maxImpulse;

    const impulse = Vector.mult(launchDir, impulseMag);

    const cap = this.selectedCap;
    this.selectedCap.isSelected = false;
    this.selectedCap = null;

    this.executeShot(cap, impulse, powerRatio);
    return true;
  }

  executeShot(cap, impulse, powerRatio = null) {
    if (!powerRatio) {
      powerRatio = Math.min(1.0, impulse.mag() / this.maxImpulse);
    }

    // Apply impulse to cap velocity
    const invMass = 1 / cap.mass;
    cap.vel.x = impulse.x * invMass;
    cap.vel.y = impulse.y * invMass;

    // Spin according to launch angle
    cap.angularVel = (Math.random() - 0.5) * 8 * powerRatio;

    // Audio & VFX
    this.audio.playFlick(powerRatio);
    this.vfx.emitKickPuff(cap.pos.x, cap.pos.y, impulse.heading(), this.match.stadium.theme);

    if (powerRatio > 0.8) {
      this.vfx.addScreenShake(0.25);
    }

    this.match.recordShot(this.currentTurn, impulse.mag());
    this.state = 'SIMULATING';
  }

  update(dt) {
    if (this.state === 'GOAL_CELEBRATION') {
      this.goalTimer -= dt;
      if (this.goalTimer <= 0) {
        this.match.resetKickoff(this.goalTeam === 1 ? 2 : 1);
        this.setTurn(this.goalTeam === 1 ? 2 : 1);
      }
      return;
    }

    if (this.state === 'SIMULATING') {
      const isSettled = this.physics.isSettled();

      // Check if goal was scored
      const goalScored = this.match.checkGoalConditions();
      if (goalScored) {
        this.triggerGoalCelebration(goalScored.team);
        return;
      }

      if (isSettled) {
        // Switch turn to other player
        const nextTeam = this.currentTurn === 1 ? 2 : 1;
        this.setTurn(nextTeam);
      }
    }
  }

  triggerGoalCelebration(scoringTeam) {
    this.state = 'GOAL_CELEBRATION';
    this.goalTeam = scoringTeam;
    this.goalTimer = 2.8; // 2.8 seconds celebration pause

    // Audio & VFX
    this.audio.playGoal();
    this.vfx.addScreenShake(0.8);
    this.vfx.emitGoalConfetti(this.match.fieldWidth / 2, this.match.fieldHeight / 2, this.match.fieldWidth, this.match.fieldHeight);

    const teamName = scoringTeam === 1 ? this.match.team1.name : this.match.team2.name;
    this.vfx.showFloatingText(`GOOOOOOOL!`, this.match.fieldWidth / 2, this.match.fieldHeight / 2 - 30, "#facc15", 56);
    this.vfx.showFloatingText(`(${teamName})`, this.match.fieldWidth / 2, this.match.fieldHeight / 2 + 35, "#ffffff", 26);
  }

  // Draw Aiming Guide, Slingshot Trajectory, and Wall Reflection
  drawAiming(ctx) {
    if (this.state !== 'AIMING' || !this.selectedCap) return;

    const cap = this.selectedCap;
    const dragVec = Vector.sub(this.currentDragPos, cap.pos);
    const dragDist = dragVec.mag();
    if (dragDist < 5) return;

    const clampedDist = Math.min(dragDist, this.maxDragDistance);
    const powerRatio = clampedDist / this.maxDragDistance;
    const launchDir = dragVec.copy().mult(-1).normalize();

    ctx.save();

    // 1. Slingshot Elastic Pull Line (from cap to finger/mouse)
    ctx.beginPath();
    ctx.moveTo(cap.pos.x, cap.pos.y);
    ctx.lineTo(this.currentDragPos.x, this.currentDragPos.y);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // Drag handle circle
    ctx.beginPath();
    ctx.arc(this.currentDragPos.x, this.currentDragPos.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.fill();

    // 2. Forward Trajectory Line with Power Gradient
    const trajLength = 70 + powerRatio * 160;
    const endX = cap.pos.x + launchDir.x * trajLength;
    const endY = cap.pos.y + launchDir.y * trajLength;

    const grad = ctx.createLinearGradient(cap.pos.x, cap.pos.y, endX, endY);
    if (powerRatio < 0.5) {
      grad.addColorStop(0, "#22c55e");
      grad.addColorStop(1, "#eab308");
    } else {
      grad.addColorStop(0, "#eab308");
      grad.addColorStop(1, "#ef4444");
    }

    ctx.beginPath();
    ctx.moveTo(cap.pos.x, cap.pos.y);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = grad;
    ctx.lineWidth = 3 + powerRatio * 3;
    ctx.stroke();

    // 3. Arrow Head at Trajectory End
    const headAngle = launchDir.heading();
    const arrowSize = 8 + powerRatio * 6;
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - Math.cos(headAngle - 0.45) * arrowSize, endY - Math.sin(headAngle - 0.45) * arrowSize);
    ctx.lineTo(endX - Math.cos(headAngle + 0.45) * arrowSize, endY - Math.sin(headAngle + 0.45) * arrowSize);
    ctx.closePath();
    ctx.fillStyle = powerRatio > 0.7 ? "#ef4444" : "#eab308";
    ctx.fill();

    // 4. Raycast Bounce Prediction off Pitch Walls
    this.drawBouncePrediction(ctx, cap.pos, launchDir, trajLength * 1.5, powerRatio);

    // 5. Radial Power Arc around the Cap
    ctx.beginPath();
    ctx.arc(cap.pos.x, cap.pos.y, cap.radius + 10, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * powerRatio));
    ctx.strokeStyle = powerRatio > 0.8 ? "#ef4444" : (powerRatio > 0.4 ? "#f59e0b" : "#10b981");
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.restore();
  }

  drawBouncePrediction(ctx, startPos, dir, maxRayDist, powerRatio) {
    const playTop = this.match.stadium.playTop;
    const playBottom = this.match.stadium.playBottom;
    const playLeft = this.match.stadium.playLeft;
    const playRight = this.match.stadium.playRight;

    let hit = null;

    // Test top wall
    if (dir.y < 0) {
      const t = (playTop - startPos.y) / dir.y;
      if (t > 0 && t < maxRayDist) {
        const hx = startPos.x + dir.x * t;
        if (hx >= playLeft && hx <= playRight) {
          hit = { x: hx, y: playTop, normal: new Vector(0, 1), t };
        }
      }
    }
    // Test bottom wall
    if (dir.y > 0 && !hit) {
      const t = (playBottom - startPos.y) / dir.y;
      if (t > 0 && t < maxRayDist) {
        const hx = startPos.x + dir.x * t;
        if (hx >= playLeft && hx <= playRight) {
          hit = { x: hx, y: playBottom, normal: new Vector(0, -1), t };
        }
      }
    }

    if (hit) {
      // Draw bounce reflected path
      const reflDir = new Vector(dir.x, -dir.y);
      const reflDist = (maxRayDist - hit.t) * 0.75;
      
      ctx.beginPath();
      ctx.moveTo(hit.x, hit.y);
      ctx.lineTo(hit.x + reflDir.x * reflDist, hit.y + reflDir.y * reflDist);
      ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Small bounce dot
      ctx.beginPath();
      ctx.arc(hit.x, hit.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#ffffff";
      ctx.fill();
    }
  }
}

window.TurnManager = TurnManager;
