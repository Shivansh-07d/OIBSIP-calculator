/* Glowy Scientific Calculator JS */
const exprDiv = document.getElementById('expr');
const resultInput = document.getElementById('result');
const buttons = Array.from(document.querySelectorAll('.btn'));
const themeBtn = document.getElementById('themeBtn');
const angleBtn = document.getElementById('angleBtn');
const acBtn = document.getElementById('ac');
const delBtn = document.getElementById('del');
const eqBtn = document.getElementById('eq');
const ansBtn = document.getElementById('ans');
const copyBtn = document.getElementById('copy');
const hlist = document.getElementById('hlist');

let expression = '';
let lastAns = '';
let isDeg = true;
let history = [];

/* helper functions */
function updateScreen(){
  exprDiv.textContent = expression || '';
  resultInput.value = '';
}

function pushToHistory(exp, res){
  history.unshift({exp, res});
  if(history.length>10) history.pop();
  renderHistory();
}
function renderHistory(){
  hlist.innerHTML = '';
  history.forEach(h=>{
    const li = document.createElement('li');
    li.textContent = `${h.exp} = ${h.res}`;
    li.title = 'Click to paste expression';
    li.onclick = ()=> { expression = h.exp; updateScreen(); };
    hlist.appendChild(li);
  });
}

/* math helpers */
function factorial(n){
  if(n<0) return NaN;
  if(n===0 || n===1) return 1;
  let res=1;
  for(let i=2;i<=Math.floor(n);i++) res*=i;
  return res;
}
function toNumberSafe(x){
  if (x===Infinity || x===-Infinity) return NaN;
  return (Math.abs(x) < 1e-12) ? 0 : +x;
}

