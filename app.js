// ===================================================
// CHÁ DE BEBÊ — app.js (VERSÃO CORRIGIDA)
// ===================================================

const SB_URL = 'https://ftgxussaxoewwtowetgi.supabase.co';
const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvc2ZkaGRhd2tsYW5kcHdqbHR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MzI5MzYsImV4cCI6MjA5MDMwODkzNn0.CWjDCkY25NPUDy_kFlAxVO3O0xLBx-OPogRQmyeyGz8';

// ── State ────────────────────────────────────────────
let sb = null;
let me = null;
let gifts = [];
let myChoice = null;
let cfg = {};
let commCache = {};

let adm = { gifts: [], choices: [], users: [], cfg: {} };

// ===================================================
// BOOT
// ===================================================
(async function boot() {
  sb = window.supabase.createClient(SB_URL, SB_KEY, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: false }
  });

  const { data: { session } } = await sb.auth.getSession();

  if (session) {
    me = session.user;
    await loadProfile();
    route();
  } else {
    renderLogin();
  }

  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      me = session.user;
      await loadProfile();
      route();
    } else if (event === 'SIGNED_OUT') {
      me = null;
      commCache = {};
      gifts = [];
      myChoice = null;
      cfg = {};
      renderLogin();
    }
  });
})();

function route() {
  if (window.location.hash === '#admin' && isAdmin()) renderAdmin();
  else renderApp();
}

window.addEventListener('hashchange', () => {
  if (me) route();
});

// ===================================================
// AUTH HELPERS
// ===================================================

function isAdmin() {
  return me?.user_metadata?.tipo === 'admin';
}

async function loadProfile() {
  if (!me) return;
  const { data, error } = await sb.from('perfis')
    .select('*').eq('user_id', me.id).single();
  if (data) me.perfil = data;
  else if (error) console.warn('[perfil]', error.message);
}

async function doLogin(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, msg: translateError(error.message) };
  me = data.user;
  await loadProfile();
  return { ok: true };
}

async function doSignup(nome, email, telefone, password) {
  const { data, error } = await sb.auth.signUp({
    email, password,
    options: { data: { nome, telefone, tipo: 'usuario' } }
  });
  if (error) return { ok: false, msg: translateError(error.message) };
  me = data.user;
  await loadProfile();
  return { ok: true };
}

async function doLogout() {
  await sb.auth.signOut();
  me = null;
  commCache = {};
  gifts = [];
  myChoice = null;
  cfg = {};
  renderLogin();
}

function translateError(msg) {
  const map = {
    'Invalid login credentials': 'E-mail ou senha incorretos.',
    'Email not confirmed': 'Confirme seu e-mail antes de entrar.',
    'User already registered': 'Este e-mail já está cadastrado.',
    'Password should be at least 6 characters': 'A senha deve ter pelo menos 6 caracteres.',
    'Unable to validate email address: invalid format': 'Formato de e-mail inválido.',
  };
  return map[msg] || msg;
}

function displayName() {
  return me?.perfil?.nome || me?.user_metadata?.nome || me?.email || '';
}

// ===================================================
// LOGIN SCREEN
// ===================================================
function renderLogin() {
  window.location.hash = '';
  document.getElementById('app').innerHTML = `
    <div class="screen-login">
      <div class="login-brand">
        <div class="grain"></div>
        <div class="brand-inner">
          <span class="brand-icon">🍼</span>
          <h1>Chá de Bebê<br>do <em id="brandName">Enzo</em></h1>
          <div class="brand-divider"></div>
          <p>Escolha um presente especial para celebrar a chegada do nosso pequenininho.</p>
          <div class="brand-chips">
            <span class="chip" id="chipDate">📅 Carregando...</span>
            <span class="chip" id="chipLocal">📍 São Paulo</span>
            <span class="chip">🎁 Lista de presentes</span>
          </div>
        </div>
      </div>

      <div class="login-form-panel">
        <div class="login-box">
          <div class="login-box-title">Bem-vindo!</div>
          <div class="login-box-sub">Entre na sua conta ou crie uma nova</div>

          <div class="tab-row">
            <button class="tab-btn active" id="tabBtnLogin">Entrar</button>
            <button class="tab-btn" id="tabBtnSignup">Criar conta</button>
          </div>

          <div class="tab-panel active" id="panelLogin">
            <div class="alert alert-error" id="loginErr"></div>
            <div class="field">
              <label>E-mail</label>
              <input type="email" id="loginEmail" placeholder="seu@email.com" autocomplete="email">
            </div>
            <div class="field">
              <label>Senha</label>
              <div class="pass-wrap">
                <input type="password" id="loginPass" placeholder="••••••••" autocomplete="current-password">
                <button type="button" class="pass-toggle" onclick="togglePass('loginPass',this)">👁</button>
              </div>
            </div>
            <button class="btn btn-primary btn-full" id="btnLogin">Entrar</button>
          </div>

          <div class="tab-panel" id="panelSignup">
            <div class="alert alert-error" id="signupErr"></div>
            <div class="alert alert-success" id="signupOk"></div>
            <div class="field">
              <label>Nome completo</label>
              <input type="text" id="signupNome" placeholder="Seu nome completo" autocomplete="name">
            </div>
            <div class="field">
              <label>E-mail</label>
              <input type="email" id="signupEmail" placeholder="seu@email.com" autocomplete="email">
            </div>
            <div class="field">
              <label>Telefone</label>
              <input type="tel" id="signupTel" placeholder="(11) 99999-9999">
            </div>
            <div class="field">
              <label>Senha</label>
              <div class="pass-wrap">
                <input type="password" id="signupPass" placeholder="Mínimo 6 caracteres">
                <button type="button" class="pass-toggle" onclick="togglePass('signupPass',this)">👁</button>
              </div>
            </div>
            <div class="field">
              <label>Confirmar senha</label>
              <input type="password" id="signupConf" placeholder="Repita a senha">
            </div>
            <button class="btn btn-primary btn-full" id="btnSignup">Criar conta</button>
          </div>
        </div>
      </div>
    </div>`;

  // Bind events
  document.getElementById('tabBtnLogin').onclick = () => switchTab('login');
  document.getElementById('tabBtnSignup').onclick = () => switchTab('signup');
  document.getElementById('btnLogin').onclick = onLogin;
  document.getElementById('btnSignup').onclick = onSignup;
  
  document.getElementById('loginPass').onkeydown = (e) => { if (e.key === 'Enter') onLogin(); };
  document.getElementById('signupConf').onkeydown = (e) => { if (e.key === 'Enter') onSignup(); };

  // Load config
  sb.from('configuracoes').select('chave, valor').then(({ data, error }) => {
    if (error) { console.warn('[config]', error.message); return; }
    if (!data) return;
    const c = Object.fromEntries(data.map(r => [r.chave, r.valor]));
    const nameParts = (c.evento_titulo || '').split(' ');
    const babyName = nameParts[nameParts.length - 1];
    if (babyName) {
      const el = document.getElementById('brandName');
      if (el) el.textContent = babyName;
    }
    if (c.evento_data) {
      const d = new Date(c.evento_data + 'T12:00:00');
      const el = document.getElementById('chipDate');
      if (el) el.textContent = '📅 ' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    }
    if (c.evento_local) {
      const el = document.getElementById('chipLocal');
      if (el) el.textContent = '📍 ' + c.evento_local.split(',')[0];
    }
  });
}

