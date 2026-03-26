function solveLaplace() {
  const { casTeX, setOutput, setPill, stepBlock, resultBlock, errorBlock } = window.EDO;
  const ft   = document.getElementById('lap-ft').value.trim();
  const mode = document.getElementById('lap-mode').value;
  if (!ft) { setPill('bad','Faltan datos'); setOutput(errorBlock('Ingresa la función.')); return; }
  try {
    if (mode === 'forward') laplaceForward(ft);
    else laplaceInverse(ft);
  } catch(err) {
    setPill('bad','Error'); setOutput(errorBlock('No se pudo calcular.', String(err)));
  }
}

/* ══════════════════════════════════════
   LAPLACE DIRECTA
══════════════════════════════════════ */
function laplaceForward(ft) {
  const { casTeX, setOutput, setPill, stepBlock, resultBlock, errorBlock } = window.EDO;
  let ftTeX; try { ftTeX = casTeX(ft); } catch { ftTeX = ft; }
  const steps = []; let latex = '';

  steps.push(stepBlock(1,'Definición',
    `$$\\mathcal{L}\\{f(t)\\} = \\int_0^{\\infty} e^{-st}f(t)\\,dt, \\quad f(t) = ${ftTeX}$$`));

  try {
    const Fs    = nerdamer(`laplace(${ft},t,s)`).toString();
    const FsTeX = casTeX(Fs);
    steps.push(stepBlock(2,'Aplicar transformada', `$$F(s) = ${FsTeX}$$`));
    steps.push(resultBlock(`$$\\mathcal{L}\\left\\{${ftTeX}\\right\\} = \\boxed{${FsTeX}}$$`));
    latex += `\\boxed{F(s) = ${FsTeX}}\n`;
    setPill('good','Transformada calculada');
  } catch(_) {
    steps.push(`<div class="step-block warn-block"><div class="step-title">Tabla de referencia</div><div class="step-content" style="overflow-x:auto">${buildLaplaceTable(false)}</div></div>`);
    setPill('warn','Ver tabla');
  }
  window.EDO.setLatexSource(latex);
  setOutput(steps.join('\n'));
}

/* ══════════════════════════════════════
   LAPLACE INVERSA — usa tabla
══════════════════════════════════════ */
function laplaceInverse(Fs) {
  const { casTeX, setOutput, setPill, stepBlock, resultBlock, errorBlock } = window.EDO;
  let FsTeX; try { FsTeX = casTeX(Fs); } catch { FsTeX = Fs; }
  const steps = []; let latex = '';

  steps.push(stepBlock(1,'Transformada inversa a calcular',
    `$$\\mathcal{L}^{-1}\\left\\{${FsTeX}\\right\\} = ?$$`));

  // Tabla de pares inversos con regex
  const inverseTable = [
    // 1/s
    { re: /^1\/s$/, ft: '1', ftTeX: '1' },
    // n!/s^(n+1)  -> t^n
    { re: /^(\d+)\/s\^(\d+)$/, ft: (m) => {
        const num = parseInt(m[1]), exp = parseInt(m[2]);
        const n = exp - 1;
        const fact = factorial(n);
        if (num === fact) return `t^${n}`;
        return null;
      },
      ftTeX: (m) => {
        const exp = parseInt(m[2]); const n = exp-1;
        const fact = factorial(n);
        if (parseInt(m[1]) === fact) return `t^{${n}}`;
        return null;
      }
    },
    // 1/(s-a)  -> e^(at)
    { re: /^1\/\(s([+-]\d+(?:\.\d+)?)\)$/, ft: (m) => `e^(${m[1]}*t)`, ftTeX: (m) => `e^{${m[1]}t}` },
    { re: /^1\/\(s-(\d+(?:\.\d+)?)\)$/,    ft: (m) => `e^(${m[1]}*t)`, ftTeX: (m) => `e^{${m[1]}t}` },
    // b/(s^2+b^2)  -> sin(bt)
    { re: /^(\d+(?:\.\d+)?)\/\(s\^2\+(\d+(?:\.\d+)?)\)$/, ft: (m) => {
        const b2 = parseFloat(m[2]), b = Math.sqrt(b2);
        if (Math.abs(parseFloat(m[1]) - b) < 1e-6) return `sin(${b}*t)`;
        // coeficiente distinto: k/b * sin(bt)
        const k = parseFloat(m[1]);
        return `${k/b}*sin(${b}*t)`;
      },
      ftTeX: (m) => {
        const b2 = parseFloat(m[2]), b = Math.sqrt(b2);
        if (Math.abs(parseFloat(m[1]) - b) < 1e-6) return `\\sin(${b}t)`;
        const k = parseFloat(m[1]);
        return `\\frac{${k}}{${b}}\\sin(${b}t)`;
      }
    },
    // s/(s^2+b^2)  -> cos(bt)
    { re: /^s\/\(s\^2\+(\d+(?:\.\d+)?)\)$/, ft: (m) => {
        const b = Math.sqrt(parseFloat(m[1]));
        return `cos(${b}*t)`;
      },
      ftTeX: (m) => {
        const b = Math.sqrt(parseFloat(m[1]));
        return `\\cos(${b}t)`;
      }
    },
    // 1/(s-a)^2  -> t*e^(at)
    { re: /^1\/\(s([+-]\d+(?:\.\d+)?)\)\^2$/, ft: (m) => `t*e^(${m[1]}*t)`, ftTeX: (m) => `t\\,e^{${m[1]}t}` },
    { re: /^1\/\(s-(\d+(?:\.\d+)?)\)\^2$/,    ft: (m) => `t*e^(${m[1]}*t)`, ftTeX: (m) => `t\\,e^{${m[1]}t}` },
    // b/((s-a)^2+b^2)  -> e^(at)*sin(bt)
    { re: /^(\d+(?:\.\d+)?)\/\(\(s([+-]\d+(?:\.\d+)?)\)\^2\+(\d+(?:\.\d+)?)\)$/, ft: (m) => {
        const b2 = parseFloat(m[3]), b = Math.sqrt(b2);
        return `e^(${m[2]}*t)*sin(${b}*t)`;
      },
      ftTeX: (m) => {
        const b2 = parseFloat(m[3]), b = Math.sqrt(b2);
        return `e^{${m[2]}t}\\sin(${b}t)`;
      }
    },
    // (s-a)/((s-a)^2+b^2)  -> e^(at)*cos(bt)
    { re: /^\(s([+-]\d+(?:\.\d+)?)\)\/\(\(s([+-]\d+(?:\.\d+)?)\)\^2\+(\d+(?:\.\d+)?)\)$/, ft: (m) => {
        const b2 = parseFloat(m[3]), b = Math.sqrt(b2);
        return `e^(${m[1]}*t)*cos(${b}*t)`;
      },
      ftTeX: (m) => {
        const b2 = parseFloat(m[3]), b = Math.sqrt(b2);
        return `e^{${m[1]}t}\\cos(${b}t)`;
      }
    },
  ];

  function factorial(n) {
    if (n <= 1) return 1;
    return n * factorial(n-1);
  }

  const clean = Fs.replace(/\s/g,'');
  let found = null, ftResult = null, ftTeXResult = null;

  for (const entry of inverseTable) {
    const m = clean.match(entry.re);
    if (m) {
      const ftVal  = typeof entry.ft === 'function'  ? entry.ft(m)  : entry.ft;
      const ftTVal = typeof entry.ftTeX === 'function' ? entry.ftTeX(m) : entry.ftTeX;
      if (ftVal && ftTVal) { found = entry; ftResult = ftVal; ftTeXResult = ftTVal; break; }
    }
  }

  if (found) {
    steps.push(stepBlock(2,'Forma reconocida en tabla',
      `$$F(s) = ${FsTeX}$$`));
    steps.push(stepBlock(3,'Aplicar par de transformada inversa',
      `$$\\mathcal{L}^{-1}\\left\\{${FsTeX}\\right\\} = ${ftTeXResult}$$`));
    steps.push(resultBlock(
      `$$\\mathcal{L}^{-1}\\left\\{${FsTeX}\\right\\} = \\boxed{${ftTeXResult}}$$`));
    latex += `\\boxed{f(t) = ${ftTeXResult}}\n`;
    setPill('good','Inversa calculada');
  } else {
    steps.push(stepBlock(2,'Sugerencia',
      `Descompón $F(s)$ en fracciones parciales y aplica la tabla:`));
    steps.push(`<div class="step-block warn-block"><div class="step-title">Tabla de transformadas inversas</div><div class="step-content" style="overflow-x:auto">${buildLaplaceTable(true)}</div></div>`);
    setPill('warn','Ver tabla — descompón en fracciones parciales');
  }

  window.EDO.setLatexSource(latex);
  setOutput(steps.join('\n'));
}

