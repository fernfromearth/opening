
(() => {
  "use strict";

  const canvas = document.getElementById("world");
  const ctx = canvas?.getContext("2d");
  const playButton = document.getElementById("play");

  if (!canvas || !ctx) {
    console.error("DIVIZTY: Canvas unavailable");
    return;
  }

  const COLORS = {
    bg: "#050609",
    cyan: "#55DDF5",
    green: "#39FF88",
    pink: "#F17CCB",
    purple: "#A98BFF",
    red: "#FF0033",
    white: "#EAF5FF"
  };

  let W = 0, H = 0, DPR = 1;
  let running = false;
  let startTime = 0;
  let lastFrame = 0;
  let raf = 0;
  let particles = [];
  let explosionStarted = false;

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, t) => a + (b - a) * t;

  function smooth(a, b, x) {
    const v = clamp((x - a) / (b - a), 0, 1);
    return v * v * (3 - 2 * v);
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = Math.max(1, window.innerWidth);
    H = Math.max(1, window.innerHeight);

    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  window.addEventListener("resize", resize);
  resize();

  function random(a, b) {
    return Math.random() * (b - a) + a;
  }

  function earthAngle(t) {
    if (t <= 4) return 1.4 * t + 0.55 * t * t;
    if (t <= 8) return 14.4 + 5.8 * (t - 4);

    if (t <= 10) {
      const u = (t - 8) / 2;
      return 37.6 + 11.6 * (
        u - u * u + (u * u * u) / 3
      );
    }

    return 41.4666667;
  }

  function drawBackground(t) {
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 90; i++) {
      const x = (i * 127.7) % W;
      const y = (i * 83.3) % H;

      ctx.globalAlpha =
        0.2 + Math.abs(Math.sin(t * 1.1 + i)) * 0.55;

      ctx.fillStyle = COLORS.white;
      ctx.fillRect(x, y, 1.3, 1.3);
    }

    ctx.globalAlpha = 1;
  }

  function drawEarth(angle, t, shaking, pinkMode) {
    const radius = Math.max(40, Math.min(145, W * 0.18, H * 0.27));
    const cx = W / 2;
    const cy = H / 2;

    const sx = shaking ? Math.sin(t * 48) * 4 : 0;
    const sy = shaking ? Math.cos(t * 55) * 4 : 0;

    const resolution = 23;
    const step = radius / resolution;
    const glyphs = " .:-=+*#%@";

    ctx.save();
    ctx.translate(cx + sx, cy + sy);

    // Soft neon halo
    const halo = ctx.createRadialGradient(0, 0, radius * 0.35, 0, 0, radius * 1.35);
    halo.addColorStop(0, pinkMode ? "rgba(241,124,203,0.12)" : "rgba(85,221,245,0.10)");
    halo.addColorStop(0.65, "rgba(169,139,255,0.06)");
    halo.addColorStop(1, "rgba(5,6,9,0)");

    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.35, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = `${step * 1.35}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let y = -resolution; y <= resolution; y++) {
      for (let x = -resolution; x <= resolution; x++) {
        const nx = x / resolution;
        const ny = y / resolution;
        const d = nx * nx + ny * ny;

        if (d > 1) continue;

        const z = Math.sqrt(1 - d);
        const lon = Math.atan2(nx, z) + angle;
        const lat = Math.asin(ny);

        const continent =
          Math.sin(lon * 2.4 + lat * 3.1) +
          Math.cos(lon * 4.1 - lat * 2.2) +
          Math.sin(lon * 6.3 + lat * 5.2) * 0.5;

        const land = continent > 0.45;

        let color = land
          ? (pinkMode ? COLORS.green : "#72E69A")
          : (pinkMode ? COLORS.pink : COLORS.cyan);

        if (pinkMode) {
          const accent =
            Math.sin(lon * 5.2 + lat * 4.3) +
            Math.cos(lon * 3.7 - lat * 5.1);

          if (z > 0.3 && accent > 1.65) color = COLORS.cyan;
          if (z > 0.35 && accent < -1.65) color = COLORS.purple;
        }

        const brightness = clamp(
          z * 0.75 + (land ? 0.25 : 0.1),
          0,
          1
        );

        const index = Math.floor(
          brightness * (glyphs.length - 1)
        );

        ctx.globalAlpha = 0.45 + z * 0.55;
        ctx.fillStyle = color;
        ctx.fillText(glyphs[index], x * step, y * step);
      }
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawError(t) {
    const flicker = 0.75 + Math.abs(Math.sin(t * 20)) * 0.25;
    const offset = Math.sin(t * 38) * 6;

    ctx.save();
    ctx.translate(W / 2, H / 2);

    for (let i = 0; i < 8; i++) {
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = i % 2 ? COLORS.red : "#FF657C";
      ctx.fillRect(-W / 2, Math.sin(t * 15 + i * 2) * 65, W, 3);
    }

    ctx.globalAlpha = flicker;
    ctx.strokeStyle = COLORS.red;
    ctx.lineWidth = 2;
    ctx.shadowColor = COLORS.red;
    ctx.shadowBlur = 30;
    ctx.strokeRect(-135, -43, 270, 86);

    ctx.font = "bold 40px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = COLORS.red;
    ctx.shadowBlur = 35;
    ctx.fillText("ERROR", offset, 0);

    ctx.shadowBlur = 0;
    ctx.font = "10px monospace";
    ctx.fillStyle = COLORS.white;
    ctx.fillText("SYSTEM FAILURE // 0x0000", 0, 62);

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function createExplosion() {
    if (explosionStarted) return;
    explosionStarted = true;
    particles = [];

    const colors = [
      COLORS.cyan,
      COLORS.green,
      COLORS.pink,
      COLORS.purple,
      COLORS.white
    ];

    for (let i = 0; i < 200; i++) {
      const a = random(0, Math.PI * 2);
      const speed = random(1.5, 7);

      particles.push({
        x: W / 2 + Math.cos(a) * random(0, 20),
        y: H / 2 + Math.sin(a) * random(0, 20),
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed,
        life: random(2, 3.2),
        maxLife: 3.2,
        size: random(1, 3),
        color: colors[Math.floor(random(0, colors.length))]
      });
    }
  }

  function drawExplosion(t, dt) {
    createExplosion();

    const elapsed = t - 10;
    const fade = 1 - smooth(2.1, 3.2, elapsed);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    for (const p of particles) {
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.vx *= Math.pow(0.985, dt * 60);
      p.vy *= Math.pow(0.985, dt * 60);
      p.life -= dt;

      if (p.life <= 0) continue;

      const alpha = clamp(p.life / p.maxLife, 0, 1) * fade;

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 4, p.y - p.vy * 4);
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.18;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    for (let i = 0; i < 3; i++) {
      const progress = clamp(elapsed / (0.8 + i * 0.3), 0, 1);

      ctx.globalAlpha = (1 - progress) * 0.4 * fade;
      ctx.strokeStyle = [COLORS.pink, COLORS.cyan, COLORS.purple][i];
      ctx.lineWidth = 2 + (1 - progress) * 4;

      ctx.beginPath();
      ctx.arc(
        W / 2,
        H / 2,
        progress * (160 + i * 90),
        0,
        Math.PI * 2
      );
      ctx.stroke();
    }

    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
  }

  function drawLogo(t) {
    const progress = clamp((t - 11.5) / 3.5, 0, 1);
    const ease = 1 - Math.pow(1 - progress, 4);
    const scale = 0.04 + ease * 0.96;
    const alpha = smooth(0.02, 0.5, progress);

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(scale, scale);
    ctx.globalAlpha = alpha;

    const size = Math.min(76, W * 0.14);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `bold ${size}px monospace`;

    ctx.shadowColor = COLORS.pink;
    ctx.shadowBlur = 35;
    ctx.fillStyle = COLORS.pink;
    ctx.fillText("DIVIZTY", 0, 0);

    ctx.shadowColor = COLORS.cyan;
    ctx.shadowBlur = 22;
    ctx.fillStyle = COLORS.cyan;
    ctx.fillText("DIVIZTY", 0, -2);

    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.white;
    ctx.fillText("DIVIZTY", 0, -1);

    ctx.globalAlpha *= smooth(0.4, 0.85, progress);
    ctx.font = `${Math.max(9, size * 0.17)}px monospace`;
    ctx.fillStyle = COLORS.white;
    ctx.fillText("WELCOME TO THE FUTURE", 0, size * 0.8);

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function animate(now) {
    if (!running) return;

    const t = (now - startTime) / 1000;
    const dt = lastFrame
      ? Math.min((now - lastFrame) / 1000, 0.033)
      : 1 / 60;

    lastFrame = now;

    drawBackground(t);

    if (t < 10) {
      drawEarth(
        earthAngle(t),
        t,
        t >= 5.5 && t < 8,
        t >= 5.5
      );
    }

    if (t >= 4 && t < 5.5) drawError(t);
    if (t >= 10 && t < 13.2) drawExplosion(t, dt);
    if (t >= 11.5) drawLogo(t);

    if (t >= 15) {
      running = false;
      return;
    }

    raf = requestAnimationFrame(animate);
  }

  function startAnimation() {
    cancelAnimationFrame(raf);
    particles = [];
    explosionStarted = false;
    lastFrame = 0;
    running = true;
    startTime = performance.now();
    raf = requestAnimationFrame(animate);
  }

  if (playButton) {
    playButton.addEventListener("click", () => {
      playButton.style.display = "none";
      startAnimation();
    });
  } else {
    startAnimation();
  }
})();