function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tabBtnLogin').classList.toggle('active', isLogin);
  document.getElementById('tabBtnSignup').classList.toggle('active', !isLogin);
  document.getElementById('panelLogin').classList.toggle('active', isLogin);
  document.getElementById('panelSignup').classList.toggle('active', !isLogin);
}

async function onLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginErr');
  errEl.classList.remove('show');
  
  if (!email || !pass) {
    showAlert(errEl, 'Preencha todos os campos.');
    return;
  }
  
  setBtn('btnLogin', true, 'Entrando...');
  const { ok, msg } = await doLogin(email, pass);
  setBtn('btnLogin', false, 'Entrar');
  
  if (ok) route();
  else showAlert(errEl, msg);
}

async function onSignup() {
  const nome = document.getElementById('signupNome').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const tel = document.getElementById('signupTel').value.trim();
  const pass = document.getElementById('signupPass').value;
  const conf = document.getElementById('signupConf').value;
  
  const errEl = document.getElementById('signupErr');
  const okEl = document.getElementById('signupOk');
  errEl.classList.remove('show');
  okEl.classList.remove('show');
  
  if (!nome || !email || !tel || !pass) {
    showAlert(errEl, 'Preencha todos os campos.');
    return;
  }
  if (pass !== conf) {
    showAlert(errEl, 'As senhas não coincidem.');
    return;
  }
  if (pass.length < 6) {
    showAlert(errEl, 'A senha deve ter pelo menos 6 caracteres.');
    return;
  }
  
  setBtn('btnSignup', true, 'Criando conta...');
  const { ok, msg } = await doSignup(nome, email, tel, pass);
  setBtn('btnSignup', false, 'Criar conta');
  
  if (ok) {
    showAlert(okEl, 'Conta criada! Redirecionando...');
    setTimeout(() => route(), 1400);
  } else {
    showAlert(errEl, msg);
  }
}

// ===================================================
// APP SCREEN
// ===================================================
async function renderApp() {
  window.location.hash = '';
  const name = displayName();

  document.getElementById('app').innerHTML = `
    <div class="screen-app">
      <div class="topbar">
        <div class="topbar-user">
          <div class="avatar">${name[0]?.toUpperCase() || '?'}</div>
          <div class="topbar-name">Olá, <strong>${name.split(' ')[0]}</strong></div>
          <span class="chosen-badge hidden" id="chosenBadge">🎁 Presente escolhido</span>
        </div>
        <div class="topbar-actions" id="topbarActions"></div>
      </div>

      <div class="hero">
        <div class="hero-tag">✨ Lista de presentes</div>
        <h1 id="heroTitle">Chá de Bebê</h1>
        <p class="hero-desc" id="heroDesc"></p>
      </div>

      <div class="event-bar" id="eventBar">
        <div class="event-item">
          <div class="event-label">📅 Data</div>
          <div class="event-value" id="evDate">—</div>
        </div>
        <div class="event-item">
          <div class="event-label">📍 Local</div>
          <div class="event-value" id="evLocal">—</div>
        </div>
        <div class="event-item">
          <div class="event-label">💰 PIX</div>
          <div class="event-value" id="evPix">—</div>
        </div>
      </div>

      <div class="grid-wrap">
        <div class="section-head">
          <div class="section-title">Escolha um presente 🎁</div>
          <div class="section-count" id="giftCount"></div>
        </div>
        <div class="gifts-grid" id="giftsGrid">${skeletons(6)}</div>
      </div>
    </div>

    <div class="modal-overlay" id="modalOverlay">
      <div class="modal">
        <button class="modal-close">×</button>
        <h3 id="modalTitle"></h3>
        <p class="modal-sub" id="modalSub"></p>
        <div id="modalBody"></div>
      </div>
    </div>`;

  // Topbar actions
  const acts = document.getElementById('topbarActions');
  if (isAdmin()) {
    acts.innerHTML = `
      <button class="btn-outline" id="goAdminBtn">⚙️ Admin</button>
      <button class="btn-outline" id="logoutBtn">Sair</button>`;
    document.getElementById('goAdminBtn').onclick = () => goAdmin();
    document.getElementById('logoutBtn').onclick = doLogout;
  } else {
    acts.innerHTML = `<button class="btn-outline" id="logoutBtn">Sair</button>`;
    document.getElementById('logoutBtn').onclick = doLogout;
  }

  // Modal close
  const modalOverlay = document.getElementById('modalOverlay');
  const modalClose = modalOverlay.querySelector('.modal-close');
  modalClose.onclick = () => closeModal();
  modalOverlay.onclick = (e) => { if (e.target === modalOverlay) closeModal(); };

  // Load data
  await loadAppData();
  await renderGrid();
}

async function loadAppData() {
  const [cfgRes, giftsRes, choiceRes] = await Promise.all([
    sb.from('configuracoes').select('chave, valor'),
    sb.from('presentes').select('*').neq('status', 'inativo').order('ordem'),
    sb.from('escolhas').select('*, presentes(titulo)').eq('usuario_id', me.id).maybeSingle()
  ]);

  if (cfgRes.data) cfgRes.data.forEach(r => cfg[r.chave] = r.valor);

  const titulo = cfg.evento_titulo || 'Chá de Bebê';
  const hEl = document.getElementById('heroTitle');
  if (hEl) hEl.innerHTML = titulo.replace(/\b(do|da|de)\s+(\w+)/i, '$1 <em>$2</em>');
  
  setText('heroDesc', cfg.evento_descricao || '');
  
  if (cfg.evento_data) {
    const d = new Date(cfg.evento_data + 'T12:00:00');
    setText('evDate', d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }));
  }
  setText('evLocal', cfg.evento_local || '—');
  setText('evPix', cfg.pix_chave || '—');

  gifts = giftsRes.data || [];
  setText('giftCount', gifts.length ? `${gifts.length} itens` : '');

  myChoice = choiceRes.data || null;
  if (myChoice) {
    const badge = document.getElementById('chosenBadge');
    if (badge) badge.classList.remove('hidden');
  }
}

