/**
 * Astral Foundry - Visual Canvas System
 * Renders atmospheric cosmic nebulae, twinkling starfield,
 * drifting aetheric motes, and radiant click particle bursts.
 */

export class FoundryCanvas {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.ctx = canvasElement.getContext('2d');
        this.stars = [];
        this.motes = [];
        this.bursts = [];
        this.nebulaBlobs = [];
        this.width = 0;
        this.height = 0;
        this.surgeActive = false;
        this.particlesEnabled = true;

        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.initCosmos();
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.width = rect.width;
        this.height = rect.height;
        this.canvas.width = Math.floor(rect.width * dpr);
        this.canvas.height = Math.floor(rect.height * dpr);
        this.ctx.scale(dpr, dpr);
    }

    initCosmos() {
        this.stars = [];
        const starCount = 120;
        for (let i = 0; i < starCount; i++) {
            this.stars.push({
                x: Math.random() * (this.width || 800),
                y: Math.random() * (this.height || 600),
                radius: Math.random() * 1.5 + 0.3,
                alpha: Math.random() * 0.8 + 0.2,
                twinkleSpeed: Math.random() * 0.03 + 0.005,
                phase: Math.random() * Math.PI * 2
            });
        }

        this.nebulaBlobs = [
            { x: 0.3, y: 0.35, r: 180, color: 'rgba(56, 189, 248, 0.04)', vx: 0.01, vy: 0.01, phase: 0 },
            { x: 0.7, y: 0.45, r: 220, color: 'rgba(168, 85, 247, 0.04)', vx: -0.01, vy: 0.015, phase: 1.5 },
            { x: 0.5, y: 0.7, r: 200, color: 'rgba(99, 102, 241, 0.03)', vx: 0.015, vy: -0.01, phase: 3.0 }
        ];

        this.motes = [];
        const moteCount = 35;
        for (let i = 0; i < moteCount; i++) {
            this.motes.push(this.createMote());
        }
    }

    createMote() {
        const w = this.width || 800;
        const h = this.height || 600;
        return {
            x: Math.random() * w,
            y: Math.random() * h,
            vx: (Math.random() - 0.5) * 0.3,
            vy: -(Math.random() * 0.6 + 0.2), // Gently rise upwards
            radius: Math.random() * 2 + 0.5,
            alpha: Math.random() * 0.6 + 0.2,
            life: Math.random() * 100,
            maxLife: Math.random() * 180 + 100,
            color: Math.random() > 0.4 ? 'rgba(56, 189, 248, ' : 'rgba(167, 139, 250, '
        };
    }

    /**
     * Spawn sparkling burst at given coordinates
     */
    spawnBurst(x, y, count = 20, isSurge = false) {
        if (!this.particlesEnabled) return;
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3.5 + 1.2;
            this.bursts.push({
                x,
                y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: Math.random() * 2.5 + 1.0,
                alpha: 1.0,
                decay: Math.random() * 0.025 + 0.02,
                color: isSurge ? '#f59e0b' : (Math.random() > 0.3 ? '#38bdf8' : '#c084fc')
            });
        }
    }

    render(delta) {
        if (!this.ctx || this.width === 0) return;
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.clearRect(0, 0, w, h);

        // 1. Nebulae
        this.nebulaBlobs.forEach(b => {
            b.phase += 0.008;
            const cx = (b.x + Math.sin(b.phase) * 0.05) * w;
            const cy = (b.y + Math.cos(b.phase) * 0.05) * h;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, b.r);
            grad.addColorStop(0, b.color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(cx, cy, b.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // 2. Stars
        this.stars.forEach(s => {
            s.phase += s.twinkleSpeed;
            const currentAlpha = s.alpha * (0.6 + 0.4 * Math.sin(s.phase));
            ctx.fillStyle = `rgba(226, 232, 240, ${currentAlpha})`;
            ctx.beginPath();
            ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        if (!this.particlesEnabled) return;

        // 3. Floating Motes
        const speedMult = this.surgeActive ? 2.0 : 1.0;
        this.motes.forEach(m => {
            m.x += m.vx * speedMult;
            m.y += m.vy * speedMult;
            m.life++;

            if (m.y < -10 || m.x < -10 || m.x > w + 10 || m.life > m.maxLife) {
                Object.assign(m, this.createMote());
                m.y = h + 10;
            }

            const fade = Math.sin((m.life / m.maxLife) * Math.PI);
            ctx.fillStyle = `${m.color}${m.alpha * fade})`;
            ctx.beginPath();
            ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        // 4. Bursts
        for (let i = this.bursts.length - 1; i >= 0; i--) {
            const p = this.bursts[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.04; // Gentle gravity
            p.alpha -= p.decay;

            if (p.alpha <= 0) {
                this.bursts.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.shadowBlur = 6;
            ctx.shadowColor = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }
}
