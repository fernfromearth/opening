
(() => {
  "use strict";

  const canvas = document.getElementById("world");

  if (!canvas) {
    console.error("DIVIZTY: ไม่พบ canvas id='world' ใน index.html");
    return;
  }

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    console.error("DIVIZTY: ไม่สามารถสร้าง Canvas context ได้");
    return;
  }

  let W = 0;
  let H = 0;
  let DPR = 1;
  let startTime = 0;
  let lastFrame = 0;
  let running = false;
  let raf = 0;
  let particles = [];
  let explosionStarted = false;

  const C = {
    cyan: "#55DDF5",
    green: "#72E69A",
    pink: "#F17CCB",
    purple: "#A98BFF",
    red: "#FF0033",
    white: "#EAF5FF"
  };

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

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

  // Smooth rotation
  function earthAngle(t) {
    if (t <= 4) {
      return 1.4 * t + 0.55 * t * t;
    }

    if (t <= 8) {
      return 14.4 + 5.8 * (t - 4);
    }

    if (t <= 10) {
      const u = (t - 8) / 2;
      return 37.6 + 11.6 * (
        u - u * u + (u * u * u) / 3
      );
    }

    return 41.4666667;
  }

  function drawBackground(t) {
    ctx.fillStyle = "#050609";
    ctx.fillRect(0, 0, W, H);

    for (let i = 0; i < 75; i++) {
      const x = (i * 127.7) % W;
      const y = (i * 83.3) % H;

      ctx.globalAlpha =
        0.25 + Math.abs(Math.sin(t * 1.2 + i)) * 0.65;

      ctx.fillStyle = C.white;
      ctx.fillRect(x, y, 1.4, 1.4);
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
          ? C.green
          : pinkMode
            ? C.pink
            : C.cyan;

        if (z < 0.16) {
          color = pinkMode ? C.pink : C.cyan;
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
        ctx.fillText(
          glyphs[index],
          x * step,
          y * step
        );
      }
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function drawError(t) {
    const red = C.red;
    const flicker = 0.72 + Math.abs(Math.sin(t * 20)) * 0.28;
    const offset = Math.sin(t * 38) * 6;

    ctx.save();
    ctx.translate(W / 2, H / 2);

    for (let i = 0; i < 8; i++) {
      const y = Math.sin(t * 15 + i * 2) * 65;

      ctx.globalAlpha = 0.12;
      ctx.fillStyle = i % 2 ? red : "#FF657C";
      ctx.fillRect(-W / 2, y, W, 3);
    }

    ctx.globalAlpha = flicker;
    ctx.strokeStyle = red;
    ctx.lineWidth = 2;
    ctx.shadowColor = red;
    ctx.shadowBlur = 30;
    ctx.strokeRect(-135, -43, 270, 86);

    ctx.font = "bold 40px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = red;
    ctx.shadowBlur = 35;
    ctx.fillText("ERROR", offset, 0);

    ctx.shadowBlur = 0;
    ctx.globalAlpha = flicker;
    ctx.font = "10px monospace";
    ctx.fillStyle = C.white;
    ctx.fillText("SYSTEM FAILURE // 0x0000", 0, 62);

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function createExplosion() {
    if (explosionStarted) return;

    explosionStarted = true;
    particles = [];

    const colors = [C.cyan, C.green, C.pink, C.purple, C.white];

    for (let i = 0; i < 180; i++) {
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
      ctx.strokeStyle = [C.pink, C.cyan, C.purple][i];
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

    ctx.shadowColor = C.pink;
    ctx.shadowBlur = 35;
    ctx.fillStyle = C.pink;
    ctx.fillText("DIVIZTY", 0, 0);

    ctx.shadowColor = C.cyan;
    ctx.shadowBlur = 22;
    ctx.fillStyle = C.cyan;
    ctx.fillText("DIVIZTY", 0, -2);

    ctx.shadowBlur = 0;
    ctx.fillStyle = C.white;
    ctx.fillText("DIVIZTY", 0, -1);

    const subAlpha = smooth(0.4, 0.85, progress);
    ctx.globalAlpha = alpha * subAlpha;
    ctx.font = `${Math.max(9, size * 0.17)}px monospace`;
    ctx.fillStyle = C.white;
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

    if (t >= 4 && t < 5.5) {
      drawError(t);
    }

    if (t >= 10 && t < 13.2) {
      drawExplosion(t, dt);
    }

    if (t >= 11.5) {
      drawLogo(t);
    }

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

  const playButton = document.getElementById("play");

  if (playButton) {
    playButton.addEventListener("click", () => {
      playButton.style.display = "none";
      startAnimation();
    });
  } else {
    // If there is no PLAY button, start automatically
    startAnimation();
  }
})();
