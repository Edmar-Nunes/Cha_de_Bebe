// ===================================================================
// CHÁ DE BEBÊ — app.js  (versão completa com admin total)
// ===================================================================

const SUPABASE_URL      = 'https://posfdhdawklandpwjlty.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBvc2ZkaGRhd2tsYW5kcHdqbHR5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3MzI5MzYsImV4cCI6MjA5MDMwODkzNn0.CWjDCkY25NPUDy_kFlAxVO3O0xLBx-OPogRQmyeyGz8';

let sb           = null;
let usuarioAtual = null;
let presentes    = [];
let meuPresente  = null;
let config       = {};
let comentariosCache = {};
let adm = { presentes: [], escolhas: [], usuarios: [], config: {} };

// ===================================================================
// INICIALIZAÇÃO
// ===================================================================

(async function iniciar() {
  sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true }
  });
  const { data: { session } } = await sb.auth.getSession();
  if (session) {
    usuarioAtual = session.user;
    await carregarPerfil();
    rotear();
  } else {
    renderLogin();
  }
  sb.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session) {
      usuarioAtual = session.user;
      await carregarPerfil();
      rotear();
    } else if (event === 'SIGNED_OUT') {
      usuarioAtual = null;
      renderLogin();
    }
  });
})();

function rotear() {
  if (window.location.hash === '#admin' && isAdmin()) renderAdmin();
  else renderApp();
}

window.addEventListener('hashchange', () => { if (usuarioAtual) rotear(); });

// ===================================================================
// AUTH
// ===================================================================

async function carregarPerfil() {
  if (!usuarioAtual) return;
  const { data } = await sb.from('perfis').select('*').eq('user_id', usuarioAtual.id).single();
  if (data) usuarioAtual.perfil = data;
}

async function login(email, senha) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password: senha });
  if (error) return { ok: false, erro: traduzirErro(error.message) };
  usuarioAtual = data.user;
  await carregarPerfil();
  return { ok: true };
}

async function cadastrar(nome, email, telefone, senha) {
  const { data, error } = await sb.auth.signUp({
    email, password: senha,
    options: { data: { nome, telefone, tipo: 'usuario' } }
  });
  if (error) return { ok: false, erro: traduzirErro(error.message) };
  usuarioAtual = data.user;
  await carregarPerfil();
  return { ok: true };
}

async function fazerLogout() {
  await sb.auth.signOut();
  usuarioAtual = null;
  comentariosCache = {};
  presentes = []; meuPresente = null; config = {};
  renderLogin();
}

function isAdmin() { return usuarioAtual?.perfil?.tipo === 'admin'; }

function traduzirErro(msg) {
  const map = {
    'Invalid login credentials':                        'E-mail ou senha incorretos.',
    'Email not confirmed':                              'Confirme seu e-mail antes de entrar.',
    'User already registered':                          'Este e-mail já está cadastrado.',
    'Password should be at least 6 characters':         'A senha deve ter pelo menos 6 caracteres.',
    'Unable to validate email address: invalid format': 'Formato de e-mail inválido.',
    'signup requires a valid password':                 'Senha inválida.'
  };
  return map[msg] || msg;
}

