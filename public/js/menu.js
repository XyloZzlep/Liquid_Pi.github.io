(() => {
  const header = document.querySelector('.site-header');
  const btn = document.querySelector('.menu-btn');
  const nav = document.querySelector('.site-header .nav');
  if (!header || !btn || !nav) return;

  nav.id = 'site-nav';
  btn.setAttribute('aria-controls', 'site-nav');

  const isOpen = () => btn.getAttribute('aria-expanded') === 'true';

  function setOpen(open) {
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
  }

  btn.addEventListener('click', () => setOpen(!isOpen()));

  nav.addEventListener('click', (e) => { if (e.target.closest('a')) setOpen(false); });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen()) { setOpen(false); btn.focus(); }
  });

  document.addEventListener('click', (e) => {
    if (isOpen() && !header.contains(e.target)) setOpen(false);
  });

  matchMedia('(min-width: 721px)').addEventListener('change', (e) => { if (e.matches) setOpen(false); });
})();