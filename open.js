
const canvas = document.getElementById("world");
const ctx = canvas.getContext("2d");

let W, H;
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
  palette.cyan,
  palette.green,
  palette.pink,
  palette.purple
];

const letters = "EARTH";

let stars = [];
let particles = [];

// CANVAS SIZE
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  W = window.innerWidth;
  H = window.innerHeight;

  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(H * dpr);

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

resize();
window.addEventListener("resize", resize);

// STARS
function makeStars() {
  stars = [];

  for (let i = 0; i < 110; i++) {
    stars.push({
      x: Math.random() * W,
      y: Math.random() * H,
      a: Math.random(),
      size: Math.random() * 2
    });
  }
}

makeStars();

function drawStars(time) {
  ctx.save();

  for (const s of stars) {
    ctx.globalAlpha = .25 + s.a * .45;
    ctx.fillStyle = palette.white;
    ctx.font = `${8 + s.size}px monospace`;

    ctx.fillText(
      ".",
      s.x,
      s.y + Math.sin(time + s.x) * 2
    );
  }

  ctx.restore();
}

// GLOBE SIZE
function globeSize() {
  return Math.min(145, W * .18, H * .27);
}

// ASCII EARTH
function drawEarth(angle, time, shake = false, disco = false) {
  const radius = globeSize();

  const cx = W / 2;
  const cy = H / 2;

  const sx = shake ? Math.sin(time * 65) * 5 : 0;
  const sy = shake ? Math.cos(time * 58) * 4 : 0;

  const step = 7;
  const fontSize = 9;

  ctx.save();

  ctx.font = `${fontSize}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // ใช้รัศมีเดียวกันทั้งแกน X และ Y
  // ไม่มีเส้นวงรีล้อมรอบ
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
        color = palette.cyan;
      }

      // DISCO COLORS
      if (disco) {
        const band = Math.floor((px + radius) / step);

        const index = Math.abs(
          band +
          Math.floor(time * 5) +
          Math.floor((py + radius) / step) * 2
        ) % colors.length;

        color = colors[index];
      }

      // SHAKE COLORS
      else if (shake) {
        color = land > .65
          ? palette.green
          : palette.pink;
      }

      if (z < .2) {
        char = "*";
        color = palette.pink;
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

// EXPLOSION
function createExplosion() {
  particles = [];

  for (let a = 0; a < 360; a += 1.5) {
    const rad = a * Math.PI / 180;
    const speed = 1.2 + Math.random() * 3.5;

    particles.push({
      vx: Math.cos(rad) * speed,
      vy: Math.sin(rad) * speed * .75,
      char: ["╱", "╲", "│", "─", "✦", "*"][
        Math.floor(Math.random() * 6)
      ],
      color: colors[
        Math.floor(Math.random() * colors.length)
      ],
      size: 10 + Math.random() * 7
    });
  }

  for (let i = 0; i < 90; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * 4;

    particles.push({
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      char: Math.random() > .5 ? "/" : "\\",
      color: colors[i % colors.length],
      size: 9 + Math.random() * 12
    });
  }
}

function drawExplosion(time) {
  const age = time - 10;
  const radius = globeSize();

  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (const p of particles) {
    const distance = age * 85;

    const x = W / 2 + p.vx * distance;
    const y = H / 2 + p.vy * distance;

    if (
      x < -50 || x > W + 50 ||
      y < -50 || y > H + 50
    ) continue;

    ctx.globalAlpha = Math.max(0, 1 - age / 2.5);
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 16;
    ctx.font = `${p.size}px monospace`;

    ctx.fillText(p.char, x, y);
  }

  // EXPANDING RINGS
  for (let i = 0; i < 3; i++) {
    const r = radius + age * (100 + i * 45);

    ctx.beginPath();
    ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2);

    ctx.strokeStyle = colors[i % colors.length];
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = Math.max(0, .65 - age / 3);

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

  ctx.fillText(
    "WELCOME TO THE FUTURE",
    0,
    size * .85
  );

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

  // EARTH
  if (t < 12.5) {
    let angle;

    if (t < 4) {
      angle = t * 1.4 + t * t * .55;
    } else if (t < 8) {
      angle = 5.6 + (t - 4) * 3;
    } else {
      angle = 17.6 + (t - 8) * 3.5;
    }

    const shaking = t >= 5.5 && t < 8;
    const disco = t >= 8 && t < 12.5;

    drawEarth(angle, t, shaking, disco);
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

// PLAY BUTTON
document.getElementById("play").addEventListener("click", () => {
  cancelAnimationFrame(raf);

  makeStars();
  createExplosion();

  startTime = performance.now();
  running = true;

  document.getElementById("start").classList.add("hide");

  raf = requestAnimationFrame(animate);
});
