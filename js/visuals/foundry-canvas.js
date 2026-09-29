/**
 * MINTED — Neon Vault Canvas
 * LUXE vault backdrop: gold bokeh, neon lasers, money dust, coin bursts
 * Same API as before (spawnBurst, setActivity, setPointer, render)
 */

const TAU = Math.PI * 2;
const MAX_DT = 0.05;

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const pick = arr => arr[(Math.random() * arr.length) | 0];

const rgba = (color, alpha) => `rgba(${color[0]},${color[1]},${color[2]},${clamp(alpha, 0, 1)})`;

/* Palette — LUXE VAULT */
const GOLD = [255, 201, 60];
const GOLD2 = [255, 184, 76];
const EMBER = [255, 138, 0];
const PINK = [255, 26, 117];
const CYAN = [0, 229, 255];
const SKY = [125, 249, 255];
const EMERALD = [0, 230, 118];
const LIME = [191, 255, 0];
const SNOW = [255, 247, 204];
const DEEP = [14, 20, 42];
const AETHER = CYAN; // keep aliases for compat
const ASTRAL = PINK;
const AMETHYST = [168, 85, 247];
const INDIGO = PINK;
const DEEP_SKY = CYAN;
const ROSE = PINK;

/** Gold haze clouds: warm vault spotlights */
const NEBULA_DEFS = [
    { x: 0.22, y: 0.78, r: 0.72, c: GOLD,  i: 0.26, ax: 0.04, ay: 0.03, sp: 0.048 },
    { x: 0.78, y: 0.74, r: 0.68, c: CYAN,  i: 0.16, ax: 0.05, ay: 0.04, sp: 0.038 },
    { x: 0.50, y: 0.22, r: 0.62, c: PINK,  i: 0.14, ax: 0.06, ay: 0.04, sp: 0.042 },
    { x: 0.14, y: 0.26, r: 0.42, c: GOLD2, i: 0.13, ax: 0.06, ay: 0.05, sp: 0.058 },
    { x: 0.86, y: 0.30, r: 0.38, c: EMERALD,i: 0.09, ax: 0.05, ay: 0.05, sp: 0.052 },
    { x: 0.48, y: 0.86, r: 0.50, c: EMBER, i: 0.12, ax: 0.04, ay: 0.03, sp: 0.036 },
    { x: 0.66, y: 0.14, r: 0.34, c: LIME,  i: 0.07, ax: 0.07, ay: 0.05, sp: 0.060 }
];

/** Bokeh particles: far gold dust, mid coins, near flare chips */
const STAR_LAYERS = [
    { count: 110, size: [0.4, 1.1], alpha: [0.12, 0.38], drift: 1.0, twinkle: [0.22, 0.68], flare: 0.00, parallax: 0.12 },
    { count: 56,  size: [0.9, 1.9], alpha: [0.26, 0.62], drift: 2.0, twinkle: [0.36, 1.05], flare: 0.02, parallax: 0.38 },
    { count: 18,  size: [1.3, 2.7], alpha: [0.50, 0.95], drift: 3.6, twinkle: [0.55, 1.45], flare: 0.30, parallax: 0.78 }
];

const STAR_COLORS = [SNOW, GOLD, GOLD2, CYAN, PINK, EMERALD];

const MAX_BURSTS = 620;
const MAX_MOTES = 96;

export class FoundryCanvas {
    constructor(canvasElement) {
        this.canvas = canvasElement || null;
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

        this.width = 0;
        this.height = 0;
        this.dpr = 1;

        this.particlesEnabled = true;
        this.surgeActive = false;
        this.activity = 0;
        this.targetActivity = 0;

        this.pointer = { x: 0, y: 0, tx: 0, ty: 0 };
        this.time = 0;
        this.core = { x: 0, y: 0 };

        this.stars = [];
        this.nebulaBlobs = [];
        this.motes = [];
        this.bursts = [];
        this.rings = [];
        this.streams = [];
        this.shooters = [];
        this.bills = []; // falling money bills

        this.spriteCache = new Map();
        this.backgroundGradient = null;
        this.shooterTimer = rand(5, 14);
        this.coreSparkTimer = 0;
        this.billTimer = 0;
        this.resizeHandler = null;

        this.quality = 1;
        this.frameAverage = 16.7;
        this.bestFrame = 16.7;
        this.warmupFrames = 0;

        if (!this.ctx) { this.supported = false; return; }
        this.supported = true;
        this.caps = this.detectCapabilities();
        this.reducedMotion = this.detectReducedMotion();
        this.resize();
        this.attachResizeListener();
        this.initCosmos();
    }

    detectCapabilities() {
        const ctx = this.ctx || {};
        const fn = name => typeof ctx[name] === 'function';
        const caps = {
            fillRect: fn('fillRect'),
            strokes: fn('moveTo') && fn('lineTo') && fn('stroke'),
            paths: fn('bezierCurveTo') || fn('quadraticCurveTo'),
            sprites: fn('drawImage'),
            dash: fn('setLineDash'),
            transforms: fn('translate') && fn('rotate'),
            transform: fn('setTransform') || fn('scale'),
            gradients: fn('createRadialGradient') && fn('createLinearGradient')
        };
        caps.rich = !!(caps.fillRect && caps.strokes && caps.paths && caps.sprites && caps.gradients);
        return caps;
    }

