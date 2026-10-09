/**
 * Physics.js - 2D Rigid Body Physics Engine for Futebol de Tampinha
 * Handles substepping, circle-circle collisions, circle-segment collisions,
 * friction, angular spin, impulse resolution, and settled detection.
 */

class Physics {
  constructor(options = {}) {
    this.substeps = options.substeps || 5;
    this.defaultFriction = options.friction || 0.985;
    this.angularFriction = options.angularFriction || 0.96;
    this.settleSpeedThreshold = options.settleSpeedThreshold || 4.0;
    this.settleAngularThreshold = options.settleAngularThreshold || 0.05;
    
    this.entities = []; // Caps and Ball
    this.segments = []; // Static walls and net barriers
    this.obstacles = []; // Static circles (Goal posts)
    
    this.onCollision = null; // Callback: (entityA, entityB, normal, impactSpeed)
    this.onWallCollision = null; // Callback: (entity, segment, impactSpeed)
    this.onObstacleCollision = null; // Callback: (entity, obstacle, impactSpeed)
  }

  addEntity(entity) {
    if (!this.entities.includes(entity)) {
      this.entities.push(entity);
    }
  }

  removeEntity(entity) {
    const idx = this.entities.indexOf(entity);
    if (idx !== -1) this.entities.splice(idx, 1);
  }

  clearEntities() {
    this.entities = [];
  }

  addSegment(x1, y1, x2, y2, options = {}) {
    const seg = {
      p1: new Vector(x1, y1),
      p2: new Vector(x2, y2),
      restitution: options.restitution !== undefined ? options.restitution : 0.75,
      isGoalNet: !!options.isGoalNet,
      isGoalLine: !!options.isGoalLine,
      id: options.id || 'wall'
    };
    this.segments.push(seg);
    return seg;
  }

  clearSegments() {
    this.segments = [];
  }

  addObstacle(x, y, radius, options = {}) {
    const obs = {
      pos: new Vector(x, y),
      radius: radius,
      restitution: options.restitution !== undefined ? options.restitution : 0.9,
      type: options.type || 'post'
    };
    this.obstacles.push(obs);
    return obs;
  }

  clearObstacles() {
    this.obstacles = [];
  }

  update(dt, customFriction = null) {
    const friction = customFriction !== null ? customFriction : this.defaultFriction;
    const subDt = dt / this.substeps;
    
    // Friction factor scaled by sub-step
    const subFriction = Math.pow(friction, 1 / this.substeps);
    const subAngularFriction = Math.pow(this.angularFriction, 1 / this.substeps);

    for (let step = 0; step < this.substeps; step++) {
      // 1. Integrate motion
      for (let i = 0; i < this.entities.length; i++) {
        const ent = this.entities[i];
        if (ent.isStatic) continue;

        ent.pos.x += ent.vel.x * subDt;
        ent.pos.y += ent.vel.y * subDt;
        ent.angle = (ent.angle || 0) + (ent.angularVel || 0) * subDt;

        // Apply friction (Ball rolls with much lower resistance than sliding caps)
        const currentFriction = ent.isBall 
          ? Math.pow(0.9935, 1 / this.substeps) 
          : subFriction;

        ent.vel.x *= currentFriction;
        ent.vel.y *= currentFriction;
        ent.angularVel = (ent.angularVel || 0) * subAngularFriction;
      }

      // 2. Circle vs Circle Collisions
      for (let i = 0; i < this.entities.length; i++) {
        for (let j = i + 1; j < this.entities.length; j++) {
          this.resolveCircleCollision(this.entities[i], this.entities[j]);
        }
      }

      // 3. Circle vs Obstacle (Goal Posts)
      for (let i = 0; i < this.entities.length; i++) {
        const ent = this.entities[i];
        for (let j = 0; j < this.obstacles.length; j++) {
          this.resolveCircleObstacle(ent, this.obstacles[j]);
        }
      }

      // 4. Circle vs Wall Segments
      for (let i = 0; i < this.entities.length; i++) {
        const ent = this.entities[i];
        for (let j = 0; j < this.segments.length; j++) {
          this.resolveCircleSegment(ent, this.segments[j]);
        }
      }
    }

    // Check if moving entities are now settled
    return this.isSettled();
  }

