(() => {
  // If canvas is missing, create it automatically (so it never breaks)
  let canvas = document.getElementById("bgParticles");
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.id = "bgParticles";
    canvas.setAttribute("aria-hidden", "true");
    document.body.prepend(canvas);
  }

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // ====== SETTINGS ======
  const SETTINGS = {
    density: 0.00009,
    maxParticles: 120,
    minParticles: 50,

    baseSpeed: 0.35,
    speedJitter: 0.25,

    dotMin: 1.2,
    dotMax: 2.4,

    linkDistance: 140,
    linkAlpha: 0.16,
    linkWidth: 1,

    mouseRadius: 170,
    mousePull: 0.015,
    mouseLineBoost: 0.10,

    // Softer teal so it shows on light background
    dotColor: "rgba(25, 140, 150, 0.45)",
    lineRGB: [25, 140, 150],
  };

  let w = 0, h = 0, dpr = 1;
  let particles = [];
  let rafId = null;
  let lastTime = 0;

  const mouse = { x: -9999, y: -9999, active: false };

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function resize() {
    dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    w = window.innerWidth;
    h = window.innerHeight;

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = clamp(Math.floor(w * h * SETTINGS.density), SETTINGS.minParticles, SETTINGS.maxParticles);
    rebuildParticles(target);
  }

  function rebuildParticles(targetCount) {
    if (particles.length > targetCount) {
      particles = particles.slice(0, targetCount);
      return;
    }
    while (particles.length < targetCount) {
      particles.push(makeParticle());
    }
  }

  function makeParticle() {
    const angle = Math.random() * Math.PI * 2;
    const speed = SETTINGS.baseSpeed + Math.random() * SETTINGS.speedJitter;

    return {
      x: Math.random() * w,
      y: Math.random() * h,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: SETTINGS.dotMin + Math.random() * (SETTINGS.dotMax - SETTINGS.dotMin)
    };
  }

  function update(dt) {
    for (const p of particles) {
      if (mouse.active) {
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < SETTINGS.mouseRadius) {
          const t = 1 - dist / SETTINGS.mouseRadius;
          p.vx += (dx / (dist || 1)) * t * SETTINGS.mousePull * dt;
          p.vy += (dy / (dist || 1)) * t * SETTINGS.mousePull * dt;
        }
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // wrap
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;

      // stable movement (never "dies")
      p.vx *= 0.996;
      p.vy *= 0.996;

      // small random nudge so it always stays alive
      if (Math.random() < 0.003) {
        p.vx += (Math.random() - 0.5) * 0.08;
        p.vy += (Math.random() - 0.5) * 0.08;
      }
    }
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);

    // lines
    for (let i = 0; i < particles.length; i++) {
      const a = particles[i];

      for (let j = i + 1; j < particles.length; j++) {
        const b = particles[j];

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < SETTINGS.linkDistance) {
          const strength = 1 - dist / SETTINGS.linkDistance;

          let mouseBoost = 0;
          if (mouse.active) {
            const mx = (a.x + b.x) * 0.5 - mouse.x;
            const my = (a.y + b.y) * 0.5 - mouse.y;
            const md = Math.sqrt(mx * mx + my * my);
            if (md < SETTINGS.mouseRadius) {
              mouseBoost = (1 - md / SETTINGS.mouseRadius) * SETTINGS.mouseLineBoost;
            }
          }

          const alpha = clamp(SETTINGS.linkAlpha * strength + mouseBoost, 0, 0.28);
          ctx.strokeStyle = `rgba(${SETTINGS.lineRGB[0]},${SETTINGS.lineRGB[1]},${SETTINGS.lineRGB[2]},${alpha})`;
          ctx.lineWidth = SETTINGS.linkWidth;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // dots
    ctx.fillStyle = SETTINGS.dotColor;
    for (const p of particles) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function loop(t) {
    const rawDt = (t - lastTime) / 16.6667;
    const dt = clamp(rawDt || 1, 0.4, 2.0);
    lastTime = t;

    update(dt);
    draw();

    rafId = requestAnimationFrame(loop);
  }

  function start() {
    if (rafId) cancelAnimationFrame(rafId);
    lastTime = performance.now();
    rafId = requestAnimationFrame(loop);
  }

  window.addEventListener("resize", () => {
    resize();
    start();
  });

  window.addEventListener("mousemove", (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
  });

  window.addEventListener("mouseleave", () => {
    mouse.active = false;
    mouse.x = -9999;
    mouse.y = -9999;
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      resize();
      start();
    }
  });

  resize();
  start();
})();
