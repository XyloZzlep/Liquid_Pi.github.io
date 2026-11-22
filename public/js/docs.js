(() => {
  const $ = (id) => document.getElementById(id);
  const slug = new URLSearchParams(location.search).get('app');
  const app = (window.LP_APPS || []).find((a) => a.slug === slug);

  if (!app) {
    $('doc-title').textContent = 'Documentación no encontrada';
    $('doc-actions').hidden = true;
    $('doc-frame').hidden = true;
    return;
  }
  document.title = `${app.name} · Documentación · Liquid-Pi`;
  $('doc-title').textContent = app.name;
  $('doc-version').textContent = `· v${app.version}`;
  $('doc-desc').textContent = app.description;
  $('doc-frame').src = `${app.doc}#view=FitH`;
  $('doc-download').href = app.doc;
  $('doc-download').setAttribute('download', `${app.slug}.pdf`);
  $('doc-open').href = app.doc;
})();