    detectReducedMotion() {
        try {
            return typeof window !== 'undefined'
                && typeof window.matchMedia === 'function'
                && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) { return false; }
    }

    attachResizeListener() {
        if (typeof window === 'undefined' || !this.canvas) return;
        this.resizeHandler = () => this.resize();
        window.addEventListener('resize', this.resizeHandler);
        if (typeof window.ResizeObserver === 'function') {
            this.resizeObserver = new window.ResizeObserver(() => this.resize());
            if (this.canvas.parentElement) this.resizeObserver.observe(this.canvas.parentElement);
        }
    }

    resize() {
        if (!this.canvas || !this.ctx) return;
        const rect = typeof this.canvas.getBoundingClientRect === 'function'
            ? this.canvas.getBoundingClientRect()
            : { width: 0, height: 0 };
        const cssWidth = Math.max(0, Math.round(rect.width || (this.canvas.clientWidth || 0)));
        const cssHeight = Math.max(0, Math.round(rect.height || (this.canvas.clientHeight || 0)));
        if (cssWidth === 0 || cssHeight === 0) return;
        if (cssWidth === this.width && cssHeight === this.height) return;
        const oldW = this.sceneWidth || cssWidth;
        const oldH = this.sceneHeight || cssHeight;
        this.dpr = clamp((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 1, 2.5);
        this.width = cssWidth;
        this.height = cssHeight;
        this.sceneWidth = cssWidth;
        this.sceneHeight = cssHeight;
        this.canvas.width = Math.floor(cssWidth * this.dpr);
        this.canvas.height = Math.floor(cssHeight * this.dpr);
        if (typeof this.ctx.setTransform === 'function') {
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        } else if (typeof this.ctx.scale === 'function' && this.dpr !== 1) {
            this.ctx.scale(this.dpr, this.dpr);
        }
        this.backgroundGradient = null;
        this.core.x = cssWidth / 2;
        this.core.y = cssHeight / 2 - 16;
        if (this.stars.length > 0) this.rescaleScene(oldW, oldH, cssWidth, cssHeight);
    }

    rescaleScene(oldW, oldH, newW, newH) {
        if (!oldW || !oldH) return;
        const sx = newW / oldW;
        const sy = newH / oldH;
        this.stars.forEach(s => {
            s.x = clamp(s.x * sx, -4, newW + 4);
            s.y = clamp(s.y * sy, -4, newH + 4);
        });
        this.motes.forEach(m => {
            m.x = clamp(m.x * sx, -20, newW + 20);
            m.y = clamp(m.y * sy, -20, newH + 20);
        });
        this.streams.forEach(c => { c.x = clamp(c.x * sx, -40, newW + 40); });
    }

    initCosmos() {
        const w = this.width || 800;
        const h = this.height || 600;
        const areaFactor = clamp((w * h) / (1280 * 720), 0.4, 2.2);

        this.nebulaBlobs = NEBULA_DEFS.map(def => ({
            baseX: def.x, baseY: def.y, color: def.c, intensity: def.i,
            radius: def.r * Math.max(w, h) * 0.52,
            ampX: def.ax, ampY: def.ay, phase: Math.random() * TAU,
            speed: def.sp * (0.6 + Math.random() * 0.8),
            sprite: null, spriteReady: false
        }));

        this.stars = [];
        STAR_LAYERS.forEach((layer, layerIndex) => {
            const count = Math.round(layer.count * areaFactor);
            for (let i = 0; i < count; i++) {
                this.stars.push({
                    x: Math.random() * w, y: Math.random() * h,
                    radius: rand(layer.size[0], layer.size[1]),
                    alpha: rand(layer.alpha[0], layer.alpha[1]),
                    twinkleSpeed: rand(layer.twinkle[0], layer.twinkle[1]),
                    phase: Math.random() * TAU,
                    drift: layer.drift * rand(0.6, 1.4),
                    layer: layerIndex, parallax: layer.parallax,
                    color: pick(STAR_COLORS),
                    flare: Math.random() < layer.flare
                });
            }
        });

        this.motes = [];
        const moteCount = Math.round(38 * areaFactor);
        for (let i = 0; i < moteCount; i++) this.motes.push(this.createMote());

        this.streams = [];
        const streamCount = Math.round(6 * areaFactor);
        for (let i = 0; i < streamCount; i++) this.streams.push(this.createStream());

        this.bills = [];
        this.bursts = [];
        this.rings = [];
        this.shooters = [];
        this.backgroundGradient = null;
    }

    createMote() {
        const w = this.width || 800;
        const h = this.height || 600;
        const kind = Math.random();
        let color;
        if (kind < 0.42) color = pick([GOLD, GOLD2, EMBER]);
        else if (kind < 0.64) color = pick([EMERALD, LIME]);
        else if (kind < 0.82) color = pick([CYAN, SKY]);
        else color = pick([PINK, SNOW]);
        return {
            x: Math.random() * w,
            y: Math.random() * h,
            vx: rand(-0.20, 0.20),
            vy: -rand(0.10, 0.55),
            radius: rand(0.7, 2.6),
            alpha: rand(0.28, 0.82),
            life: rand(0, 100),
            maxLife: rand(260, 720),
            sway: rand(0.4, 1.6),
            swayPhase: Math.random() * TAU,
            color, captured: false,
            shape: Math.random() < 0.18 ? 'bill' : 'dot'
        };
    }

    createStream() {
        const w = this.width || 800;
        const h = this.height || 600;
        const isGold = Math.random() < 0.50;
        return {
            x: Math.random() * w,
            amp: rand(0.02, 0.08) * w,
            freq: rand(0.004, 0.011),
            speed: rand(0.22, 0.72),
            width: rand(0.7, 2.0),
            alpha: rand(0.06, 0.16),
            phase: Math.random() * TAU,
            length: rand(0.20, 0.46),
            color: isGold ? GOLD : pick([CYAN, PINK])
        };
    }

    createBill() {
        const w = this.width || 800;
        return {
            x: rand(-20, w + 20),
            y: -18,
            vx: rand(-0.55, 0.55),
            vy: rand(0.7, 1.9),
            rot: rand(-22, 22) * Math.PI/180,
            vr: rand(-0.9, 0.9) * Math.PI/180,
            w: rand(18, 28),
            h: rand(10, 14),
            alpha: 1,
            life: 1,
            color: Math.random() < 0.72 ? EMERALD : GOLD
        };
    }

    spawnBurst(x, y, count = 22, isSurge = false) {
        if (!this.particlesEnabled || !this.supported) return;
        const palette = isSurge
            ? [GOLD, EMBER, PINK, SNOW]
            : [GOLD, GOLD2, CYAN, PINK, SNOW, EMERALD];
        // central explosion
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * TAU;
            const speed = rand(1.4, 6.2);
            this.bursts.push({
                x, y, px: x, py: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - rand(0, 1.2),
                radius: rand(0.9, 3.1),
                alpha: 1,
                decay: rand(0.016, 0.034),
                color: pick(palette),
                glow: 3.4 + Math.random() * 2.6,
                sparkle: Math.random() < 0.32
            });
        }
        // coin confetti
        for (let i = 0; i < Math.round(count * 0.45); i++) {
            const angle = rand(-0.95, 0.95) + -Math.PI/2;
            const speed = rand(1.8, 4.8);
            this.bursts.push({
                x, y, px: x, py: y,
                vx: Math.cos(angle) * speed + rand(-1.2,1.2),
                vy: Math.sin(angle) * speed,
                radius: rand(2.0, 4.2),
                alpha: 0.95,
                decay: rand(0.012, 0.022),
                color: pick([GOLD, GOLD2]),
                glow: 4.2,
                coin: true
            });
        }
        if (this.bursts.length > MAX_BURSTS) this.bursts.splice(0, this.bursts.length - MAX_BURSTS);

        this.rings.push({
            x, y, radius: 8,
            maxRadius: isSurge ? 168 : 122,
            alpha: isSurge ? 0.78 : 0.56,
            width: isSurge ? 3.2 : 2.1,
            color: isSurge ? PINK : GOLD,
            life: 1, decay: isSurge ? 0.020 : 0.028
        });
        if (this.rings.length > 24) this.rings.splice(0, this.rings.length - 24);

        // emit bills on burst
        for (let i = 0; i < (isSurge ? 4 : 2); i++) {
            this.bills.push({
                x: x + rand(-18,18), y: y + rand(-10, 6),
                vx: rand(-2.2, 2.2), vy: rand(-3.2, -1.2),
                rot: rand(-28,28)*Math.PI/180, vr: rand(-0.12,0.12),
                w: rand(22,30), h: rand(12,16), alpha: 1, life: 1,
                color: pick([EMERALD, GOLD]), gravity: 0.18
            });
        }
    }