async function notificarAdmin(payload) {
  try {
    const { data: { session } } = await sb.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    fetch(`${SUPABASE_URL}/functions/v1/notify-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    }).catch(() => {});
  } catch (_) {}
}

// ===================================================================
// TELA: LOGIN
// ===================================================================

function renderLogin() {
  window.location.hash = '';
  document.getElementById('app').innerHTML = `
    <div class="screen-login">
      <div class="login-brand">
        <div class="brand-inner">
          <span class="brand-emoji">🍼</span>
          <h1>Chá de Bebê<br>do <em id="brandNome">Enzo</em></h1>
          <p>Escolha um presente especial para celebrar a chegada do nosso pequenininho.</p>
          <div class="brand-pills">
            <span class="pill" id="pillData">📅 Carregando...</span>
            <span class="pill" id="pillLocal">📍 São Paulo</span>
            <span class="pill">🎁 Lista de presentes</span>
          </div>
        </div>
      </div>
      <div class="login-form-panel">
        <div class="login-box">
          <div class="tab-row">
            <button class="tab-btn active" id="btnTabLogin" onclick="trocarAba('login')">Entrar</button>
            <button class="tab-btn" id="btnTabCadastro" onclick="trocarAba('cadastro')">Criar conta</button>
          </div>
          <div class="tab-panel active" id="tabLogin">
            <div class="alert alert-error" id="loginErro"></div>
            <div class="field"><label>E-mail</label>
              <input type="email" id="loginEmail" placeholder="seu@email.com" autocomplete="email"></div>
            <div class="field"><label>Senha</label>
              <input type="password" id="loginSenha" placeholder="••••••••" autocomplete="current-password"
                onkeydown="if(event.key==='Enter') acaoLogin()"></div>
            <button class="btn btn-primary btn-full" id="btnLogin" onclick="acaoLogin()">Entrar</button>
          </div>
          <div class="tab-panel" id="tabCadastro">
            <div class="alert alert-error" id="cadErro"></div>
            <div class="alert alert-success" id="cadOk"></div>
            <div class="field"><label>Nome completo</label>
              <input type="text" id="cadNome" placeholder="Seu nome" autocomplete="name"></div>
            <div class="field"><label>E-mail</label>
              <input type="email" id="cadEmail" placeholder="seu@email.com" autocomplete="email"></div>
            <div class="field"><label>Telefone</label>
              <input type="tel" id="cadTel" placeholder="(11) 99999-9999"></div>
            <div class="field"><label>Senha</label>
              <input type="password" id="cadSenha" placeholder="Mínimo 6 caracteres"></div>
            <div class="field"><label>Confirmar senha</label>
              <input type="password" id="cadConf" placeholder="••••••••"
                onkeydown="if(event.key==='Enter') acaoCadastro()"></div>
            <button class="btn btn-primary btn-full" id="btnCad" onclick="acaoCadastro()">Criar conta</button>
          </div>
        </div>
      </div>
    </div>`;

  sb.from('configuracoes').select('chave, valor').then(({ data }) => {
    if (!data) return;
    const c = {};
    data.forEach(r => c[r.chave] = r.valor);
    const nomeEvento = (c.evento_titulo || '').match(/\b(\w+)$/)?.[1];
    if (nomeEvento) { const el = document.getElementById('brandNome'); if(el) el.textContent = nomeEvento; }
    if (c.evento_data) {
      const d = new Date(c.evento_data + 'T12:00:00');
      const el = document.getElementById('pillData');
      if(el) el.textContent = '📅 ' + d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
    }
    if (c.evento_local) { const el = document.getElementById('pillLocal'); if(el) el.textContent = '📍 ' + c.evento_local.split(',')[0]; }
  });
}

function trocarAba(aba) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('btnTab' + (aba === 'login' ? 'Login' : 'Cadastro')).classList.add('active');
  document.getElementById('tab'    + (aba === 'login' ? 'Login' : 'Cadastro')).classList.add('active');
}

async function acaoLogin() {
  const email = v('loginEmail'), senha = v('loginSenha');
  const erroEl = document.getElementById('loginErro');
  erroEl.classList.remove('show');
  if (!email || !senha) { mostrarAlerta(erroEl, 'Preencha todos os campos.'); return; }
  setBtn('btnLogin', true, 'Entrando...');
  const { ok, erro } = await login(email, senha);
  setBtn('btnLogin', false, 'Entrar');
  if (ok) rotear(); else mostrarAlerta(erroEl, erro);
}

async function acaoCadastro() {
  const nome = v('cadNome'), email = v('cadEmail'), tel = v('cadTel'),
        senha = v('cadSenha'), conf = v('cadConf');
  const erroEl = document.getElementById('cadErro');
  const okEl   = document.getElementById('cadOk');
  erroEl.classList.remove('show'); okEl.classList.remove('show');
  if (!nome || !email || !tel || !senha) { mostrarAlerta(erroEl, 'Preencha todos os campos.'); return; }
  if (senha !== conf) { mostrarAlerta(erroEl, 'As senhas não coincidem.'); return; }
  if (senha.length < 6) { mostrarAlerta(erroEl, 'A senha deve ter pelo menos 6 caracteres.'); return; }
  setBtn('btnCad', true, 'Criando conta...');
  const { ok, erro } = await cadastrar(nome, email, tel, senha);
  setBtn('btnCad', false, 'Criar conta');
  if (ok) { mostrarAlerta(okEl, 'Conta criada! Redirecionando...'); setTimeout(() => rotear(), 1400); }
  else mostrarAlerta(erroEl, erro);
}

// ===================================================================
// TELA: LISTA DE PRESENTES
// ===================================================================

async function renderApp() {
  window.location.hash = '';
  document.getElementById('app').innerHTML = `
    <div class="screen-app">
      <div class="topbar">
        <div class="topbar-user">
          <div class="avatar" id="appAvatar">?</div>
          <div class="topbar-name" id="appNome">Carregando...</div>
          <span class="chosen-badge hidden" id="chosenBadge">🎁 Presente escolhido</span>
        </div>
        <div class="topbar-actions" id="appAcoes"></div>
      </div>
      <div class="hero">
        <div class="hero-inner">
          <div class="hero-tag">✨ Lista de presentes</div>
          <h1 id="heroTitulo">Chá de Bebê</h1>
          <p id="heroDesc">Venha celebrar conosco!</p>
        </div>
      </div>
      <div class="event-bar" id="eventBar">
        <div class="event-item"><div class="event-label">📅 Data</div><div class="event-value" id="evData">—</div></div>
        <div class="event-item"><div class="event-label">📍 Local</div><div class="event-value" id="evLocal">—</div></div>
        <div class="event-item"><div class="event-label">💰 PIX</div><div class="event-value" id="evPix">—</div></div>
      </div>
      <div class="grid-container">
        <div class="section-title">Escolha um presente 🎁</div>
        <div class="presentes-grid" id="presentesGrid">${skeletons(6)}</div>
      </div>
    </div>
    <div class="modal-overlay" id="modalOverlay" onclick="fecharModal(event)">
      <div class="modal">
        <button class="modal-close" onclick="fecharModal()">×</button>
        <h3 id="modalTitulo"></h3>
        <p class="modal-sub" id="modalSub"></p>
        <div id="modalCorpo"></div>
      </div>
    </div>`;

  const nome = usuarioAtual.perfil?.nome || usuarioAtual.email;
  document.getElementById('appAvatar').textContent = nome[0].toUpperCase();
  document.getElementById('appNome').textContent = 'Olá, ' + nome.split(' ')[0];
  const acoes = document.getElementById('appAcoes');
  if (isAdmin()) {
    acoes.innerHTML = `<button class="btn-outline" onclick="irAdmin()">⚙️ Admin</button>
      <button class="btn-outline" onclick="fazerLogout()">Sair</button>`;
  } else {
    acoes.innerHTML = `<button class="btn-outline" onclick="fazerLogout()">Sair</button>`;
  }
  await Promise.all([carregarConfig(), carregarPresentes(), carregarMinhaEscolha()]);
  renderGrid();
}

async function carregarConfig() {
  const { data } = await sb.from('configuracoes').select('chave, valor');
  if (data) data.forEach(r => config[r.chave] = r.valor);
  const titulo = config.evento_titulo || 'Chá de Bebê';
  const hEl = document.getElementById('heroTitulo');
  if(hEl) hEl.innerHTML = titulo.replace(/\b(do|da|de)\s+(\w+)/i, '$1 <em>$2</em>');
  const dEl = document.getElementById('heroDesc');
  if(dEl) dEl.textContent = config.evento_descricao || '';
  if (config.evento_data) {
    const d = new Date(config.evento_data + 'T12:00:00');
    set('evData', d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }));
  }
  set('evLocal', config.evento_local || '—');
  set('evPix',   config.pix_chave   || '—');
}

async function carregarPresentes() {
  const { data } = await sb.from('presentes').select('*').neq('status','inativo').order('ordem');
  presentes = data || [];
}

async function carregarMinhaEscolha() {
  const { data } = await sb.from('escolhas')
    .select('*, presentes(titulo)').eq('usuario_id', usuarioAtual.id).maybeSingle();
  meuPresente = data;
  if (meuPresente) document.getElementById('chosenBadge')?.classList.remove('hidden');
}

async function renderGrid() {
  const grid = document.getElementById('presentesGrid');
  if (!grid) return;
  if (presentes.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:60px;color:var(--muted)">
      Nenhum presente disponível no momento.</div>`;
    return;
  }
  const cards = await Promise.all(presentes.map(renderCard));
  grid.innerHTML = cards.join('');
  bindGridEvents();
}

async function renderCard(p) {
  const esgotado  = p.quantidade_restante <= 0;
  const jaEscolhi = meuPresente?.presente_id === p.id;
  const comentarios = await carregarComentarios(p.id);
  const comentHtml = comentarios.map(c => {
    const reacoes = c.reacoes || [];
    const emoji_map = {};
    reacoes.forEach(r => { (emoji_map[r.emoji] = emoji_map[r.emoji] || []).push(r.usuario_id); });
    const reacHtml = Object.entries(emoji_map).map(([emoji, users]) =>
      `<button class="reaction-btn ${users.includes(usuarioAtual.id) ? 'active' : ''}"
        data-cid="${c.id}" data-emoji="${emoji}">${emoji} ${users.length}</button>`
    ).join('');
    return `<div class="comment">
        <div class="comment-author">${esc(c.perfis?.nome || 'Anônimo')}</div>
        <div class="comment-text">${esc(c.comentario)}</div>
        ${reacHtml ? `<div class="comment-reactions">${reacHtml}</div>` : ''}
      </div>`;
  }).join('');
  const imgSrc = p.imagem_base64 || p.imagem_url || '';
  return `
    <div class="gift-card ${esgotado ? 'esgotado' : ''}" id="gc-${p.id}">
      <div class="card-img">
        ${imgSrc ? `<img src="${imgSrc}" alt="${esc(p.titulo)}" loading="lazy">` : `<div class="card-img-icon">🎁</div>`}
        ${esgotado  ? `<span class="card-img-badge esgotado">Esgotado</span>` : ''}
        ${jaEscolhi ? `<span class="card-img-badge">Escolhido por mim ✓</span>` : ''}
      </div>
      <div class="card-body">
        <div class="card-title">${esc(p.titulo)}</div>
        ${p.descricao ? `<div class="card-desc">${esc(p.descricao)}</div>` : ''}
        ${p.preco ? `<div class="card-price">${moeda(p.preco)}</div>` : ''}
        <div class="card-stock">${esgotado ? '🎁 Já escolhido' : `📦 ${p.quantidade_restante} de ${p.quantidade_max} disponível`}</div>
        ${jaEscolhi ? `<div class="card-chosen">✅ Você escolheu este presente!
            ${meuPresente.tipo_pagamento === 'pix' ? '<br><small>Pagamento via PIX</small>' : ''}
          </div>` : ''}
        <div class="btn-row">
          ${!jaEscolhi && !esgotado && !meuPresente ? `
            <button class="btn btn-primary btn-full" data-action="escolher" data-id="${p.id}"
              data-titulo="${esc(p.titulo)}" data-preco="${p.preco || 0}">🎁 Quero este presente</button>` : ''}
          ${p.link_compra ? `<a href="${p.link_compra}" target="_blank" rel="noopener"
              style="text-align:center;font-size:12px;color:var(--muted);text-decoration:none;padding:4px 0;">
              Ver onde comprar ↗</a>` : ''}
        </div>
        <div class="comments-toggle" data-pid="${p.id}">
          💬 ${comentarios.length} comentário${comentarios.length !== 1 ? 's' : ''}
          <span style="margin-left:auto">▾</span>
        </div>
        <div class="comments-body" id="cb-${p.id}">
          ${comentHtml}
          <div class="comment-input-row">
            <input class="comment-input" id="ci-${p.id}" placeholder="Escreva um comentário...">
            <button class="btn-send" data-action="comentar" data-id="${p.id}">Enviar</button>
          </div>
        </div>
      </div>
    </div>`;
}

function bindGridEvents() {
  document.querySelectorAll('[data-action="escolher"]').forEach(btn => {
    btn.addEventListener('click', () => abrirModal(btn.dataset.id, btn.dataset.titulo, parseFloat(btn.dataset.preco)));
  });
  document.querySelectorAll('.comments-toggle').forEach(el => {
    el.addEventListener('click', () => document.getElementById('cb-' + el.dataset.pid)?.classList.toggle('open'));
  });
  document.querySelectorAll('[data-action="comentar"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById('ci-' + btn.dataset.id);
      if (input?.value.trim()) enviarComentario(btn.dataset.id, input.value.trim());
    });
  });
  document.querySelectorAll('.reaction-btn').forEach(btn => {
    btn.addEventListener('click', () => reagir(btn.dataset.cid, btn.dataset.emoji));
  });
}

