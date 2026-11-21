
const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");

let W, H, DPR;
let startTime = 0;
let lastFrame = 0;
let running = false;
let raf;
let particles = [];
let explosionStarted = false;

const palette = {
  cyan: "#55DDF5",
  green: "#72E69A",
  pink: "#F17CCB",
  purple: "#A98BFF",
  red: "#FF173D",
  white: "#EAF5FF"
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

function smoothstep(a, b, x) {
  const v = clamp((x - a) / (b - a), 0, 1);
  return v * v * (3 - 2 * v);
}

function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;

  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);
  canvas.style.width = W + "px";
  canvas.style.height = H + "px";

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

window.addEventListener("resize", resize);
resize();

function rand(min, max) {
  return Math.random() * (max - min) + min;
}

// หมุนเร็วขึ้นอย่างต่อเนื่อง แล้วค่อย ๆ ชะลอ
function getEarthAngle(t) {
  if (t <= 4) {
    return 1.4 * t + 0.55 * t * t;
  }

  if (t <= 8) {
    return 14.4 + (t - 4) * 5.8;
  }

  if (t <= 10) {
    const u = (t - 8) / 2;
    const distance = 11.6 * (u - u * u + (u * u * u) / 3);
    return 37.6 + distance;
  }

  return 41.4666667;
}

function drawStars(time) {
  ctx.save();

  for (let i = 0; i < 75; i++) {
    const x = (i * 127.7) % W;
    const y = (i * 83.3) % H;
    const alpha = 0.25 + Math.abs(Math.sin(time * 1.2 + i)) * 0.65;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = palette.white;
    ctx.fillRect(x, y, 1.4, 1.4);
  }

  ctx.restore();
}

// โลกแบบ ASCII
function drawEarth(angle, time, shaking, pinkMode) {
  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.min(145, W * 0.18, H * 0.27);

  const shakeX = shaking ? Math.sin(time * 48) * 4 : 0;
  const shakeY = shaking ? Math.cos(time * 55) * 4 : 0;

  const resolution = 22;
  const step = radius / resolution;
  const glyphs = " .:-=+*#%@";

  ctx.save();
  ctx.translate(cx + shakeX, cy + shakeY);

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

      // สีชมพูจะคงอยู่หลังหยุดสั่นจนถึงตอนระเบิด
      let color = land
        ? palette.green
        : pinkMode
          ? palette.pink
          : palette.cyan;

      if (z < 0.16) {
        color = pinkMode ? palette.pink : palette.cyan;
      }

      const light = clamp(z * 0.75 + (land ? 0.25 : 0.1), 0, 1);
      const glyphIndex = Math.floor(light * (glyphs.length - 1));
      const glyph = glyphs[glyphIndex];

      ctx.globalAlpha = 0.45 + z * 0.55;
      ctx.fillStyle = color;
      ctx.fillText(glyph, x * step, y * step);
    }
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

// ERROR แบบระบบเกมขัดข้อง
function drawError(time) {
  const flash = 0.7 + Math.abs(Math.sin(time * 24)) * 0.3;
  const glitchX = Math.sin(time * 43) * 7;
  const red = palette.red;

  ctx.save();
  ctx.translate(W / 2, H / 2);

  // แถบ glitch
  for (let i = 0; i < 8; i++) {
    const y = Math.sin(time * 13 + i * 2.1) * 65;
    const width = rand(W * 0.25, W * 0.9);

    ctx.globalAlpha = rand(0.08, 0.24);
    ctx.fillStyle = i % 2 ? red : palette.white;
    ctx.fillRect(-width / 2, y, width, rand(2, 5));
  }

  // กรอบเตือนสีแดง
  ctx.globalAlpha = flash;
  ctx.strokeStyle = red;
  ctx.lineWidth = 2;
  ctx.shadowColor = red;
  ctx.shadowBlur = 24;
  ctx.strokeRect(-132, -42, 264, 84);

  // เส้นขีดด้านบนและล่าง
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-132, -48);
  ctx.lineTo(-82, -48);
  ctx.moveTo(82, 48);
  ctx.lineTo(132, 48);
  ctx.stroke();

  // ตัวอักษร ERROR
  ctx.font = "bold 38px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = red;
  ctx.shadowBlur = 30;
  ctx.fillText("ERROR", glitchX, 0);

  // เงาตัวอักษร glitch
  ctx.globalAlpha = 0.55;
  ctx.fillStyle = palette.white;
  ctx.shadowBlur = 0;
  ctx.fillText("ERROR", glitchX - 3, 1);

  ctx.globalAlpha = flash;
  ctx.font = "10px monospace";
  ctx.fillStyle = palette.white;
  ctx.fillText("SYSTEM FAILURE // 0x0000", 0, 60);

  ctx.restore();
  ctx.globalAlpha = 1;
}

