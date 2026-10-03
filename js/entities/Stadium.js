/**
 * Stadium.js - 5 Unique Themed Stadiums for Futebol de Tampinha
 * (Classic Grass, Dirt Field, Futuristic Cyber, Beach Sand, Urban Asphalt)
 */

class Stadium {
  constructor(theme = 'grass', width = 1100, height = 660) {
    this.theme = theme;
    this.width = width;
    this.height = height;

    // Pitch playable area margins
    this.marginLeft = 90;
    this.marginRight = 90;
    this.marginTop = 40;
    this.marginBottom = 40;

    this.playLeft = this.marginLeft;
    this.playRight = this.width - this.marginRight;
    this.playTop = this.marginTop;
    this.playBottom = this.height - this.marginBottom;
    this.playWidth = this.playRight - this.playLeft;
    this.playHeight = this.playBottom - this.playTop;

    this.animTime = 0;

    // Physics parameters per stadium
    this.stadiumConfigs = {
      grass: {
        name: "Estádio Maracanã Clássico",
        friction: 0.986,
        restitution: 0.72,
        lineColor: "rgba(255, 255, 255, 0.85)",
        baseBg: "#15803d",
        stripeDark: "#166534",
        stripeLight: "#15803d",
        wallColor: "#1e3a8a",
        bannerText: "★ COPA DAS TAMPINHAS 2026 ★ FUTEBOL CLÁSSICO ★"
      },
      dirt: {
        name: "Terrão da Várzea",
        friction: 0.983,
        restitution: 0.65,
        lineColor: "rgba(254, 243, 199, 0.7)",
        baseBg: "#854d0e",
        stripeDark: "#713f12",
        stripeLight: "#854d0e",
        wallColor: "#451a03",
        bannerText: "★ FUTEBOL RAIZ ★ CAMPO DO TERRÃO ★ RAÇA E CORAÇÃO ★"
      },
      futuristic: {
        name: "Arena Cyber 2099",
        friction: 0.990,
        restitution: 0.82,
        lineColor: "#38bdf8",
        baseBg: "#090d16",
        stripeDark: "#0b1329",
        stripeLight: "#111c38",
        wallColor: "#0284c7",
        bannerText: "⚡ CYBER CAP LEAGUE ⚡ NEO-TOKYO CUP ⚡ 100% DIGITAL ⚡"
      },
      beach: {
        name: "Praia de Copacabana",
        friction: 0.981,
        restitution: 0.60,
        lineColor: "#ef4444",
        baseBg: "#d97706",
        stripeDark: "#b45309",
        stripeLight: "#d97706",
        wallColor: "#0284c7",
        bannerText: "☀️ PRAIA DE COPACABANA ☀️ SAMBA SOCCER ☀️ RIO DE JANEIRO ☀️"
      },
      urban: {
        name: "Asfalto da Quebrada",
        friction: 0.987,
        restitution: 0.76,
        lineColor: "#facc15",
        baseBg: "#27272a",
        stripeDark: "#18181b",
        stripeLight: "#27272a",
        wallColor: "#3f3f46",
        bannerText: "⚡ STREET CAP FOOTBALL ⚡ STREET LEAGUE ⚡ RESPEITA O ASFALTO ⚡"
      }
    };
  }

  setTheme(theme) {
    if (this.stadiumConfigs[theme]) {
      this.theme = theme;
    }
  }

  get config() {
    return this.stadiumConfigs[this.theme] || this.stadiumConfigs.grass;
  }

