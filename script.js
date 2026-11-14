
// 실사 배경 이미지 로드
const bgImage = new Image();
let bgLoaded = false;

bgImage.onload = () => {
    bgLoaded = true;
    console.log('연못 배경 이미지 로드 성공!');
};

bgImage.onerror = () => {
    bgLoaded = false;
    console.error('pond_bg.png 로드 실패! 이미지 경로와 파일명을 확인하세요.');
};

bgImage.src = new URL('./pond_bg.png', document.baseURI).href;


// 8개 정점 좌표 (실사 탑뷰 연못 구도에 자연스럽게 배치)
const NODES = [
  { id: 'Start', label: 'Start', rx: 0.11, ry: 0.50, type: 'bank-left' },
  { id: 'A',     label: 'A',     rx: 0.22, ry: 0.50, type: 'pad' },
  { id: 'B',     label: 'B',     rx: 0.34, ry: 0.74, type: 'pad' },
  { id: 'C',     label: 'C',     rx: 0.43, ry: 0.48, type: 'pad' },
  { id: 'D',     label: 'D',     rx: 0.53, ry: 0.27, type: 'pad' },
  { id: 'E',     label: 'E',     rx: 0.63, ry: 0.65, type: 'pad' },
  { id: 'F',     label: 'F',     rx: 0.66, ry: 0.31, type: 'pad' },
  { id: 'End',   label: 'End',   rx: 0.81, ry: 0.50, type: 'pad-end' }
];

const EDGES = [
  { from: 'Start', to: 'A',   w: 2 },
  { from: 'Start', to: 'B',   w: 9 },
  { from: 'A',     to: 'C',   w: 2 },
  { from: 'A',     to: 'D',   w: 6 },
  { from: 'C',     to: 'B',   w: 1 },
  { from: 'C',     to: 'E',   w: 4 },
  { from: 'B',     to: 'E',   w: 1 },
  { from: 'B',     to: 'F',   w: 5 },
  { from: 'D',     to: 'F',   w: 2 },
  { from: 'D',     to: 'End', w: 5 },
  { from: 'E',     to: 'F',   w: 1 },
  { from: 'F',     to: 'End', w: 2 }
];

const INF = 999;

function buildDijkstraSteps() {
  const steps = [];
  const dist = {};
  const prev = {};
  const visited = new Set();
  const discovered = new Set(['Start']);
  NODES.forEach(n => { dist[n.id] = INF; prev[n.id] = '-'; });
  dist['Start'] = 0;

  let pq = [{ id: 'Start', d: 0 }];

  steps.push({
    mode: 'dijkstra',
    frogFrom: 'Start',
    frogTo: 'Start',
    rippleAt: null,
    activeEdge: null,
    relaxedNode: null,
    dist: { ...dist },
    prev: { ...prev },
    visited: new Set(visited),
    discovered: new Set(discovered),
    pq: [...pq],
    tag: '초기화 (Initialization)',
    what: '시작점(왼쪽 풀숲)의 거리를 0으로 설정하고, 나머지 7개 연잎은 ∞(무한대)로 초기화합니다.',
    why: '아직 연못 위 어떤 연잎에도 물결이 닿지 않았으므로, 시작 위치의 비용만 0으로 두고 우선순위 큐(Min-Heap)에 삽입합니다.'
  });

  let lastFrogNode = 'Start';

  while (pq.length > 0) {
    pq.sort((a, b) => a.d - b.d);
    const curr = pq.shift();
    const u = curr.id;
    if (visited.has(u)) continue;

    visited.add(u);

    steps.push({
      mode: 'dijkstra',
      frogFrom: lastFrogNode,
      frogTo: u,
      rippleAt: u,
      activeEdge: null,
      relaxedNode: null,
      dist: { ...dist },
      prev: { ...prev },
      visited: new Set(visited),
      discovered: new Set(discovered),
      pq: [...pq],
      tag: `정점 선택 · 확정 (${u})`,
      what: `우선순위 큐에서 거리가 가장 짧은 '${u}'(누적 거리 ${dist[u]})를 꺼내 개구리가 점프하고 방문 확정합니다.`,
      why: `현재 큐에서 가장 가까운 정점의 최단 거리는 이후 다른 경로를 거쳐도 더 짧아지지 않으므로 연꽃이 활짝 피어나며 동심원 물결을 보냅니다.`
    });

    lastFrogNode = u;

    if (u === 'End') {
      steps.push({
        mode: 'dijkstra',
        frogFrom: 'End',
        frogTo: 'End',
        rippleAt: 'End',
        activeEdge: null,
        relaxedNode: null,
        dist: { ...dist },
        prev: { ...prev },
        visited: new Set(visited),
        discovered: new Set(discovered),
        pq: [...pq],
        isEnding: true,
        tag: '목적지 도달 완료',
        what: `목표 연꽃 'End'의 최단 거리가 ${dist['End']}로 확정되어 개구리가 도착합니다.`,
        why: `경로 역추적(prev): Start → A(2) → C(4) → B(5) → E(6) → F(7) → End(9). 탐색하지 않은 먼 경로까지 가지 않고도 최단 경로를 보장합니다.`
      });
      break;
    }

    const outEdges = EDGES.filter(e => e.from === u);
    for (const e of outEdges) {
      const v = e.to;
      const cand = dist[u] + e.w;
      const improved = !visited.has(v) && cand < dist[v];

      if (improved) {
        dist[v] = cand;
        prev[v] = u;
        discovered.add(v);
        pq.push({ id: v, d: cand });
      }

      steps.push({
        mode: 'dijkstra',
        frogFrom: u,
        frogTo: u,
        rippleAt: u,
        activeEdge: e,
        relaxedNode: improved ? v : null,
        dist: { ...dist },
        prev: { ...prev },
        visited: new Set(visited),
        discovered: new Set(discovered),
        pq: [...pq],
        tag: `물결 도달 · 간선 완화 (${u} → ${v})`,
        what: improved
          ? `물결이 '${v}'에 닿았습니다! '${u}'를 거치는 경로(${dist[u]} + ${e.w} = ${cand})가 더 짧아 dist[${v}]를 ${cand}로 갱신합니다.`
          : `물결이 '${v}'에 닿았으나, 후보 거리(${cand})가 기존 거리(${dist[v] === INF ? '∞' : dist[v]})보다 크거나 같아 무시합니다.`,
        why: improved
          ? `더 짧은 경로가 발견되었으므로 연꽃 봉오리가 빛나며 우선순위 큐에 (${v}, ${cand})를 추가합니다.`
          : `이미 더 효율적인 경로가 확보되어 있으므로 불필요한 갱신을 수행하지 않습니다.`
      });
    }
  }
  return steps;
}

