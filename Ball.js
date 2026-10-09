/**
 * Ball.js - Realistic Soccer Ball with 3D Rolling Projection and Motion Trail
 * Futebol de Tampinha
 */

class Ball {
  constructor(x, y) {
    this.pos = new Vector(x, y);
    this.vel = new Vector(0, 0);
    this.radius = 12;
    this.mass = 0.30;
    this.restitution = 0.94;
    this.angle = 0;
    this.angularVel = 0;
    this.isBall = true;
    this.isStatic = false;

    // Rolling texture projection
    this.rollX = 0;
    this.rollY = 0;

    // Motion trail for fast shots
    this.trail = [];
    this.maxTrail = 10;
    
    // Stats tracking
    this.maxSpeedRecorded = 0;
  }

  reset(x, y) {
    this.pos.set(x, y);
    this.vel.set(0, 0);
    this.angle = 0;
    this.angularVel = 0;
    this.trail = [];
  }

  updateTrail() {
    const speed = this.vel.mag();
    if (speed > this.maxSpeedRecorded) {
      this.maxSpeedRecorded = speed;
    }

    if (speed > 180) {
      this.trail.unshift({
        x: this.pos.x,
        y: this.pos.y,
        radius: this.radius * (0.5 + Math.min(speed / 800, 0.5)),
        alpha: Math.min(speed / 600, 0.8),
        speed: speed
      });
      if (this.trail.length > this.maxTrail) {
        this.trail.pop();
      }
    } else if (this.trail.length > 0) {
      this.trail.pop();
    }

    // Accumulate roll based on velocity
    this.rollX += this.vel.x * 0.08;
    this.rollY += this.vel.y * 0.08;
  }

  draw(ctx) {
    this.updateTrail();

    // 1. Draw Trail if moving fast
    for (let i = 0; i < this.trail.length; i++) {
      const p = this.trail[i];
      const ratio = 1 - (i / this.trail.length);
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * ratio, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 230, 100, ${p.alpha * ratio * 0.45})`;
      ctx.fill();
      ctx.restore();
    }

    // 2. Drop Shadow
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(
      this.pos.x + 3,
      this.pos.y + 4,
      this.radius * 0.95,
      this.radius * 0.75,
      Math.PI / 8,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "rgba(0, 0, 0, 0.28)";
    ctx.fill();
    ctx.restore();

    // 3. Ball Body (3D sphere gradient)
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);

    // Sphere base with lighting gradient
    const grad = ctx.createRadialGradient(
      -this.radius * 0.35, -this.radius * 0.35, this.radius * 0.1,
      0, 0, this.radius
    );
    grad.addColorStop(0, "#ffffff");
    grad.addColorStop(0.7, "#ebeef2");
    grad.addColorStop(1, "#b5bcc7");

    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = "#475569";
    ctx.stroke();

    // 4. Rolling Soccer Pentagons & Seams
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, this.radius - 0.5, 0, Math.PI * 2);
    ctx.clip(); // Keep patterns within sphere

    // Project internal roll angles
    const rollAngle = Math.atan2(this.rollY, this.rollX);
    const rollDist = Math.sqrt(this.rollX * this.rollX + this.rollY * this.rollY) % (this.radius * 2.8);

    ctx.rotate(rollAngle);
    ctx.translate(rollDist - this.radius * 1.4, 0);

    // Draw central black pentagon pattern
    this.drawPentagon(ctx, 0, 0, this.radius * 0.42, "#1e293b");

    // Draw satellite spots
    for (let a = 0; a < 5; a++) {
      const theta = (a * Math.PI * 2) / 5;
      const px = Math.cos(theta) * (this.radius * 0.85);
      const py = Math.sin(theta) * (this.radius * 0.85);
      this.drawPentagon(ctx, px, py, this.radius * 0.35, "#334155");

      // Seam line connecting to center
      ctx.beginPath();
      ctx.moveTo(Math.cos(theta) * this.radius * 0.38, Math.sin(theta) * this.radius * 0.38);
      ctx.lineTo(px, py);
      ctx.strokeStyle = "#64748b";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();

    // 5. Specular Gloss Highlight
    const gloss = ctx.createRadialGradient(
      -this.radius * 0.4, -this.radius * 0.4, 1,
      -this.radius * 0.4, -this.radius * 0.4, this.radius * 0.6
    );
    gloss.addColorStop(0, "rgba(255, 255, 255, 0.85)");
    gloss.addColorStop(0.5, "rgba(255, 255, 255, 0.2)");
    gloss.addColorStop(1, "rgba(255, 255, 255, 0)");

    ctx.beginPath();
    ctx.arc(-this.radius * 0.35, -this.radius * 0.35, this.radius * 0.45, 0, Math.PI * 2);
    ctx.fillStyle = gloss;
    ctx.fill();

    ctx.restore();
  }

  drawPentagon(ctx, x, y, r, color) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
      const vx = x + Math.cos(angle) * r;
      const vy = y + Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(vx, vy);
      else ctx.lineTo(vx, vy);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = "#0f172a";
    ctx.stroke();
  }
}

window.Ball = Ball;
