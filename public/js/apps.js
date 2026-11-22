(() => {
  const grid = document.getElementById('apps-grid');
  if (!grid) return;
  const apps = window.LP_APPS || [];

  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };

  apps.forEach((app, i) => {
    const initial = app.name.charAt(0).toUpperCase();
    const art = el('article', 'app reveal');
    art.style.setProperty('--d', `${i * 0.12}s`);

    const tile = el('div', 'app__tile');
    tile.tabIndex = 0;
    tile.setAttribute('role', 'group');
    tile.setAttribute('aria-label', app.name);

    const cover = el('div', 'app__cover');
    cover.append(el('span', 'app__initial', initial));
    const img = new Image();
    img.alt = `Portada de ${app.name}`;
    img.loading = 'lazy';
    img.addEventListener('error', () => { img.remove(); cover.classList.add('no-cover'); });
    img.src = app.cover;
    cover.append(img, el('span', 'app__badge', initial));

    const panel = el('div', 'app__panel');
    const link = el('a', 'app__link', 'Documentación →');
    link.href = `/docs/?app=${encodeURIComponent(app.slug)}`;
    link.dataset.slug = app.slug;
    panel.append(el('span', 'app__tag', `v${app.version}`), el('h3', '', app.name), el('p', '', app.description), link);

    const card = el('div', 'app__card');
    card.append(cover, panel);
    const shell = el('div', 'app__shell');
    shell.append(card);
    tile.append(shell);

    art.append(tile, el('p', 'app__name', app.name));
    grid.append(art);

    cover.addEventListener('click', () => {
      if (!matchMedia('(hover: none)').matches) return;
      grid.querySelectorAll('.app__tile.is-open').forEach((o) => o !== tile && o.classList.remove('is-open'));
      tile.classList.toggle('is-open');
    });
  });

  let raf = 0;
  const layout = () => {
    const g = grid.getBoundingClientRect();
    const mid = g.left + g.width / 2;
    for (const a of grid.children) {
      const r = a.getBoundingClientRect();
      a.classList.toggle('flip', r.left + r.width / 2 > mid + 2);
    }
  };
  const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(layout); };
  addEventListener('resize', schedule);
  addEventListener('load', layout);
  layout();
})();