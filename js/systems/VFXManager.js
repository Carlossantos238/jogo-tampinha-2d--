/**
 * VFXManager.js - Visual Effects, Particle Systems, Floating Text, and Screen Shake
 * Futebol de Tampinha
 */

class VFXManager {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
    this.confetti = [];

    // Screen shake / trauma
    this.shakeTrauma = 0;
    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
  }

  update(dt) {
    // 1. Update Shake
    if (this.shakeTrauma > 0) {
      const shakeAmt = this.shakeTrauma * this.shakeTrauma * 16;
      this.shakeOffsetX = (Math.random() * 2 - 1) * shakeAmt;
      this.shakeOffsetY = (Math.random() * 2 - 1) * shakeAmt;
      this.shakeTrauma = Math.max(0, this.shakeTrauma - dt * 2.2);
    } else {
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }

    // 2. Update Standard Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= p.friction || 0.96;
      p.vy *= p.friction || 0.96;
      p.life -= dt;
      p.size = Math.max(0.1, p.size * (1 - dt * (p.shrinkRate || 0.8)));

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // 3. Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      ft.scale += ft.scaleVel * dt;
      ft.scaleVel = Math.max(-0.5, ft.scaleVel - dt * 2.0);

      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }

    // 4. Update Confetti
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.x += c.vx * dt;
      c.y += c.vy * dt;
      c.vy += c.gravity * dt;
      c.rot += c.rotSpeed * dt;
      c.life -= dt;

      if (c.life <= 0) {
        this.confetti.splice(i, 1);
      }
    }
  }

  addScreenShake(trauma = 0.5) {
    this.shakeTrauma = Math.min(1.0, this.shakeTrauma + trauma);
  }

  // Cap Launch / Kick Puff (Grass or Dirt particles)
  emitKickPuff(x, y, dirAngle, stadiumTheme = 'grass') {
    const count = 12;
    const baseColor = stadiumTheme === 'dirt' ? '#a16207' : (stadiumTheme === 'beach' ? '#fbbf24' : '#22c55e');

    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 1.2;
      const angle = dirAngle + Math.PI + spread; // Behind the launch
      const speed = 40 + Math.random() * 120;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 4,
        color: baseColor,
        life: 0.35 + Math.random() * 0.25,
        maxLife: 0.6,
        shrinkRate: 1.5,
        friction: 0.91
      });
    }
  }

  // Strong Collision Sparks (Plastic or Metal)
  emitCollisionSparks(x, y, impactSpeed) {
    const count = Math.min(Math.floor(impactSpeed / 25), 18);
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * (impactSpeed * 0.7);
      this.particles.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2.5 + Math.random() * 2.5,
        color: Math.random() > 0.4 ? "#facc15" : "#ffffff",
        life: 0.2 + Math.random() * 0.2,
        maxLife: 0.4,
        shrinkRate: 2.0,
        friction: 0.88
      });
    }
  }

  // Floating Text (e.g. "GOOOOL!", "DEFESAAA!", "NA TRAVE!")
  showFloatingText(text, x, y, color = "#facc15", size = 48) {
    this.floatingTexts.push({
      text: text,
      x: x,
      y: y,
      vy: -55,
      color: color,
      size: size,
      scale: 0.5,
      scaleVel: 2.5,
      life: 1.8,
      maxLife: 1.8
    });
  }

  // Confetti Explosion for Goals
  emitGoalConfetti(centerX, centerY, width, height) {
    const colors = ["#ef4444", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6", "#ffffff"];
    const count = 120;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 120 + Math.random() * 380;
      this.confetti.push({
        x: centerX + (Math.random() - 0.5) * 80,
        y: centerY + (Math.random() - 0.5) * 80,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 150, // Initial upwards pop
        gravity: 280,
        width: 8 + Math.random() * 8,
        height: 5 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 12,
        life: 2.5 + Math.random() * 1.5,
        maxLife: 4.0
      });
    }
  }

  draw(ctx) {
    // 1. Draw Regular Particles
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 2. Draw Confetti
    for (let i = 0; i < this.confetti.length; i++) {
      const c = this.confetti[i];
      const alpha = Math.min(1, c.life / 0.8);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rot);
      ctx.fillStyle = c.color;
      ctx.fillRect(-c.width / 2, -c.height / 2, c.width, c.height);
      ctx.restore();
    }

    // 3. Draw Floating Texts
    for (let i = 0; i < this.floatingTexts.length; i++) {
      const ft = this.floatingTexts[i];
      const alpha = Math.min(1, ft.life / 0.4);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(ft.x, ft.y);
      ctx.scale(ft.scale, ft.scale);
      
      ctx.font = `900 ${ft.size}px "Russo One", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Heavy dark outline
      ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
      ctx.lineWidth = 6;
      ctx.strokeText(ft.text, 0, 0);

      // Bright text
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, 0, 0);

      ctx.restore();
    }
  }

  clear() {
    this.particles = [];
    this.floatingTexts = [];
    this.confetti = [];
    this.shakeTrauma = 0;
  }
}

window.VFXManager = VFXManager;