function buildBellmanSteps() {
  const steps = [];
  const dist = {};
  const prev = {};
  NODES.forEach(n => { dist[n.id] = INF; prev[n.id] = '-'; });
  dist['Start'] = 0;

  steps.push({
    mode: 'bellman',
    frogFrom: 'Start',
    frogTo: 'Start',
    rippleAt: null,
    activeEdge: null,
    relaxedNode: null,
    dist: { ...dist },
    prev: { ...prev },
    visited: new Set(['Start']),
    discovered: new Set(['Start']),
    roundInfo: '초기화 (총 V-1 = 7 라운드 준비)',
    tag: '초기화 (Initialization)',
    what: '물결 파동 없이 고요한 수면 위에서 시작점 거리만 0, 나머지 7개 정점은 ∞로 초기화합니다.',
    why: '벨만-포드는 우선순위 큐를 쓰지 않고, 모든 간선(E=12개)을 최대 V-1(7)번 반복하며 개구리가 직접 간선을 건너뛰어 거리를 갱신합니다.'
  });

  const V = NODES.length;
  for (let round = 1; round <= V - 1; round++) {
    let updatedInRound = false;

    for (const e of EDGES) {
      if (dist[e.from] === INF) continue;
      const cand = dist[e.from] + e.w;
      const improved = cand < dist[e.to];

      if (improved) {
        dist[e.to] = cand;
        prev[e.to] = e.from;
        updatedInRound = true;
      }

      const reachableSet = new Set(NODES.filter(n => dist[n.id] < INF).map(n => n.id));

      steps.push({
        mode: 'bellman',
        frogFrom: e.from,
        frogTo: e.to,
        rippleAt: null,
        activeEdge: e,
        relaxedNode: improved ? e.to : null,
        dist: { ...dist },
        prev: { ...prev },
        visited: reachableSet,
        discovered: reachableSet,
        roundInfo: `Round ${round} / ${V - 1} · 간선 (${e.from} → ${e.to}, 가중치 ${e.w}) 검사`,
        tag: `Round ${round} · 간선 점프 (${e.from} → ${e.to})`,
        what: improved
          ? `[갱신 성공] 개구리가 '${e.from} → ${e.to}' 간선을 뛰어 dist[${e.to}]를 ${cand}로 단축했습니다!`
          : `[유지] 개구리가 '${e.from} → ${e.to}'를 확인했으나(${cand}), 기존 dist[${e.to}](${dist[e.to]})가 더 짧아 유지합니다.`,
        why: improved
          ? `dist[${e.from}] + ${e.w} = ${cand} < 기존 dist[${e.to}] 조건이 성립하므로 간선 완화(Relaxation)를 수행합니다.`
          : `기존에 찾아둔 경로가 이미 더 짧거나 같기 때문에 값을 덮어쓰지 않고 다음 간선으로 넘어갑니다.`
      });
    }

    if (!updatedInRound) {
      const reachableSet = new Set(NODES.filter(n => dist[n.id] < INF).map(n => n.id));
      steps.push({
        mode: 'bellman',
        frogFrom: 'F',
        frogTo: 'End',
        rippleAt: null,
        activeEdge: null,
        relaxedNode: null,
        dist: { ...dist },
        prev: { ...prev },
        visited: reachableSet,
        discovered: reachableSet,
        isEnding: true,
        roundInfo: `Round ${round}에서 갱신 0건 → 조기 종료(Early Exit)!`,
        tag: `Round ${round} · 조기 종료 및 완료`,
        what: `Round ${round}에서 단 하나의 거리 값도 갱신되지 않아 탐색을 조기 종료하고 최종 연꽃에 도착합니다.`,
        why: `한 라운드 전체에서 간선 완화가 일어나지 않았다면 이후 라운드에서도 변화가 없으므로, 최단 거리(총 9)가 완전히 수렴했음을 보장합니다.`
      });
      break;
    }
  }
  return steps;
}

