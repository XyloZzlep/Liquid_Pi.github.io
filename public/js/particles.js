const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const COLORS = ['185,173,217', '167,184,216', '217,212,234'];

let w = 0, h = 0, dpr = 1;
let particles = [];
let rafId = 0;
let inView = true;

function makeParticle() {
  return {
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 1.8 + 0.4,
    vx: (Math.random() - 0.5) * 0.15,
    vy: -(Math.random() * 0.25 + 0.05),
    a: Math.random() * 0.6 + 0.2,
    c: COLORS[(Math.random() * COLORS.length) | 0],
  };
}

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  w = canvas.clientWidth;
  h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const weak = w < 700 || (navigator.hardwareConcurrency || 4) <= 4;
  const count = Math.max(30, Math.min(160, Math.floor((w * h) / 14000))) * (weak ? 0.5 : 1);
  particles = Array.from({ length: Math.floor(count) }, makeParticle);
  if (reduceMotion) draw();
}

function draw() {
  ctx.clearRect(0, 0, w, h);
  for (const p of particles) {
    ctx.fillStyle = `rgba(${p.c},${p.a})`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function step() {
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.y < -5) { p.y = h + 5; p.x = Math.random() * w; }
    if (p.x < -5) p.x = w + 5;
    if (p.x > w + 5) p.x = -5;
  }
  draw();
  rafId = requestAnimationFrame(step);
}

function start() {
  if (reduceMotion || rafId || !inView || document.hidden) return;
  rafId = requestAnimationFrame(step);
}
function stop() {
  cancelAnimationFrame(rafId);
  rafId = 0;
}

new IntersectionObserver(([entry]) => {
  inView = entry.isIntersecting;
  inView ? start() : stop();
}).observe(canvas);

document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

let resizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resize, 150);
});

resize();
start();