async function renderGrid() {
  const grid = document.getElementById('giftsGrid');
  if (!grid) return;

  if (gifts.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-icon">🎁</div>
      <h3>Nenhum presente disponível</h3>
      <p>Em breve adicionaremos mais opções!</p>
    </div>`;
    return;
  }

  const cards = await Promise.all(gifts.map(g => buildCard(g)));
  grid.innerHTML = cards.join('');
  bindGridEvents();
}

async function buildCard(g) {
  const sold = g.quantidade_restante <= 0;
  const isMine = myChoice?.presente_id === g.id;
  const comments = await loadComments(g.id);

  const commHtml = comments.map(c => {
    return `<div class="comment">
      <div class="comment-author">${esc(c.autor_nome || 'Anônimo')}</div>
      <div class="comment-text">${esc(c.comentario)}</div>
      <div class="comment-reactions" id="reactions-${c.id}"></div>
    </div>`;
  }).join('');

  const imgSrc = g.imagem_base64 || g.imagem_url || '';

  return `
  <div class="gift-card ${sold ? 'esgotado' : ''}" data-gift-id="${g.id}">
    <div class="card-img">
      ${imgSrc
        ? `<img src="${imgSrc}" alt="${esc(g.titulo)}" loading="lazy">`
        : `<div class="card-img-icon">🎁</div>`}
      ${sold ? `<span class="card-badge">Esgotado</span>` : ''}
      ${isMine ? `<span class="card-badge mine">Meu presente ✓</span>` : ''}
    </div>
    <div class="card-body">
      <div class="card-title">${esc(g.titulo)}</div>
      ${g.descricao ? `<div class="card-desc">${esc(g.descricao)}</div>` : ''}
      ${g.preco ? `<div class="card-price">${money(g.preco)}</div>` : ''}
      <div class="card-stock">
        ${sold ? '🎁 Já escolhido' : `📦 ${g.quantidade_restante} de ${g.quantidade_max} disponível`}
      </div>
      ${isMine ? `<div class="card-chosen-msg">✅ Você escolheu este presente!
        ${myChoice.tipo_pagamento === 'pix' ? '<br><small>Pagamento via PIX</small>' : ''}
      </div>` : ''}
      <div style="display:flex;flex-direction:column;gap:8px;margin-top:4px;">
        ${!isMine && !sold && !myChoice ? `
          <button class="btn btn-primary btn-full choose-gift-btn"
            data-id="${g.id}" data-title="${esc(g.titulo)}" data-price="${g.preco || 0}">
            🎁 Quero este presente
          </button>` : ''}
        ${g.link_compra ? `<a href="${g.link_compra}" target="_blank" rel="noopener"
          style="text-align:center;font-size:12px;color:var(--muted);text-decoration:none;padding:2px 0;">
          Ver onde comprar ↗</a>` : ''}
      </div>
    </div>
    <div class="comments-section">
      <div class="comments-body" id="cb-${g.id}">
        ${commHtml}
        <div class="comment-input-row">
          <input class="comment-input" id="ci-${g.id}" placeholder="Deixe um comentário...">
          <button class="btn-send comment-send-btn" data-id="${g.id}">Enviar</button>
        </div>
      </div>
      <div class="comments-toggle" data-pid="${g.id}">
        💬 ${comments.length} comentário${comments.length !== 1 ? 's' : ''}
        <span class="chevron">▾</span>
      </div>
    </div>
  </div>`;
}

function bindGridEvents() {
  // Botões de escolher presente
  document.querySelectorAll('.choose-gift-btn').forEach(btn => {
    btn.onclick = () => {
      const id = btn.dataset.id;
      const title = btn.dataset.title;
      const price = parseFloat(btn.dataset.price);
      openChoiceModal(id, title, price);
    };
  });

  // Toggle comentários
  document.querySelectorAll('.comments-toggle').forEach(el => {
    el.onclick = () => {
      const body = document.getElementById('cb-' + el.dataset.pid);
      if (body) body.classList.toggle('open');
    };
  });

  // Botões de enviar comentário
  document.querySelectorAll('.comment-send-btn').forEach(btn => {
    btn.onclick = () => {
      const input = document.getElementById('ci-' + btn.dataset.id);
      if (input?.value.trim()) {
        submitComment(btn.dataset.id, input.value.trim());
      }
    };
  });

  // Enter no input de comentário
  document.querySelectorAll('.comment-input').forEach(inp => {
    inp.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const id = inp.id.replace('ci-', '');
        if (inp.value.trim()) submitComment(id, inp.value.trim());
      }
    };
  });
}

async function loadComments(pid) {
  if (commCache[pid]) return commCache[pid];
  
  const { data, error } = await sb
    .from('comentarios')
    .select(`
      id,
      comentario,
      criado_em,
      perfis!comentarios_usuario_id_fkey (nome)
    `)
    .eq('presente_id', pid)
    .order('criado_em', { ascending: true });
  
  if (error) {
    console.warn('[comments]', error.message);
    return [];
  }
  
  const formatted = (data || []).map(c => ({
    id: c.id,
    comentario: c.comentario,
    criado_em: c.criado_em,
    autor_nome: c.perfis?.nome || 'Anônimo'
  }));
  
  commCache[pid] = formatted;
  return formatted;
}

async function submitComment(pid, text) {
  const { error } = await sb.from('comentarios').insert({
    presente_id: pid,
    usuario_id: me.id,
    comentario: text
  });
  
  if (error) {
    console.error('[comment error]', error);
    toast('Erro ao enviar comentário.', 'error');
    return;
  }
  
  delete commCache[pid];
  const wasOpen = document.getElementById('cb-' + pid)?.classList.contains('open');
  await renderGrid();
  if (wasOpen) {
    const body = document.getElementById('cb-' + pid);
    if (body) body.classList.add('open');
  }
  toast('Comentário enviado!', 'success');
}

// ===================================================
// CHOICE MODAL
// ===================================================

function openChoiceModal(gid, title, price) {
  const modal = document.getElementById('modalOverlay');
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalSub').textContent = 'Como você quer contribuir?';
  
  const hasPix = !!cfg.pix_chave;
  let chosen = null;

  document.getElementById('modalBody').innerHTML = `
    <div class="choice-option" id="optGift">
      <h4>🎁 Comprar o presente</h4>
      <p>${price ? money(price) : 'Sem valor definido'} — você compra e traz no dia</p>
    </div>
    ${hasPix ? `
    <div class="choice-option" id="optPix">
      <h4>💰 Contribuir via PIX</h4>
      <p>Chave: <strong>${cfg.pix_chave}</strong>${cfg.pix_nome ? ` (${cfg.pix_nome})` : ''}</p>
    </div>` : ''}
    <div class="field" style="margin-top:16px">
      <label>Mensagem para os pais (opcional)</label>
      <textarea id="choiceMsg" rows="2" placeholder="Uma mensagem especial..."></textarea>
    </div>
    <button class="btn btn-primary btn-full" id="btnConfirmChoice" style="margin-top:6px" disabled>
      Confirmar escolha
    </button>`;

  function pick(id, tipo) {
    document.querySelectorAll('.choice-option').forEach(o => o.classList.remove('selected'));
    const opt = document.getElementById(id);
    if (opt) opt.classList.add('selected');
    chosen = tipo;
    const btn = document.getElementById('btnConfirmChoice');
    if (btn) btn.disabled = false;
  }

  const optGift = document.getElementById('optGift');
  const optPix = document.getElementById('optPix');
  if (optGift) optGift.onclick = () => pick('optGift', 'presente');
  if (optPix) optPix.onclick = () => pick('optPix', 'pix');

  const confirmBtn = document.getElementById('btnConfirmChoice');
  confirmBtn.onclick = async () => {
    if (!chosen) return;
    const msg = document.getElementById('choiceMsg').value.trim();
    await confirmChoice(gid, chosen, price, msg);
  };

  modal.classList.add('open');
}

async function confirmChoice(gid, tipo, valor, mensagem) {
  console.log('[DEBUG] confirmChoice:', { gid, tipo, valor, mensagem });
  
  const payload = {
    presente_id: gid,
    usuario_id: me.id,
    tipo_pagamento: tipo,
    quantidade: 1,
    ...(valor ? { valor } : {}),
    ...(mensagem ? { mensagem } : {})
  };
  
  console.log('[DEBUG] Payload:', payload);
  
  const { data, error } = await sb.from('escolhas').insert(payload).select();
  
  console.log('[DEBUG] Resposta:', { data, error });
  
  if (error) {
    console.error('[ERROR]', error);
    const isDuplicate = error.code === '23505' || error.message?.includes('unique');
    toast(isDuplicate ? 'Você já escolheu um presente!' : 'Erro: ' + error.message, 'error');
    return;
  }
  
  closeModal();
  toast('Presente escolhido com sucesso! 🎉', 'success');
  
  // Recarregar dados
  const [gr, cr] = await Promise.all([
    sb.from('presentes').select('*').neq('status', 'inativo').order('ordem'),
    sb.from('escolhas').select('*, presentes(titulo)').eq('usuario_id', me.id).maybeSingle()
  ]);
  
  gifts = gr.data || [];
  myChoice = cr.data || null;
  
  if (myChoice) {
    const badge = document.getElementById('chosenBadge');
    if (badge) badge.classList.remove('hidden');
  }
  
  await renderGrid();
}

function closeModal() {
  const modal = document.getElementById('modalOverlay');
  if (modal) modal.classList.remove('open');
}

// ===================================================
// ADMIN SCREEN
// ===================================================

function goAdmin() {
  window.location.hash = '#admin';
  renderAdmin();
}

async function renderAdmin() {
  if (!isAdmin()) {
    renderApp();
    return;
  }

  document.getElementById('app').innerHTML = `
    <div class="screen-admin">
      <aside class="sidebar" id="adminSidebar">
        <div class="sidebar-brand">
          <div class="sidebar-brand-icon">🍼</div>
          <div>
            <h2>Chá de Bebê</h2>
            <span>Painel Admin</span>
          </div>
        </div>
        <nav class="sidebar-nav">
          <button class="nav-item active" data-panel="dashboard"><span class="nav-icon">📊</span>Dashboard</button>
          <button class="nav-item" data-panel="presentes"><span class="nav-icon">🎁</span>Presentes</button>
          <button class="nav-item" data-panel="escolhas"><span class="nav-icon">📋</span>Escolhas</button>
          <button class="nav-item" data-panel="convidados"><span class="nav-icon">👥</span>Convidados</button>
          <button class="nav-item" data-panel="configuracoes"><span class="nav-icon">⚙️</span>Configurações</button>
        </nav>
        <div class="sidebar-footer">
          <button class="nav-item" id="backToSiteBtn"><span class="nav-icon">🌐</span>Ver site</button>
          <button class="nav-item" id="adminLogoutBtn"><span class="nav-icon">🚪</span>Sair</button>
        </div>
      </aside>

      <div class="sidebar-overlay" id="sidebarOverlay"></div>

      <main class="admin-main">
        <div class="admin-topbar">
          <div style="display:flex;align-items:center;gap:14px">
            <button class="sidebar-toggle" id="sidebarToggleBtn">☰</button>
            <h1 id="admTitle">Dashboard</h1>
          </div>
          <div style="display:flex;align-items:center;gap:10px">
            <div class="admin-avatar">${displayName()[0]?.toUpperCase() || 'A'}</div>
            <span class="admin-user-name">${displayName().split(' ')[0] || 'Admin'}</span>
          </div>
        </div>

        <div class="admin-content">
          <div class="admin-panel active" id="ap-dashboard">
            <div class="stats-grid">
              <div class="stat-card c-terra"><div class="stat-icon">🎁</div><div class="stat-label">Presentes</div><div class="stat-value" id="stGifts">—</div></div>
              <div class="stat-card c-sage"><div class="stat-icon">✅</div><div class="stat-label">Escolhas</div><div class="stat-value" id="stChoices">—</div></div>
              <div class="stat-card c-blue"><div class="stat-icon">👥</div><div class="stat-label">Convidados</div><div class="stat-value" id="stGuests">—</div></div>
              <div class="stat-card c-gold"><div class="stat-icon">💰</div><div class="stat-label">Valor Total Est.</div><div class="stat-value" id="stValue">—</div></div>
            </div>
            <div class="a-card">
              <div class="a-card-title">📋 Últimas escolhas</div>
              <div class="table-wrap">
                <table id="tDash">
                  <thead><tr><th>Convidado</th><th>Presente</th><th>Pagamento</th><th>Data</th></tr></thead>
                  <tbody></tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="admin-panel" id="ap-presentes">
            <div class="panel-header-row">
              <h2 class="panel-title">🎁 Presentes</h2>
              <button class="btn btn-primary" id="newGiftBtn">+ Novo Presente</button>
            </div>
            <div class="presents-admin-grid" id="admGiftsGrid">
              <div style="text-align:center;padding:40px;color:var(--muted)">Carregando...</div>
            </div>
          </div>

          <div class="admin-panel" id="ap-escolhas">
            <div class="a-card">
              <div class="a-card-title">📋 Todas as Escolhas</div>
              <div class="table-wrap">
                <table id="tChoices">
                  <thead><tr><th>Convidado</th><th>E-mail</th><th>Telefone</th><th>Presente</th><th>Pagamento</th><th>Valor</th><th>Data</th></tr></thead>
                  <tbody></tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="admin-panel" id="ap-convidados">
            <div class="panel-header-row">
              <h2 class="panel-title">👥 Convidados</h2>
            </div>
            <div class="a-card">
              <div class="table-wrap">
                <table id="tGuests">
                  <thead><tr><th>Nome</th><th>E-mail</th><th>Telefone</th><th>Tipo</th><th>Escolha</th><th>Cadastro</th><th>Ações</th></tr></thead>
                  <tbody></tbody>
                </table>
              </div>
            </div>
          </div>

          <div class="admin-panel" id="ap-configuracoes">
            <div class="a-card">
              <div class="a-card-title">⚙️ Configurações do Evento</div>
              <div class="admin-grid-2">
                <div>
                  <div class="field"><label>Título do evento</label><input type="text" id="cfgTitle"></div>
                  <div class="field"><label>Data do evento</label><input type="date" id="cfgDate"></div>
                  <div class="field"><label>Local</label><input type="text" id="cfgLocal"></div>
                  <div class="field"><label>Descrição</label><textarea id="cfgDesc" rows="3"></textarea></div>
                </div>
                <div>
                  <div class="field"><label>Chave PIX</label><input type="text" id="cfgPix"></div>
                  <div class="field"><label>Nome do beneficiário PIX</label><input type="text" id="cfgPixName"></div>
                  <div class="field"><label>E-mail admin (notificações)</label><input type="email" id="cfgAdminEmail"></div>
                </div>
              </div>
              <button class="btn btn-primary" id="btnSaveCfg">💾 Salvar Configurações</button>
            </div>
          </div>
        </div>
      </main>
    </div>

    <div class="modal-overlay" id="modalGift">
      <div class="modal modal-lg">
        <button class="modal-close">×</button>
        <h3 id="giftModalTitle">Novo Presente</h3>
        <p class="modal-sub">Preencha os dados do presente</p>
        <div id="giftModalBody"></div>
      </div>
    </div>

    <div class="modal-overlay" id="modalGuest">
      <div class="modal">
        <button class="modal-close">×</button>
        <h3 id="guestModalTitle">Editar Convidado</h3>
        <p class="modal-sub">Altere as informações do convidado</p>
        <div id="guestModalBody"></div>
      </div>
    </div>`;

  // Bind admin events
  document.querySelectorAll('.nav-item[data-panel]').forEach(btn => {
    btn.onclick = () => admShowPanel(btn.dataset.panel, btn);
  });

  document.getElementById('sidebarToggleBtn').onclick = toggleSidebar;
  document.getElementById('sidebarOverlay').onclick = toggleSidebar;
  document.getElementById('backToSiteBtn').onclick = backToSite;
  document.getElementById('adminLogoutBtn').onclick = doLogout;
  document.getElementById('newGiftBtn').onclick = () => openGiftForm();
  document.getElementById('btnSaveCfg').onclick = admSaveConfig;

  // Modal closes
  const modalGift = document.getElementById('modalGift');
  const modalGuest = document.getElementById('modalGuest');
  modalGift.querySelector('.modal-close').onclick = () => closeGiftModal();
  modalGuest.querySelector('.modal-close').onclick = () => closeGuestModal();
  modalGift.onclick = (e) => { if (e.target === modalGift) closeGiftModal(); };
  modalGuest.onclick = (e) => { if (e.target === modalGuest) closeGuestModal(); };

  await admLoadAll();
  admRenderAll();
}

async function admLoadAll() {
  const [r1, r2, r3, r4] = await Promise.all([
    sb.from('presentes').select('*').order('ordem'),
    sb.from('escolhas').select('*, perfis(nome,email,telefone), presentes(titulo,preco)').order('criado_em', { ascending: false }),
    sb.from('perfis').select('*, escolhas(presente_id, tipo_pagamento, presentes(titulo))').order('criado_em'),
    sb.from('configuracoes').select('chave, valor')
  ]);

  if (r1.error) console.error('[adm gifts]', r1.error.message);
  if (r2.error) console.error('[adm choices]', r2.error.message);
  if (r3.error) console.error('[adm users]', r3.error.message);
  if (r4.error) console.error('[adm cfg]', r4.error.message);

  adm.gifts = r1.data || [];
  adm.choices = r2.data || [];
  adm.users = r3.data || [];
  adm.cfg = {};
  if (r4.data) r4.data.forEach(c => adm.cfg[c.chave] = c.valor);
}

function admRenderAll() {
  admRenderDashboard();
  admRenderGifts();
  admRenderChoices();
  admRenderGuests();
  admRenderConfig();
}

function admShowPanel(id, btn) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-panel]').forEach(b => b.classList.remove('active'));
  const panel = document.getElementById('ap-' + id);
  if (panel) panel.classList.add('active');
  if (btn) btn.classList.add('active');
  
  const labels = {
    dashboard: 'Dashboard', presentes: 'Presentes',
    escolhas: 'Escolhas', convidados: 'Convidados', configuracoes: 'Configurações'
  };
  setText('admTitle', labels[id] || id);
  
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('active');
}

function toggleSidebar() {
  const sidebar = document.getElementById('adminSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.toggle('open');
  if (overlay) overlay.classList.toggle('active');
}

function backToSite() {
  window.location.hash = '';
  commCache = {};
  renderApp();
}

function admRenderDashboard() {
  const totalValue = adm.choices.reduce((s, c) => s + (c.presentes?.preco || 0), 0);
  setText('stGifts', adm.gifts.length);
  setText('stChoices', adm.choices.length);
  setText('stGuests', adm.users.filter(u => u.tipo === 'usuario').length);
  setText('stValue', money(totalValue));

  const tbody = document.querySelector('#tDash tbody');
  if (!tbody) return;
  tbody.innerHTML = adm.choices.slice(0, 10).map(c => `
    <tr>
      <td><strong>${esc(c.perfis?.nome || '—')}</strong></td>
      <td>${esc(c.presentes?.titulo || '—')}</td>
      <td><span class="badge badge-${c.tipo_pagamento}">${payLabel(c.tipo_pagamento)}</span></td>
      <td style="color:var(--muted)">${fmtDate(c.criado_em)}</td>
    </tr>
  `).join('') || '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--muted)">Sem registos</td></tr>';
}

function admRenderGifts() {
  const grid = document.getElementById('admGiftsGrid');
  if (!grid) return;

  if (adm.gifts.length === 0) {
    grid.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🎁</div>
      <h3>Nenhum presente</h3>
      <p>Clique em "+ Novo Presente" para começar.</p>
    </div>`;
    return;
  }

  grid.innerHTML = adm.gifts.map(g => {
    const imgSrc = g.imagem_base64 || g.imagem_url || '';
    const sold = g.quantidade_restante <= 0;
    const sClass = g.status === 'inativo' ? 'inativo' : (sold ? 'esgotado' : 'ativo');
    const sLabel = g.status === 'inativo' ? 'Inativo' : (sold ? 'Esgotado' : 'Ativo');
    return `
    <div class="pac">
      <div class="pac-img">
        ${imgSrc ? `<img src="${imgSrc}" alt="${esc(g.titulo)}">` : `<div class="pac-img-icon">🎁</div>`}
        <div class="pac-status ${sClass}">${sLabel}</div>
      </div>
      <div class="pac-body">
        <div class="pac-title">${esc(g.titulo)}</div>
        ${g.descricao ? `<div class="pac-desc">${esc(g.descricao)}</div>` : ''}
        <div class="pac-meta">
          ${g.preco ? `<span class="pac-price">${money(g.preco)}</span>` : ''}
          <span class="pac-stock">📦 ${g.quantidade_restante}/${g.quantidade_max}</span>
        </div>
        <div class="pac-actions">
          <button class="btn btn-ghost edit-gift-btn" style="flex:1;font-size:12px;padding:7px">✏️ Editar</button>
          <button class="btn btn-danger delete-gift-btn" style="padding:7px 12px;font-size:13px">🗑️</button>
        </div>
      </div>
    </div>`;
  }).join('');

  // Bind edit/delete buttons
  adm.gifts.forEach((g, idx) => {
    const card = grid.children[idx];
    if (card) {
      const editBtn = card.querySelector('.edit-gift-btn');
      const delBtn = card.querySelector('.delete-gift-btn');
      if (editBtn) editBtn.onclick = () => openGiftForm(g);
      if (delBtn) delBtn.onclick = () => admDeleteGift(g.id, g.titulo);
    }
  });
}

