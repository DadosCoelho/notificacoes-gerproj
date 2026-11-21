/* Mascote: coelho de 12 blocos (tetraedros) azuis, em canvas.
   Fonte da forma: assets/coelho-blocos.svg (a mesma imagem, vista de cima).

   Uma linha do tempo só, t de COELHO_INI a COELHO_DUR: os blocos caem, a
   câmera gira e desce até a vista de cima (imagem padrão). Sair da aba =
   tocar a mesma linha ao contrário, mais rápido, antes de a aba trocar: a
   câmera inclina primeiro e os blocos sobem; a subida herda a garantia contra colisão da queda.

   Sem colisão (conferido em testes/verificar_coelho_blocos.js): todos caem
   juntos, com a mesma gravidade, de camadas separadas por PASSO, maior que o
   bloco mais alto (0,95); só giram acima de LIVRE e descem reto no fim. */

// 3 vértices da base (z = 0) + ápice sobre um deles: de cima só a face
// inclinada aparece, e o tom dela (luz) reproduz o desenho.
const COELHO_BLOCOS = [[[-0.36,-0.04,0],[-0.6,0.6,0],[-0.18,0.64,0],[-0.36,-0.04,0.55]],[[-0.36,-0.04,0],[-0.18,0.64,0],[-0.08,0.108,0],[-0.08,0.108,0.3]],[[-0.6,0.6,0],[-0.44,1.12,0],[-0.18,0.64,0],[-0.18,0.64,0.95]],[[0.04,0.108,0],[0.14,0.64,0],[0.56,0.58,0],[0.04,0.108,0.65]],[[0.04,0.108,0],[0.56,0.58,0],[0.32,-0.04,0],[0.04,0.108,0.1]],[[0.14,0.64,0],[0.66,1.04,0],[0.56,0.58,0],[0.14,0.64,0.2]],[[-0.02,0.14,0],[-0.66,-0.28,0],[-0.02,-0.48,0],[-0.02,-0.48,0.35]],[[-0.02,0.14,0],[0.62,-0.28,0],[-0.02,-0.48,0],[0.62,-0.28,0.65]],[[-0.66,-0.28,0],[-0.44,-0.92,0],[-0.02,-0.48,0],[-0.44,-0.92,0.3]],[[0.62,-0.28,0],[0.4,-0.92,0],[-0.02,-0.48,0],[0.62,-0.28,0.55]],[[-0.44,-0.92,0],[-0.02,-1.12,0],[-0.02,-0.48,0],[-0.02,-1.12,0.1]],[[0.4,-0.92,0],[-0.02,-1.12,0],[-0.02,-0.48,0],[-0.02,-1.12,0.75]]];

const COELHO_DUR = 4.6;           // s até a imagem padrão
// antes disto os blocos ainda estão acima do quadro: a animação começa
// (e a desmontagem termina) aqui, sem o trecho de tela vazia
const COELHO_INI = 0.6;
const COELHO_ALTURA_MODELO = 2.24; // altura do coelho visto de cima (unidades)

const coelhoQuadro = (() => {
  const RAD = Math.PI / 180;
  const ORDEM = [10, 11, 8, 9, 6, 7, 1, 4, 0, 3, 2, 5];   // camada de cada bloco
  const ALTO = 4.0, PASSO = 1.25, G = 3.0, LIVRE = 1.6, ANG = 2.4;
  const QUIQUE = 0.18, DQ = 0.22, INI_Q = 0.1;
  const TILT = 58 * RAD, YAW0 = -200 * RAD;
  const clamp = (x) => Math.min(1, Math.max(0, x));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  function queda(k, s) {
    const h = ALTO + k * PASSO, tl = Math.sqrt(h / G);
    if (s < 0) return h;
    if (s < tl) return h - G * s * s;
    if (s < tl + DQ) { const b = (s - tl) / DQ; return QUIQUE * 4 * b * (1 - b); }
    return 0;
  }

  /* Estado da cena no instante t: câmera e, por bloco, altura e giro. */
  return function (t) {
    const yaw = YAW0 * (1 - easeInOut(clamp(t / COELHO_DUR)));
    const tilt = t < 2.4 ? TILT : TILT * (1 - easeInOut(clamp((t - 2.4) / 2.2)));
    const blocos = COELHO_BLOCOS.map((_, i) => {
      const k = ORDEM.indexOf(i);
      const z = queda(k, t - INI_Q);
      return { z, giro: clamp((z - LIVRE) / (ALTO - LIVRE)) * ANG * (k % 2 ? 1 : -1) };
    });
    return { yaw, tilt, blocos };
  };
})();