async function carregarComentarios(pid) {
  if (comentariosCache[pid]) return comentariosCache[pid];
  const { data } = await sb.from('comentarios')
    .select('*, perfis(nome), reacoes(*)').eq('presente_id', pid).order('criado_em');
  comentariosCache[pid] = data || [];
  return comentariosCache[pid];
}

async function enviarComentario(pid, texto) {
  const { error } = await sb.from('comentarios').insert({
    presente_id: pid, usuario_id: usuarioAtual.id, comentario: texto
  });
  if (error) { toast('Erro ao enviar comentário: ' + error.message, 'error'); console.error('[comentario]', error); return; }
  delete comentariosCache[pid];
  const wasOpen = document.getElementById('cb-' + pid)?.classList.contains('open');
  await renderGrid();
  if (wasOpen) document.getElementById('cb-' + pid)?.classList.add('open');
}

async function reagir(cid, emoji) {
  const { data } = await sb.from('reacoes').select('id').eq('comentario_id', cid)
    .eq('usuario_id', usuarioAtual.id).eq('emoji', emoji).maybeSingle();
  if (data) await sb.from('reacoes').delete().eq('id', data.id);
  else await sb.from('reacoes').insert({ comentario_id: cid, usuario_id: usuarioAtual.id, emoji });
  comentariosCache = {};
  renderGrid();
}

function abrirModal(pid, titulo, preco) {
  document.getElementById('modalTitulo').textContent = titulo;
  document.getElementById('modalSub').textContent = 'Como você quer contribuir?';
  const temPix = !!config.pix_chave;
  let tipoPag = null;
  document.getElementById('modalCorpo').innerHTML = `
    <div class="choice-option" id="opt-presente">
      <h4>🎁 Comprar o presente</h4>
      <p>${preco ? moeda(preco) : 'Sem valor definido'} — você compra e entrega no chá</p>
    </div>
    ${temPix ? `<div class="choice-option" id="opt-pix">
      <h4>💰 Contribuir via PIX</h4>
      <p>Chave: <strong>${config.pix_chave}</strong>${config.pix_nome ? ` (${config.pix_nome})` : ''}</p>
    </div>` : ''}
    <div class="field" style="margin-top:16px;">
      <label>Mensagem para os pais (opcional)</label>
      <textarea id="modalMsg" rows="2" placeholder="Uma mensagem especial..."></textarea>
    </div>
    <button class="btn btn-primary btn-full" id="btnConfirmar" style="margin-top:8px;" disabled>
      Confirmar escolha
    </button>`;
  function selecionar(id, tipo) {
    document.querySelectorAll('.choice-option').forEach(o => o.classList.remove('selected'));
    document.getElementById(id)?.classList.add('selected');
    tipoPag = tipo;
    document.getElementById('btnConfirmar').disabled = false;
  }
  document.getElementById('opt-presente')?.addEventListener('click', () => selecionar('opt-presente', 'presente'));
  document.getElementById('opt-pix')?.addEventListener('click', () => selecionar('opt-pix', 'pix'));
  document.getElementById('btnConfirmar').addEventListener('click', async () => {
    if (!tipoPag) return;
    const msg = v('modalMsg');
    document.getElementById('btnConfirmar').disabled = true;
    document.getElementById('btnConfirmar').textContent = 'Confirmando...';
    await confirmarEscolha(pid, tipoPag, preco, msg);
  });
  document.getElementById('modalOverlay').classList.add('open');
}