function openGiftForm(g = null) {
  const editing = !!g;
  const modal = document.getElementById('modalGift');
  document.getElementById('giftModalTitle').textContent = editing ? '✏️ Editar Presente' : '➕ Novo Presente';
  
  const imgSrc = editing ? (g.imagem_base64 || g.imagem_url || '') : '';

  document.getElementById('giftModalBody').innerHTML = `
    <input type="hidden" id="gmId" value="${editing ? g.id : ''}">
    <div class="field"><label>Título *</label>
      <input type="text" id="gmTitle" placeholder="Ex: Kit de Banho" value="${editing ? esc(g.titulo) : ''}">
    </div>
    <div class="field"><label>Descrição</label>
      <textarea id="gmDesc" rows="2" placeholder="Descrição...">${editing ? esc(g.descricao || '') : ''}</textarea>
    </div>
    <div class="form-row-2">
      <div class="field"><label>Preço (R$)</label>
        <input type="number" id="gmPrice" step="0.01" placeholder="0,00" value="${editing && g.preco ? g.preco : ''}">
      </div>
      <div class="field"><label>Qtd. máxima</label>
        <input type="number" id="gmQty" min="1" value="${editing ? g.quantidade_max : 1}">
      </div>
    </div>
    <div class="form-row-2">
      <div class="field"><label>Ordem</label>
        <input type="number" id="gmOrder" value="${editing ? (g.ordem || 0) : 0}">
      </div>
      <div class="field"><label>Status</label>
        <select id="gmStatus">
          <option value="ativo" ${!editing || g.status === 'ativo' ? 'selected' : ''}>✅ Ativo</option>
          <option value="inativo" ${editing && g.status === 'inativo' ? 'selected' : ''}>🚫 Inativo</option>
        </select>
      </div>
    </div>
    <div class="field"><label>Link de compra</label>
      <input type="url" id="gmLink" placeholder="https://..." value="${editing ? esc(g.link_compra || '') : ''}">
    </div>
    <div style="margin-bottom:14px">
      <div style="font-weight:600;font-size:13px;margin-bottom:8px">🖼️ Imagem</div>
      <div class="img-tabs">
        <button class="img-tab active" id="imgTabUpload">📁 Upload</button>
        <button class="img-tab" id="imgTabUrl">🔗 URL</button>
      </div>
      <div id="imgPanelUpload">
        <div class="upload-area" id="uploadArea">
          <div class="upload-icon">📷</div>
          <p>Clique para selecionar uma imagem</p>
          <input type="file" id="gmImg" accept="image/*" style="display:none">
        </div>
        <img id="gmImgPrev" class="img-preview" style="${imgSrc && !imgSrc.startsWith('http') ? 'display:block' : 'display:none'}" src="${imgSrc || ''}">
      </div>
      <div id="imgPanelUrl" style="display:none">
        <div class="field"><input type="url" id="gmImgUrl" placeholder="https://..." value="${editing && g.imagem_url ? g.imagem_url : ''}"></div>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="cancelGiftBtn">Cancelar</button>
      <button class="btn btn-primary" id="saveGiftBtn">💾 Salvar</button>
    </div>`;

  // Bind events
  document.getElementById('uploadArea').onclick = () => document.getElementById('gmImg').click();
  document.getElementById('gmImg').onchange = (e) => previewImg(e.target, 'gmImgPrev');
  document.getElementById('imgTabUpload').onclick = () => switchImgTab('upload');
  document.getElementById('imgTabUrl').onclick = () => switchImgTab('url');
  document.getElementById('cancelGiftBtn').onclick = () => closeGiftModal();
  document.getElementById('saveGiftBtn').onclick = admSaveGift;
  
  modal.classList.add('open');
}