/* parsing and evaluation
   We replace friendly tokens with JS Math equivalents.
   We implement degree handling for trig functions.
*/
function prepareExpression(raw){
  let s = raw;

  // replace symbols
  s = s.replace(/×/g,'*').replace(/÷/g,'/').replace(/–/g,'-');

  // handle percentage: "50%" => "(50/100)"
  s = s.replace(/(\d+(\.\d+)?)%/g, '($1/100)');

  // constants
  s = s.replace(/\bpi\b|π/gi, 'Math.PI');
  s = s.replace(/\be\b/g, 'Math.E');

  // powers: ^ -> **
  s = s.replace(/\^/g, '**');

  // functions mapping
  const funcs = {
    'sqrt': 'Math.sqrt',
    'ln': 'Math.log',
    'log': 'Math.log10',
    'exp': 'Math.exp',
    'abs': 'Math.abs',
    'floor': 'Math.floor',
    'ceil': 'Math.ceil',
  };

  // map named functions
  for (const k in funcs) s = s.replace(new RegExp('\\b'+k+'\\(', 'gi'), funcs[k] + '(');

  // factorial: n! => factorial(n)
  s = s.replace(/(\d+(\.\d+)?)!/g, 'factorial($1)');

  // trig — handle degree toggle by wrapping inside a converter
  const trig = ['sin','cos','tan','asin','acos','atan'];
  trig.forEach(t=>{
    // replace t(x) with Math.t*( convert if needed )
    s = s.replace(new RegExp('\\b'+t+'\\(', 'gi'), `__${t}__(`);
  });

  // replace placeholders with actual functions that take degrees into account
  s = s.replace(/__sin__\(/g, `(${isDeg ? '(Math.sin((Math.PI/180)*' : 'Math.sin('}`);
  s = s.replace(/__cos__\(/g, `(${isDeg ? '(Math.cos((Math.PI/180)*' : 'Math.cos('}`);
  s = s.replace(/__tan__\(/g, `(${isDeg ? '(Math.tan((Math.PI/180)*' : 'Math.tan('}`);

  // inverse trig: if deg mode, convert output back to degrees
  s = s.replace(/__asin__\(/g, `(${isDeg ? '((180/Math.PI)*Math.asin(' : 'Math.asin('}`);
  s = s.replace(/__acos__\(/g, `(${isDeg ? '((180/Math.PI)*Math.acos(' : 'Math.acos('}`);
  s = s.replace(/__atan__\(/g, `(${isDeg ? '((180/Math.PI)*Math.atan(' : 'Math.atan('}`);

  return s;
}

function safeEval(raw){
  if(!raw || raw.trim()==='') return '';
  const prepared = prepareExpression(raw);
  // use Function constructor in controlled scope
  try{
    // provide factorial in scope
    const fn = new Function('factorial', `return (${prepared});`);
    let value = fn(factorial);
    if (typeof value === 'number') value = toNumberSafe(value);
    return value;
  }catch(e){
    return NaN;
  }
}

/* button hookups */
buttons.forEach(b=>{
  b.addEventListener('click', e=>{
    const val = b.dataset.val;
    const fn = b.dataset.fn;
    // small click animation
    b.style.transform = 'translateY(2px)';
    setTimeout(()=> b.style.transform = '', 100);

    if(val) { expression += val; updateScreen(); return; }
    if(fn){
      // functions append name + (
      if(fn==='pi'){ expression += 'π'; }
      else if(fn==='sqrt'){ expression += 'sqrt('; }
      else if(fn==='fact'){ expression += '!'; }
      else expression += fn + '(';
      updateScreen();
    }
  });
});

acBtn.onclick = ()=> { expression=''; updateScreen(); }
delBtn.onclick = ()=> { expression = expression.slice(0,-1); updateScreen(); }

eqBtn.onclick = evaluate;
ansBtn.onclick = ()=> { expression += String(lastAns); updateScreen(); }
copyBtn.onclick = ()=> { navigator.clipboard?.writeText(String(lastAns||'')); copyBtn.textContent='Copied'; setTimeout(()=>copyBtn.textContent='Copy',900); }

/* theme toggle */
themeBtn.onclick = ()=>{
  document.body.classList.toggle('dark');
  themeBtn.textContent = document.body.classList.contains('dark') ? '☀️ Light' : '🌙 Dark';
}

/* angle toggle */
angleBtn.onclick = ()=>{
  isDeg = !isDeg;
  angleBtn.textContent = isDeg ? 'deg' : 'rad';
}

/* evaluate handler */
function evaluate(){
  const res = safeEval(expression);
  if (Number.isNaN(res) || res === undefined) {
    resultInput.value = 'Error';
    lastAns = '';
  } else {
    // format nicely - show up to 12 significant digits, but preserve ints
    let out = (Math.abs(res - Math.round(res)) < 1e-12) ? String(Math.round(res)) : Number(res).toPrecision(12);
    // trim trailing zeros
    out = out.replace(/(?:\.0+|(\.\d+?)0+)$/,'$1');
    resultInput.value = out;
    lastAns = out;
    pushToHistory(expression, out);
  }
}

/* keyboard support */
window.addEventListener('keydown', (ev)=>{
  const k = ev.key;
  if((/^[0-9]$/).test(k) || k==='.' ) { expression+=k; updateScreen(); return; }
  if(k==='Enter' || k==='='){ ev.preventDefault(); evaluate(); return; }
  if(k==='Backspace'){ expression = expression.slice(0,-1); updateScreen(); return; }
  if(['+','-','*','/','(',')','%','^'].includes(k)){ expression+=k; updateScreen(); return; }
  if(k.toLowerCase()==='p'){ expression += 'π'; updateScreen(); return; } // quick pi
});

/* click result to copy */
resultInput.addEventListener('click', ()=>{
  if(lastAns) navigator.clipboard?.writeText(String(lastAns));
});

/* initial render */
updateScreen();
renderHistory();
buttons.forEach(b => {
  b.addEventListener('mousedown', () => {
    b.style.transform = 'scale(0.92)';
    b.style.boxShadow = '0 0 20px rgba(30,144,255,0.5)';
  });
  b.addEventListener('mouseup', () => {
    b.style.transform = 'scale(1)';
    b.style.boxShadow = '';
  });
});

/* Smooth theme fade */
themeBtn.onclick = () => {
  document.body.style.transition = 'background 0.6s ease, color 0.6s ease';
  document.body.classList.toggle('dark');
  themeBtn.textContent = document.body.classList.contains('dark') ? '☀️ Light' : '🌙 Dark';
};

/* Smooth angle button pulse */
angleBtn.onclick = () => {
  isDeg = !isDeg;
  angleBtn.textContent = isDeg ? 'deg' : 'rad';
  angleBtn.style.transform = 'scale(1.2)';
  setTimeout(() => angleBtn.style.transform = 'scale(1)', 200);
};