function fecharModal(e) {
  if (e && e.type === 'click' && e.target !== document.getElementById('modalOverlay')) return;
  document.getElementById('modalOverlay')?.classList.remove('open');
}

async function confirmarEscolha(pid, tipo, valor, mensagem) {
  const escolha = { presente_id: pid, usuario_id: usuarioAtual.id, tipo_pagamento: tipo, quantidade: 1,
    ...(valor ? { valor } : {}), ...(mensagem ? { mensagem } : {}) };
  const { error } = await sb.from('escolhas').insert(escolha);
  if (error) {
    console.error('[escolha]', error);
    const msg = error.message.includes('unique') || error.code === '23505'
      ? 'Você já escolheu um presente!'
      : 'Erro ao registrar: ' + error.message;
    toast(msg, 'error');
    document.getElementById('btnConfirmar').disabled = false;
    document.getElementById('btnConfirmar').textContent = 'Confirmar escolha';
    return;
  }
  const presente = presentes.find(p => p.id === pid) || {};
  notificarAdmin({ tipo: 'nova_escolha',
    convidado: { nome: usuarioAtual.perfil?.nome || usuarioAtual.email, email: usuarioAtual.email, telefone: usuarioAtual.perfil?.telefone || null },
    presente: { titulo: presente.titulo || 'Presente', preco: presente.preco || null },
    pagamento: { tipo, valor: valor || presente.preco || null },
    mensagem: mensagem || null, data: new Date().toISOString() });
  document.getElementById('modalOverlay')?.classList.remove('open');
  toast('Presente escolhido com sucesso! 🎉', 'success');
  await carregarPresentes();
  await carregarMinhaEscolha();
  renderGrid();
}

// ===================================================================
// TELA: ADMIN
// ===================================================================

async function irAdmin() { window.location.hash = '#admin'; renderAdmin(); }