  registerPhysics(physics, leftGoal, rightGoal) {
    const r = this.config.restitution;

    // Top wall
    physics.addSegment(this.playLeft, this.playTop, this.playRight, this.playTop, {
      restitution: r,
      id: "top_wall"
    });
    // Bottom wall
    physics.addSegment(this.playLeft, this.playBottom, this.playRight, this.playBottom, {
      restitution: r,
      id: "bottom_wall"
    });

    // Left wall upper (from top-left corner to left goal top post)
    physics.addSegment(this.playLeft, this.playTop, leftGoal.lineX, leftGoal.topY, {
      restitution: r,
      id: "left_wall_top"
    });
    // Left wall lower (from left goal bottom post to bottom-left corner)
    physics.addSegment(leftGoal.lineX, leftGoal.bottomY, this.playLeft, this.playBottom, {
      restitution: r,
      id: "left_wall_bottom"
    });

    // Right wall upper (from top-right corner to right goal top post)
    physics.addSegment(this.playRight, this.playTop, rightGoal.lineX, rightGoal.topY, {
      restitution: r,
      id: "right_wall_top"
    });
    // Right wall lower (from right goal bottom post to bottom-right corner)
    physics.addSegment(rightGoal.lineX, rightGoal.bottomY, this.playRight, this.playBottom, {
      restitution: r,
      id: "right_wall_bottom"
    });
  }

  update(dt) {
    this.animTime += dt;
  }

  draw(ctx) {
    const cfg = this.config;

    // 1. Draw outer stadium surround / perimeter
    this.drawSurround(ctx, cfg);

    // 2. Draw Pitch Surface
    this.drawPitchSurface(ctx, cfg);

    // 3. Draw Pitch Markings (lines, penalty boxes, center circle)
    this.drawMarkings(ctx, cfg);

    // 4. Perimeter Walls & Ad boards
    this.drawBorders(ctx, cfg);
  }

