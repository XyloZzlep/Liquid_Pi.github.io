const dialog = document.getElementById('login-dialog');
const openBtn = document.getElementById('open-login');
const closeBtn = dialog.querySelector('.auth__close');
const form = document.getElementById('auth-form');
const msg = document.getElementById('auth-msg');
const title = document.getElementById('auth-title');
const submit = document.getElementById('auth-submit');
const nameField = document.getElementById('field-name');
const tabs = [...dialog.querySelectorAll('.auth__tab')];

let mode = 'login';
let user = null;

function say(text, type = '') {
  msg.textContent = text;
  msg.dataset.type = type;
}

async function api(path, { method = 'GET', body } = {}) {
  const headers = { Accept: 'application/json' };
  if (method !== 'GET') {
    const { csrfToken } = await (await fetch('/api/auth/csrf', { credentials: 'same-origin' })).json();
    headers['x-csrf-token'] = csrfToken;
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(path, {
    method,
    headers,
    credentials: 'same-origin',
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

function setMode(next) {
  mode = next;
  const isLogin = next === 'login';
  tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.mode === next)));
  nameField.hidden = isLogin;
  nameField.querySelector('input').required = !isLogin;
  form.elements.password.autocomplete = isLogin ? 'current-password' : 'new-password';
  title.textContent = isLogin ? 'Bienvenido' : 'Crea tu cuenta';
  submit.textContent = isLogin ? 'Ingresar' : 'Crear cuenta';
  say('');
}
tabs.forEach((t) => t.addEventListener('click', () => setMode(t.dataset.mode)));

openBtn.addEventListener('click', async () => {
  if (user) return logout();
  setMode('login');
  form.reset();
  dialog.showModal();
});
closeBtn.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });

dialog.querySelectorAll('[data-social]').forEach((b) =>
  b.addEventListener('click', () =>
    say('Este método estará disponible pronto. Por ahora usa tu correo.', ''),
  ),
);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  say('');
  submit.disabled = true;

  const payload = { email: form.elements.email.value, password: form.elements.password.value };
  if (mode === 'register') payload.displayName = form.elements.displayName.value;

  try {
    const { ok, status, data } = await api(`/api/auth/${mode}`, { method: 'POST', body: payload });
    if (ok) {
      setUser(data.user);
      form.reset();
      dialog.close();
      return;
    }
    if (data.details?.length) say(data.details.map((d) => d.mensaje).join('. '), 'error');
    else if (status === 429) say(data.error, 'error');
    else say(data.error || 'No se pudo completar la acción', 'error');
  } catch {
    say('No hay conexión con el servidor', 'error');
  } finally {
    submit.disabled = false;
  }
});

function setUser(u) {
  user = u;
  openBtn.textContent = u ? `Salir · ${u.displayName}` : 'Ingresar';
  openBtn.title = u ? 'Cerrar sesión' : '';
  document.documentElement.dataset.role = u ? u.role : 'guest';
  document.dispatchEvent(new CustomEvent('auth:change', { detail: u }));
}

async function logout() {
  await api('/api/auth/logout', { method: 'POST' });
  setUser(null);
}

(async () => {
  try {
    const { ok, data } = await api('/api/auth/me');
    if (ok) setUser(data.user);
  } catch {}
})();