(() => {
  const root = document.getElementById('services');
  if (!root) return;

  const SERVICES = [
    { tab: 'Ofimática', title: 'Ofimática', text: 'Documentos, hojas de cálculo y presentaciones con LibreOffice, para tareas escolares y trabajo básico.' },
    { tab: 'Scratch', title: 'Programación por bloques', text: 'Scratch y un lanzador propio donde tus juegos se ven como cartas de cristal.' },
    { tab: 'Software', title: 'Desarrollo de software', text: 'Rust, Cargo y terminal para aprender a programar desde la propia Pi.' },
    { tab: 'Escritorio', title: 'Escritorio ligero', text: 'Xfce personalizado: rápido y limpio, deja más recursos para tus aplicaciones.' },
    { tab: 'Cuidado', title: 'Cuidado del equipo', text: 'Asistente Pi vigila temperatura, memoria y energía, y avisa antes de que algo se dañe.' },
    { tab: 'Guías', title: 'Guías paso a paso', text: 'Bluetooth y proyectos en Rust explicados desde cero, con los comandos justos.' },
  ];

  const $ = (id) => document.getElementById(id);
  const stage = root.querySelector('.services__stage');
  const side = root.querySelector('.services__side');
  const tabsBox = root.querySelector('.services__tabs');
  const copy = $('svc-copy');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pad = (n) => String(n).padStart(2, '0');
  const last = SERVICES.length - 1;

  let current = -1; 
  let shownSide = 'right';
  let timer = 0;

  stage.style.setProperty('--last', last);
  $('svc-total').textContent = pad(SERVICES.length);

  const sideFor = (i) => (last > 0 && i / last > 0.5 ? 'left' : 'right');

  const tabs = SERVICES.map((s, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'services__tab';
    b.id = `svc-tab-${i}`;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-controls', 'svc-copy');
    b.setAttribute('aria-selected', 'false');
    b.tabIndex = i === 0 ? 0 : -1;
    const n = document.createElement('span');
    n.textContent = pad(i + 1);
    b.append(n, s.tab);
    b.addEventListener('click', () => select(i));
    b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') select(i); });
    tabsBox.append(b);
    return b;
  });

  function reset() {
    if (current === -1) return;
    clearTimeout(timer);
    current = -1;
    root.dataset.state = 'idle';
    side.classList.remove('is-out');
    copy.classList.remove('is-out');
    tabs.forEach((t, k) => {
      t.setAttribute('aria-selected', 'false');
      t.tabIndex = k === 0 ? 0 : -1;
    });
  }

  function select(i, focus = false) {
    if (i === current) return;
    const wasIdle = current === -1;
    current = i;

    stage.style.setProperty('--i', i);
    root.dataset.state = 'active';
    tabs.forEach((t, k) => {
      t.setAttribute('aria-selected', String(k === i));
      t.tabIndex = k === i ? 0 : -1;
    });
    if (focus) tabs[i].focus();

    const nextSide = sideFor(i);
    clearTimeout(timer);
    const apply = () => {
      shownSide = nextSide;
      root.dataset.side = nextSide;
      $('svc-num').textContent = pad(i + 1);
      $('svc-title').textContent = SERVICES[i].title;
      $('svc-text').textContent = SERVICES[i].text;
      copy.setAttribute('aria-labelledby', tabs[i].id);
      side.classList.remove('is-out');
      copy.classList.remove('is-out');
    };

    if (wasIdle || reduce) apply();
    else {
      (nextSide !== shownSide ? side : copy).classList.add('is-out');
      timer = setTimeout(apply, 220);
    }
  }

  tabsBox.addEventListener('keydown', (e) => {
    let next = null;
    if (e.key === 'ArrowRight') next = current >= last ? 0 : current + 1;
    else if (e.key === 'ArrowLeft') next = current <= 0 ? last : current - 1;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = last;
    if (next === null) return;
    e.preventDefault();
    select(next, true);
  });

  const clock = $('svc-clock');
  const fmt = new Intl.DateTimeFormat('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  let tick = 0;
  let visible = false;
  const update = () => { clock.textContent = fmt.format(new Date()); };
  const start = () => { if (tick) return; update(); tick = setInterval(update, 1000); };
  const stop = () => { clearInterval(tick); tick = 0; };

  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    visible ? start() : stop();
    if (e.intersectionRatio < 0.15) reset();
  }, { threshold: [0, 0.15] }).observe(root);

  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : visible && start()));
})();