function switchImgTab(tab) {
  const isUpload = tab === 'upload';
  const tabUpload = document.getElementById('imgTabUpload');
  const tabUrl = document.getElementById('imgTabUrl');
  const panelUpload = document.getElementById('imgPanelUpload');
  const panelUrl = document.getElementById('imgPanelUrl');
  
  if (tabUpload) tabUpload.classList.toggle('active', isUpload);
  if (tabUrl) tabUrl.classList.toggle('active', !isUpload);
  if (panelUpload) panelUpload.style.display = isUpload ? '' : 'none';
  if (panelUrl) panelUrl.style.display = isUpload ? 'none' : '';
}

async function admSaveGift() {
  const id = document.getElementById('gmId').value;
  const titulo = document.getElementById('gmTitle').value.trim();
  if (!titulo) {
    toast('Título é obrigatório.', 'error');
    return;
  }

  const saveBtn = document.getElementById('saveGiftBtn');
  setBtn('saveGiftBtn', true, 'Salvando...');

  let imagem_base64 = null;
  let imagem_url = document.getElementById('gmImgUrl').value || null;
  const file = document.getElementById('gmImg').files?.[0];
  if (file) {
    imagem_base64 = await toBase64(file);
    imagem_url = null;
  }

  const payload = {
    titulo,
    descricao: document.getElementById('gmDesc').value.trim() || null,
    preco: parseFloat(document.getElementById('gmPrice').value) || null,
    quantidade_max: parseInt(document.getElementById('gmQty').value) || 1,
    ordem: parseInt(document.getElementById('gmOrder').value) || 0,
    status: document.getElementById('gmStatus').value,
    link_compra: document.getElementById('gmLink').value.trim() || null,
    atualizado_em: new Date(),
    ...(imagem_base64 ? { imagem_base64, imagem_url: null } : {}),
    ...(imagem_url && !imagem_base64 ? { imagem_url, imagem_base64: null } : {})
  };

  let error;
  if (id) {
    const { error: updateError } = await sb.from('presentes').update(payload).eq('id', id);
    error = updateError;
  } else {
    payload.quantidade_restante = payload.quantidade_max;
    const { error: insertError } = await sb.from('presentes').insert(payload);
    error = insertError;
  }

  setBtn('saveGiftBtn', false, '💾 Salvar');

  if (error) {
    toast('Erro: ' + error.message, 'error');
    return;
  }

  toast(id ? 'Presente atualizado! ✅' : 'Presente adicionado! ✅', 'success');
  closeGiftModal();
  await admLoadAll();
  admRenderGifts();
  admRenderDashboard();
}