const DIJKSTRA_STEPS = buildDijkstraSteps();
const BELLMAN_STEPS = buildBellmanSteps();

let currentMode = 'dijkstra';
let steps = DIJKSTRA_STEPS;
let stepIdx = 0;
let playTimer = null;

let jumpProgress = 1;
let jumpStartPos = { x: 0, y: 0 };
let jumpEndPos = { x: 0, y: 0 };
let frogAngle = 0;
let rippleRadius = 0;

// 다층 심도 반딧불이 파티클 (원경/근경 보케 분리)
let fireflies = Array.from({ length: 42 }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: 1.0 + Math.random() * 2.8,
  vx: (Math.random() - 0.5) * 0.00028,
  vy: (Math.random() - 0.5) * 0.00028,
  phase: Math.random() * Math.PI * 2,
  bokeh: Math.random() > 0.72
}));

const canvas = document.getElementById('pondCanvas');
const ctx = canvas.getContext('2d');

function resizeCanvas() {
  const wrap = document.getElementById('canvasWrap');
  canvas.width = wrap.clientWidth * window.devicePixelRatio;
  canvas.height = wrap.clientHeight * window.devicePixelRatio;
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  syncFrogJump(false);
}
window.addEventListener('resize', resizeCanvas);

function getNodePixel(node) {
  const w = canvas.width / window.devicePixelRatio;
  const h = canvas.height / window.devicePixelRatio;
  return { x: node.rx * w, y: node.ry * h };
}

function syncFrogJump(animate = true) {
  const st = steps[stepIdx];
  const fromNode = NODES.find(n => n.id === st.frogFrom);
  const toNode = NODES.find(n => n.id === st.frogTo);
  const pFrom = getNodePixel(fromNode);
  const pTo = getNodePixel(toNode);

  jumpStartPos = pFrom;
  jumpEndPos = pTo;

  const dx = pTo.x - pFrom.x;
  const dy = pTo.y - pFrom.y;
  if (Math.hypot(dx, dy) > 2) {
    frogAngle = Math.atan2(dy, dx);
    jumpProgress = animate ? 0 : 1;
  } else {
    jumpProgress = 1;
  }
}

function switchMode(mode) {
  stopPlay();
  closeEnding();
  currentMode = mode;
  steps = mode === 'dijkstra' ? DIJKSTRA_STEPS : BELLMAN_STEPS;
  stepIdx = 0;
  const dj = mode === 'dijkstra';
  document.getElementById('simBadge').textContent = dj ? 'Dijkstra · 탐욕적 확정' : 'Bellman-Ford · 전체 간선 완화';
  document.getElementById('navNext').textContent = dj ? '벨만-포드로 가기 ▶' : '시간·공간 복잡도 비교하기 ▶';
  document.getElementById('structTitle').textContent = dj ? '우선순위 큐 (Min-Heap PQ)' : '간선 완화 라운드 (Edge Relaxation)';
  document.getElementById('structSub').textContent = dj ? 'O((V+E) log V)' : 'O(V · E)';
  renderCode();
  updateUI(false);
}

function goToStep(idx) {
  stepIdx = Math.max(0, Math.min(steps.length - 1, idx));
  rippleRadius = 0;
  updateUI(true);
}

function nextStep() {
  if (stepIdx < steps.length - 1) {
    goToStep(stepIdx + 1);
  } else {
    stopPlay();
  }
}

function prevStep() {
  closeEnding();
  if (stepIdx > 0) {
    goToStep(stepIdx - 1);
  }
}

function togglePlay() {
  if (playTimer) {
    stopPlay();
  } else {
    if (stepIdx >= steps.length - 1) stepIdx = 0;
    document.getElementById('playBtn').textContent = '⏸ 일시 정지';
    playTimer = setInterval(() => {
      if (stepIdx < steps.length - 1) {
        nextStep();
      } else {
        stopPlay();
      }
    }, 1800);
  }
}

function stopPlay() {
  if (playTimer) {
    clearInterval(playTimer);
    playTimer = null;
  }
  document.getElementById('playBtn').textContent = '▶ 자동 재생';
}

function updateUI(animateJump = true) {
  const st = steps[stepIdx];
  syncFrogJump(animateJump);
  highlightCode(st);

  const slider = document.getElementById('stepSlider');
  slider.max = steps.length - 1;
  slider.value = stepIdx;
  document.getElementById('stepCounter').textContent = `${stepIdx + 1}/${steps.length}`;
  document.getElementById('prevBtn').disabled = stepIdx === 0;
  document.getElementById('nextBtn').disabled = stepIdx === steps.length - 1;

  document.getElementById('stepTag').textContent = `STEP ${stepIdx + 1} / ${steps.length} · ${st.tag}`;
  document.getElementById('stepWhat').textContent = st.what;
  document.getElementById('stepWhy').textContent = st.why;

  const grid = document.getElementById('distGrid');
  grid.innerHTML = '';
  NODES.forEach(n => {
    const val = st.dist[n.id];
    const isUpdated = st.relaxedNode === n.id;
    const isVisited = st.visited.has(n.id);
    const cell = document.createElement('div');
    cell.className = `dist-cell ${isUpdated ? 'updated' : ''} ${isVisited ? 'visited' : ''}`;
    cell.innerHTML = `
      <div class="node-name">${n.label}</div>
      <div class="node-val">${val === INF ? '∞' : val}</div>
      <div class="node-prev">prev: ${st.prev[n.id]}</div>
    `;
    grid.appendChild(cell);
  });

  const sBox = document.getElementById('structBox');
  if (st.mode === 'dijkstra') {
    const sorted = [...st.pq].sort((a, b) => a.d - b.d);
    sBox.innerHTML = sorted.length
      ? sorted.map(item => `[${item.id}: dist=${item.d}]`).join('  →  ')
      : '<span style="color:#64748b;">큐가 비어 있음 (탐색 완료)</span>';
  } else {
    sBox.textContent = st.roundInfo;
  }

  if (st.isEnding && document.getElementById('autoEnding').checked) {
    setTimeout(() => showEnding(st), 950);
  }
}

