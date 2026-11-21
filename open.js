
const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");

let W, H, DPR;
let startTime = 0;
let running = false;
let raf;
let particles = [];
let explosionStarted = false;

const palette = {
  cyan: "#55DDF5",
  green: "#72E69A",
  pink: "#F17CCB",
  purple: "#A98BFF",
  red: "#FF526D",
  white: "#EAF5FF"
};

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

function getEarthAngle(t) {
  if (t <= 4) return 1.4 * t + 0.55 * t * t;

  if (t <= 8) return 14.4 + (t - 4) * 5.8;

  if (t <= 10) {
    const u = (t - 8) / 2;
    const distance = 11.6 * (u - u * u + (u * u * u) / 3);
    return 37.6 + distance;
  }

  return 41.4666667;
}

function drawStars(time) {
  for (let i = 0; i < 75; i++) {
    const x = (i * 127.7) % W;
    const y = (i * 83.3) % H;
    const twinkle = 0.25 + Math.abs(Math.sin(time * 1.5 + i)) * 0.65;

    ctx.globalAlpha = twinkle;
    ctx.fillStyle = palette.white;
    ctx.fillRect(x, y, 1.5, 1.5);
  }
  ctx.globalAlpha = 1;
}

function drawEarth(angle, time, shaking, pinkMode) {
  const cx = W / 2;
  const cy = H / 2;
  const radius = Math.min(145, W * 0.18, H * 0.27);

  const shakeX = shaking ? rand(-5, 5) : 0;
  const shakeY = shaking ? rand(-5, 5) : 0;

  const cols = 43;
  const rows = 25;

  ctx.save();
  ctx.translate(cx + shakeX, cy + shakeY);

  for (let y = -rows; y <= rows; y++) {
    for (let x = -cols; x <= cols; x++) {
      const nx = x / cols;
      const ny = y / rows;

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

      // สีถูกควบคุมด้วย pinkMode เท่านั้น
      // หลังเริ่มช่วงสั่นแล้วจะคงชุดสีนี้ไปจนถึงตอนระเบิด
      let color;

      if (land) {
        color = palette.green;
      } else {
        color = pinkMode ? palette.pink : palette.cyan;
      }

      if (z < 0.2) {
        color = pinkMode ? palette.pink : palette.cyan;
      }

      ctx.globalAlpha = 0.65 + z * 0.35;
      ctx.fillStyle = color;

      const px = nx * radius;
      const py = ny * radius;
      const size = Math.max(1.2, radius / 34);

      ctx.fillRect(px, py, size, size);
    }
  }

  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawError(time) {
  const flicker = Math.sin(time * 35) > 0 ? 1 : 0.55;
  const glitch = Math.sin(time * 47) * 5;

  ctx.save();
  ctx.translate(W / 2, H / 2);

  // แถบสัญญาณรบกวน
  for (let i = 0; i < 5; i++) {
    const y = Math.sin(time * 12 + i * 3) * 55;
    ctx.globalAlpha = 0.12 + Math.random() * 0.12;
    ctx.fillStyle = i % 2 ? palette.red : palette.cyan;
    ctx.fillRect(-W / 2, y, W, rand(2, 7));
  }

  // กรอบเตือน
  ctx.globalAlpha = flicker;
  ctx.strokeStyle = palette.red;
  ctx.lineWidth = 2;
  ctx.strokeRect(-125, -37, 250, 74);

  ctx.shadowColor = palette.red;
  ctx.shadowBlur = 22;
  ctx.fillStyle = palette.red;
  ctx.font = "bold 35px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillText("ERROR", glitch, 0);

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.8;
  ctx.font = "10px monospace";
  ctx.fillStyle = palette.white;
  ctx.fillText("SYSTEM FAILURE // 0x0000", 0, 53);

  ctx.restore();
  ctx.globalAlpha = 1;
}

function createExplosion() {
  if (explosionStarted) return;
  explosionStarted = true;
  particles = [];

  const cx = W / 2;
  const cy = H / 2;

  // กระจายอนุภาคหลายระยะ ให้การระเบิดดูฟุ้งขึ้น
  for (let i = 0; i < 190; i++) {
    const a = rand(0, Math.PI * 2);
    const speed = rand(1.2, 7.2);
    const distance = rand(0, 45);

    particles.push({
      x: cx + Math.cos(a) * distance,
      y: cy + Math.sin(a) * distance,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      life: rand(0.65, 1.4),
      maxLife: 1.4,
      size: rand(1, 3.5),
      color: [palette.cyan, palette.green, palette.pink, palette.purple][
        Math.floor(rand(0, 4))
      ]
    });
  }
}

function drawExplosion(time) {
  if (!explosionStarted) createExplosion();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  const elapsed = time - 10;

  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vx *= 0.985;
    p.vy *= 0.985;
    p.life -= 0.012;

    if (p.life <= 0) continue;

    const alpha = Math.max(0, p.life / p.maxLife);

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = p.color;
    ctx.lineWidth = p.size;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - p.vx * 3.5, p.y - p.vy * 3.5);
    ctx.stroke();

    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // วงแสงฟุ้งที่ขยายออก
  for (let i = 0; i < 3; i++) {
    const progress = Math.min(1, elapsed / (0.7 + i * 0.25));
    const radius = progress * (150 + i * 95);

    ctx.globalAlpha = (1 - progress) * 0.55;
    ctx.strokeStyle = [palette.pink, palette.cyan, palette.purple][i];
    ctx.lineWidth = 2 + (1 - progress) * 5;
    ctx.beginPath();
    ctx.arc(W / 2, H / 2, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

function drawLogo(time) {
  const progress = Math.max(0, Math.min(1, (time - 12.5) / 2.5));
  const ease = 1 - Math.pow(1 - progress, 3);

  // เริ่มเล็กตรงกลาง แล้วขยายออกจากจุดกึ่งกลาง
  const scale = 0.08 + ease * 0.92;
  const alpha = ease;

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(scale, scale);
  ctx.globalAlpha = alpha;

  const text = "DIVIZTY";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 72px monospace";

  // ชั้นตัวอักษรซ้อนกัน
  ctx.shadowColor = palette.pink;
  ctx.shadowBlur = 25;
  ctx.fillStyle = palette.pink;
  ctx.fillText(text, 0, 0);

  ctx.shadowColor = palette.cyan;
  ctx.shadowBlur = 18;
  ctx.fillStyle = palette.cyan;
  ctx.fillText(text, 0, -3);

  ctx.shadowBlur = 0;
  ctx.fillStyle = palette.white;
  ctx.fillText(text, 0, -1);

  ctx.font = "12px monospace";
  ctx.fillStyle = palette.white;
  ctx.globalAlpha = alpha * 0.8;
  ctx.fillText("WELCOME TO THE FUTURE", 0, 55);

  ctx.restore();
  ctx.globalAlpha = 1;
}

function animate(now) {
  if (!running) return;

  const t = (now - startTime) / 1000;

  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = "#050609";
  ctx.fillRect(0, 0, W, H);

  drawStars(t);

  if (t < 12.5) {
    const shaking = t >= 5.5 && t < 8;

    // สำคัญ: pinkMode เปิดตั้งแต่เริ่มสั่น และคงไว้หลังหยุดสั่น
    const pinkMode = t >= 5.5;

    const angle = getEarthAngle(t);
    drawEarth(angle, t, shaking, pinkMode);
  }

  if (t >= 4 && t < 5.5) {
    drawError(t);
  }

  if (t >= 10 && t < 12.5) {
    drawExplosion(t);
  }

  if (t >= 12.5) {
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
  running = true;
  startTime = performance.now();

  requestAnimationFrame(animate);
}

const playButton = document.getElementById("play");
if (playButton) {
  playButton.addEventListener("click", () => {
    playButton.style.display = "none";
    startAnimation();
  });
}