async function admDeleteGift(id, name) {
  if (!confirm(`Excluir "${name}"? Esta ação não pode ser desfeita.`)) return;
  const { error } = await sb.from('presentes').delete().eq('id', id);
  if (error) {
    toast('Erro: ' + error.message, 'error');
    return;
  }
  toast('Presente removido.', 'success');
  await admLoadAll();
  admRenderGifts();
  admRenderDashboard();
}

function closeGiftModal() {
  const modal = document.getElementById('modalGift');
  if (modal) modal.classList.remove('open');
}

function admRenderChoices() {
  const tbody = document.querySelector('#tChoices tbody');
  if (!tbody) return;
  tbody.innerHTML = adm.choices.map(c => `
    <tr>
      <td><strong>${esc(c.perfis?.nome || '—')}</strong></td>
      <td style="color:var(--muted)">${esc(c.perfis?.email || '—')}</td>
      <td style="color:var(--muted)">${esc(c.perfis?.telefone || '—')}</td>
      <td>${esc(c.presentes?.titulo || '—')}</td>
      <td><span class="badge badge-${c.tipo_pagamento}">${payLabel(c.tipo_pagamento)}</span></td>
      <td>${c.presentes?.preco ? money(c.presentes.preco) : '—'}</td>
      <td style="color:var(--muted)">${fmtDate(c.criado_em)}</td>
    </tr>
  `).join('') || '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">Sem escolhas</td></tr>';
}

