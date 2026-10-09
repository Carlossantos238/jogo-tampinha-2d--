/**
 * Cap.js - Authentic 2D/Stylized Bottle Cap Entity
 * Features 3D embossed directional fluting, realistic metallic/plastic bevels,
 * team jersey patterns (solid, stripes, halved), distinctive goalkeeper attire,
 * selection halos, team aura pedestals, and dynamic shadows.
 * Futebol de Tampinha
 */

class Cap {
  constructor(options = {}) {
    this.id = options.id || ("cap_" + Math.random().toString(36).substr(2, 9));
    this.team = options.team || 1; // 1 or 2
    this.isGoalkeeper = !!options.isGoalkeeper;
    this.number = options.number || (this.isGoalkeeper ? 1 : 10);
    this.name = options.name || (this.isGoalkeeper ? "Goleiro" : `Jogador #${this.number}`);
    
    // Physical attributes
    this.radius = this.isGoalkeeper ? 28 : 22;
    this.mass = this.isGoalkeeper ? 2.4 : 1.0;
    this.restitution = this.isGoalkeeper ? 0.58 : 0.72;
    
    this.pos = new Vector(options.x || 0, options.y || 0);
    this.vel = new Vector(0, 0);
    this.angle = options.angle || 0;
    this.angularVel = 0;
    this.isStatic = false;
    this.isCap = true;

    // Team Customization & Colors
    this.primaryColor = options.primaryColor || (this.team === 1 ? "#2563eb" : "#dc2626");
    this.secondaryColor = options.secondaryColor || (this.team === 1 ? "#ffffff" : "#fef08a");
    this.rimColor = options.rimColor || (this.team === 1 ? "#1d4ed8" : "#991b1b");
    this.pattern = options.pattern || "solid"; // 'solid', 'stripes', 'halved'
    this.skin = options.skin || "plastic"; // 'plastic', 'metal', 'gold', 'neon', 'carbon'
    this.decal = options.decal || null; // 'star', 'crown', 'lightning', 'fire'

    // Goalkeeper distinct jersey color
    if (this.isGoalkeeper) {
      this.gkColor = options.gkColor || (this.team === 1 ? "#eab308" : "#10b981");
      this.gkSecondary = "#ffffff";
    }

    // Fluted teeth count (crown cap has 21 teeth)
    this.teethCount = this.isGoalkeeper ? 24 : 21;

    // Interactive state
    this.isSelected = false;
    this.isHovered = false;
    this.pulseAnim = Math.random() * 10;
  }

  reset(x, y) {
    this.pos.set(x, y);
    this.vel.set(0, 0);
    this.angularVel = 0;
    this.isSelected = false;
    this.isHovered = false;
  }

  draw(ctx) {
    this.pulseAnim += 0.045;

    // 1. Team Colored Base Pedestal / Turn Indicator Glow
    this.drawTeamPedestal(ctx);

    // 2. Realistic Dynamic Drop Shadow
    this.drawDynamicShadow(ctx);

    // 3. Selection Halo Glow
    if (this.isSelected || this.isHovered) {
      this.drawSelectionHalo(ctx);
    }

    // 4. Render 3D Bottle Cap Body
    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.angle);

    // Fluted crimped edge with 3D directional lighting
    this.drawCrimpedEdge(ctx);

    // Outer metallic bevel rim
    this.drawBevelRim(ctx);

    // Center disc (Team jersey colors and pattern)
    this.drawCenterDisc(ctx);

    // Jersey number or Goalkeeper Glove Badge
    this.drawInsignia(ctx);

    // High-gloss specular resin reflection
    this.drawGlossHighlight(ctx);

