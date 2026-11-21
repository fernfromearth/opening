
const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");

let W, H, DPR;
let startTime = 0;
let running = false;
let raf;

const palette = {
  cyan: "#55DDF5",
  green: "#72E69A",
  pink: "#F17CCB",
  purple: "#A98BFF",
  red: "#FF526D",
  white: "#EAF5FF"
};

const colors = [
  palette.green,
  palette.pink,
  palette.cyan,
  palette.pink
];

const letters = "EARTH";
let stars = [];
let particles = [];

// CANVAS
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);

  W = window.innerWidth;
  H = window.innerHeight;

  canvas.width = Math.round(W * DPR);
  canvas.height = Math.round(H * DPR);

  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

resize();
window.addEventListener("resize", resize);

// STARS
function makeStars() {
  stars = [];

  for (let i = 0; i < 90; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      alpha: Math.random()
    });
  }
}

makeStars();

function drawStars(time) {
  ctx.save();
  ctx.font = "10px monospace";
  ctx.fillStyle = palette.white;

  for (const star of stars) {
    ctx.globalAlpha = .25 + star.alpha * .45;

    ctx.fillText(
      ".",
      star.x,
      star.y + Math.sin(time + star.x) * 2
    );
  }

  ctx.restore();
}

// GLOBE SIZE
function globeSize() {
  return Math.min(145, W * .18, H * .27);
}

// SMOOTH ROTATION
function getEarthAngle(t) {
  if (t <= 4) {
    return 1.4 * t + .55 * t * t;
  }

  if (t <= 8) {
    return 14.4 + (t - 4) * 5.8;
  }

  if (t <= 10) {
    const u = (t - 8) / 2;

    const distance = 11.6 * (
      u - u * u + (u * u * u) / 3
    );

    return 37.6 + distance;
  }

  return 41.4666667;
}

// ASCII EARTH
function drawEarth(angle, time, shake = false, pinkMode = false) {
  const radius = globeSize();
  const cx = W / 2;
  const cy = H / 2;

  const sx = shake ? Math.sin(time * 65) * 5 : 0;
  const sy = shake ? Math.cos(time * 58) * 4 : 0;

  const step = 7;

  ctx.save();
  ctx.font = "9px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let py = -radius; py <= radius; py += step) {
    for (let px = -radius; px <= radius; px += step) {
      const nx = px / radius;
      const ny = py / radius;
      const d = nx * nx + ny * ny;

      if (d > 1) continue;

      const z = Math.sqrt(1 - d);
      const lon = Math.atan2(nx, z) + angle;
      const lat = Math.asin(-ny);

      const land =
        Math.sin(lon * 3 + lat * 4) +
        Math.cos(lon * 5 - lat * 3) +
        Math.sin(lon * 7 + lat * 6) +
        Math.cos(lon * 2 - lat * 5);

      let char;
      let color;

      if (land > .65) {
        char = letters[
          Math.abs(Math.floor(px + py)) % letters.length
        ];

        color = palette.green;
      } else {
        char = ".·:."[
          Math.abs(Math.floor(px / step + py / step)) % 4
        ];

        color = pinkMode ? palette.pink : palette.cyan;
      }

      // สีขอบโลกเหมือนกันตลอดช่วง pinkMode
      if (z < .2) {
        char = "*";
        color = pinkMode ? palette.pink : palette.cyan;
      }

      ctx.globalAlpha = .45 + z * .55;
      ctx.fillStyle = color;

      ctx.fillText(
        char,
        cx + sx + px,
        cy + sy + py
      );
    }
  }

  ctx.restore();
}

// EXPLOSION PARTICLES
function createExplosion() {
  particles = [];

  for (let i = 0; i < 135; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.2 + Math.random() * 3.2;

    particles.push({
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * .8,
      length: 12 + Math.random() * 28,
      color: colors[i % colors.length],
      alpha: .7 + Math.random() * .3
    });
  }
}