function showEnding(st) {
  const overlay = document.getElementById('endingOverlay');
  document.getElementById('endingTitle').textContent =
    st.mode === 'dijkstra'
      ? '다익스트라 여정 완료: 물결이 인도한 최단 연꽃길'
      : '벨만-포드 여정 완료: 모든 간선을 확인한 최단 연꽃길';
  document.getElementById('endingDesc').textContent =
    `최단 경로: Start → A(2) → C(4) → B(5) → E(6) → F(7) → End(9) · 총 비용 9`;
  overlay.classList.add('visible');
  renderEndingFallback();
}

function closeEnding() {
  document.getElementById('endingOverlay').classList.remove('visible');
}

function renderEndingFallback() {
  const img = document.getElementById('endingImg');
  const eCanvas = document.getElementById('endingCanvas');

  img.onload = () => {
    img.style.display = 'block';
    eCanvas.style.display = 'none';
  };
  img.onerror = () => {
    img.style.display = 'none';
    eCanvas.style.display = 'block';
    const w = (eCanvas.width = 760);
    const h = (eCanvas.height = 428);
    const c = eCanvas.getContext('2d');
    const bg = c.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#091326');
    bg.addColorStop(1, '#060c18');
    c.fillStyle = bg;
    c.fillRect(0, 0, w, h);
    c.fillStyle = '#fbcfe8';
    c.font = '15px sans-serif';
    c.textAlign = 'center';
    c.fillText('같은 폴더에 ending.png (사선 앵글 이미지)를 넣으면 실사 엔딩이 표시됩니다.', w / 2, h / 2);
  };

  // 이미 로드 완료된 경우 즉시 표시, 아니면 새로 로드 트리거
  if (img.complete && img.naturalWidth > 0) {
    img.style.display = 'block';
    eCanvas.style.display = 'none';
  } else {
    img.src = 'ending.png';
  }
}