async function renderAdmin() {
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
          <button class="nav-item active" data-panel="dashboard"><span class="nav-icon">📊</span> Dashboard</button>
          <button class="nav-item" data-panel="presentes"><span class="nav-icon">🎁</span> Presentes</button>
          <button class="nav-item" data-panel="escolhas"><span class="nav-icon">📋</span> Escolhas</button>
          <button class="nav-item" data-panel="convidados"><span class="nav-icon">👥</span> Convidados</button>
          <button class="nav-item" data-panel="configuracoes"><span class="nav-icon">⚙️</span> Configurações</button>
        </nav>
        <div class="sidebar-footer">
          <button class="nav-item" onclick="voltarSite()"><span class="nav-icon">🌐</span> Ver site</button>
          <button class="nav-item" onclick="fazerLogout()"><span class="nav-icon">🚪</span> Sair</button>
        </div>
      </aside>

      <!-- Overlay mobile -->
      <div class="sidebar-overlay" id="sidebarOverlay" onclick="toggleSidebar()"></div>

      <main class="admin-main">
        <div class="admin-topbar">
          <div style="display:flex;align-items:center;gap:14px;">
            <button class="sidebar-toggle" onclick="toggleSidebar()">☰</button>
            <h1 id="admTopTitle">Dashboard</h1>
          </div>
          <div style="display:flex;align-items:center;gap:10px;">
            <div class="admin-avatar">${(usuarioAtual.perfil?.nome || usuarioAtual.email)[0].toUpperCase()}</div>
            <span class="admin-user-name">${usuarioAtual.perfil?.nome?.split(' ')[0] || 'Admin'}</span>
          </div>
        </div>

        <div class="admin-content">

          <!-- Dashboard -->
          <div class="admin-panel active" id="ap-dashboard">
            <div class="stats-grid">
              <div class="stat-card rose"><div class="stat-icon">🎁</div><div class="stat-label">Total Presentes</div><div class="stat-value" id="stPresentes">—</div></div>
              <div class="stat-card sage"><div class="stat-icon">✅</div><div class="stat-label">Escolhas Feitas</div><div class="stat-value" id="stEscolhas">—</div></div>
              <div class="stat-card blue"><div class="stat-icon">👥</div><div class="stat-label">Convidados</div><div class="stat-value" id="stConvidados">—</div></div>
              <div class="stat-card gold"><div class="stat-icon">💰</div><div class="stat-label">Valor Total Est.</div><div class="stat-value" id="stValor">—</div></div>
            </div>
            <div class="a-card">
              <div class="a-card-title">📋 Últimas escolhas</div>
              <div class="table-wrap">
                <table id="tDash"><thead><tr>
                  <th>Convidado</th><th>Presente</th><th>Pagamento</th><th>Data</th>
                </tr></thead><tbody></tbody></table>
              </div>
            </div>
          </div>

          <!-- Presentes -->
          <div class="admin-panel" id="ap-presentes">
            <div class="panel-header-row">
              <h2 class="panel-title">🎁 Presentes</h2>
              <button class="btn btn-primary" onclick="abrirFormPresente()">+ Novo Presente</button>
            </div>
            <div class="presentes-admin-grid" id="presentesAdminGrid">
              <div style="text-align:center;padding:40px;color:var(--muted)">Carregando...</div>
            </div>
          </div>

          <!-- Escolhas -->
          <div class="admin-panel" id="ap-escolhas">
            <div class="a-card">
              <div class="a-card-title">📋 Todas as Escolhas</div>
              <div class="table-wrap">
                <table id="tEscolhas"><thead><tr>
                  <th>Convidado</th><th>E-mail</th><th>Telefone</th><th>Presente</th><th>Pagamento</th><th>Valor</th><th>Data</th>
                </tr></thead><tbody></tbody></table>
              </div>
            </div>
          </div>

          <!-- Convidados -->
          <div class="admin-panel" id="ap-convidados">
            <div class="panel-header-row">
              <h2 class="panel-title">👥 Convidados</h2>
            </div>
            <div class="a-card">
              <div class="table-wrap">
                <table id="tConvidados"><thead><tr>
                  <th>Nome</th><th>E-mail</th><th>Telefone</th><th>Tipo</th><th>Escolha</th><th>Cadastro</th><th>Ações</th>
                </tr></thead><tbody></tbody></table>
              </div>
            </div>
          </div>

          <!-- Configurações -->
          <div class="admin-panel" id="ap-configuracoes">
            <div class="a-card">
              <div class="a-card-title">⚙️ Configurações do Evento</div>
              <div class="admin-grid-2">
                <div>
                  <div class="field"><label>Título do evento</label><input type="text" id="cfgTitulo"></div>
                  <div class="field"><label>Data</label><input type="date" id="cfgData"></div>
                  <div class="field"><label>Local</label><input type="text" id="cfgLocal"></div>
                  <div class="field"><label>Descrição</label><textarea id="cfgDesc" rows="3"></textarea></div>
                </div>
                <div>
                  <div class="field"><label>Chave PIX</label><input type="text" id="cfgPix"></div>
                  <div class="field"><label>Nome beneficiário PIX</label><input type="text" id="cfgPixNome"></div>
                  <div class="field"><label>E-mail do admin (notificações)</label><input type="email" id="cfgAdminEmail"></div>
                  <div class="field">
                    <label>Imagem de capa</label>
                    <input type="file" id="cfgCapa" accept="image/*">
                    <img id="cfgCapaPrev" class="img-preview">
                  </div>
                </div>
              </div>
              <button class="btn btn-primary" id="btnSalvarCfg">💾 Salvar Configurações</button>
            </div>
          </div>

        </div>
      </main>
    </div>

    <!-- Modal Presente -->
    <div class="modal-overlay" id="modalPresente" onclick="fecharModalPresente(event)">
      <div class="modal modal-lg">
        <button class="modal-close" onclick="fecharModalPresente()">×</button>
        <h3 id="mpTitulo">Novo Presente</h3>
        <p class="modal-sub">Preencha os dados do presente</p>
        <div id="mpCorpo"></div>
      </div>
    </div>

    <!-- Modal Convidado -->
    <div class="modal-overlay" id="modalConvidado" onclick="fecharModalConvidado(event)">
      <div class="modal">
        <button class="modal-close" onclick="fecharModalConvidado()">×</button>
        <h3 id="mcTitulo">Editar Convidado</h3>
        <p class="modal-sub">Altere as informações do convidado</p>
        <div id="mcCorpo"></div>
      </div>
    </div>`;

  document.querySelectorAll('.nav-item[data-panel]').forEach(btn => {
    btn.addEventListener('click', () => admShowPanel(btn.dataset.panel, btn));
  });

  await admCarregarTudo();
  admRenderTudo();
  admBindConfig();
}

function toggleSidebar() {
  const sidebar  = document.getElementById('adminSidebar');
  const overlay  = document.getElementById('sidebarOverlay');
  const isOpen   = sidebar?.classList.contains('open');
  sidebar?.classList.toggle('open');
  overlay?.classList.toggle('active');
}

async function admCarregarTudo() {
  const [r1, r2, r3, r4] = await Promise.all([
    sb.from('presentes').select('*').order('ordem'),
    sb.from('escolhas').select('*, perfis(nome,email,telefone), presentes(titulo,preco)').order('criado_em', { ascending: false }),
    sb.from('perfis').select('*, escolhas(presente_id, tipo_pagamento, presentes(titulo))').order('criado_em'),
    sb.from('configuracoes').select('chave, valor')
  ]);
  adm.presentes = r1.data || [];
  adm.escolhas  = r2.data || [];
  adm.usuarios  = r3.data || [];
  if (r4.data) r4.data.forEach(c => adm.config[c.chave] = c.valor);
}

function admShowPanel(id, btn) {
  document.querySelectorAll('.admin-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item[data-panel]').forEach(b => b.classList.remove('active'));
  document.getElementById('ap-' + id)?.classList.add('active');
  btn?.classList.add('active');
  document.getElementById('admTopTitle').textContent = {
    dashboard: 'Dashboard', presentes: 'Presentes', escolhas: 'Escolhas',
    convidados: 'Convidados', configuracoes: 'Configurações'
  }[id] || id;
  document.getElementById('adminSidebar')?.classList.remove('open');
  document.getElementById('sidebarOverlay')?.classList.remove('active');
}

function admRenderTudo() {
  admRenderDashboard();
  admRenderPresentes();
  admRenderEscolhas();
  admRenderConvidados();
  admRenderConfig();
}

function admRenderDashboard() {
  const valorTotal = adm.escolhas.reduce((s, e) => s + (e.presentes?.preco || 0), 0);
  set('stPresentes',  adm.presentes.length);
  set('stEscolhas',   adm.escolhas.length);
  set('stConvidados', adm.usuarios.filter(u => u.tipo === 'usuario').length);
  set('stValor',      moeda(valorTotal));
  document.querySelector('#tDash tbody').innerHTML =
    adm.escolhas.slice(0, 10).map(e => `<tr>
      <td><strong>${esc(e.perfis?.nome || '—')}</strong></td>
      <td>${esc(e.presentes?.titulo || '—')}</td>
      <td><span class="badge badge-${e.tipo_pagamento}">${tipoPag(e.tipo_pagamento)}</span></td>
      <td style="color:var(--muted)">${fmtData(e.criado_em)}</td>
    </tr>`).join('') || vazio(4);
}

// ── Presentes Admin ───────────────────────────────────────────────────

function admRenderPresentes() {
  const grid = document.getElementById('presentesAdminGrid');
  if (!grid) return;
  if (adm.presentes.length === 0) {
    grid.innerHTML = `<div class="empty-state">
        <div class="empty-icon">🎁</div>
        <h3>Nenhum presente cadastrado</h3>
        <p>Clique em "+ Novo Presente" para começar.</p>
      </div>`;
    return;
  }
  grid.innerHTML = adm.presentes.map(p => {
    const imgSrc = p.imagem_base64 || p.imagem_url || '';
    const esgotado = p.quantidade_restante <= 0;
    const statusClass = p.status === 'inativo' ? 'inativo' : (esgotado ? 'esgotado' : 'ativo');
    const statusLabel = p.status === 'inativo' ? 'Inativo' : (esgotado ? 'Esgotado' : 'Ativo');
    return `
      <div class="presente-admin-card">
        <div class="pac-img">
          ${imgSrc ? `<img src="${imgSrc}" alt="${esc(p.titulo)}">` : `<div class="pac-img-icon">🎁</div>`}
          <div class="pac-status ${statusClass}">${statusLabel}</div>
        </div>
        <div class="pac-body">
          <div class="pac-title">${esc(p.titulo)}</div>
          ${p.descricao ? `<div class="pac-desc">${esc(p.descricao)}</div>` : ''}
          <div class="pac-meta">
            ${p.preco ? `<span class="pac-price">${moeda(p.preco)}</span>` : ''}
            <span class="pac-stock">📦 ${p.quantidade_restante}/${p.quantidade_max}</span>
          </div>
          <div class="pac-actions">
            <button class="btn btn-ghost pac-btn" onclick='abrirFormPresente(${JSON.stringify(p).replace(/'/g,"&#39;")})'>✏️ Editar</button>
            <button class="btn btn-danger pac-btn" onclick="admExcluirPresente('${p.id}', '${esc(p.titulo)}')">🗑️</button>
          </div>
        </div>
      </div>`;
  }).join('');
}

// ── Form Presente (Modal) ─────────────────────────────────────────────

function abrirFormPresente(p = null) {
  const editando = !!p;
  document.getElementById('mpTitulo').textContent = editando ? '✏️ Editar Presente' : '➕ Novo Presente';
  const imgSrc = editando ? (p.imagem_base64 || p.imagem_url || '') : '';
  document.getElementById('mpCorpo').innerHTML = `
    <input type="hidden" id="mpId" value="${editando ? p.id : ''}">
    <div class="field">
      <label>Título *</label>
      <input type="text" id="mpTituloInput" placeholder="Ex: Kit de Banho" value="${editando ? esc(p.titulo) : ''}">
    </div>
    <div class="field">
      <label>Descrição</label>
      <textarea id="mpDesc" rows="2" placeholder="Descrição do presente...">${editando ? esc(p.descricao || '') : ''}</textarea>
    </div>
    <div class="form-row-2">
      <div class="field">
        <label>Preço (R$)</label>
        <input type="number" id="mpPreco" step="0.01" placeholder="0,00" value="${editando && p.preco ? p.preco : ''}">
      </div>
      <div class="field">
        <label>Qtd. máxima</label>
        <input type="number" id="mpQtd" value="${editando ? p.quantidade_max : 1}" min="1">
      </div>
    </div>
    <div class="form-row-2">
      <div class="field">
        <label>Ordem de exibição</label>
        <input type="number" id="mpOrdem" value="${editando ? (p.ordem || 0) : 0}">
      </div>
      <div class="field">
        <label>Status</label>
        <select id="mpStatus">
          <option value="ativo"   ${!editando || p.status === 'ativo'   ? 'selected' : ''}>✅ Ativo</option>
          <option value="inativo" ${editando  && p.status === 'inativo' ? 'selected' : ''}>🚫 Inativo</option>
        </select>
      </div>
    </div>
    <div class="field">
      <label>Link de compra</label>
      <input type="url" id="mpLink" placeholder="https://..." value="${editando ? esc(p.link_compra || '') : ''}">
    </div>

    <div class="img-section">
      <div class="img-section-title">🖼️ Imagem do Presente</div>
      <div class="img-tabs">
        <button class="img-tab active" id="imgTabUpload" type="button" onclick="trocarImgTab('upload')">📁 Upload</button>
        <button class="img-tab" id="imgTabUrl" type="button" onclick="trocarImgTab('url')">🔗 URL</button>
      </div>
      <div id="imgPanelUpload">
        <div class="upload-area" id="uploadArea" onclick="document.getElementById('mpImg').click()">
          <div class="upload-icon">📷</div>
          <div class="upload-text">Clique ou arraste uma imagem aqui</div>
          <div class="upload-hint">JPG, PNG, WebP — convertida para Base64</div>
          <input type="file" id="mpImg" accept="image/*" style="display:none" onchange="previewImgUpload(this)">
        </div>
      </div>
      <div id="imgPanelUrl" style="display:none">
        <div class="field" style="margin-top:12px;">
          <label>URL da imagem</label>
          <input type="url" id="mpImgUrl" placeholder="https://exemplo.com/imagem.jpg"
            value="${editando ? esc(p.imagem_url || '') : ''}"
            oninput="previewImgUrl(this.value)">
        </div>
      </div>
      <div class="img-preview-wrap" id="imgPreviewWrap" style="${imgSrc ? '' : 'display:none'}">
        <img id="mpImgPrev" src="${imgSrc}" alt="Preview">
        <button class="img-remove-btn" type="button" onclick="removerImagem()">✕ Remover</button>
      </div>
    </div>

    <div class="modal-actions">
      <button class="btn btn-ghost" type="button" onclick="fecharModalPresente()">Cancelar</button>
      <button class="btn btn-primary" id="mpBtnSalvar" type="button" onclick="salvarPresente()">
        ${editando ? '💾 Salvar alterações' : '➕ Adicionar'}
      </button>
    </div>`;

  if (editando && p.imagem_url && !p.imagem_base64) trocarImgTab('url');

  document.getElementById('modalPresente').classList.add('open');

  const uploadArea = document.getElementById('uploadArea');
  if (uploadArea) {
    uploadArea.addEventListener('dragover', e => { e.preventDefault(); uploadArea.classList.add('drag-over'); });
    uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('drag-over'));
    uploadArea.addEventListener('drop', e => {
      e.preventDefault();
      uploadArea.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        const input = document.getElementById('mpImg');
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        previewImgUpload(input);
      }
    });
  }
}

function trocarImgTab(tab) {
  document.getElementById('imgTabUpload')?.classList.toggle('active', tab === 'upload');
  document.getElementById('imgTabUrl')?.classList.toggle('active',    tab === 'url');
  const pu = document.getElementById('imgPanelUpload');
  const pur = document.getElementById('imgPanelUrl');
  if (pu)  pu.style.display  = tab === 'upload' ? '' : 'none';
  if (pur) pur.style.display = tab === 'url'    ? '' : 'none';
}

function previewImgUpload(input) {
  if (!input.files?.[0]) return;
  const reader = new FileReader();
  reader.onload = e => {
    const img  = document.getElementById('mpImgPrev');
    const wrap = document.getElementById('imgPreviewWrap');
    if (img)  img.src = e.target.result;
    if (wrap) wrap.style.display = '';
    const urlInput = document.getElementById('mpImgUrl');
    if (urlInput) urlInput.value = '';
  };
  reader.readAsDataURL(input.files[0]);
}

function previewImgUrl(url) {
  const wrap = document.getElementById('imgPreviewWrap');
  if (!url) { if(wrap) wrap.style.display = 'none'; return; }
  const img = document.getElementById('mpImgPrev');
  if (img) {
    img.src = url;
    img.onload  = () => { if(wrap) wrap.style.display = ''; };
    img.onerror = () => { if(wrap) wrap.style.display = 'none'; };
  }
  const fileInput = document.getElementById('mpImg');
  if (fileInput) fileInput.value = '';
}

function removerImagem() {
  const img = document.getElementById('mpImgPrev');
  const wrap = document.getElementById('imgPreviewWrap');
  if (img)  img.src = '';
  if (wrap) wrap.style.display = 'none';
  const f = document.getElementById('mpImg');
  if (f) f.value = '';
  const u = document.getElementById('mpImgUrl');
  if (u) u.value = '';
}

async function salvarPresente() {
  const id     = document.getElementById('mpId')?.value;
  const titulo = document.getElementById('mpTituloInput')?.value.trim();
  if (!titulo) { toast('Título é obrigatório.', 'error'); return; }

  setBtn('mpBtnSalvar', true, 'Salvando...');

  let imagem_base64 = null;
  let imagem_url    = null;
  const fileInput = document.getElementById('mpImg');
  const urlInput  = document.getElementById('mpImgUrl');
  const prevSrc   = document.getElementById('mpImgPrev')?.src || '';

  if (fileInput?.files?.[0]) {
    imagem_base64 = await toBase64(fileInput.files[0]);
    imagem_url = null;
  } else if (urlInput?.value.trim()) {
    imagem_url = urlInput.value.trim();
    imagem_base64 = null;
  } else if (prevSrc && prevSrc.startsWith('data:')) {
    imagem_base64 = prevSrc;
  } else if (prevSrc && (prevSrc.startsWith('http') || prevSrc.startsWith('/'))) {
    imagem_url = prevSrc;
  }

  const dados = {
    titulo,
    descricao:      document.getElementById('mpDesc')?.value.trim() || null,
    preco:          parseFloat(document.getElementById('mpPreco')?.value) || null,
    quantidade_max: parseInt(document.getElementById('mpQtd')?.value) || 1,
    link_compra:    document.getElementById('mpLink')?.value.trim() || null,
    ordem:          parseInt(document.getElementById('mpOrdem')?.value) || 0,
    status:         document.getElementById('mpStatus')?.value || 'ativo',
    imagem_base64,
    imagem_url,
    atualizado_em:  new Date()
  };

  let err;
  if (id) {
    ({ error: err } = await sb.from('presentes').update(dados).eq('id', id));
  } else {
    dados.quantidade_restante = dados.quantidade_max;
    ({ error: err } = await sb.from('presentes').insert(dados));
  }

  setBtn('mpBtnSalvar', false, id ? '💾 Salvar alterações' : '➕ Adicionar');

  if (err) { toast('Erro: ' + err.message, 'error'); console.error(err); return; }

  toast(id ? 'Presente atualizado! ✅' : 'Presente adicionado! 🎉', 'success');
  fecharModalPresente();
  await admCarregarTudo();
  admRenderPresentes();
  admRenderDashboard();
}

async function admExcluirPresente(id, titulo) {
  if (!confirm(`Excluir "${titulo}"? Esta ação não pode ser desfeita.`)) return;
  const { error } = await sb.from('presentes').delete().eq('id', id);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  toast('Presente excluído.', 'success');
  await admCarregarTudo();
  admRenderPresentes();
  admRenderDashboard();
}

function fecharModalPresente(e) {
  if (e && e.type === 'click' && e.target !== document.getElementById('modalPresente')) return;
  document.getElementById('modalPresente')?.classList.remove('open');
}

// ── Escolhas Admin ────────────────────────────────────────────────────

function admRenderEscolhas() {
  document.querySelector('#tEscolhas tbody').innerHTML =
    adm.escolhas.map(e => `<tr>
      <td><strong>${esc(e.perfis?.nome || '—')}</strong></td>
      <td style="color:var(--muted);font-size:12px">${esc(e.perfis?.email || '—')}</td>
      <td style="color:var(--muted)">${esc(e.perfis?.telefone || '—')}</td>
      <td>${esc(e.presentes?.titulo || '—')}</td>
      <td><span class="badge badge-${e.tipo_pagamento}">${tipoPag(e.tipo_pagamento)}</span></td>
      <td>${e.presentes?.preco ? moeda(e.presentes.preco) : '—'}</td>
      <td style="color:var(--muted)">${fmtData(e.criado_em)}</td>
    </tr>`).join('') || vazio(7);
}

// ── Convidados Admin ──────────────────────────────────────────────────

function admRenderConvidados() {
  document.querySelector('#tConvidados tbody').innerHTML =
    adm.usuarios.map(u => {
      const escolha = u.escolhas?.[0];
      return `<tr>
        <td><strong>${esc(u.nome)}</strong></td>
        <td style="color:var(--muted);font-size:12px">${esc(u.email)}</td>
        <td style="color:var(--muted)">${esc(u.telefone || '—')}</td>
        <td><span class="badge badge-${u.tipo}">${u.tipo === 'admin' ? '👑 Admin' : 'Convidado'}</span></td>
        <td>${escolha ? `<span class="badge badge-pix">${esc(escolha.presentes?.titulo || '?')}</span>`
          : `<span style="color:var(--muted)">Não escolheu</span>`}</td>
        <td style="color:var(--muted)">${fmtData(u.criado_em)}</td>
        <td>
          <div class="table-actions">
            <button class="tbl-btn tbl-btn-edit" onclick='abrirModalConvidado(${JSON.stringify(u).replace(/'/g,"&#39;")})' title="Editar">✏️</button>
            <button class="tbl-btn tbl-btn-del" onclick="admExcluirConvidado('${u.user_id}','${esc(u.nome)}')" title="Excluir">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('') || vazio(7);
}