  resolveCircleCollision(a, b) {
    const dx = b.pos.x - a.pos.x;
    const dy = b.pos.y - a.pos.y;
    const distSq = dx * dx + dy * dy;
    const minDist = a.radius + b.radius;

    if (distSq >= minDist * minDist || distSq === 0) return;

    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const ny = dy / dist;

    // Positional separation (prevent sinking)
    const penetration = minDist - dist;
    const totalMass = (a.isStatic ? 0 : a.mass) + (b.isStatic ? 0 : b.mass);
    const slop = 0.5; // Correction strength
    
    if (!a.isStatic && !b.isStatic) {
      const massRatioA = b.mass / (a.mass + b.mass);
      const massRatioB = a.mass / (a.mass + b.mass);
      a.pos.x -= nx * penetration * massRatioA * slop;
      a.pos.y -= ny * penetration * massRatioA * slop;
      b.pos.x += nx * penetration * massRatioB * slop;
      b.pos.y += ny * penetration * massRatioB * slop;
    } else if (!a.isStatic) {
      a.pos.x -= nx * penetration * slop;
      a.pos.y -= ny * penetration * slop;
    } else if (!b.isStatic) {
      b.pos.x += nx * penetration * slop;
      b.pos.y += ny * penetration * slop;
    }

    // Relative velocity
    const rvx = b.vel.x - a.vel.x;
    const rvy = b.vel.y - a.vel.y;
    const velAlongNormal = rvx * nx + rvy * ny;

    // Moving away?
    if (velAlongNormal > 0) return;

    // Restitution
    const isBallCollision = a.isBall || b.isBall;
    const e = isBallCollision ? 0.94 : Math.min(a.restitution || 0.7, b.restitution || 0.7);

    // Impulse scalar
    const invMassA = a.isStatic ? 0 : (1 / a.mass);
    const invMassB = b.isStatic ? 0 : (1 / b.mass);
    let j = -(1 + e) * velAlongNormal / (invMassA + invMassB);

    // Extra kick impulse boost so the ball shoots forward fast!
    if (isBallCollision) {
      j *= 1.35;
    }

    const impulseX = j * nx;
    const impulseY = j * ny;

    if (!a.isStatic) {
      a.vel.x -= impulseX * invMassA;
      a.vel.y -= impulseY * invMassA;
    }
    if (!b.isStatic) {
      b.vel.x += impulseX * invMassB;
      b.vel.y += impulseY * invMassB;
    }

    // Tangential friction & spin transfer
    const tx = -ny;
    const ty = nx;
    const velAlongTangent = rvx * tx + rvy * ty;
    const frictionImpulse = -velAlongTangent * 0.15;
    
    if (!a.isStatic) {
      a.angularVel = (a.angularVel || 0) + frictionImpulse * 0.05;
    }
    if (!b.isStatic) {
      b.angularVel = (b.angularVel || 0) - frictionImpulse * 0.05;
    }

    const impactSpeed = Math.abs(velAlongNormal);
    if (this.onCollision && impactSpeed > 10) {
      this.onCollision(a, b, new Vector(nx, ny), impactSpeed);
    }
  }

  resolveCircleObstacle(entity, obs) {
    const dx = entity.pos.x - obs.pos.x;
    const dy = entity.pos.y - obs.pos.y;
    const distSq = dx * dx + dy * dy;
    const minDist = entity.radius + obs.radius;

    if (distSq >= minDist * minDist || distSq === 0) return;

    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const ny = dy / dist;

    // Push entity outside
    const penetration = minDist - dist;
    entity.pos.x += nx * penetration;
    entity.pos.y += ny * penetration;

    // Normal velocity
    const vn = entity.vel.x * nx + entity.vel.y * ny;
    if (vn >= 0) return; // already moving outwards

    const e = Math.min(entity.restitution || 0.7, obs.restitution || 0.9);
    const j = -(1 + e) * vn;

    entity.vel.x += j * nx;
    entity.vel.y += j * ny;

    // Spin on post hit
    entity.angularVel = (entity.angularVel || 0) + (Math.random() - 0.5) * 5;

    const impactSpeed = Math.abs(vn);
    if (this.onObstacleCollision && impactSpeed > 10) {
      this.onObstacleCollision(entity, obs, impactSpeed);
    }
  }

  resolveCircleSegment(entity, seg) {
    const x1 = seg.p1.x;
    const y1 = seg.p1.y;
    const x2 = seg.p2.x;
    const y2 = seg.p2.y;

    const segVx = x2 - x1;
    const segVy = y2 - y1;
    const segLenSq = segVx * segVx + segVy * segVy;
    if (segLenSq === 0) return;

    // Project entity.pos onto segment line
    const t = Math.max(0, Math.min(1, ((entity.pos.x - x1) * segVx + (entity.pos.y - y1) * segVy) / segLenSq));
    const closestX = x1 + t * segVx;
    const closestY = y1 + t * segVy;

    const dx = entity.pos.x - closestX;
    const dy = entity.pos.y - closestY;
    const distSq = dx * dx + dy * dy;

    if (distSq >= entity.radius * entity.radius || distSq === 0) return;

    const dist = Math.sqrt(distSq);
    const nx = dx / dist;
    const ny = dy / dist;

    // Push entity out
    const penetration = entity.radius - dist;
    entity.pos.x += nx * penetration;
    entity.pos.y += ny * penetration;

    // Normal velocity
    const vn = entity.vel.x * nx + entity.vel.y * ny;
    if (vn >= 0) return;

    // Net absorbs momentum heavily, walls bounce
    const e = seg.isGoalNet ? 0.25 : Math.min(entity.restitution || 0.7, seg.restitution || 0.75);
    const j = -(1 + e) * vn;

    entity.vel.x += j * nx;
    entity.vel.y += j * ny;

    if (seg.isGoalNet) {
      // Net drag
      entity.vel.x *= 0.7;
      entity.vel.y *= 0.7;
    }

    const impactSpeed = Math.abs(vn);
    if (this.onWallCollision && impactSpeed > 10) {
      this.onWallCollision(entity, seg, impactSpeed);
    }
  }

  isSettled() {
    let allSettled = true;
    for (let i = 0; i < this.entities.length; i++) {
      const ent = this.entities[i];
      if (ent.isStatic) continue;

      const speedSq = ent.vel.x * ent.vel.x + ent.vel.y * ent.vel.y;
      if (speedSq > this.settleSpeedThreshold * this.settleSpeedThreshold) {
        allSettled = false;
      } else {
        // Stop very slow drift
        ent.vel.x = 0;
        ent.vel.y = 0;
      }

      if (Math.abs(ent.angularVel || 0) > this.settleAngularThreshold) {
        allSettled = false;
      } else {
        ent.angularVel = 0;
      }
    }
    return allSettled;
  }

  stopAll() {
    for (let i = 0; i < this.entities.length; i++) {
      this.entities[i].vel.set(0, 0);
      this.entities[i].angularVel = 0;
    }
  }
}

window.Physics = Physics;