// สร้างอนุภาคระเบิด
function createExplosion() {
  if (explosionStarted) return;

  explosionStarted = true;
  particles = [];

  const cx = W / 2;
  const cy = H / 2;
  const colors = [
    palette.cyan,
    palette.green,
    palette.pink,
    palette.purple,
    palette.white
  ];

  for (let i = 0; i < 210; i++) {
    const angle = rand(0, Math.PI * 2);
    const speed = rand(1.5, 7.5);

    particles.push({
      x: cx + Math.cos(angle) * rand(0, 25),
      y: cy + Math.sin(angle) * rand(0, 25),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: rand(2.2, 3.3),
      maxLife: 3.3,
      size: rand(1, 3.5),
      color: colors[Math.floor(rand(0, colors.length))]
    });
  }
}

// ระเบิดฟุ้งและค่อย ๆ จาง
function drawExplosion(time, dt) {
  if (!explosionStarted) createExplosion();

  const elapsed = time - 10;
  const fade = 1 - smoothstep(2.1, 3.2, elapsed);

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

    // เส้นแสง
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.size;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(
      p.x - p.vx * 4,
      p.y - p.vy * 4
    );
    ctx.stroke();

    // แสงฟุ้งรอบอนุภาค
    ctx.globalAlpha = alpha * 0.18;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  // วงแสงที่ขยายออก
  for (let i = 0; i < 3; i++) {
    const duration = 0.8 + i * 0.3;
    const progress = clamp(elapsed / duration, 0, 1);
    const radius = progress * (160 + i * 90);

    ctx.globalAlpha = (1 - progress) * 0.45 * fade;
    ctx.strokeStyle = [
      palette.pink,
      palette.cyan,
      palette.purple
    ][i];

    ctx.lineWidth = 2 + (1 - progress) * 4;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

// โลโก้ค่อย ๆ ปรากฏและขยายจากกึ่งกลาง
function drawLogo(time) {
  const progress = clamp((time - 11.9) / 3.1, 0, 1);

  const ease = 1 - Math.pow(1 - progress, 4);
  const alpha = smoothstep(0, 0.3, progress);
  const scale = 0.06 + ease * 0.94;

  ctx.save();

  // จุดกำเนิดของการขยายอยู่ตรงกลางหน้าจอ
  ctx.translate(W / 2, H / 2);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;

  const fontSize = Math.min(76, W * 0.14);

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `bold ${fontSize}px monospace`;

  // ชั้นสีชมพู
  ctx.shadowColor = palette.pink;
  ctx.shadowBlur = 28;
  ctx.fillStyle = palette.pink;
  ctx.fillText("DIVIZTY", 0, 0);

  // ชั้นสีฟ้า
  ctx.shadowColor = palette.cyan;
  ctx.shadowBlur = 20;
  ctx.fillStyle = palette.cyan;
  ctx.fillText("DIVIZTY", 0, -2);

  // ตัวอักษรชั้นบน
  ctx.shadowBlur = 0;
  ctx.fillStyle = palette.white;
  ctx.fillText("DIVIZTY", 0, -1);

  // คำโปรยค่อย ๆ ตามมา
  const subtitleAlpha = smoothstep(0.35, 0.8, progress);
  ctx.globalAlpha = alpha * subtitleAlpha;
  ctx.font = `${Math.max(9, fontSize * 0.17)}px monospace`;
  ctx.fillStyle = palette.white;
  ctx.fillText("WELCOME TO THE FUTURE", 0, fontSize * 0.8);

  ctx.restore();
  ctx.globalAlpha = 1;
}

function animate(now) {
  if (!running) return;

  const t = (now - startTime) / 1000;
  const dt = lastFrame ? Math.min((now - lastFrame) / 1000, 0.033) : 0;
  lastFrame = now;

  ctx.clearRect(0, 0, W, H);

  ctx.fillStyle = "#050609";
  ctx.fillRect(0, 0, W, H);

  drawStars(t);

  // โลก
  if (t < 10) {
    const shaking = t >= 5.5 && t < 8;
    const pinkMode = t >= 5.5;

    drawEarth(
      getEarthAngle(t),
      t,
      shaking,
      pinkMode
    );
  }

  // ERROR
  if (t >= 4 && t < 5.5) {
    drawError(t);
  }

  // ระเบิดยังคงอยู่ระหว่างโลโก้เริ่มปรากฏ
  if (t >= 10 && t < 13.2) {
    drawExplosion(t, dt);
  }

  // โลโก้ค่อย ๆ เข้ามาทับช่วงท้ายของการระเบิด
  if (t >= 11.9) {
    drawLogo(t);
  }

  if (t >= 15) {
    running = false;
    return;
  }

  raf = requestAnimationFrame(animate);
}

function startAnimation() {
  if (running) return;

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
}
