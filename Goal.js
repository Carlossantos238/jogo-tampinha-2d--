/**
 * Goal.js - Goal Posts, Reactive Spring Net, and Goal Detection
 * Futebol de Tampinha
 */

class Goal {
  constructor(side, fieldWidth, fieldHeight, options = {}) {
    this.side = side; // 'left' or 'right'
    this.fieldWidth = fieldWidth;
    this.fieldHeight = fieldHeight;
    this.options = options;

    // Dimensions
    this.mouthHeight = options.mouthHeight || 190;
    this.depth = options.depth || 65;
    this.postRadius = 7;

    const centerY = fieldHeight / 2;
    this.topY = centerY - this.mouthHeight / 2;
    this.bottomY = centerY + this.mouthHeight / 2;

    if (this.side === 'left') {
      this.lineX = options.leftMargin || 90;
      this.backX = this.lineX - this.depth;
    } else {
      this.lineX = fieldWidth - (options.rightMargin || 90);
      this.backX = this.lineX + this.depth;
    }

    // Reactive net vertices for spring animation
    this.netRows = 7;
    this.netCols = 5;
    this.initNetPoints();
  }

  initNetPoints() {
    this.netPoints = [];
    const minX = Math.min(this.lineX, this.backX);
    const maxX = Math.max(this.lineX, this.backX);

    for (let r = 0; r <= this.netRows; r++) {
      const row = [];
      const ty = this.topY + (r / this.netRows) * this.mouthHeight;
      for (let c = 0; c <= this.netCols; c++) {
        const tx = this.side === 'left' 
          ? (this.lineX - (c / this.netCols) * this.depth)
          : (this.lineX + (c / this.netCols) * this.depth);
        row.push({
          origX: tx,
          origY: ty,
          x: tx,
          y: ty,
          vx: 0,
          vy: 0,
          isFixed: (c === 0 && (r === 0 || r === this.netRows)) // Posts are fixed
        });
      }
      this.netPoints.push(row);
    }
  }

  registerPhysics(physics) {
    // Add solid round posts
    physics.addObstacle(this.lineX, this.topY, this.postRadius, {
      type: "post",
      side: this.side,
      posName: "top"
    });
    physics.addObstacle(this.lineX, this.bottomY, this.postRadius, {
      type: "post",
      side: this.side,
      posName: "bottom"
    });

    // Add net boundary segments
    // Top net wall
    physics.addSegment(this.lineX, this.topY, this.backX, this.topY, {
      isGoalNet: true,
      restitution: 0.2
    });
    // Bottom net wall
    physics.addSegment(this.lineX, this.bottomY, this.backX, this.bottomY, {
      isGoalNet: true,
      restitution: 0.2
    });
    // Back net wall
    physics.addSegment(this.backX, this.topY, this.backX, this.bottomY, {
      isGoalNet: true,
      restitution: 0.25
    });
  }

  checkGoal(ball) {
    // Check if ball is completely past the goal line and inside the mouth
    const insideMouthY = ball.pos.y >= (this.topY + ball.radius * 0.4) && 
                         ball.pos.y <= (this.bottomY - ball.radius * 0.4);

    if (!insideMouthY) return false;

    if (this.side === 'left') {
      // Ball fully past lineX to the left
      return (ball.pos.x + ball.radius) < this.lineX && (ball.pos.x - ball.radius) > (this.backX - 10);
    } else {
      // Ball fully past lineX to the right
      return (ball.pos.x - ball.radius) > this.lineX && (ball.pos.x + ball.radius) < (this.backX + 10);
    }
  }

  update(ball) {
    // Net physical reaction to ball
    const springK = 0.12;
    const damping = 0.85;

    for (let r = 0; r <= this.netRows; r++) {
      for (let c = 0; c <= this.netCols; c++) {
        const pt = this.netPoints[r][c];
        if (pt.isFixed) continue;

        // Push by ball if inside goal area
        const dx = pt.x - ball.pos.x;
        const dy = pt.y - ball.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const touchRadius = ball.radius + 14;

        if (dist < touchRadius && dist > 0) {
          const push = (touchRadius - dist) * 0.4;
          pt.vx += (dx / dist) * push;
          pt.vy += (dy / dist) * push;
        }

        // Return to original anchor point
        const ax = (pt.origX - pt.x) * springK;
        const ay = (pt.origY - pt.y) * springK;

        pt.vx = (pt.vx + ax) * damping;
        pt.vy = (pt.vy + ay) * damping;

        pt.x += pt.vx;
        pt.y += pt.vy;
      }
    }
  }

  draw(ctx, stadiumTheme = 'grass') {
    // 1. Goal Net Cords (Spring-animated mesh)
    ctx.save();
    ctx.strokeStyle = stadiumTheme === 'futuristic' ? 'rgba(56, 189, 248, 0.55)' : 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.2;

    // Draw horizontal net strands
    for (let r = 0; r <= this.netRows; r++) {
      ctx.beginPath();
      for (let c = 0; c <= this.netCols; c++) {
        const pt = this.netPoints[r][c];
        if (c === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }

    // Draw vertical net strands
    for (let c = 0; c <= this.netCols; c++) {
      ctx.beginPath();
      for (let r = 0; r <= this.netRows; r++) {
        const pt = this.netPoints[r][c];
        if (r === 0) ctx.moveTo(pt.x, pt.y);
        else ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
    }

    // Net interior shadow
    ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
    const minX = Math.min(this.lineX, this.backX);
    ctx.fillRect(minX, this.topY, this.depth, this.mouthHeight);

    // 2. Goal Posts (Traves)
    const postColor = stadiumTheme === 'dirt' ? '#e2d5c3' : (stadiumTheme === 'futuristic' ? '#38bdf8' : '#ffffff');
    const postShadow = 'rgba(0, 0, 0, 0.4)';

    // Crossbar / back frame
    ctx.beginPath();
    ctx.moveTo(this.lineX, this.topY);
    ctx.lineTo(this.backX, this.topY);
    ctx.lineTo(this.backX, this.bottomY);
    ctx.lineTo(this.lineX, this.bottomY);
    ctx.strokeStyle = stadiumTheme === 'futuristic' ? '#0284c7' : '#94a3b8';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Top post circle
    this.drawPostCircle(ctx, this.lineX, this.topY, postColor, postShadow);

    // Bottom post circle
    this.drawPostCircle(ctx, this.lineX, this.bottomY, postColor, postShadow);

    ctx.restore();
  }

  drawPostCircle(ctx, x, y, color, shadow) {
    ctx.save();
    // Post drop shadow
    ctx.beginPath();
    ctx.arc(x + 2, y + 3, this.postRadius, 0, Math.PI * 2);
    ctx.fillStyle = shadow;
    ctx.fill();

    // Solid post
    ctx.beginPath();
    ctx.arc(x, y, this.postRadius, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Metallic highlight
    ctx.beginPath();
    ctx.arc(x - 2, y - 2, this.postRadius * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
    ctx.fill();

    ctx.strokeStyle = "#475569";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}

window.Goal = Goal;