    setActivity(cps) {
        const value = Math.max(0, Number(cps) || 0);
        this.targetActivity = value <= 1 ? 0 : clamp(Math.log10(value) / 4.6, 0, 1);
    }

    setPointer(nx, ny) {
        this.pointer.tx = clamp(nx || 0, -1, 1);
        this.pointer.ty = clamp(ny || 0, -1, 1);
    }

    setCorePoint(x, y) { this.core.x = x; this.core.y = y; }

    getSprite(color) {
        const key = color.join(',');
        if (this.spriteCache.has(key)) return this.spriteCache.get(key);
        let sprite = null;
        if (this.caps && this.caps.sprites && typeof document !== 'undefined') {
            try {
                const size = 64;
                const element = document.createElement('canvas');
                element.width = size; element.height = size;
                const sctx = element.getContext('2d');
                if (sctx && typeof sctx.createRadialGradient === 'function' && typeof sctx.fillRect === 'function') {
                    const g = sctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
                    g.addColorStop(0, rgba(color, 1));
                    g.addColorStop(0.22, rgba(color, 0.62));
                    g.addColorStop(0.52, rgba(color, 0.14));
                    g.addColorStop(1, rgba(color, 0));
                    sctx.fillStyle = g;
                    sctx.fillRect(0, 0, size, size);
                    sprite = element;
                }
            } catch (e) { sprite = null; }
        }
        this.spriteCache.set(key, sprite);
        return sprite;
    }