/* Desenha os blocos num canvas, com z-buffer. O canvas é maior que a área
   do coelho (folga), para blocos no alto e câmera inclinada caberem.
   cena = { az, tilt, girarTela, blocos: [{z, giro}] | null, vis }:
   - girarTela: desfaz o giro az na tela (a câmera só se inclina, o coelho
     não roda) — usado na volta da câmera; a queda gira a cena de verdade;
   - vis (0 a 1): brilho que depende da câmera (some em cima). */
function rendererCoelho(canvas, folga) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const ESC = W / (COELHO_ALTURA_MODELO * folga * 1.06);
  const DIST = 14, RAD = Math.PI / 180;
  const BASE = [0x00, 0x7a, 0xcc];
  const LUZ = (() => { const v = [-0.45, 0.55, 0.7], m = Math.hypot(...v); return v.map((c) => c / m); })();
  const img = ctx.createImageData(W, W), px = new Uint32Array(img.data.buffer);
  const zbuf = new Float32Array(W * W);

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const norm = (v) => { const m = Math.hypot(...v) || 1; return v.map((c) => c / m); };
  const clamp = (x) => Math.min(1, Math.max(0, x));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const rgba = (c, a = 255) => ((a << 24) | (Math.round(c[2]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[0])) >>> 0;

  // mesmo azul: sombra (45% do brilho) -> cor base -> realce (55% branco);
  // o brilho (vis) depende da câmera e some em cima, onde vale o ícone
  function tom(n, V, vis) {
    const t = Math.max(0, dot(n, LUZ));
    let c;
    if (t < 0.7) { const k = 0.45 + 0.55 * t / 0.7; c = BASE.map((x) => x * k); }
    else { const m = (t - 0.7) / 0.3 * 0.55; c = BASE.map((x) => x + (255 - x) * m); }
    if (vis > 0) {
      const h = norm([LUZ[0] + V[0], LUZ[1] + V[1], LUZ[2] + V[2]]);
      const b = 0.55 * Math.pow(Math.max(0, dot(n, h)), 40) * vis;
      c = c.map((x) => x + (255 - x) * b);
    }
    return c;
  }

  function projetor(cena) {
    const ca = Math.cos(cena.az), sa = Math.sin(cena.az), ct = Math.cos(cena.tilt), st = Math.sin(cena.tilt);
    // a perspectiva some quando a câmera chega ao topo: parado, a projeção é
    // ortogonal e as faces encaixam sem fresta, igual ao coelho-blocos.svg
    const D = DIST / Math.max(easeInOut(clamp(Math.abs(cena.tilt) / (40 * RAD))), 0.01);
    return (p) => {
      const x = p[0] * ca - p[1] * sa, y = p[0] * sa + p[1] * ca;
      const Y = y * ct + p[2] * st, prof = p[2] * ct - y * st;      // prof > 0 = perto da câmera
      const w = 1 / (D - prof), X = x * D * w, Yp = Y * D * w;      // w é linear na tela (z-buffer)
      if (!cena.girarTela) return { x: W / 2 + X * ESC, y: W / 2 - Yp * ESC, w };
      return { x: W / 2 + (X * ca + Yp * sa) * ESC, y: W / 2 - (-X * sa + Yp * ca) * ESC, w };
    };
  }

  function giraZ(p, c, a) {
    const ca = Math.cos(a), sa = Math.sin(a), dx = p[0] - c[0], dy = p[1] - c[1];
    return [c[0] + dx * ca - dy * sa, c[1] + dx * sa + dy * ca, p[2]];
  }

  // z-buffer: cada pixel mostra a face mais próxima (pintar por ordem de
  // profundidade errava quando dois blocos se cruzavam na tela)
  function triangulo(a, b, c, cor) {
    const area = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
    if (Math.abs(area) < 1e-6) return;
    const x0 = Math.max(0, Math.floor(Math.min(a.x, b.x, c.x))), x1 = Math.min(W - 1, Math.ceil(Math.max(a.x, b.x, c.x)));
    const y0 = Math.max(0, Math.floor(Math.min(a.y, b.y, c.y))), y1 = Math.min(W - 1, Math.ceil(Math.max(a.y, b.y, c.y)));
    const inv = 1 / area, eps = -0.012;   // sobreposição mínima: sem fresta entre faces vizinhas
    for (let y = y0; y <= y1; y++) {
      const py = y + 0.5;
      for (let x = x0; x <= x1; x++) {
        const pxx = x + 0.5;
        const l0 = ((b.x - pxx) * (c.y - py) - (b.y - py) * (c.x - pxx)) * inv;
        const l1 = ((c.x - pxx) * (a.y - py) - (c.y - py) * (a.x - pxx)) * inv;
        const l2 = 1 - l0 - l1;
        if (l0 < eps || l1 < eps || l2 < eps) continue;
        const w = l0 * a.w + l1 * b.w + l2 * c.w, i = y * W + x;
        if (w > zbuf[i]) { zbuf[i] = w; px[i] = cor; }
      }
    }
  }

  return function desenhar(cena) {
    const proj = projetor(cena);
    const st = Math.sin(cena.tilt), ct = Math.cos(cena.tilt);
    // direção da câmera no mundo (brilho e faces de costas)
    const V = [-st * Math.sin(cena.az), -st * Math.cos(cena.az), ct];
    const vis = cena.vis || 0;
    px.fill(0); zbuf.fill(0);                // fundo transparente

    COELHO_BLOCOS.forEach((b, i) => {
      const { z, giro } = cena.blocos ? cena.blocos[i] : { z: 0, giro: 0 };
      const c = [0, 1, 2].map((j) => (b[0][j] + b[1][j] + b[2][j]) / 3);
      const v = b.map((p) => { const r = giraZ(p, c, giro); return [r[0], r[1], r[2] + z]; });
      const pr = v.map(proj);
      if (pr.some((p) => !(p.w > 0) || p.w > 1)) return;              // atrás ou colado na câmera
      if (pr.every((p) => p.y < 0) || pr.every((p) => p.y > W) || pr.every((p) => p.x < 0) || pr.every((p) => p.x > W)) return;
      const centro = [0, 1, 2].map((j) => v.reduce((s, p) => s + p[j], 0) / 4);
      for (const f of [[0, 1, 3], [1, 2, 3], [2, 0, 3], [0, 1, 2]]) {
        const P = f.map((j) => v[j]);
        let n = cross(sub(P[1], P[0]), sub(P[2], P[0]));
        if (Math.hypot(...n) < 1e-9) continue;
        n = norm(n);
        const fc = [0, 1, 2].map((j) => (P[0][j] + P[1][j] + P[2][j]) / 3);
        if (dot(n, sub(fc, centro)) < 0) n = n.map((x) => -x);
        // face de costas sai (evita duas faces coplanares disputando o pixel)
        if (dot(n, V) <= 1e-4) continue;
        triangulo(pr[f[0]], pr[f[1]], pr[f[2]], rgba(tom(n, V, vis)));
      }
    });
    ctx.putImageData(img, 0, 0);
  };
}