function admRenderGuests() {
  const tbody = document.querySelector('#tGuests tbody');
  if (!tbody) return;
  tbody.innerHTML = adm.users.map(u => {
    const choice = u.escolhas?.[0];
    return `
    <tr>
      <td><strong>${esc(u.nome || '—')}</strong></td>
      <td style="color:var(--muted)">${esc(u.email || '—')}</td>
      <td style="color:var(--muted)">${esc(u.telefone || '—')}</td>
      <td><span class="badge badge-${u.tipo}">${u.tipo === 'admin' ? '⭐ Admin' : '👤 Usuário'}</span></td>
      <td>${choice ? esc(choice.presentes?.titulo || '—') : '<span style="color:var(--muted)">—</span>'}</td>
      <td style="color:var(--muted)">${fmtDate(u.criado_em)}</td>
      <td>
        <div class="table-actions">
          <button class="tbl-btn edit-guest-btn" data-id="${u.user_id}">✏️</button>
          <button class="tbl-btn tbl-btn-del delete-guest-btn" data-id="${u.user_id}" data-name="${esc(u.nome || '')}">🗑️</button>
        </div>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">Sem convidados</td></tr>';

  // Bind guest actions
  document.querySelectorAll('.edit-guest-btn').forEach(btn => {
    btn.onclick = () => openGuestModal(btn.dataset.id);
  });
  document.querySelectorAll('.delete-guest-btn').forEach(btn => {
    btn.onclick = () => admDeleteGuest(btn.dataset.id, btn.dataset.name);
  });
}

function openGuestModal(userId) {
  const u = adm.users.find(x => x.user_id === userId);
  if (!u) return;
  
  const modal = document.getElementById('modalGuest');
  document.getElementById('guestModalTitle').textContent = 'Editar Convidado';
  
  document.getElementById('guestModalBody').innerHTML = `
    <input type="hidden" id="gmUserId" value="${u.user_id}">
    <div class="field"><label>Nome</label>
      <input type="text" id="gmGuestName" value="${esc(u.nome || '')}">
    </div>
    <div class="field"><label>Telefone</label>
      <input type="tel" id="gmGuestTel" value="${esc(u.telefone || '')}">
    </div>
    <div class="field"><label>Tipo</label>
      <select id="gmGuestType">
        <option value="usuario" ${u.tipo === 'usuario' ? 'selected' : ''}>👤 Usuário</option>
        <option value="admin" ${u.tipo === 'admin' ? 'selected' : ''}>⭐ Admin</option>
      </select>
    </div>
    <div class="field"><label>Nova senha (deixe em branco para manter)</label>
      <div class="pass-wrap">
        <input type="password" id="gmGuestPass" placeholder="Mínimo 6 caracteres" autocomplete="new-password">
        <button type="button" class="pass-toggle" onclick="togglePass('gmGuestPass',this)">👁</button>
      </div>
    </div>
    <div class="field"><label>Confirmar nova senha</label>
      <input type="password" id="gmGuestConf" placeholder="Repita a senha" autocomplete="new-password">
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" id="cancelGuestBtn">Cancelar</button>
      <button class="btn btn-primary" id="saveGuestBtn">💾 Salvar</button>
    </div>`;
  
  document.getElementById('cancelGuestBtn').onclick = () => closeGuestModal();
  document.getElementById('saveGuestBtn').onclick = admSaveGuest;
  
  modal.classList.add('open');
}

async function admSaveGuest() {
  const userId = document.getElementById('gmUserId').value;
  const nome = document.getElementById('gmGuestName').value.trim();
  const tel = document.getElementById('gmGuestTel').value.trim();
  const tipo = document.getElementById('gmGuestType').value;
  const pass = document.getElementById('gmGuestPass').value;
  const conf = document.getElementById('gmGuestConf').value;

  if (!nome) {
    toast('Nome é obrigatório.', 'error');
    return;
  }
  if (pass) {
    if (pass.length < 6) {
      toast('Senha mínima 6 caracteres.', 'error');
      return;
    }
    if (pass !== conf) {
      toast('As senhas não coincidem.', 'error');
      return;
    }
  }

  const saveBtn = document.getElementById('saveGuestBtn');
  setBtn('saveGuestBtn', true, 'Salvando...');

  const { error } = await sb.from('perfis').update({
    nome, telefone: tel || null, tipo, atualizado_em: new Date()
  }).eq('user_id', userId);

  if (error) {
    toast('Erro: ' + error.message, 'error');
    setBtn('saveGuestBtn', false, '💾 Salvar');
    return;
  }

  if (pass) {
    try {
      const { data: { session } } = await sb.auth.getSession();
      const res = await fetch(`${SB_URL}/functions/v1/admin-update-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ user_id: userId, password: pass })
      });
      if (!res.ok) toast('Senha não alterada (Edge Function necessária).', 'error');
      else toast('Senha alterada! ✅', 'success');
    } catch {
      toast('Senha não alterada (configure a Edge Function).', 'error');
    }
  }

  setBtn('saveGuestBtn', false, '💾 Salvar');
  toast('Convidado atualizado! ✅', 'success');
  closeGuestModal();
  await admLoadAll();
  admRenderGuests();
  admRenderDashboard();
}