    ctx.restore();
  }

  drawTeamPedestal(ctx) {
    ctx.save();
    const teamColor = this.team === 1 ? "rgba(59, 130, 246, 0.35)" : "rgba(239, 68, 68, 0.35)";
    const teamBorder = this.team === 1 ? "rgba(96, 165, 250, 0.6)" : "rgba(248, 113, 113, 0.6)";

    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, this.radius + 3.5, 0, Math.PI * 2);
    ctx.fillStyle = teamColor;
    ctx.fill();
    ctx.strokeStyle = teamBorder;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    ctx.restore();
  }

  drawDynamicShadow(ctx) {
    ctx.save();
    const speed = this.vel.mag();
    const shadowDist = 4 + Math.min(speed * 0.015, 6);
    ctx.beginPath();
    ctx.ellipse(
      this.pos.x + shadowDist * 0.7,
      this.pos.y + shadowDist,
      this.radius * 1.05,
      this.radius * 0.88,
      Math.PI / 12,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
    ctx.fill();
    ctx.restore();
  }

  drawSelectionHalo(ctx) {
    ctx.save();
    const pulse = 1 + Math.sin(this.pulseAnim * 3.5) * 0.08;
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, (this.radius + 7) * pulse, 0, Math.PI * 2);
    ctx.strokeStyle = this.isSelected ? "#38bdf8" : "rgba(255, 255, 255, 0.75)";
    ctx.lineWidth = this.isSelected ? 3.5 : 2;
    ctx.setLineDash(this.isSelected ? [6, 4] : [3, 3]);
    ctx.lineDashOffset = -this.pulseAnim * 12;
    ctx.stroke();

    // Soft aura
    ctx.fillStyle = this.isSelected ? "rgba(56, 189, 248, 0.2)" : "rgba(255, 255, 255, 0.1)";
    ctx.fill();
    ctx.restore();
  }

  drawCrimpedEdge(ctx) {
    const rOuter = this.radius;
    const rInner = this.radius - (this.isGoalkeeper ? 4.8 : 3.8);
    const toothStep = (Math.PI * 2) / this.teethCount;
    // Simulated directional light angle (top-left light source)
    const lightAngle = -Math.PI * 0.75 - this.angle;

    const baseColor = this.getBaseRimColor();

    for (let i = 0; i < this.teethCount; i++) {
      const a1 = i * toothStep;
      const a2 = a1 + toothStep * 0.5;
      const a3 = a1 + toothStep;

      const p1x = Math.cos(a1) * rInner;
      const p1y = Math.sin(a1) * rInner;
      const p2x = Math.cos(a2) * rOuter;
      const p2y = Math.sin(a2) * rOuter;
      const p3x = Math.cos(a3) * rInner;
      const p3y = Math.sin(a3) * rInner;

      // Calculate lighting shade for this tooth
      const midAngle = a2;
      const lightFactor = Math.cos(midAngle - lightAngle); // -1 to 1
      const shadeAmt = Math.round(lightFactor * 35); // -35 to +35

      ctx.beginPath();
      ctx.moveTo(p1x, p1y);
      ctx.lineTo(p2x, p2y);
      ctx.lineTo(p3x, p3y);
      ctx.closePath();

      ctx.fillStyle = this.adjustColor(baseColor, shadeAmt);
      ctx.fill();

      // Flute ridge shadow
      ctx.strokeStyle = "rgba(0, 0, 0, 0.35)";
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  }

  getBaseRimColor() {
    if (this.skin === "gold") return "#f59e0b";
    if (this.skin === "metal") return "#94a3b8";
    if (this.skin === "neon") return this.team === 1 ? "#06b6d4" : "#f43f5e";
    if (this.skin === "carbon") return "#1e293b";
    if (this.isGoalkeeper) return this.adjustColor(this.gkColor, -25);
    return this.rimColor;
  }

  drawBevelRim(ctx) {
    const rBevel = this.radius - (this.isGoalkeeper ? 4.2 : 3.4);
    ctx.beginPath();
    ctx.arc(0, 0, rBevel, 0, Math.PI * 2);

    // Bevel ring with metallic highlights
    const grad = ctx.createRadialGradient(-rBevel * 0.35, -rBevel * 0.35, 1, 0, 0, rBevel);
    grad.addColorStop(0, "rgba(255, 255, 255, 0.45)");
    grad.addColorStop(0.5, "rgba(0, 0, 0, 0.12)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0.55)");

    ctx.fillStyle = grad;
    ctx.fill();

    // Crisp inner metal edge line
    ctx.beginPath();
    ctx.arc(0, 0, rBevel, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  drawCenterDisc(ctx) {
    const rDisc = this.radius - (this.isGoalkeeper ? 6.8 : 5.6);
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, rDisc, 0, Math.PI * 2);
    ctx.clip(); // Keep patterns strictly inside center disc

    const mainCol = this.isGoalkeeper ? this.gkColor : this.primaryColor;
    const secCol = this.isGoalkeeper ? this.gkSecondary : this.secondaryColor;

    // Background base
    ctx.fillStyle = mainCol;
    ctx.fillRect(-rDisc, -rDisc, rDisc * 2, rDisc * 2);

    // Team Jersey Pattern (Stripes, Halved, or Solid)
    if (this.pattern === "stripes" && !this.isGoalkeeper) {
      // 3 Vertical Football Stripes
      const stripeW = rDisc * 0.45;
      ctx.fillStyle = secCol;
      ctx.fillRect(-stripeW / 2, -rDisc, stripeW, rDisc * 2);
      ctx.fillRect(-rDisc, -rDisc, stripeW * 0.45, rDisc * 2);
      ctx.fillRect(rDisc - stripeW * 0.45, -rDisc, stripeW * 0.45, rDisc * 2);
    } else if (this.pattern === "halved" && !this.isGoalkeeper) {
      // Half-and-Half (Bicolor)
      ctx.fillStyle = secCol;
      ctx.fillRect(0, -rDisc, rDisc, rDisc * 2);
    }

    // 3D Inner Sphere Depth Gradient
    const depthGrad = ctx.createRadialGradient(-rDisc * 0.35, -rDisc * 0.35, 1, 0, 0, rDisc);
    depthGrad.addColorStop(0, "rgba(255, 255, 255, 0.35)");
    depthGrad.addColorStop(0.65, "rgba(0, 0, 0, 0)");
    depthGrad.addColorStop(1, "rgba(0, 0, 0, 0.45)");
    ctx.fillStyle = depthGrad;
    ctx.fillRect(-rDisc, -rDisc, rDisc * 2, rDisc * 2);

    // Inner Seal Ring
    ctx.beginPath();
    ctx.arc(0, 0, rDisc - 2, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Goalkeeper distinct gold star border
    if (this.isGoalkeeper) {
      ctx.beginPath();
      ctx.arc(0, 0, rDisc - 3.8, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.restore();
  }

  drawInsignia(ctx) {
    ctx.save();
    ctx.rotate(-this.angle); // Keep number/emblem upright regardless of cap spin

    if (this.isGoalkeeper) {
      // Goalkeeper Glove & Shield
      this.drawKeeperShield(ctx);
    } else if (this.decal) {
      this.drawCustomDecal(ctx, this.decal);
    } else {
      // Squad Number (#4, #7, #9, #10)
      const fontSize = Math.round(this.radius * 0.74);
      ctx.font = `900 ${fontSize}px "Russo One", "Outfit", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const textColor = (this.pattern === "stripes" || this.pattern === "halved") ? "#ffffff" : this.secondaryColor;

      // Heavy outline for contrast
      ctx.strokeStyle = "rgba(0, 0, 0, 0.85)";
      ctx.lineWidth = 3.5;
      ctx.strokeText(this.number.toString(), 0, 0.5);

      // Main number fill
      ctx.fillStyle = textColor;
      ctx.fillText(this.number.toString(), 0, 0);
    }
    ctx.restore();
  }

  drawKeeperShield(ctx) {
    const s = this.radius * 0.54;
    // Golden Shield Outline
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.88, -s * 0.5);
    ctx.lineTo(s * 0.72, s * 0.45);
    ctx.lineTo(0, s * 0.98);
    ctx.lineTo(-s * 0.72, s * 0.45);
    ctx.lineTo(-s * 0.88, -s * 0.5);
    ctx.closePath();

    ctx.fillStyle = "#0f172a";
    ctx.fill();
    ctx.strokeStyle = "#facc15";
    ctx.lineWidth = 1.8;
    ctx.stroke();

    // "GK" or "1"
    ctx.font = `900 ${s * 0.9}px "Russo One", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#facc15";
    ctx.fillText("1", 0, s * 0.05);
  }

  drawCustomDecal(ctx, decal) {
    const r = this.radius * 0.48;
    ctx.save();
    ctx.fillStyle = this.secondaryColor;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.2;

    if (decal === "star") {
      this.drawStar(ctx, 0, 0, 5, r, r * 0.45);
    } else if (decal === "crown") {
      ctx.beginPath();
      ctx.moveTo(-r, r * 0.4);
      ctx.lineTo(-r * 0.9, -r * 0.5);
      ctx.lineTo(-r * 0.3, 0);
      ctx.lineTo(0, -r * 0.8);
      ctx.lineTo(r * 0.3, 0);
      ctx.lineTo(r * 0.9, -r * 0.5);
      ctx.lineTo(r, r * 0.4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (decal === "lightning") {
      ctx.beginPath();
      ctx.moveTo(r * 0.2, -r);
      ctx.lineTo(-r * 0.7, 0);
      ctx.lineTo(0, 0);
      ctx.lineTo(-r * 0.3, r);
      ctx.lineTo(r * 0.7, -r * 0.1);
      ctx.lineTo(0, -r * 0.1);
      ctx.closePath();
      ctx.fillStyle = "#facc15";
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.font = `900 ${this.radius * 0.7}px "Russo One", sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(this.number.toString(), 0, 0);
    }
    ctx.restore();
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  drawGlossHighlight(ctx) {
    // Curved glossy reflection arc on top-left
    const r = this.radius * 0.75;
    ctx.save();
    ctx.beginPath();
    ctx.arc(-this.radius * 0.22, -this.radius * 0.22, r * 0.58, 0, Math.PI * 2);
    const gloss = ctx.createRadialGradient(
      -this.radius * 0.32, -this.radius * 0.32, 1,
      -this.radius * 0.22, -this.radius * 0.22, r * 0.58
    );
    gloss.addColorStop(0, "rgba(255, 255, 255, 0.55)");
    gloss.addColorStop(0.45, "rgba(255, 255, 255, 0.12)");
    gloss.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = gloss;
    ctx.fill();
    ctx.restore();
  }

  adjustColor(col, amt) {
    let usePound = false;
    if (!col) return "#000000";
    if (col[0] === "#") {
      col = col.slice(1);
      usePound = true;
    }
    if (col.length === 3) {
      col = col.split("").map(c => c + c).join("");
    }
    const num = parseInt(col, 16);
    if (isNaN(num)) return "#2563eb";
    let r = (num >> 16) + amt;
    let b = ((num >> 8) & 0x00ff) + amt;
    let g = (num & 0x0000ff) + amt;
    r = Math.min(255, Math.max(0, r));
    b = Math.min(255, Math.max(0, b));
    g = Math.min(255, Math.max(0, g));
    return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, "0");
  }
}

window.Cap = Cap;