/* Coelho de uma aba: os blocos caem ao entrar na aba e sobem ao sair dela,
   para parecer que os mesmos blocos viajam entre as abas. Montado, a câmera
   só se move com o mouse sobre o coelho (centro = em cima, borda = 70°
   daquele lado); fora dele, volta ao topo.

   A queda segue um relógio da aba (coelhoEntradaEm), não do canvas: a aba
   se redesenha a cada filtro, e o coelho novo continua de onde o outro
   estava, sem cair de novo. */
const COELHO_INCL_MOUSE = 70 * Math.PI / 180;
const COELHO_VEL_SAIDA = 5;        // a subida toca a queda 5x mais rápido (~0,8 s)

let coelhoEntradaEm = 0;           // performance.now() de quando a aba abriu; Infinity = ainda não

/* Marca o começo da queda da aba atual (o app chama ao trocar de aba e
   quando o splash sai). */
function coelhoComecarEntrada(ms = performance.now()) { coelhoEntradaEm = ms; }

function criarCoelho(area, lado, folga) {
  const canvas = canvasCoelhoBlocos(lado, folga);
  area.appendChild(canvas);
  const desenhar = rendererCoelho(canvas, folga);
  const RAD = Math.PI / 180;
  const clamp = (x) => Math.min(1, Math.max(0, x));
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const parado = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // câmera do mouse como vetor (tilt*sen az, tilt*cos az): suaviza sem
  // salto quando o ângulo dá a volta
  let mouse = null, cam = [0, 0], antes = performance.now();
  let saida = null;                // { de: t no começo, em: ms, fim: callback }
  let quadro = 0, entrou = false;
  const criado = antes;

  function tempoQueda(agora) {
    if (parado) return COELHO_DUR;
    if (saida) return Math.max(COELHO_INI, saida.de - (agora - saida.em) / 1000 * COELHO_VEL_SAIDA);
    return Math.min(COELHO_DUR, Math.max(COELHO_INI, COELHO_INI + (agora - coelhoEntradaEm) / 1000));
  }

  function passo(agora) {
    quadro = 0;
    if (canvas.isConnected) entrou = true;
    else if (entrou || agora - criado > 2000) return;      // a aba foi redesenhada: este para
    const dt = Math.min(0.05, (agora - antes) / 1000);
    antes = agora;
    const t = tempoQueda(agora);
    const alvo = t >= COELHO_DUR && mouse ? mouse : [0, 0];
    const f = 1 - Math.exp(-7 * dt);
    cam = [cam[0] + (alvo[0] - cam[0]) * f, cam[1] + (alvo[1] - cam[1]) * f];
    const tilt = Math.hypot(cam[0], cam[1]);
    if (t < COELHO_DUR) {
      const q = coelhoQuadro(t);
      desenhar({ az: q.yaw, tilt: q.tilt, girarTela: false, blocos: q.blocos, vis: 0 });
    } else {
      desenhar({ az: Math.atan2(cam[0], cam[1]), tilt, girarTela: true, blocos: null, vis: clamp(tilt / (25 * RAD)) });
    }
    if (saida && t <= COELHO_INI) { const fim = saida.fim; saida = null; fim(); return; }
    // segue animando enquanto cai, sobe ou a câmera não chegou ao alvo
    const assentou = Math.hypot(alvo[0] - cam[0], alvo[1] - cam[1]) < 1e-3;
    if (t < COELHO_DUR || saida || !assentou) pedir();
  }
  function pedir() { if (!quadro) quadro = requestAnimationFrame(passo); }

  if (!parado) {
    area.addEventListener('mousemove', (ev) => {
      const r = area.getBoundingClientRect();
      const dx = (ev.clientX - r.left) / r.width * 2 - 1, dy = (ev.clientY - r.top) / r.height * 2 - 1;
      const d = Math.min(1, Math.hypot(dx, dy) / 0.8);    // 80% do raio já inclina tudo
      const tilt = COELHO_INCL_MOUSE * easeInOut(d), az = Math.atan2(-dx, dy);
      mouse = [tilt * Math.sin(az), tilt * Math.cos(az)];
      pedir();
    });
    area.addEventListener('mouseleave', () => { mouse = null; pedir(); });
  }

  /* Saída: os blocos sobem no próprio lugar (a queda ao contrário). Devolve
     uma promessa que se cumpre quando eles saem; depois disso a área não
     sai de novo. */
  area.coelhoSair = () => {
    area.coelhoSair = null;
    if (parado || !canvas.isConnected || !canvas.getBoundingClientRect().width) return null;
    return new Promise((ok) => {
      const agora = performance.now();
      saida = { de: tempoQueda(agora), em: agora, fim: ok };
      mouse = null;
      pedir();
    });
  };

  pedir();
}

