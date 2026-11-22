
(() => {
  "use strict";

  const canvas = document.getElementById("world");
  const playButton = document.getElementById("play");

  if (!canvas || !playButton) {
    console.error("DIVIZTY: ไม่พบ canvas หรือปุ่ม PLAY");
    return;
  }

  const ctx = canvas.getContext("2d");

  if (!ctx) {
    console.error("DIVIZTY: ไม่สามารถสร้าง Canvas context ได้");
    return;
  }

  const C = {
    bg: "#050609",
    cyan: "#55DDF5",
    green: "#39FF88",
    pink: "#F17CCB",
    purple: "#A98BFF",
    red: "#FF0033",
    white: "#EAF5FF"
  };

  let W = 0;
  let H = 0;
  let DPR = 1;
  let animationFrame = null;
  let startTime = 0;
  let playing = false;

  const TAU = Math.PI * 2;

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    DPR = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.floor(W * DPR);
    canvas.height = Math.floor(H * DPR);

    canvas.style.width = W + "px";
    canvas.style.height = H + "px";

    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    drawBackground();
  }

  function smooth(a, b, t) {
    const x = Math.max(0, Math.min(1, (t - a) / (b - a)));
    return x * x * (3 - 2 * x);
  }

  function lerp(a, b, amount) {
    return a + (b - a) * amount;
  }

  function drawBackground() {
    ctx.fillStyle = C.bg;
    ctx.fillRect(0, 0, W, H);
  }

  function getRadius() {
    return Math.min(W, H) * 0.245;
  }

  // คำนวณความเร็วและมุมการหมุนของโลก
  function earthAngle(t) {
    if (t <= 4) {
      return 0.8 * t + 0.225 * t * t;
    }

    const angleAtFour = 0.8 * 4 + 0.225 * 16;

    if (t <= 8) {
      return angleAtFour + 2.6 * (t - 4);
    }

    const angleAtEight = angleAtFour + 2.6 * 4;
    const elapsed = Math.min(t - 8, 2);

    // ค่อย ๆ ลดความเร็วลงจนหยุดสนิท
    return angleAtEight +
      2.6 * (elapsed - elapsed * elapsed / 4);
  }

  // สร้างรูปทรงพื้นดินแบบ procedural
  function landPattern(lat, lon) {
    const a = Math.sin(lon * 2.7 + lat * 2.1);
    const b = Math.cos(lon * 3.8 - lat * 3.2);
    const c = Math.sin(lon * 5.1 + lat * 4.5);
    const d = Math.cos(lon * 1.7 + lat * 5.3);

    return a * 0.34 + b * 0.28 + c * 0.23 + d * 0.15;
  }

  function getLandColor(lat, lon) {
    const pattern =
      Math.sin(lon * 3.5 + lat * 4.2) +
      Math.cos(lon * 5.1 - lat * 2.8);

    if (pattern > 0.55) {
      return C.green;
    }

    if (pattern < -0.55) {
      return C.purple;
    }

    return C.cyan;
  }

  function drawEarth(angle, t, shakeStrength, pinkMode) {
    const radius = getRadius();
    const centerX = W / 2;
    const centerY = H / 2;

    // แรงสั่นค่อย ๆ เพิ่มและค่อย ๆ ลด
    const shakeX =
      Math.sin(t * 48) * 4.5 * shakeStrength;

    const shakeY =
      Math.cos(t * 55) * 4.5 * shakeStrength;

    const cx = centerX + shakeX;
    const cy = centerY + shakeY;

    // แสงรอบโลก
    const halo = ctx.createRadialGradient(
      cx, cy, radius * 0.3,
      cx, cy, radius * 1.5
    );

    halo.addColorStop(0, "rgba(85,221,245,0.09)");
    halo.addColorStop(0.55, "rgba(169,139,255,0.045)");
    halo.addColorStop(1, "rgba(5,6,9,0)");

    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 1.5, 0, TAU);
    ctx.fill();

    // ขอบวงกลมของโลก
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, TAU);
    ctx.strokeStyle = pinkMode
      ? "rgba(241,124,203,0.75)"
      : "rgba(85,221,245,0.55)";
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // จุด ASCII บนพื้นผิวโลก
    const step = 0.105;
    const glyphs = [" ", ".", ":", "-", "=", "+", "*", "#", "%", "@"];

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.max(8, radius * 0.075)}px "Space Mono", monospace`;

    for (let lat = -Math.PI / 2; lat <= Math.PI / 2; lat += step) {
      for (let lon = -Math.PI; lon <= Math.PI; lon += step) {
        const rotatedLon = lon + angle;

        const x3 = Math.cos(lat) * Math.sin(rotatedLon);
        const y3 = Math.sin(lat);
        const z3 = Math.cos(lat) * Math.cos(rotatedLon);

        // แสดงเฉพาะด้านหน้าของโลก
        if (z3 <= 0.015) continue;

        const x = cx + x3 * radius;
        const y = cy - y3 * radius;

        const distance = Math.sqrt(x3 * x3 + y3 * y3);
        if (distance > 1) continue;

        const pattern = landPattern(lat, lon);
        const isLand = pattern > 0.18;

        let color;

        if (pinkMode) {
          // มหาสมุทรสีชมพูตลอดช่วงสั่นและหลังสั่น
          color = isLand
            ? getLandColor(lat, lon)
            : C.pink;
        } else {
          // สีเดิมก่อนเข้าสู่ช่วงสั่น
          if (isLand) {
            color = pattern > 0.48 ? C.green : C.cyan;
          } else {
            color = "#78CBEA";
          }
        }

        const depthAlpha = 0.48 + z3 * 0.52;
        const latitudeAlpha = 0.75 + Math.cos(lat) * 0.25;

        ctx.globalAlpha = depthAlpha * latitudeAlpha;

        const brightness = Math.floor(
          3 + z3 * 6 + Math.abs(pattern) * 2
        );

        const glyphIndex = Math.min(
          glyphs.length - 1,
          brightness
        );

        ctx.fillStyle = color;
        ctx.fillText(glyphs[glyphIndex], x, y);
      }
    }

    ctx.globalAlpha = 1;

    // แสงวงแหวนบาง ๆ
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 4, 0, TAU);
    ctx.strokeStyle = pinkMode
      ? "rgba(241,124,203,0.18)"
      : "rgba(85,221,245,0.15)";
    ctx.lineWidth = 5;
    ctx.stroke();
  }

  function drawError(t) {
    const opacity =
      smooth(4, 4.35, t) *
      (1 - smooth(5.15, 5.5, t));

    if (opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.font = `700 ${Math.max(17, Math.min(W * 0.045, 30))}px "Space Mono", monospace`;

    ctx.shadowColor = C.red;
    ctx.shadowBlur = 22;
    ctx.fillStyle = C.red;

    ctx.fillText("ERROR", W / 2, H / 2);

    ctx.restore();
  }

  // เส้นระเบิด
  function drawExplosion(t) {
    const progress = Math.max(0, Math.min(1, (t - 10) / 3.2));
    const fade = 1 - smooth(12.7, 13.2, t);

    if (fade <= 0) return;

    const cx = W / 2;
    const cy = H / 2;
    const maxRadius = Math.max(W, H) * 0.8;

    const colors = [
      C.pink,
      C.cyan,
      C.green,
      C.purple,
      C.white
    ];

    ctx.save();
    ctx.globalCompositeOperation = "lighter";

    // วงแสงตรงกลาง
    const glow = ctx.createRadialGradient(
      cx, cy, 0,
      cx, cy, maxRadius * 0.45
    );

    glow.addColorStop(0, `rgba(241,124,203,${0.22 * fade})`);
    glow.addColorStop(0.4, `rgba(85,221,245,${0.08 * fade})`);
    glow.addColorStop(1, "rgba(5,6,9,0)");

    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    // เส้นระเบิดกระจายออกจากศูนย์กลาง
    const count = 150;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * TAU;
      const variation =
        Math.sin(i * 12.9898) * 0.5 + 0.5;

      const start = radiusValue(i, variation) * progress;
      const length =
        (maxRadius * (0.12 + variation * 0.48)) * progress;

      const end = start + length;

      const x1 = cx + Math.cos(angle) * start;
      const y1 = cy + Math.sin(angle) * start;
      const x2 = cx + Math.cos(angle) * end;
      const y2 = cy + Math.sin(angle) * end;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);

      ctx.strokeStyle = colors[i % colors.length];
      ctx.globalAlpha = fade * (0.3 + variation * 0.7);
      ctx.lineWidth = 0.6 + variation * 1.5;
      ctx.stroke();
    }

    ctx.restore();
  }

  function radiusValue(i, variation) {
    return variation * 20 + (i % 7) * 2;
  }

  // โลโก้ DIVIZTY ตอนจบ
  function drawLogo(t) {
    const opacity = smooth(11.5, 12.5, t);

    if (opacity <= 0) return;

    const scale = lerp(0.82, 1, smooth(11.5, 13, t));

    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.scale(scale, scale);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const fontSize = Math.min(W * 0.12, 82);

    // ชั้นแสงด้านหลัง
    ctx.globalAlpha = opacity * 0.22;
    ctx.font = `700 ${fontSize}px "Space Mono", monospace`;
    ctx.fillStyle = C.cyan;
    ctx.shadowColor = C.cyan;
    ctx.shadowBlur = 35;
    ctx.fillText("DIVIZTY", 0, 0);

    // ชั้นสีม่วง
    ctx.globalAlpha = opacity * 0.45;
    ctx.fillStyle = C.purple;
    ctx.shadowColor = C.purple;
    ctx.shadowBlur = 20;
    ctx.fillText("DIVIZTY", -2, -2);

    // ตัวอักษรหลัก
    ctx.globalAlpha = opacity;
    ctx.fillStyle = C.white;
    ctx.shadowColor = C.pink;
    ctx.shadowBlur = 18;
    ctx.fillText("DIVIZTY", 0, 0);

    ctx.restore();
  }

  function animate(now) {
    if (!playing) return;

    const t = (now - startTime) / 1000;

    drawBackground();

    if (t < 10) {
      const shakeIn = smooth(5.5, 6.8, t);
      const shakeOut = 1 - smooth(7.6, 8.1, t);
      const shakeStrength = shakeIn * shakeOut;

      // ตั้งแต่เริ่มสั่นจนถึงก่อนระเบิด โลกใช้สีชมพู
      const pinkMode = t >= 5.5;

      drawEarth(
        earthAngle(t),
        t,
        shakeStrength,
        pinkMode
      );
    }

    if (t >= 4 && t < 5.5) {
      drawError(t);
    }

    if (t >= 10) {
      drawExplosion(t);
    }

    if (t >= 11.5) {
      drawLogo(t);
    }

    if (t < 15) {
      animationFrame = requestAnimationFrame(animate);
    } else {
      playing = false;
      cancelAnimationFrame(animationFrame);
      playButton.style.display = "block";
    }
  }

  function startAnimation() {
    if (playing) return;

    playing = true;
    startTime = performance.now();

    playButton.style.display = "none";

    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }

    animationFrame = requestAnimationFrame(animate);
  }

  playButton.addEventListener("click", startAnimation);

  window.addEventListener("resize", resize);

  resize();
})();
