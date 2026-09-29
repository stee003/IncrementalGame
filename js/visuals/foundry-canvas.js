/**
 * Astral Foundry - Visual Canvas System
 *
 * Renders the living cosmic backdrop behind the foundry:
 *   - layered parallax starfield with diffraction flares
 *   - slow-breathing additive nebula clouds
 *   - aether currents streaming out of the foundry
 *   - drifting motes that converge into the central core
 *   - click sparks, shockwave rings and rare shooting stars
 *
 * All motion is delta-time based (frame-rate independent) and every effect
 * degrades gracefully on limited 2D contexts, such as the lightweight mock
 * used by the jsdom test-suite.
 */

const TAU = Math.PI * 2;
const MAX_DT = 0.05; // seconds - clamps huge frame gaps (tab switches)

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = arr => arr[(Math.random() * arr.length) | 0];

const rgba = (color, alpha) => `rgba(${color[0]},${color[1]},${color[2]},${clamp(alpha, 0, 1)})`;

/* ------------------------------------------------------------------ *
 *  Palette
 * ------------------------------------------------------------------ */
const AETHER = [56, 189, 248];
const SKY = [125, 211, 252];
const DEEP_SKY = [14, 116, 190];
const ASTRAL = [168, 85, 247];
const AMETHYST = [192, 132, 252];
const INDIGO = [99, 102, 241];
const GOLD = [245, 158, 11];
const EMBER = [251, 191, 36];
const ROSE = [244, 114, 182];
const SNOW = [226, 232, 240];

/** Nebula clouds: normalised anchor, radius factor, drift and breathing. */
const NEBULA_DEFS = [
    { x: 0.18, y: 0.26, r: 0.62, c: AETHER,  i: 0.20, ax: 0.05, ay: 0.04, sp: 0.055 },
    { x: 0.80, y: 0.36, r: 0.70, c: ASTRAL,  i: 0.17, ax: 0.06, ay: 0.05, sp: 0.041 },
    { x: 0.52, y: 0.78, r: 0.78, c: INDIGO,  i: 0.16, ax: 0.05, ay: 0.04, sp: 0.033 },
    { x: 0.34, y: 0.62, r: 0.42, c: AMETHYST,i: 0.11, ax: 0.07, ay: 0.06, sp: 0.067 },
    { x: 0.88, y: 0.78, r: 0.46, c: DEEP_SKY,i: 0.13, ax: 0.05, ay: 0.06, sp: 0.048 },
    { x: 0.08, y: 0.86, r: 0.40, c: GOLD,    i: 0.07, ax: 0.06, ay: 0.04, sp: 0.036 },
    { x: 0.66, y: 0.14, r: 0.36, c: ROSE,    i: 0.05, ax: 0.07, ay: 0.05, sp: 0.059 }
];

/** Three depth strata of stars: far dust, mid field, near beacons. */
const STAR_LAYERS = [
    { count: 130, size: [0.35, 0.95], alpha: [0.14, 0.42], drift: 1.1, twinkle: [0.25, 0.75], flare: 0.00, parallax: 0.15 },
    { count: 64,  size: [0.65, 1.55], alpha: [0.28, 0.70], drift: 2.3, twinkle: [0.40, 1.20], flare: 0.00, parallax: 0.45 },
    { count: 22,  size: [1.10, 2.30], alpha: [0.55, 1.00], drift: 4.2, twinkle: [0.60, 1.60], flare: 0.28, parallax: 0.90 }
];

const STAR_COLORS = [SNOW, SNOW, SNOW, AETHER, SKY, AMETHYST, GOLD];

const MAX_BURSTS = 520;
const MAX_MOTES = 90;

/* ------------------------------------------------------------------ *
 *  FoundryCanvas
 * ------------------------------------------------------------------ */