  drawSurround(ctx, cfg) {
    ctx.fillStyle = "#090d16";
    ctx.fillRect(0, 0, this.width, this.height);

    if (this.theme === "beach") {
      // Ocean water on top surround
      const grad = ctx.createLinearGradient(0, 0, 0, this.playTop);
      grad.addColorStop(0, "#0284c7");
      grad.addColorStop(1, "#38bdf8");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, this.width, this.playTop - 6);
    }
  }

  drawPitchSurface(ctx, cfg) {
    ctx.save();
    // Clip to playable pitch
    ctx.beginPath();
    ctx.rect(this.playLeft, this.playTop, this.playWidth, this.playHeight);
    ctx.clip();

    ctx.fillStyle = cfg.baseBg;
    ctx.fillRect(this.playLeft, this.playTop, this.playWidth, this.playHeight);

    if (this.theme === "grass") {
      // Alternating lawn stripes (classic grass mower pattern)
      const stripeWidth = this.playWidth / 14;
      for (let i = 0; i < 14; i++) {
        if (i % 2 === 0) {
          ctx.fillStyle = cfg.stripeDark;
          ctx.fillRect(this.playLeft + i * stripeWidth, this.playTop, stripeWidth, this.playHeight);
        }
      }
    } else if (this.theme === "dirt") {
      // Dry patches and texture
      ctx.fillStyle = "rgba(113, 63, 18, 0.4)";
      for (let i = 0; i < 8; i++) {
        ctx.beginPath();
        ctx.ellipse(
          this.playLeft + (i + 1) * 110,
          this.playTop + 80 + (i % 3) * 150,
          80, 50, 0.2, 0, Math.PI * 2
        );
        ctx.fill();
      }
    } else if (this.theme === "futuristic") {
      // Hexagonal or digital grid lines
      ctx.strokeStyle = "rgba(56, 189, 248, 0.12)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = this.playLeft; x <= this.playRight; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, this.playTop);
        ctx.lineTo(x, this.playBottom);
        ctx.stroke();
      }
      for (let y = this.playTop; y <= this.playBottom; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(this.playLeft, y);
        ctx.lineTo(this.playRight, y);
        ctx.stroke();
      }
    } else if (this.theme === "beach") {
      // Palm tree leaf shadow drifting across sand
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.08)";
      const drift = Math.sin(this.animTime * 0.8) * 15;
      ctx.beginPath();
      ctx.ellipse(this.playLeft + 200 + drift, this.playTop + 140, 160, 60, Math.PI / 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (this.theme === "urban") {
      // Asphalt cracks
      ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(this.playLeft + 250, this.playTop + 100);
      ctx.lineTo(this.playLeft + 290, this.playTop + 130);
      ctx.lineTo(this.playLeft + 330, this.playTop + 120);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawMarkings(ctx, cfg) {
    ctx.save();
    ctx.strokeStyle = cfg.lineColor;
    ctx.lineWidth = 3;

    if (this.theme === "futuristic") {
      ctx.shadowColor = "#38bdf8";
      ctx.shadowBlur = 8;
    }

    // Outer boundary line
    ctx.strokeRect(this.playLeft, this.playTop, this.playWidth, this.playHeight);

    const midX = this.playLeft + this.playWidth / 2;
    const midY = this.playTop + this.playHeight / 2;

    // Center halfway line
    ctx.beginPath();
    ctx.moveTo(midX, this.playTop);
    ctx.lineTo(midX, this.playBottom);
    ctx.stroke();

    // Center circle
    const centerRadius = 80;
    ctx.beginPath();
    ctx.arc(midX, midY, centerRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Center spot
    ctx.beginPath();
    ctx.arc(midX, midY, 4, 0, Math.PI * 2);
    ctx.fillStyle = cfg.lineColor;
    ctx.fill();

    // Penalty Areas (Grandes Áreas)
    const penWidth = 140;
    const penHeight = 290;
    const penTop = midY - penHeight / 2;

    // Left Penalty Box
    ctx.strokeRect(this.playLeft, penTop, penWidth, penHeight);
    // Left Penalty Spot
    ctx.beginPath();
    ctx.arc(this.playLeft + 95, midY, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Left Penalty Arc (Meia-lua)
    ctx.beginPath();
    ctx.arc(this.playLeft + 95, midY, 50, -Math.PI * 0.3, Math.PI * 0.3);
    ctx.stroke();

    // Right Penalty Box
    ctx.strokeRect(this.playRight - penWidth, penTop, penWidth, penHeight);
    // Right Penalty Spot
    ctx.beginPath();
    ctx.arc(this.playRight - 95, midY, 3.5, 0, Math.PI * 2);
    ctx.fill();
    // Right Penalty Arc
    ctx.beginPath();
    ctx.arc(this.playRight - 95, midY, 50, Math.PI * 0.7, Math.PI * 1.3);
    ctx.stroke();

    // Goal Areas (Pequenas Áreas)
    const smallWidth = 55;
    const smallHeight = 150;
    const smallTop = midY - smallHeight / 2;
    ctx.strokeRect(this.playLeft, smallTop, smallWidth, smallHeight);
    ctx.strokeRect(this.playRight - smallWidth, smallTop, smallWidth, smallHeight);

    // Corner Arcs
    const cr = 18;
    // Top-Left
    ctx.beginPath(); ctx.arc(this.playLeft, this.playTop, cr, 0, Math.PI * 0.5); ctx.stroke();
    // Bottom-Left
    ctx.beginPath(); ctx.arc(this.playLeft, this.playBottom, cr, -Math.PI * 0.5, 0); ctx.stroke();
    // Top-Right
    ctx.beginPath(); ctx.arc(this.playRight, this.playTop, cr, Math.PI * 0.5, Math.PI); ctx.stroke();
    // Bottom-Right
    ctx.beginPath(); ctx.arc(this.playRight, this.playBottom, cr, Math.PI, Math.PI * 1.5); ctx.stroke();

    // Center Circle Crest Emblem
    this.drawCenterCrest(ctx, midX, midY, centerRadius, cfg);

    // Goal Area Lawn Wear
    this.drawGoalMouthWear(ctx);

    // Corner Flags
    this.drawCornerFlags(ctx);

    ctx.restore();
  }

  drawCenterCrest(ctx, midX, midY, radius, cfg) {
    ctx.save();
    // Inner subtle ring
    ctx.beginPath();
    ctx.arc(midX, midY, radius * 0.65, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    // 5-point Star in center
    ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
    ctx.beginPath();
    const spikes = 5;
    const rOuter = radius * 0.28;
    const rInner = radius * 0.14;
    let rot = (Math.PI / 2) * 3;
    let x = midX, y = midY;
    const step = Math.PI / spikes;

    ctx.moveTo(midX, midY - rOuter);
    for (let i = 0; i < spikes; i++) {
      x = midX + Math.cos(rot) * rOuter;
      y = midY + Math.sin(rot) * rOuter;
      ctx.lineTo(x, y);
      rot += step;
      x = midX + Math.cos(rot) * rInner;
      y = midY + Math.sin(rot) * rInner;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  drawGoalMouthWear(ctx) {
    ctx.save();
    // Earthy wear patches in front of goals
    ctx.fillStyle = "rgba(180, 130, 70, 0.15)";
    // Left goal mouth
    ctx.beginPath();
    ctx.ellipse(this.playLeft + 45, this.height / 2, 35, 75, 0, 0, Math.PI * 2);
    ctx.fill();
    // Right goal mouth
    ctx.beginPath();
    ctx.ellipse(this.playRight - 45, this.height / 2, 35, 75, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawCornerFlags(ctx) {
    const corners = [
      { x: this.playLeft, y: this.playTop, dirX: 1, dirY: 1 },
      { x: this.playLeft, y: this.playBottom, dirX: 1, dirY: -1 },
      { x: this.playRight, y: this.playTop, dirX: -1, dirY: 1 },
      { x: this.playRight, y: this.playBottom, dirX: -1, dirY: -1 }
    ];

    const flagWave = Math.sin(this.animTime * 4) * 3;

    for (const c of corners) {
      ctx.save();
      // Flag pole
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(c.x, c.y - 14 * c.dirY);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Flag cloth (bright yellow/red)
      ctx.beginPath();
      ctx.moveTo(c.x, c.y - 14 * c.dirY);
      ctx.lineTo(c.x + (10 + flagWave) * c.dirX, c.y - 10 * c.dirY);
      ctx.lineTo(c.x, c.y - 6 * c.dirY);
      ctx.closePath();
      ctx.fillStyle = "#facc15";
      ctx.fill();
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.restore();
    }
  }

  drawBorders(ctx, cfg) {
    ctx.save();
    // Top Advertising Banner
    ctx.fillStyle = cfg.wallColor;
    ctx.fillRect(this.playLeft - 10, this.playTop - 26, this.playWidth + 20, 22);

    // Banner Text scrolling / glowing
    ctx.font = '900 11px "Russo One", sans-serif';
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(cfg.bannerText, this.width / 2, this.playTop - 15);

    // Bottom Advertising Banner
    ctx.fillStyle = cfg.wallColor;
    ctx.fillRect(this.playLeft - 10, this.playBottom + 4, this.playWidth + 20, 22);
    ctx.fillStyle = "#ffffff";
    ctx.fillText(cfg.bannerText, this.width / 2, this.playBottom + 15);

    // Left and Right Wall Panels
    ctx.fillStyle = "#1e293b";
    // Left upper & lower
    ctx.fillRect(this.playLeft - 14, this.playTop - 26, 12, this.playHeight + 52);
    // Right upper & lower
    ctx.fillRect(this.playRight + 2, this.playTop - 26, 12, this.playHeight + 52);

    // Corner Floodlights Bloom Glow
    this.drawCornerFloodlights(ctx);

    ctx.restore();
  }

  drawCornerFloodlights(ctx) {
    ctx.save();
    const corners = [
      { x: this.playLeft - 10, y: this.playTop - 10 },
      { x: this.playRight + 10, y: this.playTop - 10 },
      { x: this.playLeft - 10, y: this.playBottom + 10 },
      { x: this.playRight + 10, y: this.playBottom + 10 }
    ];

    for (const c of corners) {
      const grad = ctx.createRadialGradient(c.x, c.y, 2, c.x, c.y, 160);
      grad.addColorStop(0, "rgba(255, 255, 255, 0.16)");
      grad.addColorStop(0.5, "rgba(255, 255, 255, 0.05)");
      grad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(c.x, c.y, 160, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

window.Stadium = Stadium;