// EXPLOSION
function drawExplosion(time) {
  const age = time - 10;
  const cx = W / 2;
  const cy = H / 2;

  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.lineCap = "round";

  for (const p of particles) {
    const distance = age * 85;

    const x = cx + p.vx * distance;
    const y = cy + p.vy * distance;

    const tailX = x - p.vx * p.length;
    const tailY = y - p.vy * p.length;

    if (
      x < -100 || x > W + 100 ||
      y < -100 || y > H + 100
    ) continue;

    ctx.globalAlpha = Math.max(
      0,
      (1 - age / 2.5) * p.alpha
    );

    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(tailX, tailY);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  // EXPANDING RINGS
  for (let i = 0; i < 2; i++) {
    const r = globeSize() + age * (100 + i * 55);

    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);

    ctx.strokeStyle = i === 0 ? palette.green : palette.pink;
    ctx.lineWidth = 1.2;
    ctx.globalAlpha = Math.max(0, .55 - age / 3);

    ctx.stroke();
  }

  ctx.restore();
}

// DIVIZTY LOGO
function drawLogo(time) {
  const word = "DIVIZTY";
  const elapsed = time - 12.5;
  const progress = Math.min(1, elapsed / .65);

  const rotation = elapsed < 1.5
    ? (1 - Math.pow(1 - elapsed / 1.5, 2)) * .18
    : .18;

  const size = Math.min(W * .105, 82);
  const spacing = size * .83;

  const logoColors = [
    palette.green,
    palette.cyan,
    palette.pink,
    palette.purple
  ];

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(rotation);

  const totalWidth = spacing * (word.length - 1);
  const startX = -totalWidth / 2;

  // LAYERED LETTERS
  for (let layer = 9; layer >= 1; layer--) {
    for (let i = 0; i < word.length; i++) {
      const x = startX + i * spacing;
      const color = logoColors[i % logoColors.length];
      const offset = layer * 2;

      ctx.globalAlpha = progress * (layer === 1 ? 1 : .28);
      ctx.font = `700 ${size}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = color;
      ctx.shadowColor = color;
      ctx.shadowBlur = layer === 1 ? 25 : 9;

      ctx.fillText(word[i], x + offset, offset);
    }
  }

  // MAIN LOGO
  for (let i = 0; i < word.length; i++) {
    const x = startX + i * spacing;
    const color = logoColors[i % logoColors.length];

    ctx.globalAlpha = progress;
    ctx.font = `700 ${size}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.shadowColor = color;
    ctx.shadowBlur = 28;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(word[i], x, 0);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.strokeText(word[i], x, 0);
  }

  // SUBTITLE
  ctx.globalAlpha = progress;
  ctx.font = `700 ${Math.max(9, size * .16)}px monospace`;
  ctx.fillStyle = palette.pink;
  ctx.textAlign = "center";
  ctx.shadowColor = palette.pink;
  ctx.shadowBlur = 15;

  ctx.fillText("WELCOME TO THE FUTURE", 0, size * .85);

  ctx.restore();
}

// ERROR
function drawError(time) {
  const size = Math.min(64, W * .09);
  const pulse = 1 + Math.sin(time * 12) * .035;

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(pulse, pulse);

  ctx.font = `700 ${size}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = palette.red;
  ctx.shadowColor = palette.red;
  ctx.shadowBlur = 22;

  ctx.fillText("ERROR", 0, 0);

  ctx.restore();
}

// MAIN ANIMATION
function animate(now) {
  if (!running) return;

  const t = (now - startTime) / 1000;

  ctx.clearRect(0, 0, W, H);

  drawStars(t);

  if (t < 12.5) {
    const angle = getEarthAngle(t);

    // สั่นเฉพาะช่วง 5.5–8 วินาที
    const shaking = t >= 5.5 && t < 8;

    // เปลี่ยนเป็นสีเขียว + ชมพูตั้งแต่ 5.5 วินาที
    // และคงสีนี้ไว้จนถึงก่อนระเบิด
    const pinkMode = t >= 5.5;

    drawEarth(angle, t, shaking, pinkMode);
  }

  // ERROR
  if (t >= 4 && t < 5.5) {
    drawError(t);
  }

  // EXPLOSION
  if (t >= 10 && t < 12.5) {
    drawExplosion(t);
  }

  // LOGO
  if (t >= 12.5 && t < 15) {
    ctx.clearRect(0, 0, W, H);
    drawLogo(t);
  }

  if (t >= 15) {
    running = false;
    return;
  }

  raf = requestAnimationFrame(animate);
}

// PLAY
document.getElementById("play").addEventListener("click", () => {
  cancelAnimationFrame(raf);

  makeStars();
  createExplosion();

  startTime = performance.now();
  running = true;

  document.getElementById("start").classList.add("hide");

  raf = requestAnimationFrame(animate);
});
