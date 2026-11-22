(() => {
  const dialog = document.getElementById('doc-dialog');
  const grid = document.getElementById('apps-grid');
  if (!dialog || !grid) return;

  const $ = (id) => document.getElementById(id);
  const holder = $('docview-body');

  function openDoc(slug) {
    const app = (window.LP_APPS || []).find((a) => a.slug === slug);
    if (!app) return false;

    $('docview-tag').textContent = `Documentación · v${app.version}`;
    $('docview-title').textContent = app.name;
    $('docview-open').href = app.doc;
    $('docview-download').href = app.doc;
    $('docview-download').setAttribute('download', `${app.slug}.pdf`);

    const frame = document.createElement('iframe');
    frame.className = 'docview__frame';
    frame.title = `Documentación de ${app.name}`;
    frame.src = `${app.doc}#view=FitH`;
    holder.replaceChildren(frame);

    document.documentElement.style.overflow = 'hidden';
    dialog.showModal();
    return true;
  }

  grid.addEventListener('click', (e) => {
    const link = e.target.closest('.app__link');
    if (!link || e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (openDoc(link.dataset.slug)) e.preventDefault();
  });

  dialog.querySelector('.auth__close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => {
    holder.replaceChildren();
    document.documentElement.style.overflow = '';
  });
})();