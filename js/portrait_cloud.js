(() => {
  // 日常只需修改这个列表：text 是词语，color 是颜色，size 是气泡直径（px）。
  // 以下都是占位示例，可自由增删；小屏幕下会按比例缩小。
  const WORDS = [
    { text: '好奇心',     color: '#719bd6', size: 126 },
    { text: '爱折腾',     color: '#a38ac7', size: 108 },
    { text: 'AI 探索',    color: '#789ec8', size: 114 },
    { text: '代码与生活', color: '#88a4cc', size: 130 },
    { text: '记录者',     color: '#79a99f', size: 90 },
    { text: '慢慢来',     color: '#ba9b85', size: 82 },
    { text: 'Python',     color: '#81a8bc', size: 88 },
    { text: '灵感收集',   color: '#b294bd', size: 104 },
    { text: '学习中',     color: '#97a6bd', size: 80 },
    { text: 'Orin',       color: '#8ca6d8', size: 76 }
  ];
  // drift：漂浮幅度；push：鼠标推力；reach：气泡边缘外的感应距离。
  const OPTIONS = { drift: 9, push: 1000, reach: 65 };

  // Remove the previous instance/listeners if the script is evaluated again.
  window.disposePortraitCloud?.();
  let disposeInstance = () => {};

  function mount() {
    disposeInstance();
    const root = document.getElementById('portrait-cloud');
    if (!root) return;
    const field = root.querySelector('.portrait-cloud__field');
    const toggle = root.querySelector('.portrait-cloud__toggle');
    if (!field || !toggle) return;
    const events = new AbortController();
    const signal = events.signal;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let paused = reduced.matches, visible = true, staticMode = false;
    let w = 0, h = 0, frame = 0, last = 0, time = 0, touchTimer;
    const pointer = { active: false, x: 0, y: 0 };
    const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
    field.replaceChildren();
    const bubbles = WORDS.map((word, index) => {
      const el = document.createElement('div');
      const label = document.createElement('span');
      el.className = 'portrait-cloud__bubble';
      el.setAttribute('role', 'listitem');
      el.style.setProperty('--bubble-color', word.color);
      label.textContent = word.text;
      el.appendChild(label);
      field.appendChild(el);
      return { el, label, size: clamp(Number(word.size) || 90, 64, 160),
        x: 0, y: 0, vx: 0, vy: 0, r: 0, ax: 0, ay: 0, phase: index * 2.4 };
    });

    function bounds(b) {
      const x = clamp(b.x, b.r + 8, w - b.r - 8);
      const y = clamp(b.y, b.r + 8, h - b.r - 8);
      if (x !== b.x) b.vx *= -0.35;
      if (y !== b.y) b.vy *= -0.35;
      b.x = x; b.y = y;
    }

    function collide(passes = 4) {
      for (let pass = 0; pass < passes; pass++) {
        for (let i = 0; i < bubbles.length; i++) {
          const a = bubbles[i];
          for (let j = i + 1; j < bubbles.length; j++) {
            const b = bubbles[j];
            let dx = b.x - a.x, dy = b.y - a.y;
            let d = Math.hypot(dx, dy);
            const minimum = a.r + b.r + 5;
            if (d >= minimum) continue;
            if (d < 0.01) { dx = 0.01; dy = 0; d = 0.01; }
            const nx = dx / d, ny = dy / d;
            const wa = b.r ** 2 / (a.r ** 2 + b.r ** 2), wb = 1 - wa;
            const overlap = (minimum - d) * 0.9;
            a.x -= nx * overlap * wa; a.y -= ny * overlap * wa;
            b.x += nx * overlap * wb; b.y += ny * overlap * wb;
            const speed = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
            if (speed < 0) {
              const impulse = -speed * 1.3;
              a.vx -= nx * impulse * wa; a.vy -= ny * impulse * wa;
              b.vx += nx * impulse * wb; b.vy += ny * impulse * wb;
            }
          }
        }
        bubbles.forEach(bounds);
      }
    }

    function draw() {
      bubbles.forEach(b => {
        b.el.style.transform = `translate3d(${b.x - b.r}px,${b.y - b.r}px,0)`;
      });
    }

    function layout() {
      w = field.clientWidth; h = field.clientHeight;
      if (!w || !h) { update(); return; }
      field.removeAttribute('data-static');
      const area = bubbles.reduce((sum, b) => sum + Math.PI * (b.size / 2) ** 2, 0);
      const scale = Math.min(1, Math.sqrt(w * h * 0.37 / Math.max(area, 1)));
      bubbles.forEach((b, index) => {
        b.r = Math.min(b.size * scale / 2, (Math.min(w, h) - 20) / 2);
        b.el.style.width = b.el.style.height = `${b.r * 2}px`;
        b.el.style.fontSize = `${clamp(b.r * 0.3, 12, 19)}px`;
        const spread = Math.sqrt((index + 0.5) / bubbles.length);
        const angle = index * 2.399963;
        b.x = w / 2 + Math.cos(angle) * (w / 2 - b.r - 12) * spread;
        b.y = h / 2 + Math.sin(angle) * (h / 2 - b.r - 12) * spread;
        b.vx = b.vy = 0;
      });
      // Fit the text, but never make it smaller than 12px.
      bubbles.forEach(b => {
        const measured = b.label.getBoundingClientRect().width;
        if (measured > b.r * 1.8) {
          const fitted = parseFloat(b.el.style.fontSize) * (b.r * 1.8 - 12) / Math.max(1, measured - 12);
          b.el.style.fontSize = `${Math.max(12, fitted)}px`;
        }
      });
      // Keep long labels readable instead of clipping their text.
      staticMode = bubbles.some(b => b.r < 24 || b.label.getBoundingClientRect().width > b.r * 1.85);
      if (!staticMode) {
        collide(180);
        staticMode = bubbles.some((a, i) => bubbles.slice(i + 1).some(b =>
          Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r - 0.5));
      }
      if (staticMode) field.setAttribute('data-static', '');
      bubbles.forEach(b => { b.ax = b.x; b.ay = b.y; });
      pointer.active = false; draw(); update();
    }

    function step(dt) {
      time += dt;
      for (const b of bubbles) {
        b.vx += (b.ax + Math.sin(time * 0.55 + b.phase) * OPTIONS.drift - b.x) * dt;
        b.vy += (b.ay + Math.cos(time * 0.43 + b.phase) * OPTIONS.drift - b.y) * dt;
        if (pointer.active) {
          let dx = b.x - pointer.x, dy = b.y - pointer.y;
          let d = Math.hypot(dx, dy);
          if (d < 1) { dx = Math.cos(b.phase); dy = Math.sin(b.phase); d = 1; }
          const strength = Math.max(0, 1 - d / (b.r + OPTIONS.reach)) ** 2;
          b.vx += dx / d * strength * OPTIONS.push * dt;
          b.vy += dy / d * strength * OPTIONS.push * dt;
        }
        b.vx *= Math.exp(-1.7 * dt); b.vy *= Math.exp(-1.7 * dt);
        const limit = Math.min(1, 160 / (Math.hypot(b.vx, b.vy) || 1));
        b.vx *= limit; b.vy *= limit;
        b.x += b.vx * dt; b.y += b.vy * dt;
      }
      collide();
    }

    function canRun() {
      return !paused && !staticMode && visible && !document.hidden && root.isConnected && w > 0 && h > 0;
    }
    function tick(now) {
      frame = 0;
      if (!canRun()) return;
      const dt = last ? Math.min((now - last) / 1000, 0.034) : 1 / 60;
      last = now; step(dt / 2); step(dt / 2); draw();
      frame = requestAnimationFrame(tick);
    }
    function update() {
      toggle.disabled = staticMode;
      toggle.textContent = staticMode ? '标签较多 · 静态展示' : paused ? '继续漂浮' : '暂停漂浮';
      toggle.setAttribute('aria-pressed', String(paused));
      if (canRun() && !frame) { last = 0; frame = requestAnimationFrame(tick); }
      if (!canRun() && frame) { cancelAnimationFrame(frame); frame = 0; }
    }

    function point(event) {
      if (paused || staticMode) return;
      const box = field.getBoundingClientRect();
      pointer.x = event.clientX - box.left; pointer.y = event.clientY - box.top;
      pointer.active = true;
    }
    field.addEventListener('pointermove', e => { if (e.pointerType !== 'touch') point(e); }, { signal, passive: true });
    field.addEventListener('pointerdown', e => {
      point(e);
      if (e.pointerType === 'touch') {
        clearTimeout(touchTimer);
        touchTimer = setTimeout(() => { pointer.active = false; }, 250);
      }
    }, { signal, passive: true });
    field.addEventListener('pointerleave', () => { pointer.active = false; }, { signal });
    field.addEventListener('pointercancel', () => { pointer.active = false; }, { signal });
    toggle.addEventListener('click', () => { paused = !paused; pointer.active = false; update(); }, { signal });
    document.addEventListener('visibilitychange', update, { signal });
    reduced.addEventListener('change', () => { if (reduced.matches) paused = true; update(); }, { signal });
    const resize = new ResizeObserver(layout);
    const intersection = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; update(); });
    resize.observe(field); intersection.observe(root); layout();
    disposeInstance = () => {
      cancelAnimationFrame(frame); clearTimeout(touchTimer);
      events.abort(); resize.disconnect(); intersection.disconnect();
    };
  }

  document.addEventListener('DOMContentLoaded', mount);
  document.addEventListener('pjax:complete', mount);
  const unmount = () => disposeInstance();
  document.addEventListener('pjax:send', unmount);
  window.disposePortraitCloud = () => {
    disposeInstance();
    document.removeEventListener('DOMContentLoaded', mount);
    document.removeEventListener('pjax:complete', mount);
    document.removeEventListener('pjax:send', unmount);
  };
  if (document.readyState !== 'loading') mount();
})();