// ── Modal Convidado ───────────────────────────────────────────────────

function abrirModalConvidado(u) {
  document.getElementById('mcTitulo').textContent = 'Editar Convidado';
  document.getElementById('mcCorpo').innerHTML = `
    <input type="hidden" id="mcUserId" value="${u.user_id}">
    <div class="field">
      <label>Nome completo</label>
      <input type="text" id="mcNome" value="${esc(u.nome || '')}">
    </div>
    <div class="field">
      <label>E-mail</label>
      <input type="email" id="mcEmail" value="${esc(u.email || '')}" readonly
        style="opacity:0.6;cursor:not-allowed" title="E-mail não pode ser alterado aqui">
      <small style="color:var(--muted);font-size:11px;margin-top:4px;display:block">
        O e-mail é gerenciado pelo Supabase Auth.
      </small>
    </div>
    <div class="field">
      <label>Telefone</label>
      <input type="tel" id="mcTelefone" value="${esc(u.telefone || '')}">
    </div>
    <div class="field">
      <label>Tipo de conta</label>
      <select id="mcTipo">
        <option value="usuario" ${u.tipo === 'usuario' ? 'selected' : ''}>👤 Convidado</option>
        <option value="admin"   ${u.tipo === 'admin'   ? 'selected' : ''}>👑 Admin</option>
      </select>
    </div>
    <div class="separator"></div>
    <div class="separator-label">Alterar senha (opcional)</div>
    <div class="field">
      <label>Nova senha</label>
      <div class="password-wrap">
        <input type="password" id="mcSenha" placeholder="Deixe em branco para não alterar" autocomplete="new-password">
        <button type="button" class="pass-toggle" onclick="togglePassVis('mcSenha',this)">👁</button>
      </div>
    </div>
    <div class="field">
      <label>Confirmar nova senha</label>
      <div class="password-wrap">
        <input type="password" id="mcSenhaConf" placeholder="Repita a nova senha" autocomplete="new-password">
        <button type="button" class="pass-toggle" onclick="togglePassVis('mcSenhaConf',this)">👁</button>
      </div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-ghost" type="button" onclick="fecharModalConvidado()">Cancelar</button>
      <button class="btn btn-primary" id="mcBtnSalvar" type="button" onclick="salvarConvidado()">💾 Salvar</button>
    </div>`;

  document.getElementById('modalConvidado').classList.add('open');
}

