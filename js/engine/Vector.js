/**
 * Vector.js - 2D Vector mathematics utility
 * Futebol de Tampinha
 */
class Vector {
  constructor(x = 0, y = 0) {
    this.x = x;
    this.y = y;
  }

  set(x, y) {
    this.x = x;
    this.y = y;
    return this;
  }

  copy() {
    return new Vector(this.x, this.y);
  }

  add(v) {
    this.x += v.x;
    this.y += v.y;
    return this;
  }

  sub(v) {
    this.x -= v.x;
    this.y -= v.y;
    return this;
  }

  mult(n) {
    this.x *= n;
    this.y *= n;
    return this;
  }

  div(n) {
    if (n !== 0) {
      this.x /= n;
      this.y /= n;
    }
    return this;
  }

  mag() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }

  magSq() {
    return this.x * this.x + this.y * this.y;
  }

  heading() {
    return Math.atan2(this.y, this.x);
  }

  normalize() {
    const m = this.mag();
    if (m > 0.00001) {
      this.div(m);
    }
    return this;
  }

  limit(max) {
    const mSq = this.magSq();
    if (mSq > max * max) {
      this.div(Math.sqrt(mSq)).mult(max);
    }
    return this;
  }

  setMag(mag) {
    return this.normalize().mult(mag);
  }

  dot(v) {
    return this.x * v.x + this.y * v.y;
  }

  dist(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  distSq(v) {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    return dx * dx + dy * dy;
  }

  // Static helpers
  static add(v1, v2) {
    return new Vector(v1.x + v2.x, v1.y + v2.y);
  }

  static sub(v1, v2) {
    return new Vector(v1.x - v2.x, v1.y - v2.y);
  }

  static mult(v, n) {
    return new Vector(v.x * n, v.y * n);
  }

  static div(v, n) {
    return new Vector(v.x / n, v.y / n);
  }

  static dist(v1, v2) {
    return v1.dist(v2);
  }

  static fromAngle(angle, length = 1) {
    return new Vector(Math.cos(angle) * length, Math.sin(angle) * length);
  }

  static dot(v1, v2) {
    return v1.dot(v2);
  }
}

window.Vector = Vector;
