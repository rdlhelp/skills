// Trechos para o javascript_tool do navegador do app. Cole a definição que precisar e depois chame.
// Rodam na página que está sendo testada, com a sessão dela (mesma origem). Só no ambiente de teste.
// Nenhum deles fala com domínio externo.

// Preenche um campo controlado pelo React (input/textarea) com um texto qualquer, inclusive 100.000 caracteres.
// Digitar com `computer type` trava; atribuir .value direto não avisa o React. Este usa o setter nativo + evento input.
// Ex.: fillInput('textarea', 'A'.repeat(100000)) ou fillInput('[aria-label="Descrição da peça"]', '<svg/onload=console.log("QA-XSS-3")>')
function fillInput(selector, text, index = 0) {
  const el = document.querySelectorAll(selector)[index];
  if (!el) return `nenhum elemento para ${selector}`;
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, text);
  el.dispatchEvent(new Event('input', { bubbles: true }));
  return `ok: ${el.value.length} caracteres em ${selector}[${index}]`;
}

// Remove required/maxLength/min/max/pattern de todos os campos (testa se o servidor valida sozinho).
function stripValidation() {
  let n = 0;
  document.querySelectorAll('input, textarea, select').forEach((el) => {
    ['required', 'maxlength', 'minlength', 'min', 'max', 'pattern'].forEach((a) => el.hasAttribute(a) && (el.removeAttribute(a), n++));
  });
  return `${n} atributos removidos`;
}

// N cliques no mesmo tick no botão com aquele texto (simula o botão que não desabilita a tempo).
// Ex.: burstClick('Criar cotação', 5)
function burstClick(label, times = 5) {
  const btn = [...document.querySelectorAll('button, a, [role=button]')].find((b) => b.textContent.trim().includes(label));
  if (!btn) return `botão "${label}" não encontrado`;
  for (let i = 0; i < times; i++) btn.click();
  return `${times} cliques em "${btn.textContent.trim()}" (disabled agora: ${btn.disabled ?? 'n/a'})`;
}

// Chamada à API com a sessão do navegador. Devolve status e corpo.
// Ex.: await fetchJson('/v1/quotations/q_x/purchase', { method: 'POST', body: {...} })
async function fetchJson(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, { method, credentials: 'same-origin', headers: body !== undefined ? { 'Content-Type': 'application/json' } : {}, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, body: json ?? text.slice(0, 2000) };
}

// A mesma requisição N vezes em paralelo (corrida no servidor). Devolve status e um resumo de cada resposta.
// Ex.: await raceFetch('/v1/quotations', { method: 'POST', body: payload }, 5)
async function raceFetch(path, init, n = 5) {
  const all = await Promise.all(Array.from({ length: n }, () => fetchJson(path, init)));
  return all.map((r) => ({ status: r.status, resumo: JSON.stringify(r.body).slice(0, 300) }));
}

// Envolve window.fetch: atraso (ms) e/ou falha. Recarregue a página para desfazer.
// Ex.: slowFetch({ delay: 5000 }) · slowFetch({ fail: 'network', match: '/dispatch' }) · slowFetch({ fail: 500, match: '/purchase' })
function slowFetch({ delay = 0, fail = null, match = '' } = {}) {
  const orig = window.__qaOrigFetch ?? window.fetch;
  window.__qaOrigFetch = orig;
  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input.url;
    if (!url.includes(match)) return orig(input, init);
    if (delay) await new Promise((r) => setTimeout(r, delay));
    if (fail === 'network') throw new TypeError('Failed to fetch (QA simulado)');
    if (typeof fail === 'number') return new Response(JSON.stringify({ success: false, error: { code: 'QA', message: 'falha simulada pelo QA' } }), { status: fail, headers: { 'Content-Type': 'application/json' } });
    return orig(input, init);
  };
  return `fetch modificado (delay=${delay}, fail=${fail}, match="${match}")`;
}

// Derruba a sessão sem a tela saber (simula logout em outra aba / sessão expirada). Use o caminho do perfil:
// áreas '/auth/logout', área do desmonte '/api/d/auth/logout', painel '/admin-api/auth/logout'.
async function logoutBehind(path = '/auth/logout') {
  const r = await (window.__qaOrigFetch ?? fetch)(path, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  return `logout por trás: ${r.status}`;
}

// Arquivo gerado no navegador e colocado num <input type=file> (dispara change). Tipos: 'png' (válido 1x1), 'fake-jpg' (texto com nome .jpg), 'empty', 'big'.
// Ex.: makeFile('input[type=file]', 'big', { mb: 30, name: 'foto grande.jpg' })
function makeFile(selector, kind, { mb = 10, name } = {}) {
  const el = document.querySelector(selector);
  if (!el) return `nenhum input para ${selector}`;
  const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='), (c) => c.charCodeAt(0));
  const parts = { png: [[png], 'image/png', 'qa.png'], 'fake-jpg': [['isto não é uma imagem'], 'image/jpeg', 'qa.jpg'], empty: [[], 'image/jpeg', 'vazio.jpg'], big: [[new Uint8Array(mb * 1024 * 1024)], 'image/jpeg', `grande-${mb}mb.jpg`] }[kind];
  if (!parts) return `tipo desconhecido: ${kind}`;
  const file = new File(parts[0], name ?? parts[2], { type: parts[1] });
  const dt = new DataTransfer();
  dt.items.add(file);
  el.files = dt.files;
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return `arquivo ${file.name} (${file.size} bytes, ${file.type}) colocado em ${selector}`;
}

// Elementos mais largos que a janela (rolagem horizontal em 375 px).
function overflowCheck() {
  const w = document.documentElement.clientWidth;
  const out = [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > w + 1).slice(0, 15).map((e) => `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}.${[...e.classList].slice(0, 3).join('.')} → ${Math.round(e.getBoundingClientRect().right)}px`);
  return { largura: w, scrollWidth: document.documentElement.scrollWidth, transbordando: out };
}

// Procura no DOM e no texto da página termos que não podem vazar (regra 2 do CLAUDE.md).
function leakScan(extra = []) {
  const html = document.documentElement.outerHTML;
  const terms = ['elastic', 'meili', 'hub_product', 'supplier_resolution', '"raw"', 'spl', 'wapp_loja', 'cnpj', ...extra];
  const cnpj = html.match(/\b\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}\b/g) ?? [];
  const phone = html.match(/\b(?:55)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}\b/g) ?? [];
  return { termos: terms.filter((t) => html.toLowerCase().includes(t)), cnpjs: [...new Set(cnpj)].slice(0, 10), telefones: [...new Set(phone)].slice(0, 10) };
}
