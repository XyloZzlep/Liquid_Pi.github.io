const hero = document.getElementById('home');
const img = document.querySelector('.hero__product img');

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (img && hero && finePointer && !reduceMotion) {
  const MAX_X = 40;
  const MAX_Y = 28;
  const FOLLOW = 0.08;

  let targetX = 0, targetY = 0, x = 0, y = 0;
  let rafId = 0, inView = true;

  function frame() {
    x += (targetX - x) * FOLLOW;
    y += (targetY - y) * FOLLOW;
    img.style.setProperty('--px', `${x.toFixed(2)}px`);
    img.style.setProperty('--py', `${y.toFixed(2)}px`);

    const settled = Math.abs(targetX - x) < 0.05 && Math.abs(targetY - y) < 0.05;
    rafId = settled ? 0 : requestAnimationFrame(frame);
  }
  const wake = () => { if (!rafId && inView && !document.hidden) rafId = requestAnimationFrame(frame); };

  window.addEventListener('pointermove', (e) => {
    const nx = (e.clientX / window.innerWidth) * 2 - 1;
    const ny = (e.clientY / window.innerHeight) * 2 - 1;
    targetX = -nx * MAX_X;
    targetY = -ny * MAX_Y;
    wake();
  }, { passive: true });

  document.addEventListener('pointerleave', () => { targetX = 0; targetY = 0; wake(); });

  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; }).observe(hero);
}