/* Faz os coelhos de um container saírem (troca de aba). Devolve uma
   promessa cumprida quando todos saem (no máximo 1,5 s, para a troca de aba
   nunca ficar presa), ou null se não há coelho para sair. */
function coelhoSairDe(container) {
  const saidas = [...container.querySelectorAll('.coelho-area')]
    .map((a) => (a.coelhoSair ? a.coelhoSair() : null)).filter(Boolean);
  if (!saidas.length) return null;
  return Promise.race([Promise.all(saidas), new Promise((ok) => setTimeout(ok, 1500))]);
}

/* Canvas do tamanho certo para uma área de `lado` px (CSS): o dobro dos
   pixels da tela, para as bordas saírem suaves ao reduzir. */
function canvasCoelhoBlocos(lado, folga = 1.5) {
  const cv = document.createElement('canvas');
  const css = Math.round(lado * folga);
  cv.width = cv.height = Math.round(css * (window.devicePixelRatio || 1) * 2);
  cv.style.width = cv.style.height = `${css}px`;
  cv.className = 'coelho-blocos';
  return cv;
}

/* Coelho ao lado do título de uma aba. Com `pendurar`, ele desce até a
   linha de baixo sem aumentar o cabeçalho; essa linha recebe a classe
   .ao-lado-do-coelho para abrir espaço. */
function coelhoTitulo(pendurar = true) {
  const area = document.createElement('div');
  area.className = 'coelho-titulo coelho-area' + (pendurar ? ' pendurado' : '');
  area.setAttribute('aria-hidden', 'true');
  try { criarCoelho(area, 60, 1.3); } catch (e) { /* decorativo */ }
  return area;
}