function togglePassVis(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') { input.type = 'text'; btn.textContent = '🙈'; }
  else { input.type = 'password'; btn.textContent = '👁'; }
}

async function salvarConvidado() {
  const userId = document.getElementById('mcUserId')?.value;
  const nome   = document.getElementById('mcNome')?.value.trim();
  const tel    = document.getElementById('mcTelefone')?.value.trim();
  const tipo   = document.getElementById('mcTipo')?.value;
  const senha  = document.getElementById('mcSenha')?.value;
  const conf   = document.getElementById('mcSenhaConf')?.value;

  if (!nome) { toast('Nome é obrigatório.', 'error'); return; }
  if (senha) {
    if (senha.length < 6) { toast('A senha deve ter pelo menos 6 caracteres.', 'error'); return; }
    if (senha !== conf)   { toast('As senhas não coincidem.', 'error'); return; }
  }

  setBtn('mcBtnSalvar', true, 'Salvando...');

  const { error: errPerfil } = await sb.from('perfis').update({
    nome, telefone: tel || null, tipo, atualizado_em: new Date()
  }).eq('user_id', userId);

  if (errPerfil) {
    toast('Erro ao salvar perfil: ' + errPerfil.message, 'error');
    setBtn('mcBtnSalvar', false, '💾 Salvar');
    return;
  }

  if (senha) {
    try {
      const { data: { session } } = await sb.auth.getSession();
      const resp = await fetch(`${SUPABASE_URL}/functions/v1/admin-update-user`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ user_id: userId, password: senha })
      });
      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        toast('Senha não alterada: ' + (body.error || 'Edge Function não configurada'), 'error');
      } else {
        toast('Senha alterada! ✅', 'success');
      }
    } catch (e) {
      toast('Senha não alterada (configure a Edge Function admin-update-user).', 'error');
    }
  }

  setBtn('mcBtnSalvar', false, '💾 Salvar');
  toast('Convidado atualizado! ✅', 'success');
  fecharModalConvidado();
  await admCarregarTudo();
  admRenderConvidados();
}

