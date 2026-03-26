/* ui.js — Controlador principal de interfaz */

function casReady() { return typeof window.nerdamer !== 'undefined'; }
function casSimp(expr) { return nerdamer(expr).simplify().toString(); }
function casInteg(expr, v) { return nerdamer(`integrate(${expr},${v})`).toString(); }
function casDiff(expr, v) { return nerdamer(`diff(${expr},${v})`).toString(); }
function casTeX(expr) {
  try { return nerdamer(expr).toTeX(); }
  catch { return String(expr).replace(/</g,'&lt;'); }
}
function casEval(expr, subs) {
  try {
    let ne = nerdamer(expr);
    Object.entries(subs).forEach(([k,v]) => { ne = ne.sub(k,v); });
    return { ok: true, val: ne.evaluate().toString() };
  } catch { return { ok: false, val: '' }; }
}

let _latexSource = '';

function setOutput(html, latexRaw = '') {
  _latexSource = latexRaw;
  const area = document.getElementById('output-area');
  area.innerHTML = html;
  if (window.MathJax && window.MathJax.typesetPromise) {
    MathJax.typesetClear();
    MathJax.typesetPromise([area]);
  }
}

function showLoading() {
  document.getElementById('output-area').innerHTML = `
    <div class="output-loading">
      <div class="spinner"></div>
      <span>Calculando…</span>
    </div>`;
}

function setPill(type, text) {
  const p = document.getElementById('statusPill');
  p.className = 'status-pill ' + type;
  p.textContent = text;
}

function setModePill(text) { document.getElementById('modePill').textContent = text; }

function stepBlock(num, title, content, cls = '') {
  const numHtml = num ? `<div class="step-num">Paso ${num}</div>` : '';
  return `<div class="step-block ${cls}">${numHtml}<div class="step-title">${title}</div><div class="step-content">${content}</div></div>`;
}
function resultBlock(content) {
  return `<div class="step-block result"><div class="step-title">✓ Solución</div><div class="step-content">${content}</div></div>`;
}
function errorBlock(msg, detail = '') {
  return `<div class="step-block error"><div class="step-title">✗ Error</div><div class="step-content">${msg}</div>${detail ? `<div class="step-content mono" style="margin-top:8px">${detail}</div>` : ''}</div>`;
}

const modeLabels = { sep:'Separación de Variables', exa:'Ecuaciones Exactas', int:'Factor Integrante', lin:'Ecuación Lineal', lap:'Transformada de Laplace' };
let currentMethod = 'sep';

function switchMethod(method) {
  currentMethod = method;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.method === method));
  document.querySelectorAll('.method-panel').forEach(p => p.classList.toggle('active', p.id === 'panel-' + method));
  setModePill(modeLabels[method] || method);
  setPill('warn','Listo');
  setOutput(`<div class="output-placeholder"><div class="placeholder-icon">∫</div><p>Ingresa los datos y presiona <strong>Resolver</strong></p></div>`);
}

function solve() {
  if (!casReady()) {
    setPill('bad','CAS no listo');
    setOutput(errorBlock('Nerdamer aún está cargando. Espera un momento.'));
    return;
  }
  showLoading();
  setPill('warn','Calculando…');
  setTimeout(() => {
    try {
      switch (currentMethod) {
        case 'sep': solveSeparable(); break;
        case 'exa': solveExact();     break;
        case 'int': solveIntegrating(); break;
        case 'lin': solveLinear();    break;
        case 'lap': solveLaplace();   break;
      }
    } catch (err) {
      setPill('bad','Error inesperado');
      setOutput(errorBlock('Error inesperado. Revisa la sintaxis.', String(err)));
    }
  }, 40);
}

const fieldsByMethod = {
  sep:['sep-fx','sep-gy','sep-x0','sep-y0'],
  exa:['exa-M','exa-N','exa-x0','exa-y0'],
  int:['int-M','int-N','int-x0','int-y0'],
  lin:['lin-P','lin-Q','lin-x0','lin-y0'],
  lap:['lap-ft']
};

