// @ts-nocheck
import { useEffect } from "react";
import useGameState from "../hooks/useGameState";

export default function Pinball(): JSX.Element {
  const { setPage } = useGameState();
  const handleExit = () => setPage("console");
  const css = `
html,
      body {
        margin: 0;
        height: 100%;
        background: #0b0f1a;
        overflow: hidden;
        touch-action: none;
        -webkit-user-select: none;
        user-select: none;
        font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial,
          sans-serif;
        color: #e6edf3;
      }
      #ui {
        position: fixed;
        inset: 0;
        pointer-events: none;
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        padding: 10px;
      }
      .panel {
        background: rgba(0, 0, 0, 0.25);
        backdrop-filter: blur(4px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 12px;
        padding: 8px 12px;
        font-weight: 600;
        text-shadow: 0 1px 0 rgba(0, 0, 0, 0.5);
      }
      #hint {
        position: fixed;
        left: 50%;
        transform: translateX(-50%);
        bottom: 10px;
        pointer-events: none;
        font-size: 14px;
        opacity: 0.85;
        letter-spacing: 0.2px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        padding: 6px 10px;
        border-radius: 10px;
      }
      canvas {
        display: block;
        /* Centered fixed-size canvas; JS sets exact size to keep 1:2 portrait ratio */
        position: fixed;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
      }
      #exit-btn {
        position: fixed;
        bottom: 10px;
        right: 10px;
        pointer-events: auto;
        cursor: pointer;
        background: #22c55e;
        color: white;
        border: none;
        border-radius: 6px;
        padding: 10px 20px;
        font-weight: bold;
        box-shadow: 0 2px 8px rgba(0,0,0,0.12);
        transition: background 0.2s;
      }
      #exit-btn:hover {
        background: #16a34a;
      }
  `;

  useEffect(() => {
(() => {
        const canvas = document.getElementById("c");
        const ctx = canvas.getContext("2d");

        // ----- World/state MUST be declared before resize()/setupWorld is called -----
        let DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
        let W = 0, // world width
          H = 0; // world height (taller than canvas)
        let VH = 0; // viewport (canvas) height
        let camY = 0; // camera vertical position in world coords

        let ballInitX = 0;
        let ballInitY = 0;

        // world
        let ball,
          walls = [],
          bumpers = [],
          flippers = [],
          score = 0;
        // Track bumper vertical range for height-based scoring
        let bumperYMin = Infinity,
          bumperYMax = -Infinity;
        let leftDown = false,
          rightDown = false;
        let particles = [];
        let scoreDigits = [];
        // Visual-only screen shake state (does not affect physics)
        let shake = { t: 0, dur: 0.12, mag: 0, x: 0, y: 0 };

        // ---------- Math helpers ----------
        const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
        const len2 = (x, y) => x * x + y * y;
        function normalize(x, y) {
          const l = Math.hypot(x, y) || 1;
          return [x / l, y / l];
        }
        function dot(ax, ay, bx, by) {
          return ax * bx + ay * by;
        }
        function perp(x, y) {
          return [-y, x];
        } // rotate 90° ccw
        function deg(a) {
          return (a * Math.PI) / 180;
        }
        function closestT(px, py, ax, ay, bx, by) {
          const abx = bx - ax,
            aby = by - ay;
          const apx = px - ax,
            apy = py - ay;
          const ab2 = abx * abx + aby * aby || 1;
          return (apx * abx + apy * aby) / ab2;
        }

        function addWall(x1, y1, x2, y2) {
          walls.push({ x1, y1, x2, y2 });
        }
        function addBumper(x, y, r) {
          bumpers.push({ x, y, r, pulse: 0 });
          bumperYMin = Math.min(bumperYMin, y);
          bumperYMax = Math.max(bumperYMax, y);
        }

        // Base score for a bumper hit scales with bumper radius; larger bumpers award more
        function bumperScoreForRadius(r) {
          // Linear scaling tuned around typical radii; ensure a small minimum
          return Math.max(10, Math.round(r * 4));
        }

        // Additional multiplier based on bumper height: top pays ~1000x of bottom
        function bumperHeightMultiplier(y) {
          if (
            !isFinite(bumperYMin) ||
            !isFinite(bumperYMax) ||
            bumperYMax <= bumperYMin
          )
            return 1;
          const t = clamp((y - bumperYMin) / (bumperYMax - bumperYMin), 0, 1); // 0=top, 1=bottom
          const minMult = 1;
          const maxMult = 1000; // top vs bottom ratio
          const ratio = maxMult / minMult;
          // Exponential mapping gives exact endpoints: t=0 -> max, t=1 -> min
          return minMult * Math.pow(ratio, 1 - t);
        }

        class Ball {
          constructor(x, y, r) {
            this.x = x;
            this.y = y;
            this.r = r;
            this.vx = 0;
            this.vy = 0;
          }
          integrate(dt) {
            const g = 1800;
            this.vy += g * dt;
            const drag = Math.pow(0.995, dt * 60);
            this.vx *= drag;
            this.vy *= drag;
            this.x += this.vx * dt;
            this.y += this.vy * dt;

            for (const w of walls)
              collideBallSegment(this, w.x1, w.y1, w.x2, w.y2, 0.0, 0.62);
            for (const f of flippers) f.collideBall(this);

            for (const b of bumpers) {
              const dx = this.x - b.x,
                dy = this.y - b.y;
              const d2 = len2(dx, dy),
                rr = (this.r + b.r) * (this.r + b.r);
              if (d2 < rr) {
                const d = Math.sqrt(d2) || 1;
                const nx = dx / d,
                  ny = dy / d;
                const pen = this.r + b.r - d;
                this.x += nx * pen;
                this.y += ny * pen;
                const vn = this.vx * nx + this.vy * ny;
                const restitution = 1.15;
                this.vx -= (1 + restitution) * vn * nx;
                this.vy -= (1 + restitution) * vn * ny;
                const base = bumperScoreForRadius(b.r);
                const mult = bumperHeightMultiplier(b.y);
                const points = Math.max(1, Math.round(base * mult));
                score += points;
                updateScore();
                b.pulse = 1;
                spawnSparks(this.x, this.y, 10);
                spawnScoreDigits(b.x, b.y - b.r * 0.25, points);
                // Trigger a brief board shake proportional to bumper size
                addShake(Math.min(12, 0.45 * b.r), 0.14);
              }
            }
            if (this.y - this.r > H + 100) this.reset();
          }
          reset() {
            this.x = ballInitX;
            this.y = ballInitY;
            this.vx = 0;
            this.vy = 50;
            score = Math.max(0, score - 50);
            updateScore();
          }
          draw() {
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.ellipse(
              this.x + 10,
              this.y + 14,
              this.r * 1.05,
              this.r * 0.7,
              0,
              0,
              Math.PI * 2
            );
            ctx.fillStyle = "#000";
            ctx.fill();
            ctx.globalAlpha = 1;

            const grd = ctx.createRadialGradient(
              this.x - this.r * 0.4,
              this.y - this.r * 0.6,
              this.r * 0.2,
              this.x,
              this.y,
              this.r
            );
            grd.addColorStop(0, "#fafcff");
            grd.addColorStop(1, "#9aa4b4");
            ctx.fillStyle = grd;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
            ctx.fill();

            ctx.beginPath();
            ctx.arc(
              this.x - this.r * 0.35,
              this.y - this.r * 0.45,
              this.r * 0.25,
              0,
              Math.PI * 2
            );
            ctx.fillStyle = "rgba(255,255,255,0.55)";
            ctx.fill();
          }
        }

        class Flipper {
          constructor(isLeft, px, py, L, R) {
            this.isLeft = isLeft;
            this.px = px;
            this.py = py;
            this.L = L;
            this.R = R;
            this.rest = isLeft ? deg(-20) : Math.PI + deg(20);
            this.active = isLeft ? deg(-70) : Math.PI + deg(50);
            this.angle = this.rest;
            this.prevAngle = this.angle;
            this.omega = 0;
            this.maxSpeed = 16;
            this.pressing = false;
          }
          setPressed(p) {
            this.pressing = p;
          }
          update(dt) {
            this.prevAngle = this.angle;
            const target = this.pressing ? this.active : this.rest;
            let delta = target - this.angle;
            delta = Math.atan2(Math.sin(delta), Math.cos(delta));
            const maxStep = this.maxSpeed * dt;
            if (Math.abs(delta) <= maxStep) this.angle = target;
            else this.angle += Math.sign(delta) * maxStep;
            this.omega = (this.angle - this.prevAngle) / (dt || 1 / 60);
          }
          collideBall(ball) {
            const tx = Math.cos(this.angle),
              ty = Math.sin(this.angle);
            const ex = this.px + tx * this.L,
              ey = this.py + ty * this.L;
            const t = closestT(ball.x, ball.y, this.px, this.py, ex, ey);
            const cx = this.px + clamp(t, 0, 1) * (ex - this.px);
            const cy = this.py + clamp(t, 0, 1) * (ey - this.py);
            const dx = ball.x - cx,
              dy = ball.y - cy;
            const dist2 = len2(dx, dy);
            const minDist = ball.r + this.R;
            if (dist2 < minDist * minDist) {
              const dist = Math.sqrt(dist2) || 1;
              let nx = dx / dist,
                ny = dy / dist;
              const pen = minDist - dist;
              ball.x += nx * pen;
              ball.y += ny * pen;

              const rx = cx - this.px,
                ry = cy - this.py;
              const [perx, pery] = perp(rx, ry);
              const vfx = perx * this.omega,
                vfy = pery * this.omega;

              let rvx = ball.vx - vfx,
                rvy = ball.vy - vfy;
              const vn = rvx * nx + rvy * ny,
                restitution = 0.85;
              if (vn < 0) {
                rvx -= (1 + restitution) * vn * nx;
                rvy -= (1 + restitution) * vn * ny;
              } else {
                const bonus = 0.25 * this.omega;
                rvx += nx * bonus * 80;
                rvy += ny * bonus * 80;
              }
              ball.vx = rvx + vfx;
              ball.vy = rvy + vfy;
              spawnSparks(cx, cy, 6);
            }
          }
          draw() {
            ctx.fillStyle = "rgba(30,34,46,0.9)";
            ctx.beginPath();
            ctx.arc(this.px, this.py, this.R * 1.2, 0, Math.PI * 2);
            ctx.fill();

            const tx = Math.cos(this.angle),
              ty = Math.sin(this.angle);
            const ex = this.px + tx * this.L,
              ey = this.py + ty * this.L;
            ctx.beginPath();
            const r = this.R,
              nx = -ty,
              ny = tx;
            ctx.moveTo(this.px + nx * r, this.py + ny * r);
            ctx.lineTo(ex + nx * r, ey + ny * r);
            ctx.arc(ex, ey, r, Math.atan2(ny, nx), Math.atan2(-ny, -nx), true);
            ctx.lineTo(this.px - nx * r, this.py - ny * r);
            ctx.arc(
              this.px,
              this.py,
              r,
              Math.atan2(-ny, -nx),
              Math.atan2(ny, nx),
              true
            );
            const grad = ctx.createLinearGradient(this.px, this.py, ex, ey);
            grad.addColorStop(0, this.isLeft ? "#ff3366" : "#4dd0ff");
            grad.addColorStop(1, "#ffffff");
            ctx.fillStyle = grad;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(ex, ey, r * 0.7, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255,255,255,0.35)";
            ctx.fill();
          }
        }

        function collideBallSegment(
          ball,
          x1,
          y1,
          x2,
          y2,
          wallRadius = 0,
          restitution = 0.62
        ) {
          const t = closestT(ball.x, ball.y, x1, y1, x2, y2);
          const cx = x1 + clamp(t, 0, 1) * (x2 - x1);
          const cy = y1 + clamp(t, 0, 1) * (y2 - y1);
          const dx = ball.x - cx,
            dy = ball.y - cy;
          const minDist = ball.r + wallRadius;
          const d2 = len2(dx, dy);
          if (d2 < minDist * minDist) {
            const d = Math.sqrt(d2) || 1;
            const nx = dx / d,
              ny = dy / d;
            const pen = minDist - d + 0.1;
            ball.x += nx * pen;
            ball.y += ny * pen;
            const vn = ball.vx * nx + ball.vy * ny;
            ball.vx -= (1 + restitution) * vn * nx;
            ball.vy -= (1 + restitution) * vn * ny;
          }
        }

        function spawnSparks(x, y, n) {
          for (let i = 0; i < n; i++) {
            const a = Math.random() * Math.PI * 2;
            const s = 80 + Math.random() * 220;
            particles.push({
              x,
              y,
              vx: Math.cos(a) * s,
              vy: Math.sin(a) * s,
              life: 0.25 + Math.random() * 0.25,
            });
          }
        }
        function updateParticles(dt) {
          for (const p of particles) {
            p.life -= dt;
            p.vy += 800 * dt;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
          }
          particles = particles.filter((p) => p.life > 0);
        }
        function drawParticles() {
          ctx.save();
          ctx.globalCompositeOperation = "lighter";
          for (const p of particles) {
            ctx.globalAlpha = Math.max(0, p.life * 3);
            ctx.beginPath();
            ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
            ctx.fillStyle = "#ffd166";
            ctx.fill();
          }
          ctx.restore();
          ctx.globalAlpha = 1;
        }

        // Floating score label (whole number rises and fades)
        function spawnScoreDigits(x, y, points) {
          scoreDigits.push({
            text: "+" + points,
            x,
            y,
            vx: (Math.random() * 2 - 1) * 30,
            vy: -140 - Math.random() * 80,
            life: 0.95,
            ttl: 0.95,
          });
        }
        function updateScoreDigits(dt) {
          for (const d of scoreDigits) {
            d.life -= dt;
            d.x += d.vx * dt;
            d.y += d.vy * dt;
            d.vy += 220 * dt; // slow the rise over time
            d.vx *= 0.985;
          }
          scoreDigits = scoreDigits.filter((d) => d.life > 0);
        }
        function drawScoreDigits() {
          if (!scoreDigits.length) return;
          ctx.save();
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          for (const d of scoreDigits) {
            const t = Math.max(0, d.life / d.ttl);
            const alpha = Math.pow(t, 1.05);
            const size = 20 + (1 - t) * 8; // slightly larger for whole label
            ctx.globalAlpha = alpha;
            ctx.font = `800 ${size}px system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif`;
            // soft glow for readability
            ctx.shadowColor = "rgba(0,0,0,0.6)";
            ctx.shadowBlur = 8;
            ctx.fillStyle = "#ffd166";
            ctx.fillText(d.text ?? "", d.x, d.y);
          }
          ctx.restore();
          ctx.globalAlpha = 1;
        }

        function updateScore() {
          document.getElementById("score").textContent = "Score: " + score;
        }

        // --------- Visual shake (camera) ---------
        function addShake(intensity = 6, duration = 0.12) {
          // Keep the stronger/longer shake if overlapping
          shake.mag = Math.max(shake.mag, intensity);
          shake.dur = Math.max(shake.dur, duration);
          shake.t = Math.max(shake.t, duration);
        }
        function updateShake(dt) {
          if (shake.t <= 0) {
            shake.x = 0;
            shake.y = 0;
            return;
          }
          shake.t = Math.max(0, shake.t - dt);
          const k = shake.dur > 0 ? shake.t / shake.dur : 0;
          const falloff = k * k; // ease-out quad
          const a = Math.random() * Math.PI * 2;
          const m = shake.mag * falloff;
          shake.x = Math.cos(a) * m;
          shake.y = Math.sin(a) * m;
        }

        function setupWorld() {
          walls = [];
          bumpers = [];
          flippers = [];
          score = 0;
          updateScore();

          // Reset bumper height range before repopulating
          bumperYMin = Infinity;
          bumperYMax = -Infinity;

          const mX = W * 0.1,
            mY = H * 0.08;

          addWall(mX, mY, W - mX, mY);
          addWall(mX, mY, mX, H * 0.86);
          addWall(W - mX, mY, W - mX, H * 0.86);

          addWall(mX, H * 0.86, W * 0.23, H * 0.88);
          addWall(W - mX, H * 0.86, W * 0.77, H * 0.88);

          const r = Math.min(W, H);
          const B = Math.max(18, Math.floor(r * 0.025));
          addBumper(W * 0.5, H * 0.28, B);
          addBumper(W * 0.34, H * 0.4, B);
          addBumper(W * 0.66, H * 0.4, B);

          // Extra bumpers for richer shot selection and ball flow
          // Upper guides near the top lanes
          addBumper(W * 0.22, H * 0.24, B * 0.9);
          addBumper(W * 0.78, H * 0.24, B * 0.9);

          // Mid-field diamond cluster to create cross shots
          addBumper(W * 0.5, H * 0.52, B * 0.95);
          addBumper(W * 0.28, H * 0.54, B * 0.82);
          addBumper(W * 0.72, H * 0.54, B * 0.82);

          // Lower midfield pair to feed the inlanes without blocking flippers
          addBumper(W * 0.42, H * 0.7, B * 0.75);
          addBumper(W * 0.58, H * 0.7, B * 0.75);

          // Additional bumpers to double total count (spread across field)
          // Upper corners
          addBumper(W * 0.2, H * 0.18, B * 0.8);
          addBumper(W * 0.8, H * 0.18, B * 0.8);

          // Upper-mid wide lanes
          addBumper(W * 0.18, H * 0.36, B * 0.85);
          addBumper(W * 0.82, H * 0.36, B * 0.85);

          // Mid-late guides
          addBumper(W * 0.2, H * 0.62, B * 0.8);
          addBumper(W * 0.8, H * 0.62, B * 0.8);

          // Pre-flipper funnel
          addBumper(W * 0.38, H * 0.78, B * 0.7);
          addBumper(W * 0.62, H * 0.78, B * 0.7);

          // Lower outer deflectors (smaller to avoid flipper interference)
          addBumper(W * 0.24, H * 0.82, B * 0.65);
          addBumper(W * 0.76, H * 0.82, B * 0.65);

          const pivotY = H * 0.89;
          const L = Math.max(80, Math.min(140, Math.floor(W * 0.18)));
          const thickness = Math.max(8, Math.floor(W * 0.012));
          flippers.push(new Flipper(true, W * 0.26, pivotY, L, thickness));
          flippers.push(new Flipper(false, W * 0.74, pivotY, L, thickness));

          const R = Math.max(8, Math.floor(r * 0.018));
          ball = new Ball(ballInitX, ballInitY, R);
          ball.vx = (Math.random() * 2 - 1) * 60;
          ball.vy = 80;
        }

        function drawPlayfield() {
          const g = ctx.createLinearGradient(0, 0, 0, H);
          g.addColorStop(0, "#0f1a2e");
          g.addColorStop(1, "#06111f");
          ctx.fillStyle = g;
          // Background for full world; outer draw() clips to viewport
          ctx.fillRect(0, 0, W, H);

          ctx.globalAlpha = 0.08;
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, W, 8);
          ctx.globalAlpha = 1;

          ctx.strokeStyle = "rgba(255,255,255,0.14)";
          ctx.lineWidth = 4;
          ctx.lineCap = "round";
          ctx.beginPath();
          for (const w of walls) {
            ctx.moveTo(w.x1, w.y1);
            ctx.lineTo(w.x2, w.y2);
          }
          ctx.stroke();

          for (const b of bumpers) {
            const r = b.r,
              halo = r * (1 + b.pulse * 0.7);
            ctx.beginPath();
            ctx.arc(b.x, b.y, halo, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 213, 102, 0.10)";
            ctx.fill();

            ctx.beginPath();
            ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
            const rg = ctx.createRadialGradient(b.x, b.y, r * 0.2, b.x, b.y, r);
            rg.addColorStop(0, "#ffd166");
            rg.addColorStop(1, "#e65100");
            ctx.fillStyle = rg;
            ctx.fill();

            ctx.beginPath();
            ctx.arc(b.x, b.y, r * 0.25, 0, Math.PI * 2);
            ctx.fillStyle = "#222";
            ctx.fill();
          }
        }

        function resize() {
          DPR = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
          const vw = Math.floor(window.innerWidth);
          const vh = Math.floor(window.innerHeight);
          const targetAspect = 1 / 2; // width:height = 1:2 portrait
          let w, h;
          if (vw / vh > targetAspect) {
            // Viewport is wider than target: limit by height
            h = vh;
            w = Math.floor(h * targetAspect);
          } else {
            // Viewport is narrower or equal: limit by width
            w = vw;
            h = Math.floor(w / targetAspect);
          }
          // World is double-height; canvas matches viewport height only
          W = w;
          VH = h;
          H = h * 2;

          ballInitX = W * 0.85;
          ballInitY = H * 0.74;

          canvas.width = Math.floor(W * DPR);
          canvas.height = Math.floor(VH * DPR);
          canvas.style.width = W + "px";
          canvas.style.height = VH + "px";
          ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
          setupWorld();
          camY = 0;
        }
        window.addEventListener("resize", resize, { passive: true });

        // ---------- Input ----------
        function setLeft(v) {
          leftDown = v;
          flippers[0]?.setPressed(v);
        }
        function setRight(v) {
          rightDown = v;
          flippers[1]?.setPressed(v);
        }

        const activeTouches = new Map();
        canvas.addEventListener(
          "touchstart",
          (e) => {
            e.preventDefault();
            for (const t of e.changedTouches)
              activeTouches.set(t.identifier, t);
            recomputeTouchSides();
          },
          { passive: false }
        );
        canvas.addEventListener(
          "touchmove",
          (e) => {
            e.preventDefault();
            for (const t of e.changedTouches)
              activeTouches.set(t.identifier, t);
            recomputeTouchSides();
          },
          { passive: false }
        );
        canvas.addEventListener(
          "touchend",
          (e) => {
            e.preventDefault();
            for (const t of e.changedTouches)
              activeTouches.delete(t.identifier);
            recomputeTouchSides();
          },
          { passive: false }
        );
        canvas.addEventListener(
          "touchcancel",
          (e) => {
            e.preventDefault();
            for (const t of e.changedTouches)
              activeTouches.delete(t.identifier);
            recomputeTouchSides();
          },
          { passive: false }
        );

        function recomputeTouchSides() {
          const rect = canvas.getBoundingClientRect();
          const midX = rect.left + rect.width / 2;
          let left = false,
            right = false;
          activeTouches.forEach((t) => {
            const x = t.clientX ?? t.pageX;
            if (x < midX) left = true;
            else if (x > midX) right = true;
          });
          setLeft(left);
          setRight(right);
        }

        let mouseDown = false;
        canvas.addEventListener("mousedown", (e) => {
          mouseDown = true;
          const rect = canvas.getBoundingClientRect();
          const midX = rect.left + rect.width / 2;
          if (e.clientX < midX) setLeft(true);
          else setRight(true);
        });
        window.addEventListener("mouseup", () => {
          mouseDown = false;
          setLeft(false);
          setRight(false);
        });
        canvas.addEventListener("mousemove", (e) => {
          if (!mouseDown) return;
          const rect = canvas.getBoundingClientRect();
          const midX = rect.left + rect.width / 2;
          if (e.clientX < midX) {
            setLeft(true);
            setRight(false);
          } else {
            setRight(true);
            setLeft(false);
          }
        });

        window.addEventListener("keydown", (e) => {
          if (e.repeat) return;
          if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A")
            setLeft(true);
          if (e.key === "ArrowRight" || e.key === "d" || e.key === "D")
            setRight(true);
        });
        window.addEventListener("keyup", (e) => {
          if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A")
            setLeft(false);
          if (e.key === "ArrowRight" || e.key === "d" || e.key === "D")
            setRight(false);
        });

        // ---------- Game Loop ----------
        let last = 0;
        function loop(ts) {
          if (!last) last = ts;
          let dt = (ts - last) / 1000;
          dt = Math.min(dt, 1 / 15);
          const step = 1 / 240;
          while (dt > 0) {
            const s = Math.min(step, dt);
            tick(s);
            dt -= s;
          }
          last = ts;
          draw();
          requestAnimationFrame(loop);
        }
        function tick(dt) {
          for (const f of flippers) f.update(dt);
          ball.integrate(dt);
          updateParticles(dt);
          updateScoreDigits(dt);
          updateShake(dt);
          updateCamera(dt);
          for (const b of bumpers) b.pulse = Math.max(0, b.pulse - dt * 3);
        }
        function updateCamera(dt) {
          if (!ball) return;
          const desired = clamp(
            Math.round(ball.y - VH * 0.5),
            0,
            Math.max(0, H - VH)
          );
          // Smooth camera follow
          const k = Math.min(1, dt * 10);
          camY += (desired - camY) * k;
        }
        function draw() {
          ctx.save();
          // Apply visual-only board shake to everything drawn on the playfield
          ctx.translate(shake.x | 0, shake.y | 0);
          // Translate world so that camera offset defines what part is visible
          ctx.translate(0, -(camY | 0));
          // Clip to visible viewport after transforms
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, camY, W, VH);
          ctx.clip();
          drawPlayfield();
          for (const f of flippers) f.draw();
          ball.draw();
          drawParticles();
          drawScoreDigits();
          ctx.restore();
          ctx.restore();
        }

        // ---------- Start ----------
        resize();
        requestAnimationFrame(loop);
      })();
  }, []);

  return (
    <div>
      <style>{css}</style>
      <canvas id="c"></canvas>
      <button id="exit-btn" className="panel" onClick={handleExit}>
        Exit
      </button>
      <div id="ui">
      <div className="panel" id="score">Score: 0</div>
      <div className="panel" id="balls">Balls: ∞</div>
      </div>
      <div id="hint">Tap left/right to flip • Higher bumpers pay up to 1000x</div>
    </div>
  );
}