async function admExcluirConvidado(userId, nome) {
  if (!confirm(`Excluir o convidado "${nome}"?\nEsta ação remove o perfil permanentemente.`)) return;
  const { error } = await sb.from('perfis').delete().eq('user_id', userId);
  if (error) { toast('Erro: ' + error.message, 'error'); return; }
  toast('Convidado removido.', 'success');
  await admCarregarTudo();
  admRenderConvidados();
  admRenderDashboard();
}

function fecharModalConvidado(e) {
  if (e && e.type === 'click' && e.target !== document.getElementById('modalConvidado')) return;
  document.getElementById('modalConvidado')?.classList.remove('open');
}

// ── Config ────────────────────────────────────────────────────────────

function admRenderConfig() {
  const c = adm.config;
  [['cfgTitulo','evento_titulo'],['cfgData','evento_data'],['cfgLocal','evento_local'],
   ['cfgDesc','evento_descricao'],['cfgPix','pix_chave'],['cfgPixNome','pix_nome'],['cfgAdminEmail','admin_email']
  ].forEach(([id, chave]) => { const el = document.getElementById(id); if(el) el.value = c[chave] || ''; });
}

function admBindConfig() {
  document.getElementById('cfgCapa')?.addEventListener('change', function() { admPreview(this, 'cfgCapaPrev'); });
  document.getElementById('btnSalvarCfg')?.addEventListener('click', admSalvarConfig);
}

async function admSalvarConfig() {
  const pares = [
    ['evento_titulo', v('cfgTitulo')], ['evento_data', v('cfgData')],
    ['evento_local', v('cfgLocal')],   ['evento_descricao', v('cfgDesc')],
    ['pix_chave', v('cfgPix')],        ['pix_nome', v('cfgPixNome')],
    ['admin_email', v('cfgAdminEmail')]
  ];
  setBtn('btnSalvarCfg', true, 'Salvando...');
  for (const [chave, valor] of pares) {
    await sb.from('configuracoes').upsert({ chave, valor, atualizado_em: new Date() }, { onConflict: 'chave' });
  }
  const capaFile = document.getElementById('cfgCapa')?.files?.[0];
  if (capaFile) {
    const base64 = await toBase64(capaFile);
    await sb.from('configuracoes').upsert({ chave: 'imagem_capa_base64', valor: base64, atualizado_em: new Date() }, { onConflict: 'chave' });
  }
  setBtn('btnSalvarCfg', false, '💾 Salvar Configurações');
  toast('Configurações salvas! ✅', 'success');
  await admCarregarTudo();
}

// ===================================================================
// UTILITÁRIOS
// ===================================================================

function voltarSite() { window.location.hash = ''; comentariosCache = {}; renderApp(); }
function v(id) { return document.getElementById(id)?.value?.trim() || ''; }
function set(id, val) { const el = document.getElementById(id); if(el) el.textContent = val; }

function mostrarAlerta(el, msg) { if(!el) return; el.textContent = msg; el.classList.add('show'); }

function setBtn(id, loading, label) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = label;
}

function toast(msg, tipo = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${tipo}`;
  el.textContent = msg;
  document.getElementById('toasts').appendChild(el);
  setTimeout(() => el.remove(), 4200);
}

function admPreview(input, prevId) {
  if (input.files?.[0]) {
    const r = new FileReader();
    r.onload = e => {
      const el = document.getElementById(prevId);
      if (el) { el.src = e.target.result; el.style.display = 'block'; }
    };
    r.readAsDataURL(input.files[0]);
  }
}

function toBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function moeda(v) { return new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(v||0); }
function fmtData(d) { return d ? new Date(d).toLocaleDateString('pt-BR') : '—'; }
function tipoPag(t) { return {presente:'🎁 Presente',pix:'💰 PIX',dinheiro:'💵 Dinheiro'}[t]||t||'—'; }
function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function skeletons(n) {
  return Array.from({length:n},()=>`
    <div class="gift-card">
      <div class="card-img skeleton" style="height:210px;border-radius:0"></div>
      <div class="card-body">
        <div class="skeleton" style="height:18px;width:60%;margin-bottom:10px;"></div>
        <div class="skeleton" style="height:13px;width:85%;margin-bottom:7px;"></div>
        <div class="skeleton" style="height:13px;width:65%;margin-bottom:16px;"></div>
        <div class="skeleton" style="height:42px;"></div>
      </div>
    </div>`).join('');
}

function vazio(cols) {
  return `<tr><td colspan="${cols}" style="text-align:center;padding:28px;color:var(--muted)">Nenhum registro</td></tr>`;
}