// 실사 질감 연잎 & 광원 연꽃 그리기
function drawRealisticLilyPad(x, y, radius, isConfirmed, isCandidate, now) {
  ctx.save();

  // 1~2) 연잎: 가장자리가 물결치는 타원형 + 한쪽이 갈라진 틈 + 방사형 주름
  const seed = x * 0.0137 + y * 0.0211;
  const notch = (seed * 5) % (Math.PI * 2); // 갈라진 틈 방향 (연잎마다 다름)
  const gapHalf = 0.17;
  const padPath = (scale, ox, oy) => {
    ctx.beginPath();
    ctx.moveTo(x + ox, y + oy);
    const N = 80;
    for (let i = 0; i <= N; i++) {
      const th = notch + gapHalf + (i / N) * (Math.PI * 2 - gapHalf * 2);
      const ruffle = 1 + 0.05 * Math.sin(th * 9 + seed * 7) + 0.028 * Math.sin(th * 15 + seed * 3);
      const rr = radius * scale * ruffle;
      ctx.lineTo(x + ox + Math.cos(th) * rr * 1.1, y + oy + Math.sin(th) * rr * 0.92);
    }
    ctx.closePath();
  };
  const pt = (ang, rad, off = 0) => [
    x + Math.cos(ang) * rad * 1.1 - Math.sin(ang) * off,
    y + Math.sin(ang) * rad * 0.92 + Math.cos(ang) * off
  ];

  // 수면 그림자
  ctx.fillStyle = 'rgba(2, 6, 15, 0.68)';
  padPath(1.03, 4, 6);
  ctx.fill();

  // 잎 본체 그라데이션
  const padGrad = ctx.createRadialGradient(x - radius * 0.25, y - radius * 0.25, 3, x, y, radius * 1.1);
  padGrad.addColorStop(0, '#3a8a7a');
  padGrad.addColorStop(0.6, '#236457');
  padGrad.addColorStop(1, '#14423f');
  ctx.fillStyle = padGrad;
  padPath(1, 0, 0);
  ctx.fill();

  // 주름(잎맥): 어두운 골 + 밝은 능선을 번갈아 곡선으로 그림
  ctx.save();
  padPath(1, 0, 0);
  ctx.clip();
  const VEINS = 20;
  for (let v = 0; v < VEINS; v++) {
    const ang = notch + gapHalf + ((v + 0.5) * (Math.PI * 2 - gapHalf * 2)) / VEINS;
    const sway = (v % 2 ? 1 : -1) * 0.14;
    const a0 = pt(ang, radius * 0.1);
    const c1 = pt(ang + sway, radius * 0.55);
    const a1 = pt(ang, radius * 1.02);
    ctx.beginPath();
    ctx.moveTo(a0[0], a0[1]);
    ctx.quadraticCurveTo(c1[0], c1[1], a1[0], a1[1]);
    ctx.strokeStyle = 'rgba(4, 28, 30, 0.5)';
    ctx.lineWidth = 1.8;
    ctx.stroke();
    // 밝은 능선(골 바로 옆)
    const b0 = pt(ang, radius * 0.1, 1.6);
    const b1 = pt(ang + sway, radius * 0.55, 1.6);
    const b2 = pt(ang, radius * 1.02, 1.6);
    ctx.beginPath();
    ctx.moveTo(b0[0], b0[1]);
    ctx.quadraticCurveTo(b1[0], b1[1], b2[0], b2[1]);
    ctx.strokeStyle = 'rgba(170, 245, 225, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  // 가운데 배꼽
  const nv = ctx.createRadialGradient(x, y, 0, x, y, radius * 0.2);
  nv.addColorStop(0, 'rgba(8, 40, 38, 0.65)');
  nv.addColorStop(1, 'rgba(8, 40, 38, 0)');
  ctx.fillStyle = nv;
  ctx.beginPath();
  ctx.arc(x, y, radius * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // 가장자리 하이라이트
  padPath(1, 0, 0);
  ctx.strokeStyle = 'rgba(150, 235, 225, 0.5)';
  ctx.lineWidth = 1.4;
  ctx.stroke();

  // 3) 연꽃 발광 블룸(Bloom) & 다층 꽃잎
  if (isConfirmed) {
    ctx.globalCompositeOperation = 'lighter';
    const bloom = ctx.createRadialGradient(x, y, 2, x, y, radius * 1.45);
    bloom.addColorStop(0, 'rgba(255, 210, 235, 0.95)');
    bloom.addColorStop(0.35, 'rgba(244, 114, 182, 0.55)');
    bloom.addColorStop(1, 'rgba(244, 114, 182, 0)');
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(x, y, radius * 1.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // 외곽 꽃잎 10장 + 내곽 꽃잎 6장 입체 그라데이션
    for (let layer = 0; layer < 2; layer++) {
      const count = layer === 0 ? 10 : 6;
      const pLen = layer === 0 ? 13 : 8;
      const pWid = layer === 0 ? 5.2 : 3.8;
      const distR = layer === 0 ? 10 : 5.5;

      for (let k = 0; k < count; k++) {
        const a = (k * Math.PI * 2) / count + layer * 0.3;
        const px = x + Math.cos(a) * distR;
        const py = y + Math.sin(a) * distR;

        const pGrad = ctx.createLinearGradient(x, y, px + Math.cos(a) * pLen, py + Math.sin(a) * pLen);
        pGrad.addColorStop(0, '#fff1f2');
        pGrad.addColorStop(0.5, '#f9a8d4');
        pGrad.addColorStop(1, '#db2777');

        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.ellipse(px, py, pLen, pWid, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 중심 황금빛 수술
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (isCandidate) {
    const pulse = 0.5 + 0.5 * Math.sin(now * 0.007);
    ctx.globalCompositeOperation = 'lighter';
    const cGlow = ctx.createRadialGradient(x, y, 1, x, y, 22 + pulse * 6);
    cGlow.addColorStop(0, `rgba(251, 207, 232, ${0.65 + pulse * 0.3})`);
    cGlow.addColorStop(1, 'rgba(244, 114, 182, 0)');
    ctx.fillStyle = cGlow;
    ctx.beginPath();
    ctx.arc(x, y, 22 + pulse * 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.fillStyle = '#f9a8d4';
    ctx.beginPath();
    ctx.ellipse(x, y, 7, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // 어두운 꽃봉오리
    const budGrad = ctx.createRadialGradient(x - 1, y - 1, 1, x, y, 6);
    budGrad.addColorStop(0, '#f9a8d4');
    budGrad.addColorStop(1, '#831843');
    ctx.fillStyle = budGrad;
    ctx.beginPath();
    ctx.ellipse(x, y, 6, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// 사실적인 청개구리 렌더링 (뒷다리/앞다리/등무늬/눈빛 입체 표현)
function drawRealisticFrog(x, y, angle, scale, jumpArc) {
  ctx.save();

  // 수면 위 그림자
  ctx.fillStyle = 'rgba(2, 6, 15, 0.55)';
  ctx.beginPath();
  ctx.ellipse(x + 3, y + jumpArc + 7, 13 * (1 - jumpArc * 0.005), 8 * (1 - jumpArc * 0.005), angle, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.scale(scale, scale);

  // 접힌 뒷다리 (점프 시 뒤로 뻗음)
  const legStretch = jumpArc > 2 ? 7 : 0;
  ctx.fillStyle = '#15803d';
  ctx.beginPath();
  ctx.ellipse(-7 - legStretch * 0.5, -8, 7 + legStretch * 0.4, 3.2, -0.45, 0, Math.PI * 2);
  ctx.ellipse(-7 - legStretch * 0.5, 8, 7 + legStretch * 0.4, 3.2, 0.45, 0, Math.PI * 2);
  ctx.fill();

  // 앞다리
  ctx.beginPath();
  ctx.ellipse(6, -8, 4.5, 2.2, 0.5, 0, Math.PI * 2);
  ctx.ellipse(6, 8, 4.5, 2.2, -0.5, 0, Math.PI * 2);
  ctx.fill();

  // 몸통 입체 그라데이션
  const bodyGrad = ctx.createRadialGradient(2, -2, 2, 0, 0, 14);
  bodyGrad.addColorStop(0, '#86efac');
  bodyGrad.addColorStop(0.45, '#22c55e');
  bodyGrad.addColorStop(1, '#14532d');
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 9.5, 0, 0, Math.PI * 2);
  ctx.fill();

  // 등줄기 하이라이트
  ctx.strokeStyle = 'rgba(220, 252, 231, 0.45)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(-8, 0);
  ctx.lineTo(6, 0);
  ctx.stroke();

  // 금빛 눈과 동공
  ctx.fillStyle = '#fde047';
  ctx.beginPath();
  ctx.arc(8, -5.2, 2.8, 0, Math.PI * 2);
  ctx.arc(8, 5.2, 2.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#090d16';
  ctx.beginPath();
  ctx.arc(8.6, -5.2, 1.3, 0, Math.PI * 2);
  ctx.arc(8.6, 5.2, 1.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function draw(now = 0) {
  const w = canvas.width / window.devicePixelRatio;
  const h = canvas.height / window.devicePixelRatio;
  const st = steps[stepIdx];

  // 1) 배경 렌더링: pond_bg.png 실사 이미지가 있으면 우선 사용
  if (bgLoaded) {
    ctx.drawImage(bgImage, 0, 0, w, h);
    // UI 가독성을 위한 은은한 심야 비네팅 오버레이
    const vig = ctx.createRadialGradient(w * 0.5, h * 0.5, w * 0.25, w * 0.5, h * 0.5, w * 0.72);
    vig.addColorStop(0, 'rgba(4, 10, 22, 0.12)');
    vig.addColorStop(1, 'rgba(2, 6, 14, 0.55)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  } else {
    // 폴백: 깊은 남빛 수면 + 물결 노이즈 텍스처 + 좌우 수풀
    const pondGrad = ctx.createRadialGradient(w * 0.5, h * 0.5, 40, w * 0.5, h * 0.5, w * 0.68);
    pondGrad.addColorStop(0, '#0f2342');
    pondGrad.addColorStop(0.55, '#081326');
    pondGrad.addColorStop(1, '#030711');
    ctx.fillStyle = pondGrad;
    ctx.fillRect(0, 0, w, h);

    // 은은한 수면 일렁임 하이라이트
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.04)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 12; i++) {
      const wy = ((i + 0.5) / 12) * h + Math.sin(now * 0.001 + i) * 6;
      ctx.beginPath();
      ctx.moveTo(w * 0.12, wy);
      ctx.bezierCurveTo(w * 0.35, wy - 14, w * 0.65, wy + 14, w * 0.88, wy);
      ctx.stroke();
    }

    const leftBank = ctx.createLinearGradient(0, 0, w * 0.16, 0);
    leftBank.addColorStop(0, '#0d2116');
    leftBank.addColorStop(0.75, '#091711');
    leftBank.addColorStop(1, 'rgba(9, 23, 17, 0)');
    ctx.fillStyle = leftBank;
    ctx.fillRect(0, 0, w * 0.16, h);

    const rightBank = ctx.createLinearGradient(w * 0.84, 0, w, 0);
    rightBank.addColorStop(0, 'rgba(9, 23, 17, 0)');
    rightBank.addColorStop(0.25, '#091711');
    rightBank.addColorStop(1, '#0d2116');
    ctx.fillStyle = rightBank;
    ctx.fillRect(w * 0.84, 0, w * 0.16, h);
  }

  // 2) 다익스트라 실사형 다층 물결 파동 (Lighter 블렌드)
  if (st.mode === 'dijkstra' && st.rippleAt && jumpProgress >= 0.85) {
    const rn = NODES.find(n => n.id === st.rippleAt);
    const rp = getNodePixel(rn);
    rippleRadius = (rippleRadius + 1.5) % 260;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 4; i++) {
      const r = (rippleRadius + i * 65) % 260;
      const alpha = Math.pow(Math.max(0, 1 - r / 260), 1.4) * 0.5;
      ctx.strokeStyle = `rgba(186, 230, 253, ${alpha})`;
      ctx.lineWidth = 2.6 - (r / 260) * 1.4;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 3) 간선(경로) 렌더링
  const showW = document.getElementById('showWeights').checked;
  EDGES.forEach(e => {
    const p1 = getNodePixel(NODES.find(n => n.id === e.from));
    const p2 = getNodePixel(NODES.find(n => n.id === e.to));

    const isCurrentEdge = st.activeEdge && st.activeEdge.from === e.from && st.activeEdge.to === e.to;
    const isTreeEdge = st.prev[e.to] === e.from;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);

    if (isCurrentEdge) {
      ctx.strokeStyle = st.relaxedNode === e.to ? '#f472b6' : '#38bdf8';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 16;
    } else if (isTreeEdge) {
      ctx.strokeStyle = 'rgba(244, 114, 182, 0.78)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(244, 114, 182, 0.5)';
      ctx.shadowBlur = 8;
    } else {
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.22)';
      ctx.lineWidth = 1.2;
      ctx.setLineDash([4, 6]);
    }
    ctx.stroke();
    ctx.restore();

    const mx = (p1.x + p2.x) / 2;
    const my = (p1.y + p2.y) / 2;
    const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);

    ctx.fillStyle = isTreeEdge || isCurrentEdge ? '#f9a8d4' : 'rgba(148, 163, 184, 0.45)';
    ctx.beginPath();
    ctx.moveTo(mx + Math.cos(angle) * 7, my + Math.sin(angle) * 7);
    ctx.lineTo(mx + Math.cos(angle + 2.5) * 6, my + Math.sin(angle + 2.5) * 6);
    ctx.lineTo(mx + Math.cos(angle - 2.5) * 6, my + Math.sin(angle - 2.5) * 6);
    ctx.closePath();
    ctx.fill();

    if (showW) {
      ctx.fillStyle = 'rgba(5, 11, 24, 0.85)';
      ctx.beginPath();
      ctx.arc(mx, my - 13, 10.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = isCurrentEdge ? '#fde047' : isTreeEdge ? '#fbcfe8' : '#cbd5e1';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(e.w, mx, my - 13);
    }
  });

  // 4) 연잎 8개 렌더링
  NODES.forEach(n => {
    const p = getNodePixel(n);
    const isConfirmed = st.visited.has(n.id) && n.id !== 'Start';
    const isCandidate = (st.discovered.has(n.id) && !isConfirmed && n.id !== 'Start') || st.relaxedNode === n.id;

    if (n.type !== 'bank-left') {
      drawRealisticLilyPad(p.x, p.y, 38, isConfirmed, isCandidate, now);
    }

    // 정점 이름 + 거리 반투명 알약 배지
    const dVal = st.dist[n.id] === INF ? '∞' : st.dist[n.id];
    const labelText = `${n.label} (${dVal})`;
    ctx.font = 'bold 11.5px sans-serif';
    const tw = ctx.measureText(labelText).width + 14;

    ctx.fillStyle = 'rgba(4, 9, 20, 0.82)';
    ctx.beginPath();
    ctx.roundRect(p.x - tw / 2, p.y + 42, tw, 20, 10);
    ctx.fill();
    ctx.strokeStyle = isConfirmed ? 'rgba(244, 114, 182, 0.6)' : 'rgba(148, 163, 184, 0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, p.x, p.y + 52);
  });

  // 5) 오른쪽 끝 반투명 소녀 발광체 (실사 배경 없을 때 표시)
  if (!bgLoaded) {
    const endP = getNodePixel(NODES[NODES.length - 1]);
    const girlX = endP.x + 68;
    const girlY = endP.y;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const gGlow = ctx.createRadialGradient(girlX, girlY, 4, girlX, girlY, 54);
    gGlow.addColorStop(0, 'rgba(255, 255, 255, 0.72)');
    gGlow.addColorStop(0.45, 'rgba(186, 230, 253, 0.25)');
    gGlow.addColorStop(1, 'rgba(186, 230, 253, 0)');
    ctx.fillStyle = gGlow;
    ctx.beginPath();
    ctx.arc(girlX, girlY, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 6) 개구리 포물선 점프 렌더링
  if (jumpProgress < 1) {
    jumpProgress = Math.min(1, jumpProgress + 0.045);
  }
  const t = 1 - Math.pow(1 - jumpProgress, 3);
  const arcHeight = Math.sin(jumpProgress * Math.PI) * 40;
  const fx = jumpStartPos.x + (jumpEndPos.x - jumpStartPos.x) * t;
  const fy = jumpStartPos.y + (jumpEndPos.y - jumpStartPos.y) * t - arcHeight;
  const scale = 1 + Math.sin(jumpProgress * Math.PI) * 0.3;

  drawRealisticFrog(fx, fy, frogAngle, scale, arcHeight);

  // 7) 심도 있는 연두빛 반딧불이 보케(Bokeh)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  fireflies.forEach(f => {
    f.x = (f.x + f.vx + 1) % 1;
    f.y = (f.y + f.vy + 1) % 1;
    const pulse = 0.3 + 0.7 * Math.abs(Math.sin(now * 0.002 + f.phase));
    const px = f.x * w;
    const py = f.y * h;
    const rad = f.bokeh ? f.r * 3.2 : f.r * 1.8;

    const fGrad = ctx.createRadialGradient(px, py, 0, px, py, rad);
    fGrad.addColorStop(0, `rgba(217, 249, 157, ${pulse})`);
    fGrad.addColorStop(0.4, `rgba(163, 230, 53, ${pulse * 0.45})`);
    fGrad.addColorStop(1, 'rgba(163, 230, 53, 0)');
    ctx.fillStyle = fGrad;
    ctx.beginPath();
    ctx.arc(px, py, rad, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  requestAnimationFrame(draw);
}

/* ===== 화면 흐름 · 핵심 코드 패널 · 장식 ===== */
const INTRO = {
  dijkstra: { t: '다익스트라(Dijkstra) 알고리즘', l: [
    '가장 가까운 연잎부터 하나씩 "확정"해 나가는 탐욕 알고리즘이에요.',
    '확정한 연잎에서 나가는 간선으로 이웃 연잎의 거리를 갱신(완화)해요.',
    '가중치가 음수가 아닐 때만 쓸 수 있고, 우선순위 큐(Min-Heap)가 필요해요.' ] },
  bellman: { t: '벨만-포드(Bellman-Ford) 알고리즘', l: [
    '모든 간선을 정해진 순서대로 훑으며 거리를 줄여 나가는 알고리즘이에요.',
    '최단 경로는 간선이 최대 V−1개라서 전체 간선을 최대 V−1번 반복해요.',
    '음수 가중치도 다룰 수 있고, 우선순위 큐 없이 반복문만 있으면 돼요.' ] }
};

const CODE = {
  dijkstra: [
    'dist[모든 정점] ← ∞;  dist[Start] ← 0',
    'PQ ← { (Start, 0) }',
    'while PQ가 비어 있지 않음:',
    '  u ← PQ에서 dist가 최소인 정점 꺼내 확정 (이미 확정이면 건너뜀)',
    '  for 각 간선 (u → v, 가중치 w):',
    '    if dist[u] + w < dist[v]:          // 완화',
    '      dist[v] ← dist[u] + w;  prev[v] ← u',
    '      PQ.insert(v, dist[v])'
  ],
  bellman: [
    'dist[모든 정점] ← ∞;  dist[Start] ← 0',
    'for round = 1 .. V-1:',
    '  changed ← false',
    '  for 각 간선 (u → v, 가중치 w) (정해진 순서):',
    '    if dist[u] ≠ ∞ and dist[u] + w < dist[v]:   // 완화',
    '      dist[v] ← dist[u] + w;  prev[v] ← u;  changed ← true',
    '  if not changed: break            // 조기 종료'
  ]
};

function codeLines(st) {
  const bf = st.mode === 'bellman';
  if (st.activeEdge) {
    const imp = !!st.relaxedNode;
    return bf ? (imp ? [1, 3, 4, 5] : [1, 3, 4]) : (imp ? [4, 5, 6, 7] : [4, 5]);
  }
  if (st.isEnding) return bf ? [6] : [2];
  if (st.tag.startsWith('초기화')) return bf ? [0] : [0, 1];
  return [2, 3];
}

function renderCode() {
  document.getElementById('codeBox').innerHTML = CODE[currentMode]
    .map((s, i) => `<div class="code-line" data-i="${i}">${s.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>`).join('');
}

function highlightCode(st) {
  const on = codeLines(st);
  document.querySelectorAll('#codeBox .code-line').forEach((el, i) => el.classList.toggle('on', on.includes(i)));
}

let introTimer;
function show(id) {
  document.querySelectorAll('.screen').forEach(el => el.classList.toggle('active', el.id === id));
}
function goMenu() {
  clearTimeout(introTimer);
  stopPlay();
  closeEnding();
  show('screenMenu');
}
function startAlgo(mode) {
  switchMode(mode);
  const d = INTRO[mode];
  document.getElementById('introTitle').textContent = d.t;
  document.getElementById('introList').innerHTML = d.l.map(s => `<li>${s}</li>`).join('');
  const card = document.getElementById('introCard');
  card.classList.remove('fade');
  show('screenIntro');
  clearTimeout(introTimer);
  introTimer = setTimeout(() => {
    card.classList.add('fade');
    introTimer = setTimeout(enterSim, 1300);
  }, 6500);
}
function enterSim() {
  clearTimeout(introTimer);
  show('screenSim');
}
function navNext() {
  if (currentMode === 'dijkstra') {
    startAlgo('bellman');
  } else {
    stopPlay();
    closeEnding();
    show('screenCompare');
  }
}

let flowerId = 0;
function buildFlowers() {
  document.querySelectorAll('.flower').forEach(b => {
    const id = 'fg' + flowerId++;
    const petals = Array.from({ length: 8 }, (_, i) =>
      `<ellipse cx="100" cy="44" rx="22" ry="42" transform="rotate(${i * 45} 100 100)"/>`).join('');
    b.insertAdjacentHTML('afterbegin',
      `<svg viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="${id}"><stop offset="30%" stop-color="${b.dataset.c2}"/><stop offset="100%" stop-color="${b.dataset.c1}"/></radialGradient></defs>` +
      `<g fill="url(#${id})" fill-opacity=".88" stroke="rgba(255,255,255,.55)" stroke-width="1.4">${petals}</g>` +
      `<circle cx="100" cy="100" r="56" fill="rgba(6,11,22,.8)" stroke="rgba(255,255,255,.5)"/></svg>`);
  });
}
function buildFireflies() {
  const bg = document.getElementById('bgFly');
  for (let i = 0; i < 28; i++) {
    const f = document.createElement('i');
    f.className = 'fly';
    f.style.cssText = `left:${Math.random() * 100}%;top:${Math.random() * 100}%;animation-delay:${-Math.random() * 9}s;animation-duration:${7 + Math.random() * 6}s`;
    bg.appendChild(f);
  }
}

buildFlowers();
buildFireflies();
resizeCanvas();
switchMode('dijkstra');
requestAnimationFrame(draw);