    drawGlow(x, y, radius, color, alpha) {
        if (radius <= 0.2 || alpha <= 0.003) return;
        const ctx = this.ctx;
        const sprite = this.caps.sprites ? this.getSprite(color) : null;
        if (sprite) {
            ctx.globalAlpha = clamp(alpha, 0, 1);
            ctx.drawImage(sprite, x - radius, y - radius, radius * 2, radius * 2);
            ctx.globalAlpha = 1;
            return;
        }
        const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
        g.addColorStop(0, rgba(color, 0.95 * alpha));
        g.addColorStop(0.35, rgba(color, 0.35 * alpha));
        g.addColorStop(1, rgba(color, 0));
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, radius, 0, TAU); ctx.fill();
    }

    drawFlare(x, y, size, alpha, color) {
        if (!this.caps.fillRect || !this.caps.transforms) return;
        const ctx = this.ctx;
        ctx.save();
        ctx.translate(x, y);
        ctx.fillStyle = rgba(color, 1);
        ctx.globalAlpha = alpha * 0.45;
        ctx.fillRect(-size * 5, -0.5, size * 10, 1);
        ctx.fillRect(-0.5, -size * 5, 1, size * 10);
        ctx.rotate(Math.PI / 4);
        ctx.globalAlpha = alpha * 0.18;
        ctx.fillRect(-size * 2.4, -0.5, size * 4.8, 1);
        ctx.fillRect(-0.5, -size * 2.4, 1, size * 4.8);
        ctx.restore();
        ctx.globalAlpha = 1;
    }

    drawBackdrop() {
        const ctx = this.ctx;
        const w = this.width; const h = this.height;
        if (!this.backgroundGradient) {
            const g = ctx.createRadialGradient(w * 0.5, h * 0.52, 0, w * 0.5, h * 0.52, Math.max(w, h) * 0.82);
            g.addColorStop(0, 'rgba(32, 22, 12, 0.55)');
            g.addColorStop(0.28, 'rgba(18, 22, 42, 0.32)');
            g.addColorStop(0.58, 'rgba(14, 18, 36, 0.14)');
            g.addColorStop(1, 'rgba(5, 7, 16, 0)');
            this.backgroundGradient = g;
        }
        // base
        ctx.fillStyle = '#070A14';
        ctx.fillRect(0,0,w,h);
        // vignette
        ctx.fillStyle = this.backgroundGradient;
        ctx.fillRect(0,0,w,h);
        // floor glow
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const fg = ctx.createRadialGradient(w*0.5, h*0.92, 0, w*0.5, h*0.92, w*0.65);
        fg.addColorStop(0, rgba(GOLD, 0.13));
        fg.addColorStop(0.45, rgba(EMBER, 0.07));
        fg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fg;
        ctx.fillRect(0, h*0.62, w, h*0.38);
        ctx.restore();
    }

    drawHorizonGlow() {
        if (!this.caps || !this.caps.gradients) return;
        const ctx = this.ctx; const w = this.width; const h = this.height;
        const pulse = 0.78 + 0.22 * Math.sin(this.time * 0.58);
        const boost = (0.52 + this.activity * 0.72 + (this.surgeActive ? 0.42 : 0)) * pulse;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        ctx.translate(w * 0.5, h * 0.80);
        ctx.scale(1, 0.20);
        const band = ctx.createRadialGradient(0, 0, 0, 0, 0, w * 0.56);
        const col = this.surgeActive ? PINK : GOLD;
        band.addColorStop(0, rgba(col, 0.32 * boost));
        band.addColorStop(0.48, rgba(CYAN, 0.10 * boost));
        band.addColorStop(1, rgba(CYAN, 0));
        ctx.fillStyle = band;
        ctx.beginPath(); ctx.arc(0, 0, w * 0.56, 0, TAU); ctx.fill();
        ctx.restore();

        // corner washes
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        const wl = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) * 0.36);
        wl.addColorStop(0, rgba(PINK, 0.11 * boost));
        wl.addColorStop(1, rgba(PINK, 0));
        ctx.fillStyle = wl; ctx.fillRect(0, 0, w * 0.42, h * 0.34);
        const wr = ctx.createRadialGradient(w, 0, 0, w, 0, Math.max(w, h) * 0.36);
        wr.addColorStop(0, rgba(CYAN, 0.10 * boost));
        wr.addColorStop(1, rgba(CYAN, 0));
        ctx.fillStyle = wr; ctx.fillRect(w * 0.58, 0, w * 0.42, h * 0.34);
        ctx.restore();
    }

    drawNebulae(dt) {
        const ctx = this.ctx; const w = this.width; const h = this.height;
        const px = this.pointer.x; const py = this.pointer.y;
        const boost = 1 + this.activity * 0.52 + (this.surgeActive ? 0.50 : 0);
        const surgeTint = this.surgeActive ? 0.34 : 0;
        ctx.save();
        if (this.caps.gradients) ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < this.nebulaBlobs.length; i++) {
            const b = this.nebulaBlobs[i];
            b.phase += b.speed * dt;
            const breathe = 1 + Math.sin(b.phase * 1.7) * 0.09;
            const cx = (b.baseX + Math.sin(b.phase) * b.ampX - px * b.ampX * 0.9) * w;
            const cy = (b.baseY + Math.cos(b.phase * 0.8) * b.ampY - py * b.ampY * 0.9) * h;
            const radius = b.radius * breathe;
            const alpha = b.intensity * boost * (0.80 + 0.20 * Math.sin(b.phase * 1.3 + i));
            const sprite = this.caps.sprites ? this.getNebulaSprite(b) : null;
            if (sprite) {
                ctx.globalAlpha = clamp(alpha, 0, 1);
                ctx.drawImage(sprite, cx - radius, cy - radius, radius * 2, radius * 2);
                ctx.globalAlpha = 1;
            } else {
                const color = surgeTint > 0 ? mixColor(b.color, PINK, surgeTint * 0.28) : b.color;
                const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
                g.addColorStop(0, rgba(color, alpha));
                g.addColorStop(0.42, rgba(color, alpha * 0.42));
                g.addColorStop(1, rgba(color, 0));
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(cx, cy, radius, 0, TAU); ctx.fill();
            }
        }
        ctx.globalAlpha = 1; ctx.restore();
    }

    getNebulaSprite(blob) {
        if (blob.sprite !== null && blob.sprite !== undefined) return blob.sprite;
        blob.sprite = this.getSprite(blob.color);
        return blob.sprite;
    }

    drawStars(dt) {
        const ctx = this.ctx; const w = this.width; const h = this.height;
        const speedScale = this.reducedMotion ? 0.25 : 1;
        for (let i = 0; i < this.stars.length; i++) {
            const s = this.stars[i];
            s.phase += s.twinkleSpeed * dt;
            s.y -= s.drift * dt * 4.8 * speedScale;
            s.x += Math.sin(s.phase * 0.34) * s.drift * dt * 1.9;
            if (s.y < -4) { s.y = h + 4; s.x = Math.random() * w; }
            if (s.x < -4) s.x = w + 4; else if (s.x > w + 4) s.x = -4;
            const ox = -this.pointer.x * 12 * s.parallax;
            const oy = -this.pointer.y * 9 * s.parallax;
            const twinkle = 0.58 + 0.42 * Math.sin(s.phase);
            const alpha = clamp(s.alpha * twinkle, 0, 1);
            const x = s.x + ox; const y = s.y + oy;
            ctx.fillStyle = rgba(s.color, alpha);
            ctx.beginPath(); ctx.arc(x, y, s.radius, 0, TAU); ctx.fill();
            if (s.flare && twinkle > 0.74) {
                if (this.quality) this.drawFlare(x, y, s.radius, alpha, s.color);
            } else if (s.layer === 2 && twinkle > 0.88) {
                this.drawGlow(x, y, s.radius * 6, s.color, alpha * 0.32);
            }
        }
    }

    drawCoreBloom(dt) {
        const ctx = this.ctx;
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 1.28);
        const intensity = 0.14 + pulse * 0.07 + this.activity * 0.28 + (this.surgeActive ? 0.18 : 0);
        const color = this.surgeActive ? PINK : GOLD;
        const radius = (this.width * 0.32 + this.height * 0.17) * (0.90 + pulse * 0.13 + this.activity * 0.22);
        ctx.save();
        if (this.caps.gradients) ctx.globalCompositeOperation = 'lighter';
        this.drawGlow(this.core.x, this.core.y, radius, color, intensity);
        this.drawGlow(this.core.x, this.core.y, radius * 0.30, SNOW, intensity * 0.55);
        this.drawGlow(this.core.x, this.core.y, radius * 0.62, CYAN, intensity * 0.12);
        ctx.restore();
    }

    drawStreams(dt) {
        if (!this.caps.rich || this.reducedMotion) return;
        const ctx = this.ctx; const w = this.width; const h = this.height;
        const px = this.pointer.x; const py = this.pointer.y;
        const boost = 1 + this.activity * 0.62 + (this.surgeActive ? 0.78 : 0);
        const speedScale = this.reducedMotion ? 0.2 : 1;
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
        for (let i = 0; i < this.streams.length; i++) {
            const s = this.streams[i];
            s.phase += s.speed * dt * speedScale;
            const head = ((s.phase * 0.12) % 1 + 1) % 1;
            const top = head * (h + 200) - 100;
            const segLen = s.length * h;
            const y0 = top - segLen;
            const baseX = s.x - px * 22;
            const alpha = s.alpha * boost;
            const g = ctx.createLinearGradient(0, y0, 0, top);
            g.addColorStop(0, rgba(s.color, 0));
            g.addColorStop(0.62, rgba(s.color, alpha * 0.68));
            g.addColorStop(1, rgba(SNOW, alpha));
            ctx.strokeStyle = g; ctx.lineWidth = s.width;
            ctx.beginPath();
            const steps = 14;
            for (let k = 0; k <= steps; k++) {
                const t = k / steps;
                const y = y0 + segLen * t;
                const sway = Math.sin(s.phase + y * s.freq + py * 2) * s.amp;
                const x = baseX + sway;
                if (k === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    drawMotes(dt) {
        const ctx = this.ctx; const w = this.width; const h = this.height;
        const speedScale = this.reducedMotion ? 0.3 : 1;
        const boost = 1 + this.activity * 0.50 + (this.surgeActive ? 1.0 : 0);
        const cx = this.core.x; const cy = this.core.y;
        const captureRadius = Math.min(w, h) * 0.30;
        ctx.save();
        if (this.caps.gradients) ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < this.motes.length; i++) {
            const m = this.motes[i];
            m.life += dt * 60;
            m.swayPhase += dt * 1.6;
            let ax = 0; let ay = 0;
            const dx = cx - m.x; const dy = cy - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < captureRadius && dist > 1) {
                const pull = (1 - dist / captureRadius) * 2.2 * boost;
                ax += (dx / dist) * pull; ay += (dy / dist) * pull;
                m.captured = true;
            } else m.captured = false;
            m.vx += (ax + Math.sin(m.swayPhase) * 0.11) * dt;
            m.vy += (ay - 0.02) * dt;
            m.vx *= 1 - 0.6 * dt; m.vy *= 1 - 0.6 * dt;
            m.x += m.vx * dt * 60 * speedScale;
            m.y += m.vy * dt * 60 * speedScale;
            const nearCore = m.captured ? clamp(1 - dist / captureRadius, 0, 1) : 0;
            const consumed = nearCore > 0.92;
            if (m.y < -20 || m.x < -20 || m.x > w + 20 || m.life > m.maxLife || consumed) {
                Object.assign(m, this.createMote());
                if (Math.random() < 0.5) m.y = rand(h * 0.52, h + 20); else m.x = Math.random() * w;
                continue;
            }
            const lifeFade = Math.sin(clamp(m.life / m.maxLife, 0, 1) * Math.PI);
            const alpha = clamp(m.alpha * lifeFade * (0.56 + 0.44 * boost) * (1 - nearCore * 0.34), 0, 1);
            if (m.shape === 'bill') {
                ctx.save();
                ctx.translate(m.x, m.y);
                ctx.rotate(Math.sin(m.swayPhase) * 0.18);
                ctx.fillStyle = rgba(m.color, alpha * 0.85);
                ctx.strokeStyle = rgba(SNOW, alpha * 0.45);
                ctx.lineWidth = 0.6;
                const bw = 9, bh = 5.5;
                ctx.fillRect(-bw/2, -bh/2, bw, bh);
                ctx.strokeRect(-bw/2, -bh/2, bw, bh);
                ctx.fillStyle = rgba(SNOW, alpha);
                ctx.font = '600 4px monospace';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('$', 0, 0.5);
                ctx.restore();
            } else {
                this.drawGlow(m.x, m.y, m.radius * 3.2, m.color, alpha);
            }
        }
        ctx.restore();
    }

    drawBills(dt) {
        if (!this.particlesEnabled || this.reducedMotion) return;
        // spawn ambient bills based on activity
        const rate = 0.25 + this.activity * 1.2;
        this.billTimer -= dt;
        if (this.billTimer <= 0) {
            this.billTimer = rand(0.45, 1.2) / (0.6 + rate);
            if (Math.random() < rate * 0.55) this.bills.push(this.createBill());
        }
        const ctx = this.ctx; const w = this.width; const h = this.height;
        ctx.save();
        for (let i = this.bills.length - 1; i >= 0; i--) {
            const b = this.bills[i];
            // physics for burst bills vs ambient
            if (b.gravity !== undefined) {
                b.vy += b.gravity * dt * 60 * 0.16;
                b.vx *= 1 - 0.9 * dt;
                b.vy *= 1 - 0.18 * dt;
                b.rot += b.vr || rand(-0.08,0.08);
                b.vr = (b.vr || 0) * (1 - 0.6 * dt);
            } else {
                b.x += b.vx * dt * 60; b.y += b.vy * dt * 60;
                b.rot += b.vr * dt * 60 * 0.02;
            }
            if (b.gravity !== undefined) { b.x += b.vx * dt * 60; b.y += b.vy * dt * 60; }

            b.life -= dt * (b.gravity !== undefined ? 0.45 : 0.0);
            const out = b.y > h + 30 || b.x < -40 || b.x > w + 40 || (b.gravity !== undefined && b.life <= 0);
            if (out) { this.bills.splice(i,1); continue; }
            const alpha = b.gravity !== undefined ? clamp(b.life,0,1) : 0.88;
            ctx.save();
            ctx.translate(b.x, b.y);
            ctx.rotate(b.rot);
            ctx.globalAlpha = alpha;
            // bill body
            const grad = ctx.createLinearGradient(-b.w/2, 0, b.w/2, 0);
            grad.addColorStop(0, rgba(b.color, 1));
            grad.addColorStop(0.5, rgba([Math.min(255,b.color[0]+28), Math.min(255,b.color[1]+28), Math.min(255,b.color[2]+18)], 1));
            grad.addColorStop(1, rgba(b.color, 0.88));
            ctx.fillStyle = grad;
            ctx.strokeStyle = 'rgba(255,255,255,0.22)';
            ctx.lineWidth = 0.9;
            ctx.beginPath();
            // rounded rect
            const r = 2.2;
            ctx.roundRect ? ctx.roundRect(-b.w/2, -b.h/2, b.w, b.h, r) : ctx.rect(-b.w/2, -b.h/2, b.w, b.h);
            ctx.fill(); ctx.stroke();
            // inner border
            ctx.strokeStyle = 'rgba(255,255,255,0.14)';
            ctx.lineWidth = 0.7;
            const inset = 1.4;
            ctx.strokeRect(-b.w/2+inset, -b.h/2+inset, b.w-inset*2, b.h-inset*2);
            // $ sign
            ctx.fillStyle = b.color === EMERALD ? '#FFD23F' : '#0A5A2E';
            ctx.font = `900 ${Math.round(b.h*0.72)}px var(--font-mono, monospace)`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('$', 0, 0.5);
            ctx.restore();
        }
        ctx.restore();
        if (this.bills.length > 28) this.bills.splice(0, this.bills.length - 28);
    }

    drawBursts(dt) {
        const ctx = this.ctx; const speedScale = this.reducedMotion ? 0.35 : 1;
        ctx.save();
        if (this.caps.gradients) ctx.globalCompositeOperation = 'lighter';
        for (let i = this.bursts.length - 1; i >= 0; i--) {
            const p = this.bursts[i];
            p.px = p.x; p.py = p.y;
            p.vy += (p.coin ? 0.62 : 1.05) * dt;
            const drag = 1 - (p.coin ? 1.0 : 1.6) * dt;
            p.vx *= drag; p.vy *= drag;
            p.x += p.vx * dt * 60 * speedScale;
            p.y += p.vy * dt * 60 * speedScale;
            p.alpha -= p.decay * (dt * 60);
            if (p.alpha <= 0) { this.bursts.splice(i,1); continue; }
            if (p.coin) {
                // draw coin disc
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.x * 0.04);
                const scaleX = 0.72 + 0.28 * Math.sin(p.x * 0.18 + this.time * 6);
                ctx.scale(scaleX, 1);
                ctx.fillStyle = rgba(p.color, p.alpha);
                ctx.strokeStyle = rgba(SNOW, p.alpha * 0.45);
                ctx.lineWidth = 0.8;
                ctx.beginPath(); ctx.arc(0,0, p.radius, 0, TAU); ctx.fill(); ctx.stroke();
                ctx.fillStyle = rgba([60,26,0], p.alpha);
                ctx.font = `800 ${Math.round(p.radius*1.0)}px monospace`;
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('$', 0, 0.5);
                ctx.restore();
                this.drawGlow(p.x, p.y, p.radius * 3.2, p.color, p.alpha * 0.45);
            } else {
                this.drawGlow(p.x, p.y, p.radius * p.glow, p.color, p.alpha * 0.55);
                ctx.fillStyle = rgba(p.color, p.alpha);
                ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, TAU); ctx.fill();
                if (this.caps.rich && this.quality) {
                    const tx = p.x - p.px; const ty = p.y - p.py;
                    const len = Math.sqrt(tx*tx+ty*ty);
                    if (len > 1.2) {
                        ctx.strokeStyle = rgba(p.color, p.alpha * 0.48);
                        ctx.lineWidth = p.radius * 0.9;
                        ctx.beginPath(); ctx.moveTo(p.px,p.py); ctx.lineTo(p.x,p.y); ctx.stroke();
                    }
                }
            }
        }
        ctx.restore();
    }

    drawRings(dt) {
        if (!this.caps.rich) { this.rings.length = 0; return; }
        const ctx = this.ctx;
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = this.rings.length - 1; i >= 0; i--) {
            const r = this.rings[i];
            r.radius += (r.maxRadius - r.radius) * (1 - Math.pow(0.02, dt));
            r.life -= r.decay * (dt * 60);
            if (r.life <= 0 || r.radius >= r.maxRadius) { this.rings.splice(i,1); continue; }
            const alpha = r.life * r.alpha;
            ctx.strokeStyle = rgba(r.color, alpha);
            ctx.lineWidth = r.width * r.life;
            ctx.beginPath(); ctx.arc(r.x, r.y, r.radius, 0, TAU); ctx.stroke();
            ctx.strokeStyle = rgba(SNOW, alpha * 0.36);
            ctx.lineWidth = Math.max(0.5, r.width * r.life * 0.35);
            ctx.beginPath(); ctx.arc(r.x, r.y, r.radius * 0.82, 0, TAU); ctx.stroke();
        }
        ctx.restore();
    }

    drawShootingStars(dt) {
        if (!this.caps.rich || !this.quality) return;
        const ctx = this.ctx; const w = this.width; const h = this.height;
        if (!this.reducedMotion) {
            this.shooterTimer -= dt;
            if (this.shooterTimer <= 0) {
                this.shooterTimer = rand(7, 20);
                const fromLeft = Math.random() < 0.5;
                this.shooters.push({
                    x: fromLeft ? -40 : w + 40, y: rand(h * 0.05, h * 0.5),
                    vx: (fromLeft ? 1 : -1) * rand(340, 620), vy: rand(120, 260),
                    life: 1, decay: rand(0.35, 0.6),
                    color: pick([SNOW, GOLD, PINK, CYAN]), length: rand(90, 220)
                });
            }
        }
        ctx.save(); ctx.globalCompositeOperation = 'lighter';
        for (let i = this.shooters.length - 1; i >= 0; i--) {
            const s = this.shooters[i];
            s.x += s.vx * dt; s.y += s.vy * dt; s.life -= s.decay * dt;
            if (s.life <= 0 || s.x < -80 || s.x > w + 80 || s.y > h + 80) { this.shooters.splice(i,1); continue; }
            const norm = Math.hypot(s.vx, s.vy) || 1;
            const tailX = s.x - (s.vx / norm) * s.length;
            const tailY = s.y - (s.vy / norm) * s.length;
            const g = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
            g.addColorStop(0, rgba(s.color, 0)); g.addColorStop(1, rgba(SNOW, s.life));
            ctx.strokeStyle = g; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(tailX, tailY); ctx.lineTo(s.x, s.y); ctx.stroke();
            this.drawGlow(s.x, s.y, 14, s.color, s.life * 0.5);
        }
        ctx.restore();
    }

    emitCoreSparks(dt) {
        if (!this.particlesEnabled || this.activity < 0.16) return;
        this.coreSparkTimer -= dt;
        if (this.coreSparkTimer > 0) return;
        this.coreSparkTimer = rand(0.05, 0.22) / (0.42 + this.activity);
        const palette = this.surgeActive ? [GOLD, PINK, SNOW] : [GOLD, CYAN, PINK];
        const angle = Math.random() * TAU;
        const speed = rand(0.45, 1.9);
        this.bursts.push({
            x: this.core.x + Math.cos(angle) * 18, y: this.core.y + Math.sin(angle) * 18,
            px: this.core.x + Math.cos(angle) * 18, py: this.core.y + Math.sin(angle) * 18,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            radius: rand(0.7, 1.9), alpha: 0.9, decay: rand(0.008, 0.018),
            color: pick(palette), glow: rand(3, 5)
        });
        if (this.bursts.length > MAX_BURSTS) this.bursts.splice(0, 40);
    }

    updateQuality(dt) {
        if (dt <= 0) return;
        this.warmupFrames++; if (this.warmupFrames < 30) return;
        const ms = dt * 1000;
        this.frameAverage = this.frameAverage * 0.94 + ms * 0.06;
        this.bestFrame = Math.min(ms, this.bestFrame + 0.02);
        const degradeAt = Math.max(26, this.bestFrame * 1.9);
        const recoverAt = Math.max(19, this.bestFrame * 1.35);
        if (this.quality && this.frameAverage > degradeAt) this.quality = 0;
        else if (!this.quality && this.frameAverage < recoverAt) this.quality = 1;
    }

    render(delta) {
        if (!this.ctx || !this.supported) return;
        const w = this.width; const h = this.height;
        if (!w || !h) return;
        const dt = clamp(typeof delta === 'number' && isFinite(delta) ? delta : 0, 0, MAX_DT);
        this.time += dt;
        const ease = Math.min(1, dt * 3.2);
        this.pointer.x += (this.pointer.tx - this.pointer.x) * ease;
        this.pointer.y += (this.pointer.ty - this.pointer.y) * ease;
        this.activity += (this.targetActivity - this.activity) * Math.min(1, dt * 1.8);
        this.updateQuality(dt);
        const ctx = this.ctx;
        ctx.clearRect(0,0,w,h);
        ctx.globalAlpha = 1;
        this.drawBackdrop();
        this.drawHorizonGlow();
        this.drawNebulae(dt);
        this.drawStars(dt);
        this.drawCoreBloom(dt);
        if (!this.particlesEnabled) return;
        this.drawStreams(dt);
        this.drawShootingStars(dt);
        this.drawMotes(dt);
        this.drawBills(dt);
        this.emitCoreSparks(dt);
        this.drawBursts(dt);
        this.drawRings(dt);
    }

    destroy() {
        if (this.resizeHandler && typeof window !== 'undefined') window.removeEventListener('resize', this.resizeHandler);
        if (this.resizeObserver && typeof this.resizeObserver.disconnect === 'function') this.resizeObserver.disconnect();
        this.spriteCache.clear();
    }
}

function mixColor(a,b,t){
    const k = clamp(t,0,1);
    return [Math.round(a[0]+(b[0]-a[0])*k), Math.round(a[1]+(b[1]-a[1])*k), Math.round(a[2]+(b[2]-a[2])*k)];
}