export class FoundryCanvas {
    constructor(canvasElement) {
        this.canvas = canvasElement || null;
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

        this.width = 0;
        this.height = 0;
        this.dpr = 1;

        this.particlesEnabled = true;
        this.surgeActive = false;
        this.activity = 0;          // 0..1 smoothed production intensity
        this.targetActivity = 0;    // 0..1 requested by the game state

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

        this.spriteCache = new Map();
        this.backgroundGradient = null;
        this.shooterTimer = rand(5, 14);
        this.coreSparkTimer = 0;
        this.resizeHandler = null;

        // Adaptive quality: 1 = every effect, 0 = only the cheap ones.
        // Long sessions on modest hardware shed the extras rather than stutter.
        this.quality = 1;
        this.frameAverage = 16.7;
        this.bestFrame = 16.7;
        this.warmupFrames = 0;

        if (!this.ctx) {
            this.supported = false;
            return;
        }

        this.supported = true;
        this.caps = this.detectCapabilities();
        this.reducedMotion = this.detectReducedMotion();

        this.resize();
        this.attachResizeListener();
        this.initCosmos();
    }

    /* ---------------------------------------------------------------- *
     *  Environment detection
     * ---------------------------------------------------------------- */

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
        // "Rich" mode enables the layered, path-based effects. The lite path
        // only relies on arcs + radial gradients, which every real browser
        // and the jsdom mock both support.
        caps.rich = !!(caps.fillRect && caps.strokes && caps.paths && caps.sprites && caps.gradients);
        return caps;
    }

    detectReducedMotion() {
        try {
            return typeof window !== 'undefined'
                && typeof window.matchMedia === 'function'
                && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        } catch (e) {
            return false;
        }
    }

    /* ---------------------------------------------------------------- *
     *  Sizing
     * ---------------------------------------------------------------- */

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

        // Reset the transform instead of stacking a new scale on every resize.
        if (typeof this.ctx.setTransform === 'function') {
            this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        } else if (typeof this.ctx.scale === 'function' && this.dpr !== 1) {
            this.ctx.scale(this.dpr, this.dpr);
        }

        this.backgroundGradient = null;
        this.core.x = cssWidth / 2;
        this.core.y = cssHeight / 2 - 18;

        if (this.stars.length > 0) this.rescaleScene(oldW, oldH, cssWidth, cssHeight);
    }

    /** Keep every element inside the viewport after a resize. */
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

    /* ---------------------------------------------------------------- *
     *  Scene construction
     * ---------------------------------------------------------------- */

    initCosmos() {
        const w = this.width || 800;
        const h = this.height || 600;
        const areaFactor = clamp((w * h) / (1280 * 720), 0.4, 2.2);

        this.nebulaBlobs = NEBULA_DEFS.map(def => ({
            baseX: def.x,
            baseY: def.y,
            color: def.c,
            intensity: def.i,
            radius: def.r * Math.max(w, h) * 0.55,
            ampX: def.ax,
            ampY: def.ay,
            phase: Math.random() * TAU,
            speed: def.sp * (0.6 + Math.random() * 0.8),
            sprite: null,
            spriteReady: false
        }));

        this.stars = [];
        STAR_LAYERS.forEach((layer, layerIndex) => {
            const count = Math.round(layer.count * areaFactor);
            for (let i = 0; i < count; i++) {
                this.stars.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    radius: rand(layer.size[0], layer.size[1]),
                    alpha: rand(layer.alpha[0], layer.alpha[1]),
                    twinkleSpeed: rand(layer.twinkle[0], layer.twinkle[1]),
                    phase: Math.random() * TAU,
                    drift: layer.drift * rand(0.6, 1.4),
                    layer: layerIndex,
                    parallax: layer.parallax,
                    color: pick(STAR_COLORS),
                    flare: Math.random() < layer.flare
                });
            }
        });

        this.motes = [];
        const moteCount = Math.round(34 * areaFactor);
        for (let i = 0; i < moteCount; i++) this.motes.push(this.createMote());

        this.streams = [];
        const streamCount = Math.round(7 * areaFactor);
        for (let i = 0; i < streamCount; i++) this.streams.push(this.createStream());

        this.bursts = [];
        this.rings = [];
        this.shooters = [];
        this.backgroundGradient = null;
    }

    createMote() {
        const w = this.width || 800;
        const h = this.height || 600;
        const warm = Math.random() < 0.18;
        return {
            x: Math.random() * w,
            y: Math.random() * h,
            vx: rand(-0.22, 0.22),
            vy: -rand(0.12, 0.55),
            radius: rand(0.6, 2.4),
            alpha: rand(0.25, 0.8),
            life: rand(0, 100),
            maxLife: rand(240, 700),
            sway: rand(0.4, 1.6),
            swayPhase: Math.random() * TAU,
            color: warm ? pick([GOLD, EMBER]) : pick([AETHER, SKY, AMETHYST, SNOW]),
            captured: false
        };
    }

    createStream() {
        const w = this.width || 800;
        const h = this.height || 600;
        return {
            x: Math.random() * w,
            amp: rand(0.02, 0.09) * w,
            freq: rand(0.004, 0.012),
            speed: rand(0.25, 0.8),
            width: rand(0.6, 1.8),
            alpha: rand(0.05, 0.16),
            phase: Math.random() * TAU,
            length: rand(0.18, 0.45),
            color: Math.random() < 0.2 ? GOLD : pick([AETHER, SKY, AMETHYST])
        };
    }

    /* ---------------------------------------------------------------- *
     *  Public API
     * ---------------------------------------------------------------- */

    /**
     * Spawn a sparkling click burst at the given canvas-local coordinates.
     * @param {number} x
     * @param {number} y
     * @param {number} count
     * @param {boolean} isSurge
     */
    spawnBurst(x, y, count = 20, isSurge = false) {
        if (!this.particlesEnabled || !this.supported) return;

        const palette = isSurge
            ? [GOLD, EMBER, SNOW]
            : [AETHER, SKY, AMETHYST, SNOW];

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * TAU;
            const speed = rand(1.2, 5.0);
            this.bursts.push({
                x,
                y,
                px: x,
                py: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                radius: rand(0.8, 2.6),
                alpha: 1,
                decay: rand(0.018, 0.038),
                color: pick(palette),
                glow: 3.2 + Math.random() * 2.4
            });
        }
        if (this.bursts.length > MAX_BURSTS) {
            this.bursts.splice(0, this.bursts.length - MAX_BURSTS);
        }

        this.rings.push({
            x,
            y,
            radius: 6,
            maxRadius: isSurge ? 150 : 110,
            alpha: isSurge ? 0.75 : 0.55,
            width: isSurge ? 3 : 2,
            color: isSurge ? GOLD : AETHER,
            life: 1,
            decay: isSurge ? 0.022 : 0.03
        });
        if (this.rings.length > 24) this.rings.splice(0, this.rings.length - 24);
    }

    /**
     * Normalised production intensity (0..1) used to scale visual intensity.
     * Uses a log curve so early game and late game both read well.
     */
    setActivity(cps) {
        const value = Math.max(0, Number(cps) || 0);
        this.targetActivity = value <= 1 ? 0 : clamp(Math.log10(value) / 5, 0, 1);
    }

    /** Pointer parallax input, normalised to -1..1. */
    setPointer(nx, ny) {
        this.pointer.tx = clamp(nx || 0, -1, 1);
        this.pointer.ty = clamp(ny || 0, -1, 1);
    }

    /** Screen-space point the aether motes converge toward. */
    setCorePoint(x, y) {
        this.core.x = x;
        this.core.y = y;
    }

    /* ---------------------------------------------------------------- *
     *  Drawing helpers
     * ---------------------------------------------------------------- */

    getSprite(color) {
        const key = color.join(',');
        if (this.spriteCache.has(key)) return this.spriteCache.get(key);

        let sprite = null;
        if (this.caps && this.caps.sprites && typeof document !== 'undefined') {
            try {
                const size = 64;
                const element = document.createElement('canvas');
                element.width = size;
                element.height = size;
                const sctx = element.getContext('2d');
                if (sctx && typeof sctx.createRadialGradient === 'function' && typeof sctx.fillRect === 'function') {
                    const g = sctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
                    g.addColorStop(0, rgba(color, 1));
                    g.addColorStop(0.2, rgba(color, 0.62));
                    g.addColorStop(0.5, rgba(color, 0.16));
                    g.addColorStop(1, rgba(color, 0));
                    sctx.fillStyle = g;
                    sctx.fillRect(0, 0, size, size);
                    sprite = element;
                }
            } catch (e) {
                sprite = null;
            }
        }
        this.spriteCache.set(key, sprite);
        return sprite;
    }

    /** Soft additive light blob, sprite-accelerated when available. */
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
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, TAU);
        ctx.fill();
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

    /* ---------------------------------------------------------------- *
     *  Layers
     * ---------------------------------------------------------------- */

    drawBackdrop() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Cached wash so we are not allocating a gradient every frame.
        // Kept translucent at the edges so the canvas blends seamlessly into
        // the surrounding panels instead of ending on a visible seam.
        if (!this.backgroundGradient) {
            const g = ctx.createRadialGradient(w * 0.5, h * 0.46, 0, w * 0.5, h * 0.46, Math.max(w, h) * 0.8);
            g.addColorStop(0, 'rgba(26, 44, 76, 0.55)');
            g.addColorStop(0.45, 'rgba(13, 21, 39, 0.28)');
            g.addColorStop(1, 'rgba(4, 6, 12, 0)');
            this.backgroundGradient = g;
        }

        ctx.fillStyle = this.backgroundGradient;
        ctx.fillRect ? ctx.fillRect(0, 0, w, h) : ctx.clearRect(0, 0, w, h);
    }

    drawNebulae(dt) {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        const px = this.pointer.x;
        const py = this.pointer.y;
        const boost = 1 + this.activity * 0.45 + (this.surgeActive ? 0.35 : 0);
        const surgeTint = this.surgeActive ? 0.35 : 0;

        ctx.save();
        if (this.caps.gradients) ctx.globalCompositeOperation = 'lighter';

        for (let i = 0; i < this.nebulaBlobs.length; i++) {
            const b = this.nebulaBlobs[i];
            b.phase += b.speed * dt;

            const breathe = 1 + Math.sin(b.phase * 1.7) * 0.09;
            const cx = (b.baseX + Math.sin(b.phase) * b.ampX - px * b.ampX * 0.9) * w;
            const cy = (b.baseY + Math.cos(b.phase * 0.8) * b.ampY - py * b.ampY * 0.9) * h;
            const radius = b.radius * breathe;
            const alpha = b.intensity * boost * (0.78 + 0.22 * Math.sin(b.phase * 1.3 + i));

            const sprite = this.caps.sprites ? this.getNebulaSprite(b) : null;
            if (sprite) {
                ctx.globalAlpha = clamp(alpha, 0, 1);
                ctx.drawImage(sprite, cx - radius, cy - radius, radius * 2, radius * 2);
                ctx.globalAlpha = 1;
            } else {
                const color = surgeTint > 0 ? mixColor(b.color, GOLD, surgeTint * 0.4) : b.color;
                const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
                g.addColorStop(0, rgba(color, alpha));
                g.addColorStop(0.4, rgba(color, alpha * 0.42));
                g.addColorStop(1, rgba(color, 0));
                ctx.fillStyle = g;
                ctx.beginPath();
                ctx.arc(cx, cy, radius, 0, TAU);
                ctx.fill();
            }
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    }

    getNebulaSprite(blob) {
        if (blob.sprite !== null && blob.sprite !== undefined) return blob.sprite;
        blob.sprite = this.getSprite(blob.color);
        return blob.sprite;
    }

    drawStars(dt) {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        const speedScale = this.reducedMotion ? 0.25 : 1;

        for (let i = 0; i < this.stars.length; i++) {
            const s = this.stars[i];
            s.phase += s.twinkleSpeed * dt;
            s.y -= s.drift * dt * 5 * speedScale;
            s.x += Math.sin(s.phase * 0.35) * s.drift * dt * 2;

            if (s.y < -4) {
                s.y = h + 4;
                s.x = Math.random() * w;
            }
            if (s.x < -4) s.x = w + 4;
            else if (s.x > w + 4) s.x = -4;

            const ox = -this.pointer.x * 14 * s.parallax;
            const oy = -this.pointer.y * 10 * s.parallax;
            const twinkle = 0.55 + 0.45 * Math.sin(s.phase);
            const alpha = clamp(s.alpha * twinkle, 0, 1);
            const x = s.x + ox;
            const y = s.y + oy;

            ctx.fillStyle = rgba(s.color, alpha);
            ctx.beginPath();
            ctx.arc(x, y, s.radius, 0, TAU);
            ctx.fill();

            if (s.flare && twinkle > 0.75) {
                if (this.quality) this.drawFlare(x, y, s.radius, alpha, s.color);
            } else if (s.layer === 2 && twinkle > 0.9) {
                this.drawGlow(x, y, s.radius * 6, s.color, alpha * 0.35);
            }
        }
    }

    drawCoreBloom(dt) {
        const ctx = this.ctx;
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 1.35);
        const intensity = 0.10 + pulse * 0.05 + this.activity * 0.22 + (this.surgeActive ? 0.12 : 0);
        const color = this.surgeActive ? GOLD : AETHER;
        const radius = (this.width * 0.30 + this.height * 0.16) * (0.92 + pulse * 0.12 + this.activity * 0.2);

        ctx.save();
        if (this.caps.gradients) ctx.globalCompositeOperation = 'lighter';
        this.drawGlow(this.core.x, this.core.y, radius, color, intensity);
        this.drawGlow(this.core.x, this.core.y, radius * 0.32, SNOW, intensity * 0.5);
        ctx.restore();
    }

    drawStreams(dt) {
        if (!this.caps.rich || this.reducedMotion) return;
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        const px = this.pointer.x;
        const py = this.pointer.y;
        const boost = 1 + this.activity * 0.6 + (this.surgeActive ? 0.8 : 0);
        const speedScale = this.reducedMotion ? 0.2 : 1;

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.lineCap = 'round';

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
            g.addColorStop(0.65, rgba(s.color, alpha * 0.7));
            g.addColorStop(1, rgba(SNOW, alpha));

            ctx.strokeStyle = g;
            ctx.lineWidth = s.width;
            ctx.beginPath();
            const steps = 14;
            for (let k = 0; k <= steps; k++) {
                const t = k / steps;
                const y = y0 + segLen * t;
                const sway = Math.sin(s.phase + y * s.freq + py * 2) * s.amp;
                const x = baseX + sway;
                if (k === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        ctx.restore();
    }

    drawMotes(dt) {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        const speedScale = this.reducedMotion ? 0.3 : 1;
        const boost = 1 + this.activity * 0.5 + (this.surgeActive ? 1.0 : 0);
        const cx = this.core.x;
        const cy = this.core.y;
        const captureRadius = Math.min(w, h) * 0.28;

        ctx.save();
        if (this.caps.gradients) ctx.globalCompositeOperation = 'lighter';

        for (let i = 0; i < this.motes.length; i++) {
            const m = this.motes[i];
            m.life += dt * 60;
            m.swayPhase += dt * 1.6;

            // Gentle attraction toward the central core.
            let ax = 0;
            let ay = 0;
            const dx = cx - m.x;
            const dy = cy - m.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < captureRadius && dist > 1) {
                const pull = (1 - dist / captureRadius) * 2.4 * boost;
                ax += (dx / dist) * pull;
                ay += (dy / dist) * pull;
                m.captured = true;
            } else {
                m.captured = false;
            }

            m.vx += (ax + Math.sin(m.swayPhase) * 0.12) * dt;
            m.vy += (ay - 0.02) * dt;
            m.vx *= 1 - 0.6 * dt;
            m.vy *= 1 - 0.6 * dt;
            m.x += m.vx * dt * 60 * speedScale;
            m.y += m.vy * dt * 60 * speedScale;

            const nearCore = m.captured ? clamp(1 - dist / captureRadius, 0, 1) : 0;
            const consumed = nearCore > 0.92;

            if (m.y < -20 || m.x < -20 || m.x > w + 20 || m.life > m.maxLife || consumed) {
                Object.assign(m, this.createMote());
                if (Math.random() < 0.5) m.y = rand(h * 0.5, h + 20);
                else m.x = Math.random() * w;
                continue;
            }

            const lifeFade = Math.sin(clamp(m.life / m.maxLife, 0, 1) * Math.PI);
            const alpha = clamp(m.alpha * lifeFade * (0.55 + 0.45 * boost) * (1 - nearCore * 0.35), 0, 1);
            this.drawGlow(m.x, m.y, m.radius * 3.4, m.color, alpha);
        }

        ctx.restore();
    }

    drawBursts(dt) {
        const ctx = this.ctx;
        const speedScale = this.reducedMotion ? 0.35 : 1;

        ctx.save();
        if (this.caps.gradients) ctx.globalCompositeOperation = 'lighter';

        for (let i = this.bursts.length - 1; i >= 0; i--) {
            const p = this.bursts[i];
            p.px = p.x;
            p.py = p.y;
            p.vy += 1.1 * dt;            // gentle gravity
            const drag = 1 - 1.6 * dt;
            p.vx *= drag;
            p.vy *= drag;
            p.x += p.vx * dt * 60 * speedScale;
            p.y += p.vy * dt * 60 * speedScale;
            p.alpha -= p.decay * (dt * 60);

            if (p.alpha <= 0) {
                this.bursts.splice(i, 1);
                continue;
            }

            this.drawGlow(p.x, p.y, p.radius * p.glow, p.color, p.alpha * 0.55);
            ctx.fillStyle = rgba(p.color, p.alpha);
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, TAU);
            ctx.fill();

            if (this.caps.rich && this.quality) {
                // Motion-blur streak from the previous position.
                const tx = p.x - p.px;
                const ty = p.y - p.py;
                const len = Math.sqrt(tx * tx + ty * ty);
                if (len > 1.2) {
                    ctx.strokeStyle = rgba(p.color, p.alpha * 0.5);
                    ctx.lineWidth = p.radius * 0.9;
                    ctx.beginPath();
                    ctx.moveTo(p.px, p.py);
                    ctx.lineTo(p.x, p.y);
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }

    drawRings(dt) {
        if (!this.caps.rich) {
            this.rings.length = 0;
            return;
        }
        const ctx = this.ctx;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (let i = this.rings.length - 1; i >= 0; i--) {
            const r = this.rings[i];
            r.radius += (r.maxRadius - r.radius) * (1 - Math.pow(0.02, dt));
            r.life -= r.decay * (dt * 60);
            if (r.life <= 0 || r.radius >= r.maxRadius) {
                this.rings.splice(i, 1);
                continue;
            }
            const alpha = r.life * r.alpha;
            ctx.strokeStyle = rgba(r.color, alpha);
            ctx.lineWidth = r.width * r.life;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, TAU);
            ctx.stroke();

            ctx.strokeStyle = rgba(SNOW, alpha * 0.4);
            ctx.lineWidth = Math.max(0.5, r.width * r.life * 0.4);
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius * 0.82, 0, TAU);
            ctx.stroke();
        }
        ctx.restore();
    }

    drawShootingStars(dt) {
        if (!this.caps.rich || !this.quality) return;
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        if (!this.reducedMotion) {
            this.shooterTimer -= dt;
            if (this.shooterTimer <= 0) {
                this.shooterTimer = rand(7, 20);
                const fromLeft = Math.random() < 0.5;
                this.shooters.push({
                    x: fromLeft ? -40 : w + 40,
                    y: rand(h * 0.05, h * 0.5),
                    vx: (fromLeft ? 1 : -1) * rand(340, 620),
                    vy: rand(120, 260),
                    life: 1,
                    decay: rand(0.35, 0.6),
                    color: pick([SNOW, SKY, GOLD, AMETHYST]),
                    length: rand(90, 220)
                });
            }
        }

        ctx.save();
        ctx.globalCompositeOperation = 'lighter';

        for (let i = this.shooters.length - 1; i >= 0; i--) {
            const s = this.shooters[i];
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            s.life -= s.decay * dt;
            if (s.life <= 0 || s.x < -80 || s.x > w + 80 || s.y > h + 80) {
                this.shooters.splice(i, 1);
                continue;
            }
            const norm = Math.hypot(s.vx, s.vy) || 1;
            const tailX = s.x - (s.vx / norm) * s.length;
            const tailY = s.y - (s.vy / norm) * s.length;
            const g = ctx.createLinearGradient(tailX, tailY, s.x, s.y);
            g.addColorStop(0, rgba(s.color, 0));
            g.addColorStop(1, rgba(SNOW, s.life));
            ctx.strokeStyle = g;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(tailX, tailY);
            ctx.lineTo(s.x, s.y);
            ctx.stroke();
            this.drawGlow(s.x, s.y, 14, s.color, s.life * 0.5);
        }
        ctx.restore();
    }

    /** Ambient sparks emitted by the core once the foundry gets busy. */
    emitCoreSparks(dt) {
        if (!this.particlesEnabled || this.activity < 0.18) return;
        this.coreSparkTimer -= dt;
        if (this.coreSparkTimer > 0) return;
        this.coreSparkTimer = rand(0.05, 0.22) / (0.4 + this.activity);

        const palette = this.surgeActive ? [GOLD, EMBER, SNOW] : [AETHER, SKY, AMETHYST];
        const angle = Math.random() * TAU;
        const speed = rand(0.4, 1.8);
        this.bursts.push({
            x: this.core.x + Math.cos(angle) * 18,
            y: this.core.y + Math.sin(angle) * 18,
            px: this.core.x + Math.cos(angle) * 18,
            py: this.core.y + Math.sin(angle) * 18,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            radius: rand(0.6, 1.8),
            alpha: 0.9,
            decay: rand(0.008, 0.018),
            color: pick(palette),
            glow: rand(3, 5)
        });
        if (this.bursts.length > MAX_BURSTS) this.bursts.splice(0, 40);
    }

    /* ---------------------------------------------------------------- *
     *  Frame
     * ---------------------------------------------------------------- */

    /**
     * Shed the most expensive optional effects when frames get consistently
     * slow, and restore them once there is headroom again. Thresholds derive
     * from the best frame time observed, so this behaves the same on a 60Hz
     * panel and on a high-refresh display instead of assuming a fixed budget.
     */
    updateQuality(dt) {
        if (dt <= 0) return;
        this.warmupFrames++;
        if (this.warmupFrames < 30) return; // ignore start-up jank

        const ms = dt * 1000;
        this.frameAverage = this.frameAverage * 0.94 + ms * 0.06;
        this.bestFrame = Math.min(ms, this.bestFrame + 0.02);

        const degradeAt = Math.max(26, this.bestFrame * 1.9);
        const recoverAt = Math.max(19, this.bestFrame * 1.35);

        if (this.quality && this.frameAverage > degradeAt) {
            this.quality = 0;
        } else if (!this.quality && this.frameAverage < recoverAt) {
            this.quality = 1;
        }
    }

    render(delta) {
        if (!this.ctx || !this.supported) return;
        const w = this.width;
        const h = this.height;
        if (!w || !h) return;

        const dt = clamp(typeof delta === 'number' && isFinite(delta) ? delta : 0, 0, MAX_DT);
        this.time += dt;

        // Smoothed pointer parallax + activity easing.
        const ease = Math.min(1, dt * 3.2);
        this.pointer.x += (this.pointer.tx - this.pointer.x) * ease;
        this.pointer.y += (this.pointer.ty - this.pointer.y) * ease;
        this.activity += (this.targetActivity - this.activity) * Math.min(1, dt * 1.8);

        this.updateQuality(dt);

        const ctx = this.ctx;
        ctx.clearRect(0, 0, w, h);
        ctx.globalAlpha = 1;

        // 1. Deep space wash
        this.drawBackdrop();

        // 2. Nebula clouds
        this.drawNebulae(dt);

        // 3. Starfield
        this.drawStars(dt);

        // 4. Core bloom behind the foundry
        this.drawCoreBloom(dt);

        if (!this.particlesEnabled) return;

        // 5. Aether currents
        this.drawStreams(dt);

        // 6. Shooting stars
        this.drawShootingStars(dt);

        // 7. Drifting motes
        this.drawMotes(dt);

        // 8. Click sparks & shockwave rings
        this.emitCoreSparks(dt);
        this.drawBursts(dt);
        this.drawRings(dt);
    }

    destroy() {
        if (this.resizeHandler && typeof window !== 'undefined') {
            window.removeEventListener('resize', this.resizeHandler);
        }
        if (this.resizeObserver && typeof this.resizeObserver.disconnect === 'function') {
            this.resizeObserver.disconnect();
        }
        this.spriteCache.clear();
    }
}

/** Linear colour blend helper (used for surge tinting). */
function mixColor(a, b, t) {
    const k = clamp(t, 0, 1);
    return [
        Math.round(a[0] + (b[0] - a[0]) * k),
        Math.round(a[1] + (b[1] - a[1]) * k),
        Math.round(a[2] + (b[2] - a[2]) * k)
    ];
}