function clearFields() {
  (fieldsByMethod[currentMethod]||[]).forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
  setPill('warn','Listo');
  setOutput(`<div class="output-placeholder"><div class="placeholder-icon">∫</div><p>Listo. Ingresa datos y presiona <strong>Resolver</strong></p></div>`);
}

async function copyLatex() {
  if (!_latexSource) { setPill('warn','Nada que copiar'); return; }
  try {
    await navigator.clipboard.writeText(_latexSource);
    setPill('good','LaTeX copiado ✓');
    setTimeout(() => setPill('warn','Listo'), 1500);
  } catch { setPill('bad','No se pudo copiar'); }
}

function setValue(id, val) { const el=document.getElementById(id); if(el) el.value=val; }

const examples = {
  sep1: ()=>{ switchMethod('sep'); setValue('sep-fx','x'); setValue('sep-gy','y'); setValue('sep-x0','0'); setValue('sep-y0','2'); },
  sep2: ()=>{ switchMethod('sep'); setValue('sep-fx','1/(1+x^2)'); setValue('sep-gy','1+y^2'); setValue('sep-x0',''); setValue('sep-y0',''); },
  exa1: ()=>{ switchMethod('exa'); setValue('exa-M','2*x*y + 3'); setValue('exa-N','x^2 + 4*y'); setValue('exa-x0','1'); setValue('exa-y0','2'); },
  exa2: ()=>{ switchMethod('exa'); setValue('exa-M','y*cos(x) + 2*x'); setValue('exa-N','sin(x) + 2*y'); setValue('exa-x0',''); setValue('exa-y0',''); },
  int1: ()=>{ switchMethod('int'); setValue('int-M','3*x*y + y^2'); setValue('int-N','x^2 + x*y'); setValue('int-x0',''); setValue('int-y0',''); },
  int2: ()=>{ switchMethod('int'); setValue('int-M','y'); setValue('int-N','2*x - y*e^y'); setValue('int-x0',''); setValue('int-y0',''); },
  lin1: ()=>{ switchMethod('lin'); setValue('lin-P','2'); setValue('lin-Q','4'); setValue('lin-x0','0'); setValue('lin-y0','1'); },
  lin2: ()=>{ switchMethod('lin'); setValue('lin-P','2/x'); setValue('lin-Q','x^3'); setValue('lin-x0',''); setValue('lin-y0',''); },
  lap1: ()=>{ switchMethod('lap'); document.getElementById('lap-mode').value='forward'; setValue('lap-ft','t^2*e^(3*t)'); },
  lap2: ()=>{ switchMethod('lap'); document.getElementById('lap-mode').value='forward'; setValue('lap-ft','sin(2*t)*e^(-t)'); },
  lap3: ()=>{ switchMethod('lap'); document.getElementById('lap-mode').value='inverse'; setValue('lap-ft','1/(s^2+4)'); },
};

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => switchMethod(btn.dataset.method)));
  document.getElementById('btn-solve').addEventListener('click', solve);
  document.getElementById('btn-clear').addEventListener('click', clearFields);
  document.getElementById('btn-copy').addEventListener('click', copyLatex);
  document.querySelectorAll('.field-input').forEach(inp => {
    inp.addEventListener('keydown', e => { if(e.key==='Enter') solve(); });
    inp.addEventListener('input', () => setPill('warn','Listo'));
  });
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const fn = examples[chip.dataset.ex];
      if(fn) { fn(); setPill('warn','Ejemplo cargado'); setOutput(`<div class="output-placeholder"><div class="placeholder-icon">∫</div><p>Ejemplo cargado. Presiona <strong>Resolver</strong></p></div>`); }
    });
  });
  switchMethod('sep');
});

window.EDO = { casSimp, casInteg, casDiff, casTeX, casEval, setOutput, showLoading, setPill, setModePill, stepBlock, resultBlock, errorBlock, setLatexSource: s => { _latexSource = s; } };