async function admDeleteGuest(userId, nome) {
  if (!confirm(`Remover "${nome}"?`)) return;
  const { error } = await sb.from('perfis').delete().eq('user_id', userId);
  if (error) {
    toast('Erro: ' + error.message, 'error');
    return;
  }
  toast('Convidado removido.', 'success');
  await admLoadAll();
  admRenderGuests();
  admRenderDashboard();
}

function closeGuestModal() {
  const modal = document.getElementById('modalGuest');
  if (modal) modal.classList.remove('open');
}

function admRenderConfig() {
  const c = adm.cfg;
  const fields = {
    cfgTitle: 'evento_titulo',
    cfgDate: 'evento_data',
    cfgLocal: 'evento_local',
    cfgDesc: 'evento_descricao',
    cfgPix: 'pix_chave',
    cfgPixName: 'pix_nome',
    cfgAdminEmail: 'admin_email'
  };
  for (const [id, key] of Object.entries(fields)) {
    const el = document.getElementById(id);
    if (el) el.value = c[key] || '';
  }
}

async function admSaveConfig() {
  const pairs = [
    ['evento_titulo', document.getElementById('cfgTitle').value],
    ['evento_data', document.getElementById('cfgDate').value],
    ['evento_local', document.getElementById('cfgLocal').value],
    ['evento_descricao', document.getElementById('cfgDesc').value],
    ['pix_chave', document.getElementById('cfgPix').value],
    ['pix_nome', document.getElementById('cfgPixName').value],
    ['admin_email', document.getElementById('cfgAdminEmail').value]
  ];
  
  setBtn('btnSaveCfg', true, 'Salvando...');
  
  for (const [chave, valor] of pairs) {
    await sb.from('configuracoes').upsert({ chave, valor, atualizado_em: new Date() }, { onConflict: 'chave' });
  }
  
  setBtn('btnSaveCfg', false, '💾 Salvar Configurações');
  toast('Configurações guardadas! ✅', 'success');
  await admLoadAll();
}

// ===================================================
// UTILITIES
// ===================================================

function setText(id, v) {
  const el = document.getElementById(id);
  if (el) el.textContent = v;
}

function showAlert(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
}

function setBtn(id, loading, label) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = label;
}

function toast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = msg;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

window.togglePass = function(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  input.type = input.type === 'password' ? 'text' : 'password';
  btn.textContent = input.type === 'password' ? '👁' : '🙈';
};

function previewImg(input, prevId) {
  if (!input.files?.[0]) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    const el = document.getElementById(prevId);
    if (el) {
      el.src = e.target.result;
      el.style.display = 'block';
    }
  };
  reader.readAsDataURL(input.files[0]);
}

function toBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function money(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleDateString('pt-BR') : '—';
}

function payLabel(t) {
  const labels = { presente: '🎁 Presente', pix: '💰 PIX', dinheiro: '💵 Dinheiro' };
  return labels[t] || t || '—';
}

function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function skeletons(n) {
  return Array.from({ length: n }, () => `
    <div class="gift-card">
      <div class="card-img skeleton" style="height:200px;border-radius:0"></div>
      <div class="card-body">
        <div class="skeleton" style="height:18px;width:60%;margin-bottom:9px;border-radius:6px"></div>
        <div class="skeleton" style="height:13px;width:85%;margin-bottom:7px;border-radius:6px"></div>
        <div class="skeleton" style="height:13px;width:65%;margin-bottom:16px;border-radius:6px"></div>
        <div class="skeleton" style="height:42px;border-radius:9px"></div>
      </div>
    </div>`).join('');
}