/* ══════════════════════════════════════
   TABLA HTML
══════════════════════════════════════ */
function buildLaplaceTable(inverse = false) {
  const rows = [
    ['1','\\dfrac{1}{s}'],
    ['t^n','\\dfrac{n!}{s^{n+1}}'],
    ['e^{at}','\\dfrac{1}{s-a}'],
    ['\\sin(bt)','\\dfrac{b}{s^2+b^2}'],
    ['\\cos(bt)','\\dfrac{s}{s^2+b^2}'],
    ['\\sinh(bt)','\\dfrac{b}{s^2-b^2}'],
    ['\\cosh(bt)','\\dfrac{s}{s^2-b^2}'],
    ['t\\,e^{at}','\\dfrac{1}{(s-a)^2}'],
    ['e^{at}\\sin(bt)','\\dfrac{b}{(s-a)^2+b^2}'],
    ['e^{at}\\cos(bt)','\\dfrac{s-a}{(s-a)^2+b^2}'],
    ['t^n e^{at}','\\dfrac{n!}{(s-a)^{n+1}}'],
    ['\\delta(t)','1'],
    ['u(t-a)','\\dfrac{e^{-as}}{s}'],
  ];
  const [c1,c2] = inverse ? ['F(s)','f(t)'] : ['f(t)','F(s)'];
  let html = `<table style="width:100%;border-collapse:collapse;font-size:13px">
    <thead><tr style="background:rgba(34,85,221,.08)">
      <th style="padding:8px 12px;text-align:left;border-bottom:1px solid var(--border)">${c1}</th>
      <th style="padding:8px 12px;text-align:left;border-bottom:1px solid var(--border)">${c2}</th>
    </tr></thead><tbody>`;
  rows.forEach(([ft,Fs],i) => {
    const [l,r] = inverse ? [Fs,ft] : [ft,Fs];
    html += `<tr style="${i%2?'background:rgba(0,0,0,.02)':''}">
      <td style="padding:7px 12px;border-bottom:1px solid var(--border)">$${l}$</td>
      <td style="padding:7px 12px;border-bottom:1px solid var(--border)">$${r}$</td>
    </tr>`;
  });
  return html + '</tbody></table>';
}